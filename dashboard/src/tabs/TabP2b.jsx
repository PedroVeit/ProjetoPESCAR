import { useMemo, useState } from "react";
import { C } from "../constants/theme";
import { useData, useFilters } from "../data/store";
import { dist, rendaQ, fmtP, fmtBRL, fmtN, anoLbl } from "../data/selectors";
import { Card, Lbl, Seg } from "../components/atoms";
import { Pergunta, Secao, Takeaway, Proximo, Hi, Nota } from "../components/story";
import ChartInfoTooltip from "../components/charts/ChartInfoTooltip";
import BoxList from "../components/charts/BoxList";
import Heatmap from "../components/charts/Heatmap";
import SmallMultiples from "../components/charts/SmallMultiples";
import { RV } from "../components/charts/chartInteract";

const CURTOS = {
  faixa_renda: ["≤¼", "¼–½", "½–1", ">1"],
  idade: ["≤15", "16", "17", "18", "19+"],
  escol: ["≤8º", "9º", "EJA", "1º", "2º", "3º", "Conc", "Out"],
  turno_c: ["Manhã", "Tarde", "Noite"],
  curso_c: ["Sim", "Não"],
};
const SM_VARS = [["faixa_renda", "Renda per capita (SM)"], ["idade", "Idade"], ["escol", "Escolaridade (EF/EM)"], ["turno_c", "Turno"]];
const GRUPOS = [{ v: "sem", l: "Sem experiência", col: "cyan" }, { v: "com", l: "Com experiência", col: "orange" }, { v: "todos", l: "Todos" }];

