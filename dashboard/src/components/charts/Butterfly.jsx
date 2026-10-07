import { useState } from "react";
import { motion } from "framer-motion";
import { C } from "../../constants/theme";
import { fmtP, fmtPP, fmtN } from "../../data/selectors";
import { Readout, RV } from "./chartInteract";

// Gráfico borboleta: as mesmas categorias, sem experiência à esquerda e com
// experiência à direita, cada lado em % do próprio grupo. A coluna final dá a
// diferença em p.p. — a leitura que interessa ("onde os perfis divergem").
export default function Butterfly({ a, b, la = "Sem experiência", lb = "Com experiência" }) {
  const [hv, setHv] = useState(null);
  const max = Math.max(0.01, ...a.pct, ...b.pct);
  const w = p => `${(p / max) * 100}%`;
  const ease = { duration: .6, ease: [0.22, 1, 0.36, 1] };
  return <div onMouseLeave={() => setHv(null)}>
    <div style={{ display: "grid", gridTemplateColumns: "1fr 118px 1fr 64px", gap: 8, fontSize: 10, fontWeight: 800, letterSpacing: 1, marginBottom: 6 }}>
      <span style={{ textAlign: "right", color: C.cyan }}>← {la.toUpperCase()}</span><span />
      <span style={{ color: C.orange }}>{lb.toUpperCase()} →</span><span style={{ color: C.muted, textAlign: "right" }}>DIFERENÇA</span>
    </div>
    {a.cats.map((c, i) => {
      const d = a.pct[i] - b.pct[i];
      const on = hv == null || hv === i;
      return <div key={c} onMouseEnter={() => setHv(i)} style={{ display: "grid", gridTemplateColumns: "1fr 118px 1fr 64px", gap: 8, alignItems: "center", padding: "3px 0", opacity: on ? 1 : .4, transition: "opacity .2s" }}>
        <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: 10.5, color: C.muted, fontFamily: "ui-monospace, monospace" }}>{fmtP(a.pct[i])}</span>
          <div style={{ width: "75%", display: "flex", justifyContent: "flex-end" }}>
            <motion.div initial={{ width: 0 }} animate={{ width: w(a.pct[i]) }} transition={{ ...ease, delay: i * .04 }} style={{ height: 16, background: C.cyan, borderRadius: "4px 0 0 4px", opacity: .85 }} />
          </div>
        </div>
        <span style={{ fontSize: 11.5, textAlign: "center", color: hv === i ? C.text : C.muted, fontWeight: hv === i ? 700 : 550, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{c}</span>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <div style={{ width: "75%" }}>
            <motion.div initial={{ width: 0 }} animate={{ width: w(b.pct[i]) }} transition={{ ...ease, delay: i * .04 }} style={{ height: 16, background: C.orange, borderRadius: "0 4px 4px 0", opacity: .85 }} />
          </div>
          <span style={{ fontSize: 10.5, color: C.muted, fontFamily: "ui-monospace, monospace" }}>{fmtP(b.pct[i])}</span>
        </div>
        <span style={{ textAlign: "right", fontSize: 11, fontWeight: 800, fontFamily: "ui-monospace, monospace", color: Math.abs(d) < .03 ? C.muted : d > 0 ? C.cyan : C.orange }}>
          {fmtPP(d, 0).replace(" p.p.", "")}</span>
      </div>;
    })}
    <Readout>{hv != null && <>
      <b style={{ color: C.text }}>{a.cats[hv]}</b>
      <RV l={la} v={`${fmtN(a.n[hv])} de ${fmtN(a.tot)} (${fmtP(a.pct[hv], 1)})`} c={C.cyan} />
      <RV l={lb} v={`${fmtN(b.n[hv])} de ${fmtN(b.tot)} (${fmtP(b.pct[hv], 1)})`} c={C.orange} />
    </>}</Readout>
  </div>;
}
