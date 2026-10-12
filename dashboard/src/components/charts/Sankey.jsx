import { useId, useMemo, useState } from "react";
import { C, GRUPO_COL, EXP_LBL, EXP_COL } from "../../constants/theme";
import { fmtN, fmtP } from "../../data/selectors";
import { Readout, RV, useInView } from "./chartInteract";

// Sankey em três colunas: grupo do canal → experiência → faixa de renda.
// Cada combinação (grupo, experiência, faixa) é um "fio" com dois trechos, e
// os fios mantêm a cor do canal de origem até o fim — por isso dá para passar
// o mouse num canal e seguir só os jovens que vieram por ele até a renda.
//
// flows: [{ g, exp, f, n }]
export default function Sankey({ flows, grupos, faixas }) {
  const uid = useId().replace(/:/g, "");
  const [hv, setHv] = useState(null); // { t: "g"|"exp"|"f"|"fio", v }
  const [ref, seen] = useInView();
  const exps = ["sem", "com"];
  const W = 720, H = 400, T = 16, B = 10, NW = 12, GAP = 12;
  const xs = [190, 372, 556];

  const lay = useMemo(() => {
    const fios = flows.filter(f => f.n > 0 && grupos.includes(f.g)).map(f => ({ ...f }));
    const total = fios.reduce((s, f) => s + f.n, 0) || 1;
    const cols = [
      grupos.map(g => ({ k: g, n: fios.filter(f => f.g === g).reduce((s, f) => s + f.n, 0) })).filter(x => x.n > 0),
      exps.map(e => ({ k: e, n: fios.filter(f => f.exp === e).reduce((s, f) => s + f.n, 0) })).filter(x => x.n > 0),
      faixas.map(fx => ({ k: fx, n: fios.filter(f => f.f === fx).reduce((s, f) => s + f.n, 0) })).filter(x => x.n > 0),
    ];
    const scale = Math.min(...cols.map(c => (H - T - B - GAP * (c.length - 1)) / total));
    cols.forEach(col => {
      const h = total * scale + GAP * (col.length - 1);
      let y = T + (H - T - B - h) / 2;
      col.forEach(nd => { nd.y = y; nd.h = nd.n * scale; nd.cur = y; nd.cin = y; y += nd.h + GAP; });
    });
    const node = (c, k) => cols[c].find(n => n.k === k);
    const gi = g => grupos.indexOf(g), ei = e => exps.indexOf(e), fi = f => faixas.indexOf(f);
    // trecho 1: saída do grupo ordenada por (exp, faixa); chegada na exp por (grupo, faixa)
    [...fios].sort((a, b) => ei(a.exp) - ei(b.exp) || fi(a.f) - fi(b.f)).forEach(f => { const n = node(0, f.g); f.y0 = n.cur; n.cur += f.n * scale; });
    [...fios].sort((a, b) => gi(a.g) - gi(b.g) || fi(a.f) - fi(b.f)).forEach(f => { const n = node(1, f.exp); f.y1 = n.cin; n.cin += f.n * scale; });
    // trecho 2: saída da exp ordenada por (faixa, grupo); chegada na faixa por (exp, grupo)
    [...fios].sort((a, b) => fi(a.f) - fi(b.f) || gi(a.g) - gi(b.g)).forEach(f => { const n = node(1, f.exp); f.y2 = n.cur; n.cur += f.n * scale; });
    [...fios].sort((a, b) => ei(a.exp) - ei(b.exp) || gi(a.g) - gi(b.g)).forEach(f => { const n = node(2, f.f); f.y3 = n.cin; n.cin += f.n * scale; });
    fios.forEach(f => { f.h = f.n * scale; });
    return { fios, cols, total };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flows, grupos.join(), faixas.join()]);

  const banda = (x0, y0, x1, y1, h) => {
    const xm = (x0 + x1) / 2;
    return `M${x0},${y0} C${xm},${y0} ${xm},${y1} ${x1},${y1} L${x1},${y1 + h} C${xm},${y1 + h} ${xm},${y0 + h} ${x0},${y0 + h} Z`;
  };
  const casa = f => !hv || (hv.t === "fio" ? hv.v === f : f[hv.t] === hv.v);
  const corNo = (c, k) => (c === 0 ? C[GRUPO_COL[k]] : c === 1 ? C[EXP_COL[k]] : C.purple);
  const rotulo = (c, k) => (c === 1 ? EXP_LBL[k] : k);

  const leitura = () => {
    if (!hv) return null;
    if (hv.t === "fio") {
      const f = hv.v;
      return <><b style={{ color: C[GRUPO_COL[f.g]] }}>{f.g}</b> → {EXP_LBL[f.exp]} → {f.f}<RV l="jovens" v={fmtN(f.n)} /></>;
    }
    const sel = lay.fios.filter(f => f[hv.t] === hv.v);
    const n = sel.reduce((s, f) => s + f.n, 0);
    const parte = (campo, ks, lbl) => ks.map(k => { const x = sel.filter(f => f[campo] === k).reduce((s, f) => s + f.n, 0); return x ? <RV key={k} l={lbl(k)} v={fmtP(x / n)} /> : null; });
    return <><b style={{ color: C.text }}>{hv.t === "exp" ? EXP_LBL[hv.v] : hv.v}</b><RV l="jovens" v={`${fmtN(n)} (${fmtP(n / lay.total)})`} />
      {hv.t === "g" && parte("f", faixas, k => k)}
      {hv.t === "f" && parte("g", grupos, k => k)}
      {hv.t === "exp" && parte("f", faixas, k => k)}</>;
  };

  return <div ref={ref}>
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: "block" }} onMouseLeave={() => setHv(null)}>
      <defs><clipPath id={`sk-${uid}`}><rect className={seen ? "ch-bar-x" : undefined} x="0" y="0" width={W} height={H} style={{ animationDuration: "1.3s" }} /></clipPath></defs>
      <g clipPath={`url(#sk-${uid})`} style={{ visibility: seen ? "visible" : "hidden" }}>
        {lay.fios.map((f, i) => {
          const on = casa(f);
          const col = C[GRUPO_COL[f.g]];
          return <g key={i} style={{ opacity: on ? (hv ? .82 : .42) : .05, transition: "opacity .25s ease", cursor: "pointer" }}
            onMouseEnter={() => setHv({ t: "fio", v: f })}>
            <path d={banda(xs[0] + NW, f.y0, xs[1], f.y1, f.h)} fill={col} />
            <path d={banda(xs[1] + NW, f.y2, xs[2], f.y3, f.h)} fill={col} />
          </g>;
        })}
      </g>
      {lay.cols.map((col, c) => col.map(nd => {
        const t = c === 0 ? "g" : c === 1 ? "exp" : "f";
        const ativo = hv && hv.t === t && hv.v === nd.k;
        const cor = corNo(c, nd.k);
        const lx = c === 0 ? xs[0] - 8 : c === 2 ? xs[2] + NW + 8 : xs[1] + NW + 8;
        const anchor = c === 0 ? "end" : "start";
        return <g key={`${c}-${nd.k}`} onMouseEnter={() => setHv({ t, v: nd.k })} style={{ cursor: "pointer" }}>
          <rect x={xs[c]} y={nd.y} width={NW} height={Math.max(1.5, nd.h)} rx={2} fill={cor} stroke={ativo ? C.text : "none"} strokeWidth="1.5" />
          <rect x={c === 0 ? xs[0] - 140 : xs[c]} y={nd.y} width={c === 1 ? NW : 150} height={Math.max(12, nd.h)} fill="transparent" />
          <text x={lx} y={nd.y + nd.h / 2 - (nd.h > 26 ? 3 : -3)} fontSize="11" fontWeight="750" fill={ativo ? C.text : cor} textAnchor={anchor}
            style={{ paintOrder: "stroke", stroke: C.card, strokeWidth: 3 }}>{rotulo(c, nd.k)}</text>
          {nd.h > 26 && <text x={lx} y={nd.y + nd.h / 2 + 10} fontSize="9.5" fill={C.muted} textAnchor={anchor}
            style={{ paintOrder: "stroke", stroke: C.card, strokeWidth: 3 }}>{fmtN(nd.n)} · {fmtP(nd.n / lay.total)}</text>}
        </g>;
      }))}
    </svg>
    <Readout vazio="passe o mouse num bloco ou numa faixa para seguir um caminho">{leitura()}</Readout>
  </div>;
}
