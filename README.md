# Projeto PESCAR — Visualização de Dados

Dashboard para apoiar a Fundação Projeto Pescar a monitorar se a seleção
de candidatos está de fato priorizando jovens sem experiência
profissional prévia, e a entender o perfil socioeconômico e o fluxo
(inscrição → matrícula → evasão) desse público, por unidade e ao longo
 do tempo.


# Pergunta 1 — Prioridade e concorrência
- Os jovens sem experiência profissional são maioria entre os inscritos de
  todas as unidades, como essa proporção mudou de 2025 para 2026, e as
  unidades mais concorridas atraem menos esse público?
- Dados: inscritos (experiência prévia) + Controle NIGE (vagas). Concorrência
  calculada com e sem inscrições repetidas em mais de uma unidade.

# Pergunta 2 — Perfil de quem se inscreve
- Qual o perfil socioeconômico dos inscritos sem experiência (idade, renda
  familiar per capita, moradia, escolaridade) e como ele difere entre
  unidades e em relação a quem já trabalhou?
- Enriquecimento: renda per capita (renda ÷ (moradores + 1)) em salários mínimos
  do ano.

# Pergunta 3 — Canais de chegada
- Por quais canais os jovens chegam ao Pescar em cada unidade, e os canais
  institucionais (CRAS/CREAS, escola) trazem um público mais vulnerável
  (sem experiência, menor renda per capita) que a indicação informal
  (amigos, parentes)?

# Uso de dados pessoais (LGPD)
- O dashboard e o repositório só contêm dados **agregados**; nenhuma linha
  individual, nome, código, data de nascimento ou bairro sai de `data/`.
- Grupos com menos de 5 pessoas são suprimidos ou agrupados em "outros".
- Raça e deficiência são dados sensíveis (LGPD art. 5º, II): usar apenas
  agregados e somente após confirmar com a Fundação/professora.

DOCUMENTAR TUDO QUE FOI TRATADO NOS DADOS

 - Caihan Garcia
 - Pedro da Costa Peccolo
 - Pedro Passero Veit

# Estrutura

 - `src/pipeline/build_dashboard_data.py` — pipeline de pré-processamento
   (leitura dos 15 layouts de planilha, limpeza, enriquecimento, integração
   com o NIGE, supressão LGPD) → gera `dashboard/public/data/pescar.json`
 - `dashboard/` — dashboard interativo (React + Vite, gráficos em SVG próprios,
   animações com Framer Motion)
 - `src/analysis/` — análises exploratórias anteriores
 - `output/` — indicadores e dados agregados (sem dados pessoais)
 - `data/` — planilhas originais (**não versionadas**)

# Como rodar

```bash
# 1. dados: coloque as planilhas em data/ (podem estar em subpastas)
pip install -r requirements.txt
cd dashboard
npm install
npm run dados      # roda o pipeline e gera public/data/pescar.json
npm run dev        # http://localhost:5173
npm run build      # versão estática em dashboard/dist/ (GitHub Pages, Vercel…)
```

Atalhos do painel: **← →** trocam de capítulo (modo apresentação);
`?estatico` na URL desliga as animações (para capturar imagens para o relatório).

# Dashboard — capítulos

| Aba | Pergunta | Visualizações |
|---|---|---|
| A história | abertura | gráfico de unidades com rolagem (scrollytelling) |
| Sem experiência | P1 | barra 100% empilhada, ranking animado, gráfico de inclinação |
| Concorrência | P1 | dispersão animada no tempo (Gapminder), haltere, diagrama de arcos |
| Quem se inscreve | P2 | waffle, histograma com linhas BPC/CadÚnico, gráfico borboleta |
| Unidades lado a lado | P2 | boxplots, heatmap ordenável, small multiples |
| Canais de chegada | P3 | ranking com comparação entre anos, heatmap unidade × canal |
| Canal × vulnerabilidade | P3 | pontos com intervalo de confiança (Wilson), Sankey |
| Respostas | fechamento | respostas, recomendações e limitações |
| Dados & LGPD | fechamento | etapas do pipeline, heatmap de completude, integração NIGE |

Filtros globais (ano e unidade em destaque) valem para todas as abas. Cada
gráfico tem um "?" com como ler, por que a técnica foi escolhida e cuidados de
interpretação (`dashboard/src/constants/chartGuides.js`).
