import { useState, useRef, useEffect } from "react";
import { C } from "../../constants/theme";
import { REDUCED } from "../../utils/animate";

// Primitivas de interação dos gráficos, para cada gráfico não reinventar
// hover, tooltip e entrada.

// ————— caixa de tooltip dentro do SVG —————
// rows: [{ col, label, val }] em monospace na cor da série.
export function ChartTooltip({ x, y, W, width = 170, title, sub, subCol, rows = [], flipAt = 0.56, scale = 1 }) {
  const left = x > W * flipAt;
  const lineH = 13 * scale;
  const h = 22 * scale + rows.length * lineH + (sub ? lineH : 0);
  const padX = 9 * scale;
  return <g transform={`translate(${left ? x - width - 12 : x + 12},${y})`} style={{ pointerEvents: "none" }}>
    <rect width={width} height={h} rx="7" fill={C.card} stroke={C.border} opacity="0.97" />
    <text x={padX} y={14 * scale} fontSize={9.5 * scale} fill={C.text} fontWeight="700">{title}</text>
    {sub && <text x={padX} y={26 * scale} fontSize={8.5 * scale} fill={subCol || C.muted}>{sub}</text>}
    {rows.map((r, j) => <text key={r.label ?? j} x={padX} y={(sub ? 39 : 27) * scale + j * lineH}
      fontSize={9 * scale} fontFamily="ui-monospace, monospace" fill={r.col}>{r.label}: {r.val}</text>)}
  </g>;
}

export function HoverBand({ x, y, w, h }) {
  return <rect x={x} y={y} width={w} height={h} fill={C.text} opacity="0.05" rx="3" style={{ pointerEvents: "none" }} />;
}

// ————— entrada: só anima quando o gráfico entra na tela —————
export function useInView({ threshold = 0.2 } = {}) {
  const ref = useRef(null);
  // Sem animação (modo estático), não há entrada a esperar: desenha já.
  const [seen, setSeen] = useState(REDUCED);
  useEffect(() => {
    const el = ref.current;
    if (!el || seen) return;
    if (typeof IntersectionObserver === "undefined") { setSeen(true); return; }
    const io = new IntersectionObserver(entries => {
      if (entries.some(e => e.isIntersecting)) { setSeen(true); io.disconnect(); }
    }, { threshold });
    io.observe(el);
    return () => io.disconnect();
  }, [seen, threshold]);
  return [ref, seen];
}

export function DrawPath({ d, redrawKey, dur = ".9s", delay = "0s", draw = true, style, ...rest }) {
  return <path key={redrawKey} d={d} pathLength="1"
    className={draw ? "ch-draw" : undefined}
    style={{ ...(draw ? { animationDuration: dur, animationDelay: delay } : {}), ...style }}
    {...rest} />;
}

export function stagger(i, n, total = 500) {
  return `${(i / Math.max(n - 1, 1)) * total}ms`;
}

// ————— heatmap em tabela HTML —————
export function cellHL(cell, r, c) {
  if (!cell) return null;
  if (cell.r === r && cell.c === c) return { outline: `1.5px solid ${C.text}`, outlineOffset: -1.5 };
  if (cell.r === r || cell.c === c) return { boxShadow: `inset 0 0 0 99px ${C.text}0d` };
  return null;
}

export function Readout({ children, vazio = "passe o mouse no gráfico para ver os números" }) {
  return <div style={{
    marginTop: 8, padding: "7px 12px", background: C.dim, borderRadius: 6,
    fontSize: 11, color: C.muted, display: "flex", gap: 14, flexWrap: "wrap",
    minHeight: 32, alignItems: "center",
  }}>
    {children || <span style={{ opacity: .7 }}>{vazio}</span>}
  </div>;
}

export function RV({ l, v, c }) {
  return <span>{l}: <b style={{ color: c || C.text, fontFamily: "ui-monospace, monospace" }}>{v}</b></span>;
}

// Legenda que também é controle (toggle) — padrão §3.1 da skill.
export function LegendToggle({ items, active, onToggle, bar = true }) {
  return <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
    {items.map(s => {
      const on = active ? !!active[s.k] : true;
      return <button key={s.k} onClick={onToggle ? () => onToggle(s.k) : undefined} style={{
        borderRadius: 6, padding: "3px 10px", fontSize: 10.5, cursor: onToggle ? "pointer" : "default", fontWeight: 600,
        border: `1px solid ${on ? s.col : C.border}`, background: on ? `${s.col}1c` : C.card, color: on ? s.col : C.muted, transition: "all .15s",
      }}>
        <span style={{ display: "inline-block", width: 12, height: bar ? 8 : 3, background: on ? s.col : C.border, borderRadius: 2, marginRight: 5, verticalAlign: "middle" }} />
        {s.label}{s.n != null && <span style={{ opacity: .65 }}> · {s.n}</span>}
      </button>;
    })}
  </div>;
}
