import { useMemo } from "react";
import { C, GRUPO_COL } from "../constants/theme";
import { useData, useFilters } from "../data/store";
import { canais, canalQ, dist, fluxo, panorama, wilson, fmtP, fmtPP, fmtBRL, fmtN, anoLbl } from "../data/selectors";
import { Card, Lbl, StatCard } from "../components/atoms";
import { Pergunta, Secao, Takeaway, Proximo, Hi, Nota } from "../components/story";
import ChartInfoTooltip from "../components/charts/ChartInfoTooltip";
import DotCI from "../components/charts/DotCI";
import Sankey from "../components/charts/Sankey";

export default function TabP3b() {
  const D = useData();
  const { ano } = useFilters();
  const cs = useMemo(() => canais(D, ano), [D, ano]);
  const fl = useMemo(() => fluxo(D, ano), [D, ano]);
  const pan = panorama(D, ano);
  const fx = dist(D, "faixa_renda", ano, "todos");
  const avg = [pan.sem / pan.responderam, fx.pct[0] + fx.pct[1]];
  const anoSM = ano === 0 ? D.meta.anos[D.meta.anos.length - 1] : ano;
  const sm = D.meta.salario_minimo[String(anoSM)];

  const iCras = D.meta.canais.indexOf("CRAS/CREAS"), iAmigos = D.meta.canais.indexOf("Amigos"), iEsc = D.meta.canais.indexOf("Escola");
  const cras = cs.linhas[iCras], amigos = cs.linhas[iAmigos], esc = cs.linhas[iEsc];
  const p = (l, a, b) => l[a] / l[b];
  const ciCras = [wilson(cras.sem, cras.n), wilson(cras.meio, cras.rv)];
  const sigSem = ciCras[0][0] > avg[0], sigRenda = ciCras[1][0] > avg[1];
  const iFunc = D.meta.canais.indexOf("Filho(a) de funcionário");
  const func = cs.linhas[iFunc];
  const qC = canalQ(D, ano, iCras), qA = canalQ(D, ano, iAmigos);

  return <div>
    <Pergunta tab="p3b"
      pergunta="Os canais institucionais (CRAS/CREAS, escola) trazem um público mais vulnerável — sem experiência e de menor renda — que a indicação informal?"
      resposta={<>{sigSem && sigRenda ? "Sim, e com folga estatística" : sigRenda ? "Sim na renda; na experiência, só em parte" : "Em parte"}: quem chega pelo CRAS/CREAS
        é <Hi c="green">{fmtP(p(cras, "sem", "n"))}</Hi> sem experiência (média {fmtP(avg[0])}) e <Hi c="green">{fmtP(p(cras, "meio", "rv"))}</Hi> vivem
        com até meio salário mínimo por pessoa (média {fmtP(avg[1])}).{" "}
        {sigSem && sigRenda ? "Os dois intervalos de confiança ficam inteiros acima da média." : sigRenda ? "A diferença de renda é estatisticamente clara; a de experiência, neste recorte, não." : "Os intervalos de confiança encostam na média."}{" "}
        A escola traz mais jovens sem experiência ({fmtP(p(esc, "sem", "n"))}) com renda igual à média, e o extremo oposto são os filhos de funcionários das
        empresas parceiras ({fmtP(p(func, "meio", "rv"))} até 1/2 SM). É o canal <b>menor</b> ({fmtP(cras.share, 1)} dos inscritos) que traz o público <b>mais prioritário</b>.</>} />

    <div className="kpis">
      <StatCard label="Sem experiência · CRAS/CREAS" value={fmtP(p(cras, "sem", "n"))} color={C.green} delta={{ txt: fmtPP(p(cras, "sem", "n") - avg[0], 0) + " vs média", col: C.green }} sub={`amigos: ${fmtP(p(amigos, "sem", "n"))}`} />
      <StatCard label="Até 1/2 SM · CRAS/CREAS" value={fmtP(p(cras, "meio", "rv"))} color={C.green} delta={{ txt: fmtPP(p(cras, "meio", "rv") - avg[1], 0) + " vs média", col: C.green }} sub={`amigos: ${fmtP(p(amigos, "meio", "rv"))}`} />
      <StatCard label="Renda per capita mediana" value={qC ? fmtBRL(qC[2] * sm) : "—"} color={C.green} sub={`CRAS/CREAS · amigos: ${qA ? fmtBRL(qA[2] * sm) : "—"} (${anoSM})`} />
      <StatCard label="Inscritos via CRAS/CREAS" value={fmtN(cras.n)} color={C.text} sub={`${fmtP(cras.share, 1)} de ${fmtN(cs.base)} · ${anoLbl(ano)}`} />
    </div>

    <div className="g2">
    <Secao titulo="1. Cada canal traz um público diferente — e dá para confiar na diferença?"
      sub="O ponto é a proporção observada; a barra, o intervalo de 95%. Se a barra inteira fica à direita da linha tracejada, o canal traz um público mais vulnerável que a média — e não por acaso.">
      <Card>
        <Lbl>Perfil de quem chegou por cada canal · {anoLbl(ano)}</Lbl>
        <ChartInfoTooltip id="p3-ci" />
        <DotCI destaque={iCras} avg={avg} titulos={["% sem experiência", "% até 1/2 SM per capita"]}
          rows={cs.linhas.map(l => ({ k: l.c, label: l.nome, col: C[GRUPO_COL[l.grupo]], m1: [l.sem, l.n], m2: [l.meio, l.rv] }))} />
        <Nota>Ordenado pelo % até 1/2 SM. ⚠ = menos de 150 inscritos: intervalo largo, ler com cautela. Canais com menos de 30 inscritos não aparecem.</Nota>
      </Card>
    </Secao>

    <Secao titulo="2. Seguindo cada jovem do canal até a renda"
      sub="Cada jovem conta uma vez, pelo canal mais institucional que citou. Passe o mouse em “Institucional” e compare com “Informal”: a faixa verde termina proporcionalmente mais nas rendas mais baixas.">
      <Card>
        <Lbl>Canal → experiência → renda per capita · {anoLbl(ano)}</Lbl>
        <ChartInfoTooltip id="p3-sankey" />
        <Sankey flows={fl} grupos={D.meta.grupos} faixas={D.meta.faixas_renda} />
      </Card>
    </Secao>
    </div>

    <Takeaway>
      O canal que menos traz inscritos é justamente o que traz o público mais alinhado à missão. <b>Fortalecer a parceria com CRAS/CREAS</b> — divulgação
      direta para técnicos, vagas reservadas, calendário de inscrição combinado — é a forma mais eficiente de aumentar a proporção de jovens sem experiência
      e em vulnerabilidade, compensando a queda observada entre 2025 e 2026. Hoje esse encaminhamento depende de cada unidade; virar uma política da rede
      tornaria o resultado menos desigual.
    </Takeaway>
    <Proximo tab="p3b" />
  </div>;
}
