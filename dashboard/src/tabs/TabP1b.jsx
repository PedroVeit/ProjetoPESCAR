import { useMemo } from "react";
import { C } from "../constants/theme";
import { useData, useFilters } from "../data/store";
import { p1PorUnidade, panorama, sobreposicao, pearson, fmtP, fmtX, fmtN, anoLbl } from "../data/selectors";
import { Card, Lbl, StatCard } from "../components/atoms";
import { Pergunta, Secao, Takeaway, Proximo, Hi, Nota } from "../components/story";
import ChartInfoTooltip from "../components/charts/ChartInfoTooltip";
import BubbleTime from "../components/charts/BubbleTime";
import Dumbbell from "../components/charts/Dumbbell";
import ArcDiagram from "../components/charts/ArcDiagram";

const forca = r => {
  const a = Math.abs(r);
  return a < .2 ? "praticamente nula" : a < .4 ? "fraca" : a < .6 ? "moderada" : "forte";
};

export default function TabP1b() {
  const D = useData();
  const { ano, foco, setFoco } = useFilters();
  const [a0, a1] = D.meta.anos.slice(-2);

  const bolhas = useMemo(() => {
    const A = new Map(p1PorUnidade(D, a0).map(r => [r.u, r]));
    const B = new Map(p1PorUnidade(D, a1).map(r => [r.u, r]));
    const pt = r => (r && r.cv != null && r.pct != null ? { cv: r.cv, pct: r.pct, insc: r.inscricoes } : null);
    return D.unidades.map(u => ({ u: u.id, nome: u.nome, A: pt(A.get(u.id)), B: pt(B.get(u.id)) })).filter(r => r.A || r.B);
  }, [D, a0, a1]);

  const regs = [0, 1].map(k => {
    const pts = bolhas.map(b => (k ? b.B : b.A)).filter(Boolean);
    return pearson(pts.map(p => Math.log(p.cv)), pts.map(p => p.pct));
  });

  const rows = useMemo(() => p1PorUnidade(D, ano).filter(r => r.cv != null), [D, ano]);
  const pan = panorama(D, ano);
  const pares = useMemo(() => sobreposicao(D, ano), [D, ano]);
  const top = [...rows].sort((x, y) => y.cv - x.cv)[0];
  const cvRede = pan.vagas ? pan.inscricoes / pan.vagas : null;
  // Exemplo para o texto: entre as unidades mais concorridas (metade de cima),
  // a que mais divide candidatos — unidades pequenas não servem de exemplo.
  const medCv = [...rows].sort((x, y) => x.cv - y.cv)[Math.floor(rows.length / 2)]?.cv ?? 0;
  const maisDividida = rows.filter(r => r.cv >= medCv).sort((x, y) => y.pctMulti - x.pctMulti)[0];

  return <div>
    <Pergunta tab="p1b"
      pergunta="As unidades mais concorridas atraem menos jovens sem experiência? E quanto da concorrência é real?"
      resposta={<>Em parte. A tendência existe — quanto mais inscritos por vaga, menor a parcela sem experiência — mas é {forca(regs[0]?.r ?? 0)}{" "}
        (r = <Hi>{fmtX(regs[0]?.r, 2)}</Hi> em {a0}) e enfraqueceu em {a1} (r = <Hi>{fmtX(regs[1]?.r, 2)}</Hi>), com exceções claras como unidades muito
        concorridas e ainda com perfil prioritário. E parte da disputa é dividida: <Hi c="purple">{fmtP(pan.multi / pan.pessoas)}</Hi> dos jovens
        se inscreveram em mais de uma unidade no mesmo ano, o que infla a concorrência aparente.</>} />

    <div className="kpis">
      <StatCard label={`Inscrições por vaga · ${anoLbl(ano)}`} value={fmtX(cvRede)} color={C.text} sub={`${fmtN(pan.inscricoes)} inscrições para ${fmtN(pan.vagas)} vagas`} />
      <StatCard label="Unidade mais concorrida" value={top ? `${fmtX(top.cv)}/vaga` : "—"} color={C.orange} sub={top?.nome} />
      <StatCard label="Jovens em mais de uma unidade" value={fmtN(pan.multi)} color={C.purple} sub={`${fmtP(pan.multi / pan.pessoas, 1)} dos ${fmtN(pan.pessoas)} jovens únicos`} />
      <StatCard label={`Correlação em ${a1}`} value={fmtX(regs[1]?.r, 2)} color={C.cyan} sub={`concorrência × % sem experiência (${forca(regs[1]?.r ?? 0)})`} />
    </div>

    <Secao titulo="1. Mais concorrência, menos jovens sem experiência"
      sub={`Aperte ▶ para ver as unidades se moverem de ${a0} para ${a1}. A linha tracejada é a tendência do ano: inclinada para baixo = unidades mais disputadas têm proporcionalmente menos jovens sem experiência.`}>
      <div className="g2-wide">
        <Card>
          <Lbl>Inscrições por vaga × % sem experiência · cada bolha é uma unidade</Lbl>
          <ChartInfoTooltip id="p1-gap" />
          <BubbleTime rows={bolhas} anos={[a0, a1]} anoGlobal={ano} foco={foco} onPick={setFoco} />
          <Nota>Unidades sem vagas registradas no NIGE para o ano não aparecem naquele ano.</Nota>
        </Card>
        <Card>
          <Lbl>Quem mais se moveu de {a0} para {a1}</Lbl>
          <Movimentos bolhas={bolhas} foco={foco} onPick={setFoco} />
        </Card>
      </div>
    </Secao>

    <div className="g2">
      <Secao titulo="2. A concorrência real é menor que a aparente"
        sub="Muitos jovens tentam várias unidades. Descontando quem também se inscreveu em outra, a disputa por vaga cai — em algumas unidades, pela metade.">
        <Card>
          <Lbl>Inscrições por vaga · aparente × exclusiva · {anoLbl(ano)}</Lbl>
          <ChartInfoTooltip id="p1-dumbbell" />
          <div style={{ display: "flex", gap: 14, fontSize: 11, color: C.muted, marginBottom: 6 }}>
            <span><span style={{ color: C.text }}>●</span> todas as inscrições</span>
            <span><span style={{ color: C.cyan }}>●</span> só quem se inscreveu apenas aqui</span>
          </div>
          <Dumbbell foco={foco} onPick={setFoco} rows={rows.map(r => ({ k: r.u, label: r.nome, a: r.cv, b: Math.max(0, r.cvReal), extra: r }))} />
        </Card>
      </Secao>

      <Secao titulo="3. Quem disputa candidatos com quem"
        sub="Unidades da mesma cidade dividem o mesmo público. Passe o mouse numa unidade para ver com quem ela compete.">
        <Card>
          <Lbl>Jovens inscritos em duas unidades · {anoLbl(ano)}</Lbl>
          <ChartInfoTooltip id="p1-arc" />
          <ArcDiagram foco={foco} onPick={setFoco} links={pares}
            nodes={D.unidades.map(u => ({ k: u.id, label: u.nome, cidade: u.cidade, peso: rows.find(r => r.u === u.id)?.multi || 0 }))} />
          <Nota>Ordenadas por cidade (faixa colorida sob os nomes). Pares com menos de 5 jovens em comum não aparecem.</Nota>
        </Card>
      </Secao>
    </div>

    <Takeaway>
      A concorrência pesa, de leve, contra o público prioritário: as unidades mais procuradas tendem a receber proporcionalmente mais candidatos que já trabalharam.
      Como a maioria dessas unidades fica em Porto Alegre e dividem candidatos entre si (em {maisDividida?.nome}, {fmtP(maisDividida?.pctMulti)} dos
      inscritos também tentaram outra unidade), uma <b>agenda de seleção coordenada</b> entre unidades vizinhas evitaria que o mesmo jovem ocupe
      várias filas, e ajudaria a medir a demanda real. Nas unidades concorridas, a etapa de seleção precisa ativamente priorizar quem nunca trabalhou.
    </Takeaway>
    <Proximo tab="p1b" />
  </div>;
}

