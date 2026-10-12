import { useMemo, useState } from "react";
import { C, FAIXA_OP, alpha } from "../constants/theme";
import { useData, useFilters } from "../data/store";
import { dist, rendaQ, rendaHist, fmtP, fmtSM, fmtBRL, fmtN, anoLbl } from "../data/selectors";
import { Card, Lbl, StatCard, Seg } from "../components/atoms";
import { Pergunta, Secao, Takeaway, Proximo, Hi, Nota } from "../components/story";
import ChartInfoTooltip from "../components/charts/ChartInfoTooltip";
import Waffle from "../components/charts/Waffle";
import RendaHist from "../components/charts/RendaHist";
import Butterfly from "../components/charts/Butterfly";

const VARS = [["idade", "Idade"], ["escol", "Escolaridade"], ["morad", "Moradia"], ["turno_c", "Turno da escola"], ["estuda_c", "Estuda?"], ["curso_c", "Curso profissionalizante"]];

export default function TabP2a() {
  const D = useData();
  const { ano, foco } = useFilters();
  const [grupo, setGrupo] = useState("sem");
  const [v, setV] = useState("idade");
  const anoSM = ano === 0 ? D.meta.anos[D.meta.anos.length - 1] : ano;
  const sm = D.meta.salario_minimo[String(anoSM)];

  const fx = useMemo(() => dist(D, "faixa_renda", ano, grupo, foco), [D, ano, grupo, foco]);
  const fSem = dist(D, "faixa_renda", ano, "sem"), fCom = dist(D, "faixa_renda", ano, "com");
  const qSem = rendaQ(D, null, ano, "sem"), qCom = rendaQ(D, null, ano, "com");
  const idade = dist(D, "idade", ano, "sem");
  const estuda = dist(D, "estuda_c", ano, "sem");
  const morad = dist(D, "morad", ano, "sem");
  const meio = p => p.pct[0] + p.pct[1];
  const idadeModa = idade.cats[idade.n.indexOf(Math.max(...idade.n))];
  const alugadaOuMenos = 1 - morad.pct[0] - morad.pct[1];

  const bA = dist(D, v, ano, "sem", foco), bB = dist(D, v, ano, "com", foco);
  const focoNome = foco != null ? D.unidades[foco].nome : null;

  return <div>
    <Pergunta tab="p2a"
      pergunta="Qual o perfil socioeconômico dos inscritos sem experiência — idade, renda familiar per capita, moradia, escolaridade — e como ele difere de quem já trabalhou?"
      resposta={<>É um público de baixa renda — <Hi c="purple">{fmtP(meio(fSem))}</Hi> vivem com até meio salário mínimo por pessoa (mediana
        de <Hi c="purple">{fmtBRL(qSem?.p50 * sm)}</Hi>) — mas nisso ele quase não difere de quem já trabalhou ({fmtP(meio(fCom))}). O que separa os
        dois grupos é a <b>fase da vida</b>: os sem experiência são mais novos (a maioria tem {idadeModa} anos), <Hi>{fmtP(estuda.pct[0])}</Hi> ainda estudam
        e estão no início do ensino médio; os com experiência são mais velhos, já concluíram a escola ou estudam à noite.</>} />

    <div className="kpis">
      <StatCard label="Até 1/2 SM per capita" value={fmtP(meio(fSem))} color={C.purple} sub={`sem experiência · ${fmtP(meio(fCom))} entre os com experiência`} />
      <StatCard label="Renda per capita mediana" value={fmtBRL(qSem?.p50 * sm)} color={C.cyan} sub={`${fmtSM(qSem?.p50)} · com experiência: ${fmtBRL(qCom?.p50 * sm)}`} />
      <StatCard label="Idade mais comum" value={`${idadeModa} anos`} color={C.text} sub={`sem experiência · ${anoLbl(ano)}`} />
      <StatCard label="Não moram em casa própria" value={fmtP(alugadaOuMenos)} color={C.orange} sub="alugada, cedida, ocupação ou abrigo" />
    </div>

    <div className="g2">
      <Secao titulo="1. De cada 100 jovens…"
        sub={`Renda familiar dividida por todos que moram na casa, em salários mínimos de ${anoSM} (R$ ${fmtN(sm)}).${focoNome ? ` Mostrando só ${focoNome}.` : ""}`}>
        <Card>
          <Lbl>Renda per capita · {anoLbl(ano)}{focoNome ? ` · ${focoNome}` : ""}</Lbl>
          <ChartInfoTooltip id="p2-waffle" />
          <div style={{ marginBottom: 12 }}>
            <Seg value={grupo} onChange={setGrupo} options={[{ v: "sem", l: "Sem experiência", col: "cyan" }, { v: "com", l: "Com experiência", col: "orange" }, { v: "todos", l: "Todos" }]} />
          </div>
          <Waffle animKey={`${grupo}|${ano}|${foco}`} cats={fx.cats.map((c, i) => ({ label: c, p: fx.pct[i], col: alpha(C.purple, FAIXA_OP[i]) }))} />
          {fx.sup && <Nota c="yellow">Algumas células da unidade têm menos de 5 pessoas e foram suprimidas (LGPD).</Nota>}
          <Nota>Base: {fmtN(fx.tot)} inscritos com renda válida.</Nota>
        </Card>
      </Secao>

      <Secao titulo="2. Na renda, os dois grupos quase se sobrepõem"
        sub="As barras (sem experiência) e a linha (com experiência) têm praticamente a mesma forma: os dois públicos se concentram abaixo de meio salário mínimo por pessoa. A renda não é o que os distingue.">
        <Card>
          <Lbl>Distribuição da renda per capita · % de cada grupo · rede inteira</Lbl>
          <ChartInfoTooltip id="p2-hist" />
          <RendaHist sem={rendaHist(D, ano, "sem")} com={rendaHist(D, ano, "com")} sm={sm} depKey={ano} />
        </Card>
      </Secao>
    </div>

    <Secao titulo="3. O que separa os dois grupos é a fase da vida"
      sub={`Escolha uma variável. Barras de tamanhos muito diferentes dos dois lados = característica que distingue o público prioritário.${focoNome ? ` Mostrando só ${focoNome}.` : ""}`}>
      <Card>
        <Lbl>Sem × com experiência · {anoLbl(ano)}</Lbl>
        <ChartInfoTooltip id="p2-butterfly" />
        <div style={{ marginBottom: 12 }}>
          <Seg value={v} onChange={setV} options={VARS.map(([k, l]) => ({ v: k, l, col: "purple" }))} />
        </div>
        <Butterfly key={v} a={bA} b={bB} />
        {(bA.sup || bB.sup) && <Nota c="yellow">Células com menos de 5 pessoas na unidade em foco foram suprimidas.</Nota>}
      </Card>
    </Secao>

    <Takeaway>
      Quase todos os inscritos — com ou sem experiência — vêm de famílias de baixa renda. Por isso, <b>"sem experiência" não funciona como um marcador de
      vulnerabilidade econômica</b>: ele marca sobretudo <b>idade e momento escolar</b> (16–17 anos, 1º–2º ano do ensino médio, estudando de manhã).
      Se a intenção da Fundação é chegar primeiro em quem nunca teve uma chance no mercado, o critério funciona; se for priorizar os mais pobres, a renda per
      capita (que já é coletada) discrimina melhor e deveria entrar explicitamente na seleção.
    </Takeaway>
    <Proximo tab="p2a" />
  </div>;
}
