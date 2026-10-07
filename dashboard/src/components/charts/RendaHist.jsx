import { useState } from "react";
import { C } from "../../constants/theme";
import { fmtP, fmtBRL, fmtX } from "../../data/selectors";
import { useTweenValues } from "../../utils/animate";
import { HoverBand, LegendToggle, Readout, RV, useInView } from "./chartInteract";

// Histograma da renda per capita em salários mínimos (passo 0,1 SM; a última
// barra soma tudo acima de 2 SM). As duas séries são normalizadas para % do
// próprio grupo — sem isso, o grupo maior (sem experiência) pareceria
// "mais pobre" só por ser maior.
export default function RendaHist({ sem, com, sm, depKey }) {
  const [ativo, setAtivo] = useState({ sem: true, com: true });
  const [hv, setHv] = useState(null);
  const [ref, seen] = useInView();
  const norm = b => { const t = b.reduce((a, x) => a + x, 0) || 1; return b.map(x => x / t); };
  const ps = norm(sem), pc = norm(com);
  const anim = useTweenValues([...ps, ...pc], 500, depKey);
  const S = anim.slice(0, 20), K = anim.slice(20);

  const W = 600, H = 270, L = 40, R = 12, T = 26, B = 34;
  const nb = 20, bw = (W - L - R) / nb;
  const vis = [ativo.sem && ps, ativo.com && pc].filter(Boolean);
  const maxV = Math.max(0.05, ...(vis.length ? vis : [ps, pc]).flat()) * 1.12;
  const Y = v => T + (1 - v / maxV) * (H - T - B);
  const X = sm0 => L + (sm0 / 2) * (W - L - R);
  const refs = [[0.25, "1/4 SM · BPC"], [0.5, "1/2 SM · CadÚnico"], [1, "1 SM"]];
  const ticksY = [0, .05, .1, .15, .2, .25, .3].filter(v => v <= maxV);
  const passo = (W - L - R) / nb;

  const onMove = e => {
    const r = e.currentTarget.getBoundingClientRect();
    const fx = ((e.clientX - r.left) / r.width) * W;
    const i = Math.floor((fx - L) / passo);
    setHv(i >= 0 && i < nb ? i : null);
  };

  const stepPath = arr => arr.map((v, i) => `${i ? "L" : "M"}${L + i * bw},${Y(v)} L${L + (i + 1) * bw},${Y(v)}`).join(" ");

  return <div ref={ref}>
    <div style={{ marginBottom: 8 }}>
      <LegendToggle active={ativo} onToggle={k => setAtivo(a => ({ ...a, [k]: !a[k] }))} items={[
        { k: "sem", label: "Sem experiência", col: C.cyan },
        { k: "com", label: "Com experiência", col: C.orange },
      ]} />
    </div>
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: "block", cursor: "crosshair" }} onMouseMove={onMove} onMouseLeave={() => setHv(null)}>
      {ticksY.map(v => <g key={v}>
        <line x1={L} x2={W - R} y1={Y(v)} y2={Y(v)} stroke={C.border} strokeWidth=".6" />
        <text x={L - 6} y={Y(v) + 3} fontSize="9" fill={C.muted} textAnchor="end">{fmtP(v)}</text>
      </g>)}
      {hv != null && <HoverBand x={L + hv * bw} y={T} w={bw} h={H - T - B} />}
      {seen && <g style={{ opacity: ativo.sem ? 1 : 0, transition: "opacity .3s ease" }}>
        {S.map((v, i) => <rect key={i} className="ch-bar" style={{ animationDelay: `${i * 22}ms` }} x={L + i * bw + 1} width={bw - 2} y={Y(v)} height={Math.max(0, H - B - Y(v))}
          fill={C.cyan} opacity={hv == null || hv === i ? .75 : .45} rx="2" />)}
      </g>}
      {seen && <path className="ch-area" d={stepPath(K)} fill="none" stroke={C.orange} strokeWidth="2.4" strokeLinejoin="round"
        style={{ opacity: ativo.com ? 1 : 0, transition: "opacity .3s ease" }} />}
      {refs.map(([v, l], i) => <g key={v}>
        <line x1={X(v)} x2={X(v)} y1={T - 8} y2={H - B} stroke={C.text} strokeWidth="1" strokeDasharray="3,3" opacity=".55" />
        <text x={X(v) + 4} y={T - 12 + (i === 1 ? 11 : 0)} fontSize="9.5" fill={C.text} fontWeight="700" opacity=".8">{l}</text>
      </g>)}
      {[0, .5, 1, 1.5, 2].map(v => <text key={v} x={X(v)} y={H - B + 14} fontSize="9.5" fill={C.muted} textAnchor="middle">{v === 2 ? "2+" : fmtX(v, 1)}</text>)}
      <text x={(L + W - R) / 2} y={H - 4} fontSize="10" fill={C.muted} textAnchor="middle">renda familiar per capita, em salários mínimos</text>
    </svg>
    <Readout>{hv != null && <>
      <b style={{ color: C.text }}>{hv === 19 ? "1,9 SM ou mais" : `${fmtX(hv / 10, 1)} a ${fmtX((hv + 1) / 10, 1)} SM`}</b>
      <span>≈ {fmtBRL(sm * hv / 10)}{hv === 19 ? "+" : `–${fmtBRL(sm * (hv + 1) / 10)}`} por pessoa</span>
      {ativo.sem && <RV l="sem experiência" v={fmtP(ps[hv], 1)} c={C.cyan} />}
      {ativo.com && <RV l="com experiência" v={fmtP(pc[hv], 1)} c={C.orange} />}
    </>}</Readout>
  </div>;
}
