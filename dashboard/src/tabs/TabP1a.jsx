import { useMemo } from "react";
import { motion } from "framer-motion";
import { C, EXP_LBL } from "../constants/theme";
import { useData, useFilters } from "../data/store";
import { p1PorUnidade, slope, panorama, fmtP, fmtPP, fmtN, anoLbl } from "../data/selectors";
import { Card, Lbl, StatCard } from "../components/atoms";
import { Pergunta, Secao, Takeaway, Proximo, Hi, Nota } from "../components/story";
import ChartInfoTooltip from "../components/charts/ChartInfoTooltip";
import RankBars from "../components/charts/RankBars";
import SlopeChart from "../components/charts/SlopeChart";
import { RV } from "../components/charts/chartInteract";

export default function TabP1a() {
  const D = useData();
  const { ano, foco, setFoco } = useFilters();
  const [a0, a1] = D.meta.anos.slice(-2);

  const rows = useMemo(() => p1PorUnidade(D, ano), [D, ano]);
  const outro = ano === a1 ? a0 : ano === a0 ? a1 : null;
  const rowsOutro = useMemo(() => outro ? new Map(p1PorUnidade(D, outro).map(r => [r.u, r])) : null, [D, outro]);
  const sl = useMemo(() => slope(D), [D]);
  const pA = panorama(D, a0), pB = panorama(D, a1), pSel = panorama(D, ano);

  const validas = rows.filter(r => r.pct != null);
  const maioria = validas.filter(r => r.pct > 0.5).length;
  const min = validas.reduce((m, r) => (r.pct < m.pct ? r : m), validas[0]);
  const quedas = sl.linhas.filter(l => l.d <= -0.05).sort((x, y) => x.d - y.d);
  const subidas = sl.linhas.filter(l => l.d >= 0.05);
  const dRede = pB.pctSem - pA.pctSem;
  // Casos (unidade, ano) em que sem experiência NÃO é maioria — a narrativa
  // não pode dizer "todas" se houver algum.
  const abaixo = D.meta.anos.flatMap(a => p1PorUnidade(D, a).filter(r => r.pct != null && r.pct <= 0.5).map(r => `${r.nome} em ${a} (${fmtP(r.pct)})`));

  return <div>
    <Pergunta tab="p1a"
      pergunta="Os jovens sem experiência profissional são maioria entre os inscritos de todas as unidades, e como essa proporção mudou de 2025 para 2026?"
      resposta={<>{maioria === validas.length ? "Sim" : "Quase"}, são maioria em <Hi>{maioria} de {validas.length}</Hi> unidades ({anoLbl(ano)}); a menor proporção é <Hi c="orange">{fmtP(min?.pct)}</Hi> ({min?.nome}).
        Mas a vantagem encolheu: na rede, o percentual caiu de <Hi>{fmtP(pA.pctSem)}</Hi> em {a0} para <Hi>{fmtP(pB.pctSem)}</Hi> em {a1} ({fmtPP(dRede)}),
        com queda relevante em <Hi c="red">{quedas.length}</Hi> unidades e alta em apenas <Hi c="green">{subidas.length}</Hi>.</>} />

    <div className="kpis">
      <StatCard label={`Sem experiência · ${anoLbl(ano)}`} value={fmtP(pSel.pctSem, 1)} color={C.cyan}
        sub={`${fmtN(pSel.sem)} de ${fmtN(pSel.responderam)} que responderam o questionário`} />
      <StatCard label={`Variação ${a0} → ${a1}`} value={fmtPP(dRede)} color={dRede < 0 ? C.red : C.green}
        sub={`${fmtP(pA.pctSem, 1)} → ${fmtP(pB.pctSem, 1)} na rede inteira`} />
      <StatCard label="Unidades com maioria" value={`${maioria} de ${validas.length}`} color={C.text}
        sub={`acima de 50% sem experiência em ${anoLbl(ano)}`} />
      <StatCard label="Maior queda" value={quedas[0] ? fmtPP(quedas[0].d) : "—"} color={C.red}
        sub={quedas[0] ? `${quedas[0].nome}: ${fmtP(quedas[0].a)} → ${fmtP(quedas[0].b)}` : ""} />
    </div>

    <Secao titulo="1. A rede como um todo: o público prioritário perdeu espaço"
      sub="Cada barra é 100% dos inscritos que responderam o questionário. A fatia ciano é quem nunca trabalhou com carteira assinada nem fez estágio.">
      <Card>
        <Lbl>Composição dos inscritos por ano</Lbl>
        <ChartInfoTooltip id="p1-comp" />
        <Composicao anos={[a0, a1]} pans={[pA, pB]} />
      </Card>
    </Secao>

    <div className="g2" style={{ marginTop: 4 }}>
      <Secao titulo="2. Unidade por unidade: todas acima da linha da maioria?"
        sub={`Ordenado do maior para o menor. ${outro ? `O traço branco marca o valor de ${outro} — barra à direita do traço = cresceu.` : "Escolha um ano no topo para comparar com o outro."} Clique numa unidade para destacá-la em todo o dashboard.`}>
        <Card>
          <Lbl>% sem experiência por unidade · {anoLbl(ano)}</Lbl>
          <ChartInfoTooltip id="p1-rank" />
          <RankBars foco={foco} onPick={setFoco} fmt={v => fmtP(v)} refValue={0.5} refLabel="maioria" ghostLabel={outro ? `valor de ${outro}` : ""}
            rows={rows.map(r => ({ k: r.u, label: r.nome, v: r.pct, col: r.pct != null && r.pct < 0.6 ? C.orange : C.cyan,
              ghost: rowsOutro?.get(r.u)?.pct ?? null }))}
            readout={r => {
              const o = rows.find(x => x.u === r.k);
              const g = rowsOutro?.get(r.k);
              return <><b style={{ color: C.text }}>{o.nome}</b>
                <RV l="sem experiência" v={`${fmtN(o.sem)} de ${fmtN(o.resp)} (${fmtP(o.pct, 1)})`} c={C.cyan} />
                {g && g.pct != null && <RV l={`em ${outro}`} v={`${fmtP(g.pct, 1)} (${fmtPP(o.pct - g.pct)})`} />}
                <RV l="inscrições" v={fmtN(o.inscricoes)} /></>;
            }} />
          <Nota>Barras laranja: menos de 60% sem experiência — maioria apertada.</Nota>
        </Card>
      </Secao>

      <Secao titulo={`3. O que mudou de ${a0} para ${a1}`}
        sub="Cada linha liga o valor de uma unidade nos dois anos. Linhas vermelhas descem: a unidade passou a atrair proporcionalmente mais jovens que já trabalharam.">
        <Card>
          <Lbl>Inclinação {a0} → {a1} · % sem experiência</Lbl>
          <ChartInfoTooltip id="p1-slope" />
          <SlopeChart data={sl} foco={foco} onPick={setFoco} />
        </Card>
      </Secao>
    </div>

    <Takeaway>
      {abaixo.length
        ? <>O critério de prioridade é cumprido <b>na porta de entrada</b> em quase toda a rede, mas não em todas: o público sem experiência deixou de ser maioria em {abaixo.join(", ")}.</>
        : <>O critério de prioridade está sendo cumprido <b>na porta de entrada</b>: em todas as unidades e anos a maioria dos inscritos nunca trabalhou.</>}
      Mas a tendência é de queda: {quedas.length} unidades perderam mais de 5 p.p., com as maiores quedas em{" "}
      {quedas.slice(0, 3).map(q => `${q.nome} (${fmtPP(q.d)})`).join(", ")}.
      Se a seleção não compensar isso, a proporção de matriculados sem experiência tende a cair junto. Vale acompanhar
      essas unidades e investigar o que mudou na divulgação (próximos capítulos: concorrência e canais).
    </Takeaway>
    <Proximo tab="p1a" />
  </div>;
}

