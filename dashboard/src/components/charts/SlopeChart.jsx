import { useMemo, useState } from "react";
import { C } from "../../constants/theme";
import { fmtP, fmtPP, fmtN } from "../../data/selectors";
import { ChartTooltip, DrawPath, LegendToggle, useInView } from "./chartInteract";

// Gráfico de inclinação: uma linha por unidade ligando o % de inscritos sem
// experiência no primeiro ano ao do segundo. A inclinação É a mudança — é a
// forma mais direta de mostrar "como a proporção mudou" para 25+ unidades ao
// mesmo tempo, sem 25 gráficos de barra.

const CORTE = 0.05; // ±5 p.p. separa "estável" de mudança real

const cat = d => (d <= -CORTE ? "caiu" : d >= CORTE ? "subiu" : "estavel");

function espalhar(items, gap, lo, hi) {
  items.sort((a, b) => a.y - b.y);
  items.forEach(it => { it.ly = it.y; });
  for (let i = 1; i < items.length; i++) if (items[i].ly < items[i - 1].ly + gap) items[i].ly = items[i - 1].ly + gap;
  const over = items.length ? items[items.length - 1].ly - hi : 0;
  if (over > 0) {
    items[items.length - 1].ly -= over;
    for (let i = items.length - 2; i >= 0; i--) if (items[i].ly > items[i + 1].ly - gap) items[i].ly = items[i + 1].ly - gap;
  }
  if (items.length && items[0].ly < lo) { const d = lo - items[0].ly; items.forEach(it => { it.ly += d; }); }
  return items;
}

