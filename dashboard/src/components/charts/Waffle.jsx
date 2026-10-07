import { motion } from "framer-motion";
import { C } from "../../constants/theme";
import { fmtP } from "../../data/selectors";

// Waffle 10×10: cada quadrado é 1% do grupo. Os quadrados são distribuídos
// pelo método do maior resto, para a soma dar exatamente 100.
// cats: [{ label, p (0..1), col }]
function cem(ps) {
  const raw = ps.map(p => p * 100);
  const base = raw.map(Math.floor);
  let falta = 100 - base.reduce((a, b) => a + b, 0);
  raw.map((v, i) => [v - Math.floor(v), i]).sort((a, b) => b[0] - a[0]).forEach(([, i]) => { if (falta > 0) { base[i]++; falta--; } });
  return base;
}

export default function Waffle({ cats, animKey, destaque = 2 }) {
  const n = cem(cats.map(c => c.p));
  const cells = n.flatMap((k, i) => Array.from({ length: k }, () => i));
  const ate = n.slice(0, destaque).reduce((a, b) => a + b, 0);
  return <div style={{ display: "flex", gap: 22, alignItems: "center", flexWrap: "wrap" }}>
    <div key={animKey} style={{ display: "grid", gridTemplateColumns: "repeat(10, 1fr)", gap: 4, width: "min(100%, 270px)", aspectRatio: "1" }}>
      {cells.map((ci, i) => <motion.div key={i} initial={{ opacity: 0, scale: .3 }} animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: (Math.floor(i / 10) + (i % 10)) * .028, duration: .32, ease: [0.22, 1, 0.36, 1] }}
        title={`${cats[ci].label}`}
        style={{ background: cats[ci].col, borderRadius: 3, outline: ci < destaque ? `1px solid ${C.text}22` : "none" }} />)}
    </div>
    <div style={{ display: "grid", gap: 9, minWidth: 180, flex: 1 }}>
      <div style={{ fontSize: 30, fontWeight: 800, lineHeight: 1, color: C.purple }}>{ate}<span style={{ fontSize: 15, color: C.muted, fontWeight: 600 }}> de cada 100</span></div>
      <div style={{ fontSize: 12, color: C.muted, lineHeight: 1.5, marginTop: -4 }}>vivem com até <b style={{ color: C.text }}>meio salário mínimo</b> por pessoa — o critério de baixa renda do CadÚnico.</div>
      {cats.map((c, i) => <div key={c.label} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12 }}>
        <span style={{ width: 12, height: 12, borderRadius: 3, background: c.col, flexShrink: 0 }} />
        <span style={{ flex: 1, color: C.text }}>{c.label}</span>
        <b style={{ fontFamily: "ui-monospace, monospace", color: C.text }}>{fmtP(c.p)}</b>
        <span style={{ fontSize: 10.5, color: C.muted, minWidth: 30, textAlign: "right" }}>{n[i]}▪</span>
      </div>)}
    </div>
  </div>;
}
