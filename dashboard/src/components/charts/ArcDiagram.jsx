import { useState } from "react";
import { C } from "../../constants/theme";
import { fmtN } from "../../data/selectors";
import { DrawPath, Readout, RV, useInView } from "./chartInteract";

// Diagrama de arcos: as unidades ficam numa linha (agrupadas por cidade) e
// cada arco liga duas unidades que dividiram candidatos. Arco grosso = muitos
// jovens inscritos nas duas. Passar o mouse numa unidade isola a rede dela.
//
// nodes: [{ k, label, cidade, peso }] · links: [{ a, b, n }]
export default function ArcDiagram({ nodes, links, foco, onPick }) {
  const [hvN, setHvN] = useState(null);
  const [hvL, setHvL] = useState(null);
  const [ref, seen] = useInView();
  const ord = [...nodes].sort((x, y) => (x.cidade || "~").localeCompare(y.cidade || "~", "pt-BR") || x.label.localeCompare(y.label, "pt-BR"));
  const W = 760, base = 240, H = 372, P = 26;
  const step = (W - 2 * P) / Math.max(ord.length - 1, 1);
  const xOf = new Map(ord.map((n, i) => [n.k, P + i * step]));
  const maxN = Math.max(1, ...links.map(l => l.n));
  const maxP = Math.max(1, ...ord.map(n => n.peso || 0));
  const sel = hvN ?? foco;

  const ativo = l => (hvL ? l === hvL : sel == null || l.a === sel || l.b === sel);
  const parceiros = sel == null ? [] : links.filter(l => l.a === sel || l.b === sel).map(l => ({ k: l.a === sel ? l.b : l.a, n: l.n })).sort((a, b) => b.n - a.n);
  const nome = k => nodes.find(n => n.k === k)?.label;

  // Faixas de cidade sob os nós, para a geografia ficar visível.
  const faixas = [];
  ord.forEach((n, i) => {
    const c = n.cidade || "—";
    if (!faixas.length || faixas[faixas.length - 1].c !== c) faixas.push({ c, i0: i, i1: i }); else faixas[faixas.length - 1].i1 = i;
  });

  const linksOrd = [...links].sort((a, b) => ativo(a) - ativo(b));

  return <div ref={ref}>
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: "block" }} onMouseLeave={() => { setHvN(null); setHvL(null); }}>
      {faixas.map((f, i) => {
        const x0 = P + f.i0 * step - step / 2 + 2, x1 = P + f.i1 * step + step / 2 - 2;
        return <g key={f.c + i}>
          <rect x={x0} y={base + 6} width={x1 - x0} height={3} rx={1.5} fill={i % 2 ? C.purple : C.blue} opacity=".45" />
          {x1 - x0 >= f.c.length * 4.6 ? <text x={(x0 + x1) / 2} y={base + 20} fontSize="8.5" fill={C.muted} textAnchor="middle" fontWeight="700">{f.c}</text> : null}
        </g>;
      })}
      {seen && linksOrd.map((l, i) => {
        const xa = xOf.get(l.a), xb = xOf.get(l.b);
        if (xa == null || xb == null) return null;
        const [x0, x1] = xa < xb ? [xa, xb] : [xb, xa];
        const rx = (x1 - x0) / 2, ry = Math.min(rx * .9, base - 14);
        const d = `M${x0},${base} A${rx},${ry} 0 0,1 ${x1},${base}`;
        const on = ativo(l);
        return <g key={`${l.a}-${l.b}`}>
          <DrawPath d={d} fill="none" stroke={on && sel != null ? C.yellow : C.purple} strokeWidth={1 + Math.sqrt(l.n / maxN) * 9} strokeLinecap="round"
            style={{ opacity: on ? (sel != null || hvL ? .85 : .26) : .05, transition: "opacity .25s ease, stroke .25s", pointerEvents: "none" }}
            delay={`${Math.min(i * 12, 700)}ms`} dur="1s" />
          <path d={d} fill="none" stroke="transparent" strokeWidth={10} style={{ cursor: "pointer" }} onMouseEnter={() => { setHvL(l); setHvN(null); }} onMouseLeave={() => setHvL(null)} />
        </g>;
      })}
      {ord.map((n, i) => {
        const x = xOf.get(n.k);
        const isSel = n.k === sel;
        const r = 3 + Math.sqrt((n.peso || 0) / maxP) * 7;
        const ligado = sel == null || isSel || parceiros.some(p => p.k === n.k);
        return <g key={n.k} style={{ cursor: "pointer", opacity: ligado ? 1 : .35, transition: "opacity .25s" }}
          onMouseEnter={() => { setHvN(n.k); setHvL(null); }} onClick={() => onPick?.(n.k)}>
          <circle cx={x} cy={base} r={r + 6} fill="transparent" />
          <circle className="ch-pop" style={{ animationDelay: `${i * 20}ms` }} cx={x} cy={base} r={r} fill={isSel ? C.yellow : C.card} stroke={isSel ? C.yellow : C.purple} strokeWidth="1.6" />
          <text transform={`translate(${x + 3},${base + 30}) rotate(55)`} fontSize="9.5" fill={isSel ? C.yellow : C.muted} fontWeight={isSel ? 800 : 500}>
            {n.label.length > 22 ? n.label.slice(0, 21) + "…" : n.label}</text>
        </g>;
      })}
    </svg>
    <Readout vazio="passe o mouse numa unidade ou num arco">
      {hvL ? <><b style={{ color: C.text }}>{nome(hvL.a)} ↔ {nome(hvL.b)}</b><RV l="jovens inscritos nas duas" v={fmtN(hvL.n)} c={C.purple} /></>
        : sel != null ? <><b style={{ color: C.yellow }}>{nome(sel)}</b>
          {parceiros.length ? <span>divide candidatos com: {parceiros.slice(0, 5).map(p => <span key={p.k} style={{ marginRight: 10 }}>{nome(p.k)} <b style={{ color: C.text, fontFamily: "ui-monospace, monospace" }}>{fmtN(p.n)}</b></span>)}</span>
            : <span>nenhum par com 5+ jovens em comum</span>}</> : null}
    </Readout>
  </div>;
}
