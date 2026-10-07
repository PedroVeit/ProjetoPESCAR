import { motion } from "framer-motion";
import { C, FAIXA_OP, alpha } from "../constants/theme";
import { useData } from "../data/store";
import { p1PorUnidade, panorama, slope, dist, canais, fmtP, fmtPP, fmtN } from "../data/selectors";
import { Hi, Proximo, useNav } from "../components/story";

const ease = [0.22, 1, 0.36, 1];

export default function TabRespostas() {
  const D = useData();
  const { go } = useNav();
  const [a0, a1] = D.meta.anos.slice(-2);
  const pA = panorama(D, a0), pB = panorama(D, a1), tot = panorama(D, 0);

  const abaixo = D.meta.anos.flatMap(a => p1PorUnidade(D, a).filter(r => r.pct != null && r.pct <= .5).map(r => `${r.nome} (${a})`));
  const nUnid = p1PorUnidade(D, 0).filter(r => r.pct != null).length;
  const sl = slope(D);
  const quedas = sl.linhas.filter(l => l.d <= -.05).length;

  const fS = dist(D, "faixa_renda", 0, "sem"), fC = dist(D, "faixa_renda", 0, "com");
  const iS = dist(D, "idade", 0, "sem"), iC = dist(D, "idade", 0, "com");
  const cs = canais(D, 0).linhas;
  const by = n => cs.find(l => l.nome === n);
  const cras = by("CRAS/CREAS"), amigos = by("Amigos");
  const fx = dist(D, "faixa_renda", 0, "todos");

  const respostas = [
    {
      n: 1, col: "cyan", tab: "p1a", q: "Os sem experiência são maioria em todas as unidades, e como isso mudou?",
      r: <>São maioria em quase toda a rede{abaixo.length ? <> — exceto {abaixo.join(", ")}</> : ""}. Mas a parcela caiu de <Hi>{fmtP(pA.pctSem)}</Hi> para <Hi>{fmtP(pB.pctSem)}</Hi>
        ({fmtPP(pB.pctSem - pA.pctSem)}), com queda relevante em {quedas} de {sl.linhas.length} unidades. Unidades mais concorridas tendem a ter menos jovens sem
        experiência, mas a relação é fraca; e {fmtP(tot.multi / tot.pessoas)} dos jovens disputam mais de uma unidade.</>,
      viz: <MiniBarras itens={[[`${a0}`, pA.pctSem, C.cyan], [`${a1}`, pB.pctSem, C.cyan]]} ref50 />,
    },
    {
      n: 2, col: "purple", tab: "p2a", q: "Qual o perfil socioeconômico de quem se inscreve sem experiência?",
      r: <>Jovens de 15 a 17 anos, ainda no ensino médio e de baixa renda: <Hi c="purple">{fmtP(fS.pct[0] + fS.pct[1])}</Hi> vivem com até 1/2 SM per capita.
        A renda praticamente não difere de quem já trabalhou ({fmtP(fC.pct[0] + fC.pct[1])}); a diferença está na idade — {fmtP(iC.pct[3] + iC.pct[4])} dos com
        experiência têm 18+, contra {fmtP(iS.pct[3] + iS.pct[4])} dos sem — e no momento escolar. O perfil de renda varia muito entre unidades.</>,
      viz: <MiniEmpilhada linhas={[["sem exp.", fS], ["com exp.", fC]]} />,
    },
    {
      n: 3, col: "green", tab: "p3a", q: "Por quais canais os jovens chegam, e os institucionais trazem um público mais vulnerável?",
      r: <>A maioria chega por indicação ({fmtP(amigos.share)} citam amigos). CRAS/CREAS respondem por só <Hi c="green">{fmtP(cras.share, 1)}</Hi> dos inscritos,
        mas trazem o público mais vulnerável: {fmtP(cras.sem / cras.n)} sem experiência e <Hi c="green">{fmtP(cras.meio / cras.rv)}</Hi> até 1/2 SM per capita (média {fmtP(fx.pct[0] + fx.pct[1])}),
        diferença estatisticamente significativa. Em várias unidades esse canal não existe.</>,
      viz: <MiniBarras itens={[["CRAS/CREAS", cras.meio / cras.rv, C.green], ["Amigos", amigos.meio / amigos.rv, C.orange], ["Média", fx.pct[0] + fx.pct[1], C.muted]]} min={.6} rot="% até 1/2 SM" />,
    },
  ];

  const recs = [
    ["Monitorar a queda do público prioritário", `A parcela sem experiência caiu ${fmtPP(pB.pctSem - pA.pctSem)} em um ano. Acompanhar por unidade, a cada ciclo, com este painel.`],
    ["Transformar o encaminhamento por CRAS/CREAS em política da rede", "É o canal que mais traz o público-alvo e o menos usado. Parcerias formais e calendário combinado com a assistência social."],
    ["Usar a renda per capita junto com a experiência", "Experiência separa jovens por idade, não por renda. A renda já é coletada e diferencia melhor a vulnerabilidade."],
    ["Coordenar a seleção entre unidades vizinhas", `${fmtN(tot.multi)} jovens se inscreveram em mais de uma unidade. Agenda comum evita filas duplicadas e mede a demanda real.`],
    ["Registrar o resultado da seleção por candidato", "Sem a lista nominal de aprovados não é possível afirmar quem foi selecionado — só quem se inscreveu. É o principal próximo passo de dados."],
  ];

  const limites = [
    "As conclusões são sobre inscritos, não sobre selecionados: não há vínculo individual entre as planilhas de inscrição e as matrículas do NIGE (correlações são entre unidades — falácia ecológica).",
    "Inscrições repetidas são identificadas por nascimento + sexo + bairro + cidade: gêmeos ou coincidências podem ser unidos por engano.",
    `Renda e moradores são autodeclarados; ${fmtN(D.tratamento.find(t => t.etapa === "Renda")?.rem)} rendas impossíveis foram descartadas. ${fmtP((tot.inscricoes - tot.responderam) / tot.inscricoes)} dos inscritos não responderam o questionário.`,
    "CRAS/CREAS tem poucos inscritos por unidade; por isso os intervalos de confiança são mostrados e células com menos de 5 pessoas são suprimidas (LGPD).",
    "Apenas dois anos de dados: a variação 2025 → 2026 é uma mudança, ainda não uma tendência.",
    "No NIGE há turmas com mais matriculados que vagas (reposição de desistentes), o que afeta a razão inscrições/vaga.",
  ];

  return <div>
    <motion.header initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .5, ease }}
      style={{ padding: "22px 24px", borderRadius: 14, border: `1px solid ${C.border}`, background: `linear-gradient(120deg, ${C.yellow}14, ${C.card} 60%)`, marginBottom: 16 }}>
      <div style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: 1.5, color: C.yellow }}>FECHAMENTO · RESPOSTAS</div>
      <h1 style={{ fontSize: "clamp(20px, 2.4vw, 28px)", marginTop: 8, lineHeight: 1.25 }}>O que os dados respondem — em uma página</h1>
      <p style={{ color: C.muted, fontSize: 13.5, marginTop: 6, maxWidth: 900, lineHeight: 1.6 }}>
        {fmtN(tot.inscricoes)} inscrições · {fmtN(tot.pessoas)} jovens únicos · {D.unidades.length} unidades · {D.meta.anos.join(" e ")}. Todos os números abaixo são
        calculados a partir dos dados; clique em "ver evidências" para abrir os gráficos de cada resposta.</p>
    </motion.header>

    <div style={{ display: "grid", gap: 12 }}>
      {respostas.map((r, i) => <motion.article key={r.n} initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: .1 + i * .12, duration: .5, ease }}
        style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) 240px", gap: 18, alignItems: "center", padding: "18px 20px", borderRadius: 14,
          background: C.card, border: `1px solid ${C.border}`, borderLeft: `4px solid ${C[r.col]}` }} className="resp-card">
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: 1.3, color: C.bg, background: C[r.col], borderRadius: 4, padding: "2px 7px" }}>PERGUNTA {r.n}</span>
            <span style={{ fontSize: 14.5, fontWeight: 700 }}>{r.q}</span>
          </div>
          <p style={{ fontSize: 13.5, lineHeight: 1.75, marginTop: 10, color: C.text, opacity: .92 }}>{r.r}</p>
          <button onClick={() => go(r.tab)} style={{ marginTop: 10, background: "none", border: `1px solid ${C[r.col]}66`, color: C[r.col], borderRadius: 7, padding: "5px 12px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>ver evidências →</button>
        </div>
        <div>{r.viz}</div>
      </motion.article>)}
    </div>

    <div className="g2" style={{ marginTop: 18 }}>
      <motion.section initial={{ opacity: 0, y: 14 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: .5, ease }}
        style={{ padding: "18px 20px", borderRadius: 14, background: `${C.yellow}0d`, border: `1px solid ${C.yellow}40` }}>
        <h2 style={{ fontSize: 15, color: C.yellow, marginBottom: 12 }}>Recomendações para a Fundação</h2>
        <ol style={{ display: "grid", gap: 12, listStyle: "none" }}>
          {recs.map(([t, d], i) => <li key={t} style={{ display: "grid", gridTemplateColumns: "26px 1fr", gap: 8 }}>
            <span style={{ fontWeight: 800, fontSize: 16, color: C.yellow }}>{i + 1}</span>
            <div><div style={{ fontWeight: 700, fontSize: 13.5 }}>{t}</div><div style={{ fontSize: 12.5, color: C.muted, lineHeight: 1.6, marginTop: 2 }}>{d}</div></div>
          </li>)}
        </ol>
      </motion.section>
      <motion.section initial={{ opacity: 0, y: 14 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: .5, ease, delay: .1 }}
        style={{ padding: "18px 20px", borderRadius: 14, background: C.card, border: `1px solid ${C.border}` }}>
        <h2 style={{ fontSize: 15, marginBottom: 12 }}>Limitações — o que os dados <i>não</i> dizem</h2>
        <ul style={{ display: "grid", gap: 9, listStyle: "none" }}>
          {limites.map(t => <li key={t} style={{ display: "grid", gridTemplateColumns: "14px 1fr", gap: 6, fontSize: 12.5, color: C.muted, lineHeight: 1.6 }}>
            <span style={{ color: C.red }}>•</span><span>{t}</span></li>)}
        </ul>
      </motion.section>
    </div>
    <Proximo tab="respostas" />
  </div>;
}

