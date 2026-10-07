import { motion } from "framer-motion";
import { C } from "../../constants/theme";
import { fmtN, fmtP } from "../../data/selectors";

// Small multiples: o mesmo mini gráfico de barras por unidade, todos na mesma
// escala, com o traço da média da rede em cada barra. O olho compara formas
// sem ler números; clicar num mini gráfico põe a unidade em foco.
//
// items: [{ k, label, pct[], n, sup }] · ref: pct[] da rede · cats: rótulos curtos
export default function SmallMultiples({ items, rede, cats, foco, onPick, col }) {
  const c = col || C.cyan;
  const max = Math.max(0.05, ...items.flatMap(i => i.pct), ...rede) * 1.05;
  return <div className="mini-grid">
    {items.map((it, k) => {
      const isF = it.k === foco;
      return <motion.button key={it.k} layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(k * .025, .5) }}
        whileHover={{ y: -2 }} onClick={() => onPick?.(it.k)} style={{
          textAlign: "left", padding: "9px 10px 8px", borderRadius: 10, cursor: "pointer", color: C.text,
          border: `1px solid ${isF ? C.yellow : C.border}`, background: isF ? `${C.yellow}10` : C.card, minWidth: 0,
          opacity: foco != null && !isF ? .55 : 1, transition: "opacity .25s",
        }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 6, marginBottom: 6 }}>
          <span style={{ fontSize: 11.5, fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", color: isF ? C.yellow : C.text }}>{it.label}</span>
          <span style={{ fontSize: 10, color: C.muted, whiteSpace: "nowrap" }}>n={fmtN(it.n)}{it.sup ? "*" : ""}</span>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: `repeat(${cats.length}, 1fr)`, gap: 3, alignItems: "end", height: 54 }}>
          {it.pct.map((p, i) => <div key={i} title={`${cats[i]}: ${fmtP(p)} (rede: ${fmtP(rede[i])})`} style={{ position: "relative", height: "100%", display: "flex", alignItems: "flex-end" }}>
            <motion.div initial={{ height: 0 }} animate={{ height: `${(p / max) * 100}%` }} transition={{ duration: .55, ease: [0.22, 1, 0.36, 1], delay: Math.min(k * .025, .5) + i * .03 }}
              style={{ width: "100%", background: c, opacity: .85, borderRadius: "3px 3px 0 0" }} />
            <span style={{ position: "absolute", left: -1, right: -1, bottom: `${(rede[i] / max) * 100}%`, borderTop: `1.5px dashed ${C.text}`, opacity: .7 }} />
          </div>)}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: `repeat(${cats.length}, 1fr)`, gap: 3, marginTop: 3 }}>
          {cats.map(cn => <span key={cn} style={{ fontSize: 8.5, color: C.muted, textAlign: "center", whiteSpace: "nowrap", overflow: "hidden" }}>{cn}</span>)}
        </div>
      </motion.button>;
    })}
  </div>;
}
