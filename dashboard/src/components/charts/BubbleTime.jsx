import { useEffect, useRef, useState } from "react";
import { C } from "../../constants/theme";
import { fmtP, fmtX, fmtN, pearson } from "../../data/selectors";
import { ChartTooltip, useInView } from "./chartInteract";
import { REDUCED } from "../../utils/animate";
import { Btn } from "../atoms";

// Dispersão animada no tempo (estilo Gapminder). Cada bolha é uma unidade:
// X = inscrições por vaga (log), Y = % sem experiência, área = inscrições.
// O parâmetro t ∈ [0,1] interpola entre o primeiro e o segundo ano; o botão ▶
// anima a passagem e deixa um rastro de onde cada unidade veio.
//
// rows: [{ u, nome, A: {cv, pct, insc} | null, B: {...} | null }]
export default function BubbleTime({ rows, anos, anoGlobal, foco, onPick }) {
  const [t, setT] = useState(anoGlobal === anos[0] ? 0 : 1);
  const [hv, setHv] = useState(null);
  const [playing, setPlaying] = useState(false);
  const raf = useRef(0);
  const tRef = useRef(t);
  tRef.current = t;
  const [ref, seen] = useInView();

  const animar = (alvo, dur = 1400) => {
    cancelAnimationFrame(raf.current);
    const de = tRef.current;
    if (REDUCED || de === alvo) { setT(alvo); setPlaying(false); return; }
    const t0 = performance.now();
    setPlaying(true);
    const tick = now => {
      const p = Math.min((now - t0) / dur, 1);
      const e = p < .5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2; // easeInOutCubic
      setT(de + (alvo - de) * e);
      if (p < 1) raf.current = requestAnimationFrame(tick); else setPlaying(false);
    };
    raf.current = requestAnimationFrame(tick);
  };
  useEffect(() => () => cancelAnimationFrame(raf.current), []);
  useEffect(() => { if (seen) animar(anoGlobal === anos[0] ? 0 : 1, 900); /* eslint-disable-next-line */ }, [anoGlobal]);

  const W = 620, H = 420, L = 52, R = 18, T = 18, B = 42;
  const todos = rows.flatMap(r => [r.A, r.B].filter(Boolean));
  const cvs = todos.map(p => p.cv), pcts = todos.map(p => p.pct);
  const lx0 = Math.log(Math.min(...cvs) * 0.8), lx1 = Math.log(Math.max(...cvs) * 1.2);
  const y0 = Math.max(0, Math.floor(Math.min(...pcts) * 10) / 10 - 0.03), y1 = 1;
  const X = cv => L + ((Math.log(cv) - lx0) / (lx1 - lx0)) * (W - L - R);
  const Y = p => T + ((y1 - p) / (y1 - y0)) * (H - T - B);
  const maxI = Math.max(...todos.map(p => p.insc));
  const Rr = i => 4 + Math.sqrt(i / maxI) * 20;

  const pos = rows.map(r => {
    const a = r.A, b = r.B;
    if (a && b) {
      const lx = Math.log(a.cv) + (Math.log(b.cv) - Math.log(a.cv)) * t;
      return { r, x: L + ((lx - lx0) / (lx1 - lx0)) * (W - L - R), y: Y(a.pct + (b.pct - a.pct) * t), rad: Rr(a.insc + (b.insc - a.insc) * t), op: 1 };
    }
    const p = a || b;
    return { r, x: X(p.cv), y: Y(p.pct), rad: Rr(p.insc), op: a ? 1 - t : t };
  });

  const anoVis = t < .5 ? 0 : 1;
  const regs = [0, 1].map(k => {
    const pts = rows.map(r => (k ? r.B : r.A)).filter(Boolean);
    return pearson(pts.map(p => Math.log(p.cv)), pts.map(p => p.pct));
  });
  const reg = regs[anoVis];
  const regOp = Math.abs(t - .5) * 2;

  const onMove = e => {
    const b = e.currentTarget.getBoundingClientRect();
    const fx = ((e.clientX - b.left) / b.width) * W, fy = ((e.clientY - b.top) / b.height) * H;
    let best = null, bd = 26;
    for (const p of pos) { if (p.op < .2) continue; const d = Math.hypot(p.x - fx, p.y - fy) - p.rad * .6; if (d < bd) { bd = d; best = p.r.u; } }
    setHv(best);
  };

  const hl = hv ?? foco;
  const hit = rows.find(r => r.u === hv);
  const hp = pos.find(p => p.r.u === hv);
  const ticksX = [1, 2, 3, 5, 10, 20, 30, 50, 100].filter(v => Math.log(v) >= lx0 && Math.log(v) <= lx1);
  const ticksY = [];
  for (let v = Math.ceil(y0 * 10) / 10; v <= 1 + 1e-9; v += .1) ticksY.push(+v.toFixed(1));
  const top3 = [...pos].filter(p => p.op > .5).sort((a, b) => b.x - a.x).slice(0, 3).map(p => p.r.u);
  const ordem = [...pos].sort((a, b) => b.rad - a.rad);

  return <div ref={ref}>
    <div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 8, flexWrap: "wrap" }}>
      <Btn active={!playing && t === 0} color={C.purple} onClick={() => animar(0)}>{anos[0]}</Btn>
      <Btn active={!playing && t === 1} color={C.blue} onClick={() => animar(1)}>{anos[1]}</Btn>
      <Btn active={playing} color={C.cyan} onClick={() => { setT(0); tRef.current = 0; requestAnimationFrame(() => animar(1, 2600)); }}>▶ Animar {anos[0]} → {anos[1]}</Btn>
      <div style={{ flex: 1, minWidth: 80, height: 3, background: C.border, borderRadius: 2, position: "relative", marginLeft: 6 }}>
        <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: `${t * 100}%`, background: `linear-gradient(90deg, ${C.purple}, ${C.blue})`, borderRadius: 2 }} />
      </div>
    </div>
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: "block", cursor: "crosshair" }} onMouseMove={onMove} onMouseLeave={() => setHv(null)}
      onClick={() => hv != null && onPick?.(hv)}>
      <text x={(L + W - R) / 2} y={H / 2 + 30} fontSize="110" fontWeight="800" fill={C.text} opacity=".05" textAnchor="middle">{anos[anoVis]}</text>
      {ticksY.map(v => <g key={v}>
        <line x1={L} x2={W - R} y1={Y(v)} y2={Y(v)} stroke={C.border} strokeWidth={v === .5 ? 1.2 : .6} strokeDasharray={v === .5 ? "4,3" : undefined} />
        <text x={L - 8} y={Y(v) + 3} fontSize="9.5" fill={C.muted} textAnchor="end">{fmtP(v)}</text>
      </g>)}
      {ticksX.map(v => <g key={v}>
        <line x1={X(v)} x2={X(v)} y1={T} y2={H - B} stroke={C.border} strokeWidth=".6" />
        <text x={X(v)} y={H - B + 14} fontSize="9.5" fill={C.muted} textAnchor="middle">{v}</text>
      </g>)}
      <text x={(L + W - R) / 2} y={H - 6} fontSize="10.5" fill={C.muted} textAnchor="middle">inscrições por vaga (escala log) → mais concorrida</text>
      <text transform={`translate(13,${(T + H - B) / 2}) rotate(-90)`} fontSize="10.5" fill={C.muted} textAnchor="middle">% sem experiência ↑</text>

      {reg && seen && <g style={{ opacity: regOp * .9, pointerEvents: "none" }}>
        <line x1={L} x2={W - R} y1={Y(reg.a + reg.b * lx0)} y2={Y(reg.a + reg.b * lx1)} stroke={C.text} strokeWidth="1.2" strokeDasharray="6,4" />
        <text x={W - R - 4} y={T + 14} fontSize="11.5" fontWeight="800" fill={C.text} textAnchor="end">r = {fmtX(reg.r, 2)} em {anos[anoVis]}</text>
      </g>}

      {seen && t > 0 && t < 1 && pos.map(p => p.r.A && p.r.B && <line key={`t${p.r.u}`} x1={X(p.r.A.cv)} y1={Y(p.r.A.pct)} x2={p.x} y2={p.y}
        stroke={C.cyan} strokeWidth="1" opacity=".35" style={{ pointerEvents: "none" }} />)}
      {seen && t === 1 && hl != null && (() => { const r = rows.find(x => x.u === hl); return r?.A && r?.B && <line x1={X(r.A.cv)} y1={Y(r.A.pct)} x2={X(r.B.cv)} y2={Y(r.B.pct)} stroke={C.yellow} strokeWidth="1.4" strokeDasharray="3,3" />; })()}

      {seen && ordem.map((p, i) => {
        const isHl = p.r.u === hl;
        const dim = hl != null && !isHl;
        const c = isHl ? C.yellow : C.cyan;
        return <g key={p.r.u} className="ch-pop" style={{ animationDelay: `${Math.min(i * 22, 500)}ms`, pointerEvents: "none" }}>
          <circle cx={p.x} cy={p.y} r={p.rad} fill={c} fillOpacity={(dim ? .1 : .32) * p.op} stroke={c} strokeOpacity={(dim ? .25 : .95) * p.op} strokeWidth={isHl ? 2 : 1.2} />
          {(isHl || (hl == null && top3.includes(p.r.u))) && p.op > .5 &&
            <text x={p.x} y={p.y - p.rad - 4} fontSize="10" fontWeight="700" fill={isHl ? C.yellow : C.text} textAnchor="middle">{p.r.nome}</text>}
        </g>;
      })}

      {hit && hp && <ChartTooltip W={W} x={hp.x} y={Math.min(hp.y - 10, H - 100)} width={200} title={hit.nome}
        rows={[
          hit.A && { label: `${anos[0]}`, val: `${fmtX(hit.A.cv)} insc/vaga · ${fmtP(hit.A.pct)}`, col: C.purple },
          hit.B && { label: `${anos[1]}`, val: `${fmtX(hit.B.cv)} insc/vaga · ${fmtP(hit.B.pct)}`, col: C.blue },
          { label: "inscrições", val: [hit.A, hit.B].filter(Boolean).map(p => fmtN(p.insc)).join(" → "), col: C.muted },
        ].filter(Boolean)} />}
    </svg>
  </div>;
}
