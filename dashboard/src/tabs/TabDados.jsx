import { motion } from "framer-motion";
import { C } from "../constants/theme";
import { useData, useFilters } from "../data/store";
import { fmtN, fmtP } from "../data/selectors";
import { Card, Lbl } from "../components/atoms";
import { Secao, Proximo, Nota } from "../components/story";
import { useCountUp } from "../components/atoms";
import ChartInfoTooltip from "../components/charts/ChartInfoTooltip";
import Heatmap from "../components/charts/Heatmap";
import { RV } from "../components/charts/chartInteract";

const ease = [0.22, 1, 0.36, 1];
const ROTULO_CAMPO = {
  experiencia: "Experiência", renda: "Renda", moradores: "Moradores", moradia: "Moradia", escolaridade: "Escolaridade",
  estuda: "Estuda?", turno: "Turno", curso_prof: "Curso prof.", canal: "Canal", idade_decl: "Idade", cidade: "Cidade",
};

export default function TabDados() {
  const D = useData();
  const { foco, setFoco } = useFilters();
  const etapas = D.tratamento;
  const campos = D.meta.campos_completude;

  return <div>
    <motion.header initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .5, ease }}
      style={{ padding: "22px 24px", borderRadius: 14, border: `1px solid ${C.border}`, background: `linear-gradient(120deg, ${C.blue}14, ${C.card} 60%)`, marginBottom: 6 }}>
      <div style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: 1.5, color: C.blue }}>FECHAMENTO · DADOS & LGPD</div>
      <h1 style={{ fontSize: "clamp(20px, 2.4vw, 28px)", marginTop: 8, lineHeight: 1.25 }}>Do arquivo bruto ao gráfico</h1>
      <p style={{ color: C.muted, fontSize: 13.5, marginTop: 6, maxWidth: 920, lineHeight: 1.6 }}>
        {D.meta.arquivos} planilhas em {D.meta.layouts} layouts de coluna diferentes, o Controle NIGE e a lista de endereços passam por um pipeline em Python
        (<code>src/pipeline/build_dashboard_data.py</code>) que padroniza, limpa, enriquece, integra e publica <b>só agregados</b>. Cada etapa abaixo mostra
        quantos registros saem dela.</p>
    </motion.header>

    <Secao titulo="1. As etapas do tratamento" sub="Em ordem de execução. O número grande é o total depois da etapa; o vermelho, o que foi removido ou marcado.">
      <Card>
        <Lbl>Pipeline de pré-processamento</Lbl>
        <ChartInfoTooltip id="dados-pipeline" />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: 10 }}>
          {etapas.map((e, i) => <Etapa key={e.etapa} e={e} i={i} />)}
        </div>
      </Card>
    </Secao>

    <div className="g2-wide">
      <Secao titulo="2. Qualidade: onde faltam respostas" sub="Percentual de linhas preenchidas por campo em cada planilha. Linhas claras = muitos inscritos sem questionário.">
        <Card>
          <Lbl>Completude por planilha (unidade + ano) × campo</Lbl>
          <ChartInfoTooltip id="dados-completude" />
          <div style={{ maxHeight: 640, overflowY: "auto" }}>
            <Heatmap labelW={190} scaleMax={1} foco={foco} onPick={k => setFoco(+k.split("|")[0])}
              rows={D.completude.map(c => ({ k: `${c.u}|${c.ano}`, label: `${D.unidades[c.u].nome} ${c.ano}`, c }))}
              cols={campos.map(k => ({ k, label: ROTULO_CAMPO[k] || k, col: C.green }))}
              cell={(r, c) => { const v = r.c.c[c.k]; return { v, txt: Math.round(v * 100) }; }}
              readout={(r, c) => <><b style={{ color: C.text }}>{r.label}</b><RV l={c.label} v={`${fmtP(r.c.c[c.k], 1)} preenchido`} c={r.c.c[c.k] < .7 ? C.red : C.green} /></>} />
          </div>
          <Nota>Valores em % (0–100). Clique numa linha para destacar a unidade no dashboard.</Nota>
        </Card>
      </Secao>

      <div>
        <Secao titulo="3. LGPD: o que é publicado" sub="O painel é público; os dados de origem não são.">
          <Card>
            <Lista c="green" titulo="Sai do pipeline" itens={[
              "Contagens e percentuais por unidade, ano, experiência e categoria",
              "Quantis de renda per capita (grupos com 10+ pessoas)",
              "Pares de unidades com 5+ candidatos em comum",
              "Completude dos campos (sem nenhum valor individual)",
            ]} />
            <Lista c="red" titulo="Nunca sai" itens={[
              "Nome, código do candidato, data de nascimento, bairro, escola",
              "Raça e deficiência (dados sensíveis, art. 5º II) — não usados",
              `Qualquer contagem de 1 a ${D.meta.k_min - 1} pessoas (vira "<${D.meta.k_min}")`,
            ]} />
            <Nota>As planilhas ficam em <code>data/</code>, ignorada pelo Git. Nascimento + bairro são usados só dentro do pipeline, para achar inscrições repetidas.</Nota>
          </Card>
        </Secao>

        <Secao titulo="4. Como incluir um ano novo" sub="O pré-processamento não tem nada fixo por ano.">
          <Card>
            <ol style={{ display: "grid", gap: 8, paddingLeft: 18, fontSize: 12.5, lineHeight: 1.6, color: C.text }}>
              <li>Salvar as planilhas em <code>data/</code> com o nome <code>&lt;Unidade&gt; &lt;Ano&gt;.xlsx</code> (sufixo <code>- 2</code> para uma 2ª turma).</li>
              <li>Atualizar o Controle NIGE em <code>data/</code> e, se o ano for novo, o salário mínimo em <code>SALARIO_MINIMO</code>.</li>
              <li>Rodar <code>npm run dados</code> na pasta <code>dashboard/</code>. O relatório do terminal lista unidades sem correspondência no NIGE (adicionar ao <code>DE_PARA</code>).</li>
              <li>Recarregar o painel: o novo ano aparece nos filtros e em todos os gráficos.</li>
            </ol>
          </Card>
        </Secao>

        <Secao titulo="5. Integração com o NIGE">
          <Card>
            <div style={{ maxHeight: 260, overflowY: "auto", fontSize: 11.5 }}>
              {D.unidades.map(u => <div key={u.id} style={{ display: "grid", gridTemplateColumns: "1fr 14px 1fr", gap: 6, padding: "3px 0", borderBottom: `1px solid ${C.border}` }}>
                <span>{u.nome}</span><span style={{ color: C.muted }}>→</span>
                <span style={{ color: u.nige ? C.muted : C.red, fontFamily: "ui-monospace, monospace", fontSize: 10.5 }}>{u.nige || "sem correspondência"}</span>
              </div>)}
            </div>
            <Nota>Casamento automático por similaridade de nomes + de-para manual para os Hubs.</Nota>
          </Card>
        </Secao>
      </div>
    </div>
    <Proximo tab="dados" />
  </div>;
}