export default function SlopeChart({ data, foco, onPick }) {
  const { anos, linhas } = data;
  const [ativo, setAtivo] = useState({ caiu: true, estavel: true, subiu: true });
  const [hv, setHv] = useState(null);
  const [ref, seen] = useInView();

  const W = 600, H = 470, T = 34, B = 22, xA = 70, xB = 360;
  const vals = linhas.flatMap(l => [l.a, l.b]);
  const lo = Math.floor((Math.min(...vals) - 0.02) * 20) / 20;
  const hi = Math.min(1, Math.ceil((Math.max(...vals) + 0.02) * 20) / 20);
  const y = v => T + ((hi - v) / (hi - lo)) * (H - T - B);
  const COL = { caiu: C.red, estavel: C.muted, subiu: C.green };

  const vis = linhas.filter(l => ativo[cat(l.d)]);
  const conta = { caiu: 0, estavel: 0, subiu: 0 };
  linhas.forEach(l => { conta[cat(l.d)]++; });

  const rotulos = useMemo(() => espalhar(vis.map(l => ({ u: l.u, y: y(l.b), l })), 13.2, T - 6, H - B + 4),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [vis.map(l => l.u).join(","), lo, hi]);

  const onMove = e => {
    const r = e.currentTarget.getBoundingClientRect();
    const fx = ((e.clientX - r.left) / r.width) * W, fy = ((e.clientY - r.top) / r.height) * H;
    if (fx > xB + 12) {
      const lab = rotulos.find(it => Math.abs(it.ly - fy) < 7);
      setHv(lab ? lab.u : null);
      return;
    }
    if (fx < xA - 16) { setHv(null); return; }
    const t = Math.max(0, Math.min(1, (fx - xA) / (xB - xA)));
    let best = null, bd = 12;
    for (const l of vis) {
      const yl = y(l.a) + (y(l.b) - y(l.a)) * t;
      const d = Math.abs(yl - fy);
      if (d < bd) { bd = d; best = l.u; }
    }
    setHv(best);
  };

  const ordem = [...vis].sort((a, b) => (a.u === hv || a.u === foco) - (b.u === hv || b.u === foco));
  const hl = hv ?? foco;
  const hit = linhas.find(l => l.u === hv);
  const ticks = [];
  for (let v = Math.ceil(lo * 10) / 10; v <= hi + 1e-9; v += 0.1) ticks.push(+v.toFixed(2));

  return <div ref={ref}>
    <div style={{ marginBottom: 8 }}>
      <LegendToggle bar={false} active={ativo} onToggle={k => setAtivo(a => ({ ...a, [k]: !a[k] }))} items={[
        { k: "caiu", label: `Caiu mais de ${CORTE * 100} p.p.`, col: C.red, n: conta.caiu },
        { k: "estavel", label: "Estável (±5 p.p.)", col: C.muted, n: conta.estavel },
        { k: "subiu", label: `Subiu mais de ${CORTE * 100} p.p.`, col: C.green, n: conta.subiu },
      ]} />
    </div>
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: "block", cursor: "crosshair" }} onMouseMove={onMove} onMouseLeave={() => setHv(null)}
      onClick={() => hv != null && onPick?.(hv)}>
      {ticks.map(v => <g key={v}>
        <line x1={xA} x2={xB} y1={y(v)} y2={y(v)} stroke={C.border} strokeWidth={v === 0.5 ? 1.2 : .6} strokeDasharray={v === 0.5 ? "4,3" : undefined} />
        <text x={xA - 10} y={y(v) + 3} fontSize="9" fill={C.muted} textAnchor="end">{fmtP(v)}</text>
      </g>)}
      {lo <= 0.5 && <text x={xA + 4} y={y(0.5) - 4} fontSize="9" fill={C.muted} fontWeight="700">maioria (50%)</text>}
      <text x={xA} y={16} fontSize="12" fontWeight="800" fill={C.text} textAnchor="middle">{anos[0]}</text>
      <text x={xB} y={16} fontSize="12" fontWeight="800" fill={C.text} textAnchor="middle">{anos[1]}</text>
      <line x1={xA} x2={xA} y1={T - 8} y2={H - B} stroke={C.border} />
      <line x1={xB} x2={xB} y1={T - 8} y2={H - B} stroke={C.border} />

      {seen && ordem.map((l, i) => {
        const c = COL[cat(l.d)];
        const on = hl == null || l.u === hl;
        return <g key={l.u} style={{ opacity: on ? 1 : .16, transition: "opacity .25s ease", pointerEvents: "none" }}>
          <DrawPath d={`M${xA},${y(l.a)} L${xB},${y(l.b)}`} stroke={c} strokeWidth={l.u === hl ? 3 : 1.6} fill="none" strokeLinecap="round"
            delay={`${Math.min(i * 25, 600)}ms`} dur=".8s" />
          <circle className="ch-pop" cx={xA} cy={y(l.a)} r={l.u === hl ? 4.5 : 3} fill={c} stroke={C.card} strokeWidth="1.2" style={{ animationDelay: `${Math.min(i * 25, 600)}ms` }} />
          <circle className="ch-pop" cx={xB} cy={y(l.b)} r={l.u === hl ? 4.5 : 3} fill={c} stroke={C.card} strokeWidth="1.2" style={{ animationDelay: `${Math.min(i * 25, 600) + 700}ms` }} />
          {l.u === hl && <text x={xA - 10} y={y(l.a) - 6} fontSize="10" fontWeight="800" fill={c} textAnchor="end">{fmtP(l.a)}</text>}
        </g>;
      })}

      {seen && rotulos.map(({ u, y: y0, ly, l }) => {
        const c = COL[cat(l.d)];
        const on = hl == null || u === hl;
        return <g key={u} className="ch-area" style={{ opacity: on ? 1 : .25, transition: "opacity .25s ease", pointerEvents: "none" }}>
          <path d={`M${xB + 5},${y0} C${xB + 14},${y0} ${xB + 10},${ly} ${xB + 18},${ly}`} stroke={c} strokeWidth=".7" fill="none" opacity=".6" />
          <text x={xB + 21} y={ly + 3.2} fontSize="9.6" fill={u === hl ? C.text : C.muted} fontWeight={u === hl ? 800 : 500}>
            <tspan fill={c} fontWeight="800" fontFamily="ui-monospace, monospace">{fmtP(l.b)}</tspan>  {l.nome}
          </text>
        </g>;
      })}

      {hit && <ChartTooltip W={W} x={(xA + xB) / 2} y={Math.min(y((hit.a + hit.b) / 2) + 8, H - 80)} width={190}
        title={hit.nome} sub={`${cat(hit.d) === "caiu" ? "▼ caiu" : cat(hit.d) === "subiu" ? "▲ subiu" : "≈ estável"} ${fmtPP(hit.d)}`} subCol={COL[cat(hit.d)]}
        rows={[
          { label: `${anos[0]}`, val: `${fmtP(hit.a, 1)} de ${fmtN(hit.na)}`, col: C.text },
          { label: `${anos[1]}`, val: `${fmtP(hit.b, 1)} de ${fmtN(hit.nb)}`, col: C.text },
        ]} />}
    </svg>
  </div>;
}
