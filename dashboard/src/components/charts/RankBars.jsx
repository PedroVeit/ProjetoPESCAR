import { useState } from "react";
import { motion, LayoutGroup } from "framer-motion";
import { C } from "../../constants/theme";
import { Readout } from "./chartInteract";

// Ranking em barras horizontais (HTML). Ao trocar o ano ou o filtro, as barras
// mudam de comprimento E de posição com animação de layout — o leitor vê quem
// subiu e quem caiu no ranking, em vez de uma lista nova aparecer do nada.
//
// rows: [{ k, label, v (0..max), ghost?, n?, col, sub?, foco? }]
// ghost: valor de comparação (ex.: o outro ano), desenhado como um traço.
// refValue: linha de referência vertical (ex.: 0.5 = "maioria").
export default function RankBars({ rows, max = 1, fmt, refValue: refV, refLabel, ghostLabel, readout, onPick, foco, labelW = 168 }) {
  const [hv, setHv] = useState(null);
  const sorted = [...rows].sort((a, b) => (b.v ?? -1) - (a.v ?? -1));
  const hit = sorted.find(r => r.k === hv);
  const pos = v => `${Math.max(0, Math.min(1, (v ?? 0) / max)) * 100}%`;

  return <div>
    {refLabel && <div style={{ display: "grid", gridTemplateColumns: `${labelW}px 1fr 64px`, gap: 8, marginBottom: 2 }}>
      <span />
      <div style={{ position: "relative", height: 14 }}>
        <span style={{ position: "absolute", left: pos(refV), transform: "translateX(-50%)", fontSize: 9.5, color: C.muted, fontWeight: 700, whiteSpace: "nowrap" }}>{refLabel} ▾</span>
      </div>
    </div>}
    <LayoutGroup>
      <div onMouseLeave={() => setHv(null)}>
        {sorted.map((r, i) => {
          const dim = (foco != null && r.k !== foco) || (hv != null && r.k !== hv);
          const isFoco = foco != null && r.k === foco;
          return <motion.div layout="position" key={r.k} transition={{ type: "spring", stiffness: 260, damping: 30 }}
            onMouseEnter={() => setHv(r.k)} onClick={onPick ? () => onPick(r.k) : undefined}
            style={{ display: "grid", gridTemplateColumns: `${labelW}px 1fr 64px`, gap: 8, alignItems: "center", padding: "3px 0", cursor: onPick ? "pointer" : "default",
              opacity: dim ? .38 : 1, transition: "opacity .25s ease", borderRadius: 4, background: isFoco ? `${C.yellow}14` : "transparent" }}>
            <span style={{ fontSize: 11.5, color: hv === r.k || isFoco ? C.text : C.muted, fontWeight: hv === r.k || isFoco ? 700 : 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", textAlign: "right" }}>
              <span style={{ opacity: .5, marginRight: 5, fontVariantNumeric: "tabular-nums" }}>{i + 1}</span>{r.label}
            </span>
            <div style={{ position: "relative", height: 14, background: `${C.border}88`, borderRadius: 3 }}>
              {refV != null && <span style={{ position: "absolute", left: pos(refV), top: -3, bottom: -3, borderLeft: `1px dashed ${C.muted}`, opacity: .7 }} />}
              <motion.div initial={{ width: 0 }} animate={{ width: pos(r.v) }} transition={{ duration: .7, ease: [0.22, 1, 0.36, 1], delay: Math.min(i * .018, .4) }}
                style={{ position: "absolute", left: 0, top: 0, bottom: 0, background: r.col, borderRadius: 3, opacity: r.v == null ? 0 : .9,
                  outline: isFoco ? `1.5px solid ${C.yellow}` : "none" }} />
              {r.ghost != null && <motion.span animate={{ left: pos(r.ghost) }} transition={{ duration: .6, ease: [0.22, 1, 0.36, 1] }}
                title={ghostLabel} style={{ position: "absolute", top: -2, bottom: -2, width: 2.5, marginLeft: -1, background: C.text, borderRadius: 1, opacity: .75 }} />}
            </div>
            <span style={{ fontSize: 11.5, fontWeight: 700, color: r.v == null ? C.muted : C.text, fontFamily: "ui-monospace, monospace", whiteSpace: "nowrap" }}>{r.v == null ? "n<5" : fmt(r.v)}</span>
          </motion.div>;
        })}
      </div>
    </LayoutGroup>
    {readout !== false && <Readout>{hit && readout ? readout(hit) : null}</Readout>}
  </div>;
}
