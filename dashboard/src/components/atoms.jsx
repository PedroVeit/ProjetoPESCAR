import { useState, useEffect } from "react";
import { C } from "../constants/theme";
import { REDUCED } from "../utils/animate";

// Anima o único número dentro de uma string ("62%", "11.894") de 0 até o
// valor final, preservando prefixo/sufixo e o separador de milhar pt-BR.
export function useCountUp(value, dur = 700) {
  const parse = v => {
    const s = String(v);
    const m = s.match(/-?\d[\d.]*(?:,\d+)?/g);
    if (REDUCED || !m || m.length !== 1 || typeof v === "object") return null;
    const raw = m[0];
    const dec = (raw.split(",")[1] || "").length;
    const num = parseFloat(raw.replace(/\./g, "").replace(",", "."));
    return isFinite(num) ? { s, raw, dec, num } : null;
  };
  const fmt = (p, x) => p.s.replace(p.raw, x.toLocaleString("pt-BR", { minimumFractionDigits: p.dec, maximumFractionDigits: p.dec }));
  const [disp, setDisp] = useState(() => { const p = parse(value); return p ? fmt(p, 0) : value; });
  useEffect(() => {
    const p = parse(value);
    if (!p) { setDisp(value); return; }
    const t0 = performance.now();
    let raf;
    const tick = now => {
      const k = Math.min((now - t0) / dur, 1);
      setDisp(fmt(p, p.num * (1 - Math.pow(1 - k, 3))));
      if (k < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);
  return disp;
}

export function Card({ children, s = {}, className = "" }) {
  return <div className={`ui-card ${className}`} style={{ position: "relative", background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: "14px 16px", ...s }}>{children}</div>;
}

export function Lbl({ children, s = {} }) {
  return <div style={{ fontSize: 10, color: C.muted, textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 10, fontWeight: 600, paddingRight: 26, ...s }}>{children}</div>;
}

export function StatCard({ label, value, color, sub, delta }) {
  const disp = useCountUp(value);
  return <Card s={{ minWidth: 0 }}>
    <Lbl>{label}</Lbl>
    <div style={{ display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap" }}>
      <div style={{ fontSize: 26, fontWeight: 700, color: color || C.text, fontVariantNumeric: "tabular-nums", lineHeight: 1.1 }}>{disp}</div>
      {delta && <span style={{ fontSize: 11, fontWeight: 700, color: delta.col }}>{delta.txt}</span>}
    </div>
    {sub && <div style={{ fontSize: 11, color: C.muted, marginTop: 5, lineHeight: 1.45 }}>{sub}</div>}
  </Card>;
}

export function Btn({ children, active, color, onClick, s = {}, title }) {
  const c = color || C.cyan;
  return <button title={title} onClick={onClick} style={{ borderRadius: 6, padding: "4px 10px", fontSize: 11, cursor: "pointer", fontWeight: 600, border: `1px solid ${active ? c : C.border}`, background: active ? `${c}22` : C.card, color: active ? c : C.muted, transition: "all .15s", ...s }}>{children}</button>;
}

// Controle segmentado single-select com trilho e indicador deslizante.
export function Seg({ options, value, onChange, size = 11 }) {
  const i = Math.max(0, options.findIndex(o => o.v === value));
  return <div role="group" style={{ position: "relative", display: "inline-grid", gridTemplateColumns: `repeat(${options.length}, auto)`, background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, padding: 2 }}>
    {options.map((o, k) => {
      const act = k === i;
      const c = o.col ? (C[o.col] || o.col) : C.text;
      return <button key={String(o.v)} onClick={() => onChange(o.v)} aria-pressed={act} style={{
        position: "relative", zIndex: 1, padding: "4px 11px", borderRadius: 6, fontSize: size, fontWeight: act ? 700 : 500,
        cursor: "pointer", border: `1px solid ${act ? `${c}66` : "transparent"}`, background: act ? `${c}1e` : "transparent",
        color: act ? c : C.muted, transition: "all .2s cubic-bezier(.2,0,0,1)", whiteSpace: "nowrap",
      }}>{o.l}</button>;
    })}
  </div>;
}

export function Badge({ children, color }) {
  const c = color || C.muted;
  return <span style={{ background: `${c}22`, color: c, border: `1px solid ${c}44`, borderRadius: 4, padding: "1px 6px", fontSize: 10, fontWeight: 600, whiteSpace: "nowrap" }}>{children}</span>;
}

export function Swatch({ color, w = 10, h = 10, r = 2 }) {
  return <span style={{ display: "inline-block", width: w, height: h, borderRadius: r, background: color, verticalAlign: "middle", flexShrink: 0 }} />;
}
