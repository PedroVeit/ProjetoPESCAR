import { useState } from "react";
import { motion } from "framer-motion";
import { C } from "../../constants/theme";
import { fmtSM, fmtBRL, fmtN } from "../../data/selectors";
import { HoverBand, Readout, RV } from "./chartInteract";

// Boxplots horizontais, um por unidade, todos na mesma régua (salários
// mínimos per capita). Ordenados pela mediana: no topo, onde os inscritos são
// mais pobres. Trocar grupo/ano move as caixas em vez de redesenhá-las.
//
// rows: [{ k, label, q: {p10,p25,p50,p75,p90,n} }]
export default function BoxList({ rows, sm, foco, onPick, max = 1.1 }) {
  const [hv, setHv] = useState(null);
  const sorted = [...rows].sort((a, b) => a.q.p50 - b.q.p50);
  const W = 600, L = 176, R = 22, T = 30, rowH = 16;
  const H = T + sorted.length * rowH + 6;
  const X = v => L + (Math.min(v, max) / max) * (W - L - R);
  const refs = [[0.25, "1/4"], [0.5, "1/2 SM"], [1, "1 SM"]];
  const sp = { type: "spring", stiffness: 170, damping: 26 };
  const hit = sorted.find(r => r.k === hv);

  return <div>
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: "block" }} onMouseLeave={() => setHv(null)}>
      {[0, .2, .4, .6, .8, 1].map(v => <text key={v} x={X(v)} y={T - 16} fontSize="9" fill={C.muted} textAnchor="middle">{v.toLocaleString("pt-BR")}</text>)}
      {refs.map(([v, l]) => <g key={v}>
        <line x1={X(v)} x2={X(v)} y1={T - 8} y2={H} stroke={C.text} strokeDasharray="3,3" opacity=".4" />
        <text x={X(v) + 3} y={T - 4} fontSize="8.5" fill={C.text} fontWeight="700" opacity=".75">{l}</text>
      </g>)}
      {sorted.map((r, i) => {
        // Linha desenhada em coordenada local; a posição vertical é animada no
        // <g>, então reordenar (trocar grupo/ano) desliza as unidades.
        const y = rowH / 2;
        const isF = r.k === foco, isH = r.k === hv;
        const dim = (foco != null || hv != null) && !isF && !isH;
        const c = isF ? C.yellow : C.purple;
        return <motion.g key={r.k} initial={false} animate={{ y: T + i * rowH }} transition={sp} style={{ opacity: dim ? .35 : 1, transition: "opacity .25s", cursor: "pointer" }}
          onMouseEnter={() => setHv(r.k)} onClick={() => onPick?.(r.k)}>
          {isH && <HoverBand x={0} y={y - rowH / 2} w={W} h={rowH} />}
          <rect x={0} y={y - rowH / 2} width={W} height={rowH} fill="transparent" />
          <text x={L - 8} y={y + 3.5} fontSize="10" textAnchor="end" fill={isF ? C.yellow : isH ? C.text : C.muted} fontWeight={isF || isH ? 700 : 500}>
            {r.label.length > 27 ? r.label.slice(0, 26) + "…" : r.label}</text>
          <motion.line initial={false} animate={{ x1: X(r.q.p10), x2: X(r.q.p90) }} transition={sp} y1={y} y2={y} stroke={c} strokeWidth="1.2" opacity=".7" />
          <motion.rect initial={false} animate={{ x: X(r.q.p25), width: Math.max(1, X(r.q.p75) - X(r.q.p25)) }} transition={sp}
            y={y - 5} height={10} rx={2.5} fill={c} fillOpacity=".35" stroke={c} strokeWidth="1" />
          <motion.circle initial={false} animate={{ cx: X(r.q.p50) }} transition={sp} cy={y} r={3.6} fill={C.text} stroke={C.card} strokeWidth="1.2" />
          {r.q.p90 > max && <text x={W - R + 4} y={y + 3} fontSize="9" fill={C.muted}>›</text>}
        </motion.g>;
      })}
    </svg>
    <Readout>{hit && <>
      <b style={{ color: C.text }}>{hit.label}</b>
      <RV l="mediana" v={`${fmtSM(hit.q.p50)} ≈ ${fmtBRL(hit.q.p50 * sm)}`} />
      <RV l="metade central" v={`${fmtBRL(hit.q.p25 * sm)} a ${fmtBRL(hit.q.p75 * sm)}`} c={C.purple} />
      <RV l="n" v={fmtN(hit.q.n)} />
    </>}</Readout>
  </div>;
}