export default function TabP2b() {
  const D = useData();
  const { ano, foco, setFoco } = useFilters();
  const [grupo, setGrupo] = useState("sem");
  const [smv, setSmv] = useState("faixa_renda");
  const anoSM = ano === 0 ? D.meta.anos[D.meta.anos.length - 1] : ano;
  const sm = D.meta.salario_minimo[String(anoSM)];
  const uni = D.unidades;

  const boxes = useMemo(() => uni.map(u => ({ k: u.id, label: u.nome, q: rendaQ(D, u.id, ano, grupo) })).filter(r => r.q), [D, ano, grupo, uni]);
  const porMed = [...boxes].sort((a, b) => a.q.p50 - b.q.p50);
  const faixas = useMemo(() => new Map(uni.map(u => [u.id, dist(D, "faixa_renda", ano, grupo, u.id)])), [D, ano, grupo, uni]);
  const rede = dist(D, "faixa_renda", ano, grupo);

  const smItems = useMemo(() => uni.map(u => {
    const d = dist(D, smv, ano, grupo, u.id);
    const keep = smv === "escol" ? d.pct.slice(0, 7) : d.pct;
    return { k: u.id, label: u.nome, pct: keep, n: d.tot, sup: d.sup };
  }).filter(it => it.n >= 20).sort((a, b) => a.label.localeCompare(b.label, "pt-BR")), [D, smv, ano, grupo, uni]);
  const smRede = (() => { const d = dist(D, smv, ano, grupo); return smv === "escol" ? d.pct.slice(0, 7) : d.pct; })();
  const smCats = smv === "escol" ? CURTOS.escol.slice(0, 7) : CURTOS[smv];

  const top = porMed.slice(0, 3), base = porMed.slice(-2);
  const ateQuarto = [...faixas.entries()].map(([u, d]) => ({ u, p: d.tot >= 20 ? d.pct[0] : null })).filter(x => x.p != null).sort((a, b) => b.p - a.p);
  const gl = GRUPOS.find(g => g.v === grupo).l.toLowerCase();

  return <div>
    <Pergunta tab="p2b"
      pergunta="O perfil dos inscritos sem experiência muda de uma unidade para outra? Onde estão os mais vulneráveis?"
      resposta={<>Muda bastante. A renda per capita mediana vai de <Hi c="purple">{fmtBRL(porMed[0]?.q.p50 * sm)}</Hi> em {porMed[0]?.label} a{" "}
        <Hi c="purple">{fmtBRL(porMed[porMed.length - 1]?.q.p50 * sm)}</Hi> em {porMed[porMed.length - 1]?.label}. Em {D.unidades[ateQuarto[0]?.u]?.nome},{" "}
        <Hi c="purple">{fmtP(ateQuarto[0]?.p)}</Hi> dos inscritos estão abaixo de 1/4 de salário mínimo por pessoa (linha da extrema pobreza do BPC);
        em {D.unidades[ateQuarto[ateQuarto.length - 1]?.u]?.nome}, só {fmtP(ateQuarto[ateQuarto.length - 1]?.p)}.</>} />

    <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", margin: "4px 0 2px" }}>
      <span style={{ fontSize: 11, color: C.muted, fontWeight: 700, letterSpacing: 1 }}>GRUPO ANALISADO</span>
      <Seg value={grupo} onChange={setGrupo} options={GRUPOS} />
      <span style={{ fontSize: 11, color: C.muted }}>vale para os três gráficos abaixo · {anoLbl(ano)}</span>
    </div>

    <div className="g2">
      <Secao titulo="1. A renda dos inscritos, unidade por unidade"
        sub="Unidades no topo têm inscritos mais pobres. A caixa é a metade central dos inscritos; o ponto, a mediana. As linhas tracejadas marcam 1/4, 1/2 e 1 salário mínimo por pessoa.">
        <Card>
          <Lbl>Renda per capita (em SM) · {gl}</Lbl>
          <ChartInfoTooltip id="p2-box" />
          <BoxList rows={boxes} sm={sm} foco={foco} onPick={setFoco} />
        </Card>
      </Secao>

      <Secao titulo="2. A mesma pergunta em faixas"
        sub="Cada linha soma 100%. Clique em “Até 1/4 SM” para ordenar as unidades pelo público mais pobre.">
        <Card>
          <Lbl>Unidade × faixa de renda per capita · {gl}</Lbl>
          <ChartInfoTooltip id="p2-heat" />
          <Heatmap foco={foco} onPick={setFoco} sortDefault="f0" labelW={150}
            rows={uni.filter(u => faixas.get(u.id).tot >= 20).map(u => ({ k: u.id, label: u.nome }))}
            cols={D.meta.faixas_renda.map((f, i) => ({ k: `f${i}`, label: f, col: C.purple }))}
            cell={(r, c) => { const d = faixas.get(r.k); const i = +c.k.slice(1); return { v: d.pct[i], txt: fmtP(d.pct[i]) }; }}
            readout={(r, c) => { const d = faixas.get(r.k); const i = +c.k.slice(1); return <>
              <b style={{ color: C.text }}>{r.label}</b><RV l={c.label} v={`${fmtN(d.n[i])} de ${fmtN(d.tot)} (${fmtP(d.pct[i], 1)})`} c={C.purple} />
              <RV l="na rede" v={fmtP(rede.pct[i], 1)} />{d.sup && <span style={{ color: C.yellow }}>parte das células &lt;5 suprimida</span>}</>; }} />
          <Nota>Só unidades com 20+ inscritos com renda válida no recorte.</Nota>
        </Card>
      </Secao>
    </div>

    <Secao titulo="3. Todas as unidades, a mesma régua"
      sub="Um mini gráfico por unidade. O traço tracejado é a rede inteira: barra acima do traço = a unidade tem mais gente naquela categoria que a média.">
      <Card>
        <Lbl>Small multiples · {gl} · {anoLbl(ano)}</Lbl>
        <ChartInfoTooltip id="p2-small" />
        <div style={{ marginBottom: 12 }}>
          <Seg value={smv} onChange={setSmv} options={SM_VARS.map(([v, l]) => ({ v, l, col: "purple" }))} />
        </div>
        <SmallMultiples items={smItems} rede={smRede} cats={smCats} foco={foco} onPick={setFoco} col={smv === "faixa_renda" ? C.purple : C.cyan} />
        <Nota>* parte das contagens da unidade tem menos de 5 pessoas e foi suprimida. Unidades com menos de 20 respostas no recorte não aparecem.</Nota>
      </Card>
    </Secao>

    <Takeaway>
      O Pescar não tem um público só. {top.map(t => t.label).join(", ")} recebem os inscritos mais pobres da rede; {base.map(t => t.label).join(" e ")}, os de
      maior renda relativa. Isso importa para a meta de priorização: <b>comparar unidades pelo % sem experiência sem olhar a renda esconde onde a
      vulnerabilidade de fato está</b>. As unidades de renda mais baixa são candidatas naturais a mais vagas ou a apoio extra (transporte, alimentação),
      e as de renda mais alta podem rever onde divulgam (próximo capítulo).
    </Takeaway>
    <Proximo tab="p2b" />
  </div>;
}
