import { useState } from "react";
import { motion } from "framer-motion";
import { C } from "../../constants/theme";
import { fmtP, fmtN, wilson } from "../../data/selectors";
import { HoverBand, Readout, RV } from "./chartInteract";

// Proporção por canal com intervalo de confiança de 95% (Wilson), em dois
// painéis lado a lado com as linhas na mesma ordem. A linha tracejada é a
// média geral: um intervalo inteiro de um lado dela é diferença que não se
// explica por acaso. Canais pequenos ficam com barras largas — de propósito.
//
// rows: [{ k, label, col, m1: [k, n], m2: [k, n] }]
export default function DotCI({ rows, avg, titulos, destaque, minN = 30 }) {
  const [hv, setHv] = useState(null);
  const vis = rows.filter(r => r.m1[1] >= minN);
  const sorted = [...vis].sort((a, b) => b.m2[0] / b.m2[1] - a.m2[0] / a.m2[1]);
  const W = 680, L = 150, G = 34, T = 36, rowH = 26, R = 14;
  const pw = (W - L - G - R) / 2;
  const H = T + sorted.length * rowH + 22;
  const dom = m => {
    const ci = sorted.map(r => wilson(...r[m]));
    const lo = Math.max(0, Math.floor((Math.min(...ci.map(c => c[0]), avg[m === "m1" ? 0 : 1]) - .03) * 20) / 20);
    const hi = Math.min(1, Math.ceil((Math.max(...ci.map(c => c[1]), avg[m === "m1" ? 0 : 1]) + .02) * 20) / 20);
    return [lo, hi];
  };
  const doms = { m1: dom("m1"), m2: dom("m2") };
  const X = (m, v) => { const [lo, hi] = doms[m]; const x0 = m === "m1" ? L : L + pw + G; return x0 + ((v - lo) / (hi - lo)) * pw; };
  const sp = { type: "spring", stiffness: 160, damping: 24 };
  const hit = sorted.find(r => r.k === hv);

  const painel = (m, i) => {
    const [lo, hi] = doms[m];
    const ticks = [];
    for (let v = Math.ceil(lo * 10) / 10; v <= hi + 1e-9; v += .1) ticks.push(+v.toFixed(1));
    return <g key={m}>
      <text x={X(m, lo)} y={14} fontSize="11" fontWeight="800" fill={C.text}>{titulos[i]}</text>
      {ticks.map(v => <g key={v}>
        <line x1={X(m, v)} x2={X(m, v)} y1={T - 6} y2={H - 18} stroke={C.border} strokeWidth=".6" />
        <text x={X(m, v)} y={H - 6} fontSize="9" fill={C.muted} textAnchor="middle">{fmtP(v)}</text>
      </g>)}
      <line x1={X(m, avg[i])} x2={X(m, avg[i])} y1={T - 12} y2={H - 18} stroke={C.text} strokeDasharray="4,3" opacity=".7" />
      <text x={X(m, avg[i]) + 3} y={T - 14} fontSize="9" fill={C.text} opacity=".8">média {fmtP(avg[i])}</text>
    </g>;
  };

  return <div>
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: "block" }} onMouseLeave={() => setHv(null)}>
      {painel("m1", 0)}{painel("m2", 1)}
      {sorted.map((r, i) => {
        const y = T + i * rowH + rowH / 2;
        const isH = r.k === hv, isD = r.k === destaque;
        const dim = hv != null && !isH;
        return <g key={r.k} onMouseEnter={() => setHv(r.k)} style={{ opacity: dim ? .35 : 1, transition: "opacity .2s" }}>
          {(isH || isD) && <HoverBand x={0} y={y - rowH / 2} w={W} h={rowH} />}
          <rect x={0} y={y - rowH / 2} width={W} height={rowH} fill="transparent" />
          <text x={L - 10} y={y + 1} fontSize="11" textAnchor="end" fill={isD || isH ? C.text : C.muted} fontWeight={isD || isH ? 800 : 550}>{r.label}</text>
          <text x={L - 10} y={y + 11} fontSize="8.5" textAnchor="end" fill={C.muted}>n={fmtN(r.m1[1])}{r.m1[1] < 150 ? " ⚠" : ""}</text>
          {["m1", "m2"].map(m => {
            const [k, n] = r[m];
            const [a, b] = wilson(k, n);
            return <g key={m}>
              <motion.line initial={false} animate={{ x1: X(m, a), x2: X(m, b) }} transition={sp} y1={y} y2={y} stroke={r.col} strokeWidth={isD ? 4 : 3} strokeLinecap="round" opacity=".45" />
              <motion.circle initial={false} animate={{ cx: X(m, k / n) }} transition={sp} cy={y} r={isD ? 6 : 5} fill={r.col} stroke={C.card} strokeWidth="1.5" />
            </g>;
          })}
        </g>;
      })}
    </svg>
    <Readout>{hit && <>
      <b style={{ color: hit.col }}>{hit.label}</b>
      <RV l={titulos[0]} v={`${fmtP(hit.m1[0] / hit.m1[1], 1)} (IC ${wilson(...hit.m1).map(v => fmtP(v)).join("–")})`} />
      <RV l={titulos[1]} v={`${fmtP(hit.m2[0] / hit.m2[1], 1)} (IC ${wilson(...hit.m2).map(v => fmtP(v)).join("–")})`} />
      <RV l="inscritos" v={fmtN(hit.m1[1])} />
    </>}</Readout>
  </div>;
}