// Lista lateral do gráfico animado: as unidades com maior deslocamento, para
// o apresentador saber para onde apontar quando a animação roda.
function Movimentos({ bolhas, foco, onPick }) {
  const mov = bolhas.filter(b => b.A && b.B).map(b => ({ ...b, dp: b.B.pct - b.A.pct, dc: b.B.cv - b.A.cv }))
    .sort((x, y) => Math.abs(y.dp) - Math.abs(x.dp)).slice(0, 9);
  return <div style={{ display: "grid", gap: 4 }}>
    {mov.map(m => {
      const c = m.dp < 0 ? C.red : C.green;
      const sel = foco === m.u;
      return <button key={m.u} onClick={() => onPick(m.u)} style={{ display: "grid", gridTemplateColumns: "1fr auto auto", gap: 10, alignItems: "center",
        textAlign: "left", padding: "7px 9px", borderRadius: 8, cursor: "pointer", border: `1px solid ${sel ? C.yellow : C.border}`,
        background: sel ? `${C.yellow}14` : C.dim, color: C.text }}>
        <span style={{ fontSize: 12, fontWeight: 650, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{m.nome}</span>
        <span style={{ fontSize: 11, color: c, fontWeight: 800, fontFamily: "ui-monospace, monospace" }}>{m.dp < 0 ? "▼" : "▲"} {fmtX(Math.abs(m.dp) * 100)} p.p.</span>
        <span style={{ fontSize: 10.5, color: C.muted, fontFamily: "ui-monospace, monospace", minWidth: 74, textAlign: "right" }}>{fmtX(m.A.cv)}→{fmtX(m.B.cv)}/vaga</span>
      </button>;
    })}
    <Nota>Variação do % sem experiência e da concorrência. Clique para acompanhar a unidade na animação.</Nota>
  </div>;
}