function Etapa({ e, i }) {
  const n = useCountUp(e.n == null ? "—" : fmtN(e.n));
  return <motion.div initial={{ opacity: 0, y: 14 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * .08, duration: .45, ease }}
    style={{ position: "relative", padding: "12px 14px", borderRadius: 10, background: C.dim, border: `1px solid ${C.border}` }}>
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <span style={{ width: 20, height: 20, borderRadius: "50%", background: `${C.blue}22`, color: C.blue, fontSize: 10.5, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center" }}>{i + 1}</span>
      <span style={{ fontSize: 12, fontWeight: 750 }}>{e.etapa}</span>
    </div>
    <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginTop: 8 }}>
      <span style={{ fontSize: 22, fontWeight: 800, fontVariantNumeric: "tabular-nums" }}>{n}</span>
      {e.rem ? <span style={{ fontSize: 11.5, fontWeight: 700, color: C.red }}>−{fmtN(e.rem)}</span> : null}
    </div>
    <div style={{ fontSize: 11, color: C.muted, lineHeight: 1.5, marginTop: 4 }}>{e.txt}</div>
  </motion.div>;
}

function Lista({ c, titulo, itens }) {
  return <div style={{ marginBottom: 12 }}>
    <div style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: 1.2, color: C[c], marginBottom: 6 }}>{titulo.toUpperCase()}</div>
    {itens.map(t => <div key={t} style={{ display: "grid", gridTemplateColumns: "16px 1fr", gap: 4, fontSize: 12.5, lineHeight: 1.55, color: C.text }}>
      <span style={{ color: C[c] }}>{c === "green" ? "✓" : "✕"}</span><span>{t}</span></div>)}
  </div>;
}