function MiniBarras({ itens, ref50, min = 0, rot }) {
  return <div style={{ display: "grid", gap: 8 }}>
    {rot && <div style={{ fontSize: 10, color: C.muted, fontWeight: 700, letterSpacing: 1 }}>{rot.toUpperCase()}</div>}
    {itens.map(([l, v, c], i) => <div key={l} style={{ display: "grid", gridTemplateColumns: "70px 1fr 40px", gap: 8, alignItems: "center", fontSize: 11.5 }}>
      <span style={{ color: C.muted, textAlign: "right", whiteSpace: "nowrap" }}>{l}</span>
      <div style={{ position: "relative", height: 14, background: C.border, borderRadius: 3 }}>
        <motion.div initial={{ width: 0 }} animate={{ width: `${((v - min) / (1 - min)) * 100}%` }} transition={{ duration: .8, delay: .3 + i * .12, ease }}
          style={{ position: "absolute", inset: 0, right: "auto", background: c, borderRadius: 3 }} />
        {ref50 && <span style={{ position: "absolute", left: "50%", top: -3, bottom: -3, borderLeft: `1px dashed ${C.text}` }} />}
      </div>
      <b style={{ fontFamily: "ui-monospace, monospace" }}>{fmtP(v)}</b>
    </div>)}
  </div>;
}

function MiniEmpilhada({ linhas }) {
  return <div style={{ display: "grid", gap: 8 }}>
    <div style={{ fontSize: 10, color: C.muted, fontWeight: 700, letterSpacing: 1 }}>RENDA PER CAPITA</div>
    {linhas.map(([l, d], i) => <div key={l} style={{ display: "grid", gridTemplateColumns: "60px 1fr", gap: 8, alignItems: "center", fontSize: 11.5 }}>
      <span style={{ color: C.muted, textAlign: "right" }}>{l}</span>
      <div style={{ display: "flex", height: 16, borderRadius: 3, overflow: "hidden" }}>
        {d.pct.map((p, k) => <motion.div key={k} initial={{ width: 0 }} animate={{ width: `${p * 100}%` }} transition={{ duration: .7, delay: .3 + i * .15 + k * .06, ease }}
          title={`${d.cats[k]}: ${fmtP(p)}`} style={{ background: alpha(C.purple, FAIXA_OP[k]) }} />)}
      </div>
    </div>)}
    <div style={{ fontSize: 10, color: C.muted }}>mais escuro = até 1/4 SM</div>
  </div>;
}
