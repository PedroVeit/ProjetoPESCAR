import { useState } from "react";
import { motion } from "framer-motion";
import { C } from "../../constants/theme";
import { fmtX, fmtN, fmtP } from "../../data/selectors";
import { HoverBand, Readout, RV, useInView } from "./chartInteract";

// Haltere: dois valores da mesma unidade na mesma régua. Aqui, concorrência
// aparente (todas as inscrições ÷ vagas) e demanda exclusiva (só quem se
// inscreveu apenas nesta unidade ÷ vagas). Trocar o ano move os pontos.
//
// rows: [{ k, label, a, b, extra }]  a = aparente, b = exclusiva
export default function Dumbbell({ rows, foco, onPick }) {
  const [hv, setHv] = useState(null);
  const [ref, seen] = useInView();
  const sorted = [...rows].sort((x, y) => y.a - x.a);
  const W = 560, rowH = 17, T = 22, L = 170, R = 40;
  const H = T + sorted.length * rowH + 8;
  const max = Math.max(...sorted.map(r => r.a)) * 1.05;
  const X = v => L + (v / max) * (W - L - R);
  const ticks = [0, 5, 10, 15, 20, 30, 40, 50].filter(v => v <= max);
  const hit = sorted.find(r => r.k === hv);
  const ease = { duration: .6, ease: [0.22, 1, 0.36, 1] };

  return <div ref={ref}>
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: "block" }} onMouseLeave={() => setHv(null)}>
      {ticks.map(v => <g key={v}>
        <line x1={X(v)} x2={X(v)} y1={T - 6} y2={H - 6} stroke={C.border} strokeWidth=".6" />
        <text x={X(v)} y={T - 10} fontSize="9" fill={C.muted} textAnchor="middle">{v}</text>
      </g>)}
      {sorted.map((r, i) => {
        const y = T + i * rowH + rowH / 2;
        const isHl = r.k === hv || r.k === foco;
        const dim = (hv != null || foco != null) && !isHl;
        return <g key={r.k} onMouseEnter={() => setHv(r.k)} onClick={() => onPick?.(r.k)} style={{ cursor: "pointer", opacity: dim ? .35 : 1, transition: "opacity .25s" }}>
          {r.k === hv && <HoverBand x={0} y={y - rowH / 2} w={W} h={rowH} />}
          <rect x={0} y={y - rowH / 2} width={W} height={rowH} fill="transparent" />
          <text x={L - 8} y={y + 3.5} fontSize="10" fill={isHl ? (r.k === foco ? C.yellow : C.text) : C.muted} fontWeight={isHl ? 700 : 500} textAnchor="end">
            {r.label.length > 26 ? r.label.slice(0, 25) + "…" : r.label}</text>
          {seen && <>
            <motion.line initial={{ x1: X(0), x2: X(0) }} animate={{ x1: X(r.b), x2: X(r.a) }} transition={{ ...ease, delay: Math.min(i * .02, .4) }}
              y1={y} y2={y} stroke={C.muted} strokeWidth="2.2" strokeOpacity=".5" />
            <motion.circle initial={{ cx: X(0) }} animate={{ cx: X(r.b) }} transition={{ ...ease, delay: Math.min(i * .02, .4) }} cy={y} r="4.6" fill={C.cyan} />
            <motion.circle initial={{ cx: X(0) }} animate={{ cx: X(r.a) }} transition={{ ...ease, delay: Math.min(i * .02, .4) }} cy={y} r="4.6" fill={C.text} />
          </>}
        </g>;
      })}
    </svg>
    <Readout>{hit && <>
      <b style={{ color: C.text }}>{hit.label}</b>
      <RV l="aparente" v={`${fmtX(hit.a)} por vaga`} />
      <RV l="exclusiva" v={`${fmtX(hit.b)} por vaga`} c={C.cyan} />
      <RV l="inscritos também em outra unidade" v={`${fmtN(hit.extra.multi)} (${fmtP(hit.extra.pctMulti)})`} />
      <RV l="vagas" v={fmtN(hit.extra.vagas)} />
    </>}</Readout>
  </div>;
}
