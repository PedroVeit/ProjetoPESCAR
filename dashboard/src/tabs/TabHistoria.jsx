import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { C, FAIXA_OP, alpha } from "../constants/theme";
import { useData } from "../data/store";
import { dist, panorama, fmtN, fmtP } from "../data/selectors";
import { Hi, useNav } from "../components/story";
import ChartInfoTooltip from "../components/charts/ChartInfoTooltip";
import { REDUCED } from "../utils/animate";

// Abertura em "scrollytelling": o gráfico fica fixo e o texto rola ao lado.
// Cada passo reorganiza OS MESMOS pontos (1 ponto = 10 inscrições), então o
// leitor vê o público sendo recortado de vários ângulos sem perder a noção de
// que é sempre o mesmo grupo de jovens.

const POR_PONTO = 10;
const W = 660, H = 470, TOPO = 58;

// Distribui k marcas uniformemente entre n posições (para não amontoar).
const espalhado = (j, k, n) => Math.floor(((j + 1) * k) / n) > Math.floor((j * k) / n);

function montarPontos(D) {
  const iCras = D.meta.canais.indexOf("CRAS/CREAS");
  const pts = [];
  for (const ano of D.meta.anos) {
    const p = D.panorama.find(x => x.ano === ano);
    const N = Math.round(p.inscricoes / POR_PONTO);
    const nSem = Math.round(p.sem / POR_PONTO), nCom = Math.round(p.com / POR_PONTO);
    const nDup = Math.round((p.inscricoes - p.pessoas) / POR_PONTO);
    const t = D.p3.totais.find(x => x.ano === ano && x.c === iCras) || { n: 0, sem: 0 };
    const grupos = [["sem", nSem, p.sem, Math.round(t.sem / POR_PONTO)], ["com", nCom, p.com, Math.round((t.n - t.sem) / POR_PONTO)], ["nr", N - nSem - nCom, 0, 0]];
    let j = 0;
    for (const [exp, n, base, nCras] of grupos) {
      const f = exp === "nr" ? null : dist(D, "faixa_renda", ano, exp);
      const cotas = f ? f.n.map(x => Math.round((n * x) / base)) : [];
      let fi = 0, usados = 0;
      for (let k = 0; k < n; k++) {
        while (f && fi < cotas.length && usados >= cotas[fi]) { fi++; usados = 0; }
        const faixa = f && fi < cotas.length ? fi : null;
        if (faixa != null) usados++;
        pts.push({ id: pts.length, ano, exp, faixa, cras: espalhado(k, nCras, n), dup: espalhado(j, nDup, N) });
        j++;
      }
    }
  }
  return pts;
}

// Coloca grupos de pontos em blocos de colunas (preenchimento por coluna).
function layout(pts, chaveGrupo, ordem, { R = 24, gapCols = 2.2, superGap = 3.5, superDe } = {}) {
  const grupos = ordem.map(k => ({ k, ids: [] }));
  const idx = new Map(ordem.map((k, i) => [k, i]));
  pts.forEach(p => { const g = idx.get(chaveGrupo(p)); if (g != null) grupos[g].ids.push(p.id); });
  const usados = grupos.filter(g => g.ids.length);
  let cols = 0;
  usados.forEach((g, i) => {
    const sup = superDe && i > 0 && superDe(usados[i - 1].k) !== superDe(g.k);
    g.c0 = cols + (i ? (sup ? superGap : gapCols) : 0);
    g.nc = Math.ceil(g.ids.length / R);
    cols = g.c0 + g.nc;
  });
  const s = Math.min((W - 20) / cols, (H - TOPO - 20) / R);
  const x0 = (W - cols * s) / 2, y0 = TOPO + (H - TOPO - R * s) / 2;
  const pos = new Map();
  usados.forEach(g => g.ids.forEach((id, j) => pos.set(id, [x0 + (g.c0 + Math.floor(j / R)) * s + s / 2, y0 + (j % R) * s + s / 2])));
  const rot = usados.map(g => ({ k: g.k, x: x0 + (g.c0 + g.nc / 2) * s, n: g.ids.length, y: y0 - 10, x0: x0 + g.c0 * s, x1: x0 + (g.c0 + g.nc) * s }));
  return { pos, s, rot, y0, yEnd: y0 + R * s };
}

