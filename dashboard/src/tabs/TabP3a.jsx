import { useMemo } from "react";
import { C, GRUPO_COL } from "../constants/theme";
import { useData, useFilters } from "../data/store";
import { canais, heatCanal, p1PorUnidade, fmtP, fmtN, anoLbl } from "../data/selectors";
import { Card, Lbl, StatCard } from "../components/atoms";
import { Pergunta, Secao, Takeaway, Proximo, Hi, Nota } from "../components/story";
import ChartInfoTooltip from "../components/charts/ChartInfoTooltip";
import RankBars from "../components/charts/RankBars";
import Heatmap from "../components/charts/Heatmap";
import { RV } from "../components/charts/chartInteract";

export default function TabP3a() {
  const D = useData();
  const { ano, foco, setFoco } = useFilters();
  const [a0, a1] = D.meta.anos.slice(-2);
  const outro = ano === a1 ? a0 : ano === a0 ? a1 : null;

  const cs = useMemo(() => canais(D, ano, foco), [D, ano, foco]);
  const csOutro = useMemo(() => (outro ? canais(D, outro, foco) : null), [D, outro, foco]);
  const hm = useMemo(() => heatCanal(D, ano), [D, ano]);
  const unidades = useMemo(() => p1PorUnidade(D, ano).filter(r => r.resp >= 30).sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR")), [D, ano]);

  const L = cs.linhas;
  const by = nome => L.find(l => l.nome === nome);
  const top = [...L].sort((a, b) => b.share - a.share)[0];
  const informal = ["Amigos", "Parentes", "Ex-aluno Pescar"].map(by);
  const cras = by("CRAS/CREAS"), escola = by("Escola");
  // "Ao menos um canal informal" não é a soma (quem citou dois conta uma vez);
  // a soma serve de teto e é apresentada como "até".
  const crasPorUnid = unidades.map(u => ({ u, p: hm.get(u.u, D.meta.canais.indexOf("CRAS/CREAS")).n / u.resp })).sort((a, b) => b.p - a.p);
  const semCras = crasPorUnid.filter(x => x.p < 0.01).length;
  const focoNome = foco != null ? D.unidades[foco].nome : null;

  const cols = D.meta.canais.map((nome, c) => ({ k: String(c), label: nome, col: C[GRUPO_COL[D.meta.grupo_canal[nome]]] }));

  return <div>
    <Pergunta tab="p3a"
      pergunta="Por quais canais os jovens chegam ao Pescar em cada unidade?"
      resposta={<>Principalmente pelo boca a boca: <Hi c="orange">{fmtP(top?.share)}</Hi> citam {top?.nome.toLowerCase()}, e parentes e ex-alunos vêm logo depois.
        A rede de proteção social quase não aparece: <Hi c="green">{fmtP(cras?.share, 1)}</Hi> chegaram por CRAS/CREAS e <Hi c="green">{fmtP(escola?.share)}</Hi> pela escola
        — e em <Hi c="red">{semCras}</Hi> das {unidades.length} unidades o CRAS/CREAS praticamente não encaminha ninguém (menos de 1%).</>} />

    <div className="kpis">
      <StatCard label="Canal mais citado" value={fmtP(top?.share)} color={C.orange} sub={`${top?.nome} · ${anoLbl(ano)}`} />
      <StatCard label="Indicação informal" value={`até ${fmtP(informal.reduce((s, x) => s + x.share, 0))}`} color={C.orange} sub="amigos + parentes + ex-alunos (somas de menções)" />
      <StatCard label="CRAS / CREAS" value={fmtP(cras?.share, 1)} color={C.green} sub={`${fmtN(cras?.n)} inscritos encaminhados pela assistência social`} />
      <StatCard label="Escola" value={fmtP(escola?.share, 1)} color={C.green} sub={`${fmtN(escola?.n)} inscritos`} />
    </div>

    <div className="g2">
      <Secao titulo="1. O boca a boca domina"
        sub={`Cada inscrito podia marcar mais de um canal. ${outro ? `O traço branco é o valor de ${outro}.` : "Escolha um ano no topo para comparar."}${focoNome ? ` Mostrando só ${focoNome}.` : ""}`}>
        <Card>
          <Lbl>Como conheceu o Pescar · % dos inscritos · {anoLbl(ano)}</Lbl>
          <ChartInfoTooltip id="p3-bars" />
          <RankBars labelW={150} max={Math.max(...L.map(l => l.share), ...(csOutro?.linhas.map(l => l.share) || [0])) * 1.08} fmt={v => fmtP(v, 1)}
            rows={L.map(l => ({ k: l.c, label: l.nome, v: l.share, col: C[GRUPO_COL[l.grupo]], ghost: csOutro?.linhas[l.c].share ?? null }))}
            readout={r => { const l = L[r.k]; return <><b style={{ color: C[GRUPO_COL[l.grupo]] }}>{l.nome}</b><span>grupo {l.grupo.toLowerCase()}</span>
              <RV l="inscritos" v={`${fmtN(l.n)} de ${fmtN(cs.base)}`} />{csOutro && <RV l={`em ${outro}`} v={fmtP(csOutro.linhas[l.c].share, 1)} />}</>; }} />
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 8, fontSize: 10.5, color: C.muted }}>
            {D.meta.grupos.map(g => <span key={g}><span style={{ display: "inline-block", width: 9, height: 9, borderRadius: 2, background: C[GRUPO_COL[g]], marginRight: 4 }} />{g}</span>)}
          </div>
        </Card>
      </Secao>

      <Secao titulo="2. Onde cada canal funciona"
        sub="Clique em CRAS/CREAS ou Escola para ordenar as unidades: no topo ficam as que de fato recebem jovens encaminhados pela rede pública.">
        <Card>
          <Lbl>Unidade × canal · % dos inscritos da unidade · {anoLbl(ano)}</Lbl>
          <ChartInfoTooltip id="p3-heat" />
          <Heatmap foco={foco} onPick={setFoco} labelW={140} sortDefault={String(D.meta.canais.indexOf("CRAS/CREAS"))}
            rows={unidades.map(u => ({ k: u.u, label: u.nome }))} cols={cols}
            cell={(r, c) => {
              const x = hm.get(r.k, +c.k), base = hm.resp.get(r.k);
              if (x.sup && !x.n) return { v: null, txt: "<5" };
              return { v: x.n / base, txt: fmtP(x.n / base) };
            }}
            readout={(r, c) => { const x = hm.get(r.k, +c.k), base = hm.resp.get(r.k); return <>
              <b style={{ color: C.text }}>{r.label}</b><RV l={c.label} v={x.sup && !x.n ? "menos de 5" : `${fmtN(x.n)} de ${fmtN(base)} (${fmtP(x.n / base, 1)})`} c={c.col} /></>; }} />
          <Nota>Só unidades com 30+ respostas no recorte. Hachurado: menos de 5 pessoas (LGPD).</Nota>
        </Card>
      </Secao>
    </div>

    <Takeaway>
      Hoje o Pescar cresce por indicação: amigos e parentes de quem já conhece o programa. Isso funciona, mas tende a reproduzir a mesma rede social —
      e deixa de fora quem não tem ninguém por perto que conheça o Pescar. <b>CRAS/CREAS e escolas são os únicos canais que chegam a jovens “de fora da
      rede”</b>, e eles respondem por uma fatia pequena e muito desigual entre as unidades. O próximo capítulo mostra que esse canal pequeno traz o público mais vulnerável.
    </Takeaway>
    <Proximo tab="p3a" />
  </div>;
}