function Composicao({ anos, pans }) {
  const segs = p => [
    ["sem", p.sem, C.cyan],
    ["com", p.com, C.orange],
    ["nr", p.inscricoes - p.responderam, C.muted],
  ];
  return <div style={{ display: "grid", gap: 14, padding: "4px 0" }}>
    {anos.map((a, i) => {
      const p = pans[i];
      return <div key={a} style={{ display: "grid", gridTemplateColumns: "48px 1fr", gap: 10, alignItems: "center" }}>
        <span style={{ fontWeight: 800, fontSize: 14 }}>{a}</span>
        <div>
          <div style={{ display: "flex", height: 30, borderRadius: 6, overflow: "hidden", background: C.border }}>
            {segs(p).map(([k, n, c], j) => <motion.div key={k} initial={{ width: 0 }} whileInView={{ width: `${(n / p.inscricoes) * 100}%` }}
              viewport={{ once: true }} transition={{ duration: .9, delay: .15 + j * .12 + i * .2, ease: [0.22, 1, 0.36, 1] }}
              title={`${EXP_LBL[k]}: ${fmtN(n)}`}
              style={{ background: c, opacity: k === "nr" ? .35 : .9, display: "flex", alignItems: "center", paddingLeft: 8, overflow: "hidden" }}>
              <span style={{ fontSize: 11.5, fontWeight: 800, color: C.bg, whiteSpace: "nowrap" }}>{k !== "nr" && fmtP(n / p.responderam)}</span>
            </motion.div>)}
          </div>
          <div style={{ fontSize: 10.5, color: C.muted, marginTop: 4 }}>
            {fmtN(p.inscricoes)} inscrições · <span style={{ color: C.cyan }}>{fmtN(p.sem)} sem</span> · <span style={{ color: C.orange }}>{fmtN(p.com)} com experiência</span> · {fmtN(p.inscricoes - p.responderam)} sem questionário
          </div>
        </div>
      </div>;
    })}
    <Nota>Percentuais calculados sobre quem respondeu o questionário socioeconômico (a fatia cinza fica fora da conta).</Nota>
  </div>;
}