export default function TabHistoria() {
  const D = useData();
  const { go } = useNav();
  const [passo, setPasso] = useState(0);
  const refs = useRef([]);
  const pts = useMemo(() => montarPontos(D), [D]);
  const [a0, a1] = D.meta.anos.slice(-2);
  const tot = panorama(D, 0), pA = panorama(D, a0), pB = panorama(D, a1);
  const fx = dist(D, "faixa_renda", 0, "todos");
  const iCras = D.meta.canais.indexOf("CRAS/CREAS");
  const cras = D.p3.totais.filter(t => t.c === iCras).reduce((s, t) => ({ n: s.n + t.n, sem: s.sem + t.sem, meio: s.meio + t.meio, rv: s.rv + t.rv }), { n: 0, sem: 0, meio: 0, rv: 0 });
  const FAIXAS = D.meta.faixas_renda;

  const ORD_EXP = ["sem", "com", "nr"];
  const LBL_EXP = { sem: "sem experiência", com: "com experiência", nr: "sem questionário" };
  const COL_EXP = { sem: C.cyan, com: C.orange, nr: C.muted };

  const passos = useMemo(() => [
    {
      lay: layout(pts, () => "todos", ["todos"]),
      cor: () => [C.text, .55],
      rot: () => `${fmtN(tot.inscricoes)} inscrições`,
    },
    {
      lay: layout(pts, () => "todos", ["todos"]),
      cor: p => (p.dup ? [C.purple, .9] : [C.text, .3]),
      rot: () => `${fmtN(tot.pessoas)} jovens únicos`,
    },
    {
      lay: layout(pts, p => p.exp, ORD_EXP),
      cor: p => [COL_EXP[p.exp], p.exp === "nr" ? .35 : .9],
      rot: k => `${LBL_EXP[k]}${k !== "nr" ? ` · ${fmtP((k === "sem" ? tot.sem : tot.com) / tot.responderam)}` : ""}`,
    },
    {
      lay: layout(pts, p => `${p.ano}|${p.exp}`, D.meta.anos.flatMap(a => ORD_EXP.map(e => `${a}|${e}`)), { R: 22, gapCols: 1.2, superGap: 5, superDe: k => k.split("|")[0] }),
      cor: p => [COL_EXP[p.exp], p.exp === "nr" ? .3 : .9],
      rot: k => { const [a, e] = k.split("|"); const pp = panorama(D, +a); return e === "sem" ? `${a} · ${fmtP(pp.sem / pp.responderam)}` : ""; },
    },
    {
      lay: layout(pts, p => (p.faixa == null ? "nd" : `f${p.faixa}`), [...FAIXAS.map((_, i) => `f${i}`), "nd"], { R: 24, gapCols: 1.6 }),
      cor: p => (p.faixa == null ? [C.muted, .22] : [alpha(C.purple, FAIXA_OP[p.faixa]).slice(0, 7), Math.max(.35, FAIXA_OP[p.faixa])]),
      rot: k => (k === "nd" ? "sem renda informada" : `${FAIXAS[+k.slice(1)]} · ${fmtP(fx.pct[+k.slice(1)])}`),
    },
    {
      lay: layout(pts, () => "todos", ["todos"]),
      cor: p => (p.cras ? [C.green, 1] : [C.text, .12]),
      rot: () => `${fmtN(cras.n)} vieram pelo CRAS/CREAS`,
      grande: p => p.cras,
    },
    {
      lay: layout(pts, p => p.exp, ORD_EXP),
      cor: p => [COL_EXP[p.exp], p.exp === "nr" ? .3 : .85],
      rot: k => LBL_EXP[k],
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
  ], [pts, D]);

  useEffect(() => {
    const io = new IntersectionObserver(es => {
      es.forEach(e => { if (e.isIntersecting) setPasso(+e.target.dataset.passo); });
    }, { rootMargin: "-45% 0px -45% 0px" });
    refs.current.forEach(el => el && io.observe(el));
    return () => io.disconnect();
  }, []);

  const P = passos[passo];
  const textos = [
    <><Kicker>Projeto Pescar · seleção 2025–2026</Kicker>
      <h1 style={{ fontSize: "clamp(26px, 3.2vw, 40px)", lineHeight: 1.12, letterSpacing: -0.6, margin: "8px 0 14px" }}>Quem o Pescar está<br />alcançando?</h1>
      <p>Em {D.meta.anos.join(" e ")}, o Projeto Pescar recebeu <Hi c="text">{fmtN(tot.inscricoes)}</Hi> inscrições em <Hi c="text">{D.unidades.length}</Hi> unidades.
        Cada ponto ao lado representa {POR_PONTO} delas.</p>
      <p style={{ marginTop: 10, color: C.muted }}>A Fundação prioriza jovens <b style={{ color: C.cyan }}>sem experiência profissional</b>. Os dados mostram se isso acontece — e onde não acontece.</p>
      <motion.div animate={REDUCED ? {} : { y: [0, 6, 0] }} transition={{ repeat: Infinity, duration: 1.6 }} style={{ marginTop: 22, fontSize: 12, color: C.muted, fontWeight: 700, letterSpacing: 1 }}>ROLE PARA COMEÇAR ↓</motion.div></>,
    <><Kicker>Primeiro, quantos jovens são?</Kicker>
      <p>O mesmo jovem pode se inscrever em várias unidades. Cruzando data de nascimento, sexo e bairro, <Hi c="purple">{fmtN(tot.multi)}</Hi> jovens aparecem em mais de uma.</p>
      <p>Descontadas as repetições (pontos <b style={{ color: C.purple }}>roxos</b>), são <Hi c="text">{fmtN(tot.pessoas)}</Hi> jovens únicos disputando <Hi c="text">{fmtN(tot.vagas)}</Hi> vagas.</p></>,
    <><Kicker>O público prioritário é maioria</Kicker>
      <p><Hi>{fmtP(tot.pctSem)}</Hi> dos que responderam o questionário <b style={{ color: C.cyan }}>nunca trabalharam</b> com carteira assinada nem fizeram estágio.</p>
      <p style={{ color: C.muted }}>{fmtN(tot.inscricoes - tot.responderam)} inscrições (cinza) vieram sem o questionário socioeconômico e ficam fora das proporções.</p></>,
    <><Kicker>Mas a vantagem está encolhendo</Kicker>
      <p>De {a0} para {a1}, a parcela sem experiência caiu de <Hi>{fmtP(pA.pctSem)}</Hi> para <Hi>{fmtP(pB.pctSem)}</Hi>. O bloco laranja cresceu.</p>
      <p style={{ color: C.muted }}>Pergunta 1 investiga onde isso aconteceu e se tem a ver com a concorrência.</p></>,
    <><Kicker>É um público de baixa renda</Kicker>
      <p><Hi c="purple">{fmtP(fx.pct[0] + fx.pct[1])}</Hi> vivem com até <b>meio salário mínimo por pessoa</b> — o corte de baixa renda do CadÚnico. <Hi c="purple">{fmtP(fx.pct[0])}</Hi> estão abaixo de 1/4.</p>
      <p style={{ color: C.muted }}>Pergunta 2 mostra que isso vale com ou sem experiência — e como muda de unidade para unidade.</p></>,
    <><Kicker>E quase ninguém chega pela rede de proteção social</Kicker>
      <p>Só <Hi c="green">{fmtN(cras.n)}</Hi> inscritos ({fmtP(cras.n / tot.responderam, 1)}) foram encaminhados por CRAS/CREAS. A maioria chega por amigos e parentes.</p>
      <p>Mas esse grupo pequeno é o mais vulnerável: <Hi c="green">{fmtP(cras.sem / cras.n)}</Hi> sem experiência e <Hi c="green">{fmtP(cras.meio / cras.rv)}</Hi> até 1/2 SM per capita.</p></>,
    <><Kicker>Três perguntas guiam o resto do painel</Kicker>
      {[["p1a", "cyan", "1", "Os sem experiência são maioria em todas as unidades, e como isso mudou?"],
        ["p2a", "purple", "2", "Qual o perfil socioeconômico de quem se inscreve sem experiência?"],
        ["p3a", "green", "3", "Por quais canais os jovens chegam — e quem cada canal traz?"]].map(([k, c, n, t]) =>
        <motion.button key={k} whileHover={{ x: 4 }} onClick={() => go(k)} style={{ display: "flex", gap: 12, alignItems: "center", width: "100%", textAlign: "left", marginTop: 10,
          padding: "12px 14px", borderRadius: 10, border: `1px solid ${C[c]}55`, background: `${C[c]}12`, color: C.text, cursor: "pointer", fontSize: 13.5, lineHeight: 1.45 }}>
          <span style={{ fontSize: 18, fontWeight: 800, color: C[c] }}>{n}</span><span style={{ flex: 1 }}>{t}</span><span style={{ color: C[c] }}>→</span>
        </motion.button>)}</>,
  ];

  return <div className="story">
    <div className="story-sticky">
      <div style={{ width: "100%", maxWidth: 760, position: "relative" }}>
        <div style={{ position: "absolute", top: 4, right: 4, zIndex: 3 }}><ChartInfoTooltip id="historia-pontos" corner={false} align="right" /></div>
        <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: "block", overflow: "visible" }}>
          <text x={8} y={18} fontSize="10" fill={C.muted} fontWeight="700" letterSpacing="1.4">● = {POR_PONTO} INSCRIÇÕES</text>
          <g>
            {pts.map(p => {
              const [x, y] = P.lay.pos.get(p.id) || [W / 2, H / 2];
              const [cor, op] = P.cor(p);
              const g = P.grande?.(p);
              const r = P.lay.s * (g ? .5 : .36);
              return <circle key={p.id} cx={0} cy={0} r={r} fill={cor} opacity={op}
                style={{ transform: `translate(${x}px, ${y}px)`, transition: `transform .9s cubic-bezier(.65,0,.35,1) ${(p.id % 97) * 4}ms, fill .6s ease, opacity .6s ease, r .4s ease` }} />;
            })}
          </g>
          {P.lay.rot.map(r => {
            const txt = P.rot(r.k);
            return txt ? <motion.g key={`${passo}-${r.k}`} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: .5, duration: .4 }}>
              <line x1={r.x0} x2={r.x1} y1={r.y + 4} y2={r.y + 4} stroke={C.border} />
              <text x={r.x} y={r.y - 2} fontSize={P.lay.rot.length > 4 ? 10 : 12.5} fontWeight="750" fill={C.text} textAnchor="middle">{txt}</text>
            </motion.g> : null;
          })}
        </svg>
      </div>
    </div>
    <div className="story-steps">
      {textos.map((t, i) => <div key={i} className="story-step" data-passo={i} ref={el => { refs.current[i] = el; }}>
        <motion.div animate={{ opacity: passo === i ? 1 : .28, scale: passo === i ? 1 : .98 }} transition={{ duration: .35 }}
          style={{ background: `${C.card}f2`, border: `1px solid ${passo === i ? C.border : "transparent"}`, borderRadius: 14, padding: "20px 22px",
            fontSize: 15.5, lineHeight: 1.7, color: C.text, boxShadow: passo === i ? "0 12px 34px rgba(0,0,0,.25)" : "none", width: "100%" }}>
          <div style={{ display: "grid", gap: 8 }}>{t}</div>
        </motion.div>
      </div>)}
      <div style={{ height: "20vh" }} />
    </div>
  </div>;
}

function Kicker({ children }) {
  return <div style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: 1.5, color: C.cyan, textTransform: "uppercase" }}>{children}</div>;
}
