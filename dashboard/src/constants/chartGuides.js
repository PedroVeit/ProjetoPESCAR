// Verbetes do painel "como ler este gráfico" (ChartInfoTooltip).
//   t        título curto
//   o        o que ESTE gráfico representa (o dado, não o tipo de gráfico)
//   ler      [chaveDeCor | null, texto] — cada cor/forma que aparece
//   ex       leitura concreta
//   porque   qual pergunta responde e por que esta técnica (justificativa do relatório)
//   cuidado  armadilha real de interpretação (opcional)
// Cores por CHAVE de paleta (string). Nunca importe C aqui.

export const CHART_GUIDES = {
  "historia-pontos": {
    t: "Gráfico de unidades",
    o: "Cada ponto representa 10 inscrições. A cada passo da narrativa os mesmos pontos se reorganizam e mudam de cor para mostrar outra divisão do mesmo público.",
    ler: [["cyan", "Ciano: sem experiência profissional."], ["orange", "Laranja: já trabalhou com carteira ou estágio."], [null, "Cinza: não respondeu o questionário, ou o atributo não se aplica."]],
    porque: "Gráficos de unidades tornam proporções concretas (\"de cada 10 pontos, 7…\") e a transição animada mostra que é o mesmo público visto por ângulos diferentes — é a abertura da narrativa.",
    cuidado: "Os pontos são arredondados para múltiplos de 10; os números exatos estão no texto ao lado.",
  },
  "p1-comp": {
    t: "Composição por ano",
    o: "Todas as inscrições do ano divididas entre quem nunca trabalhou, quem já trabalhou e quem não respondeu o questionário socioeconômico.",
    ler: [["cyan", "Sem experiência (público prioritário)."], ["orange", "Com experiência."], [null, "Cinza: inscrições sem questionário — ficam fora dos percentuais."]],
    ex: "Se a fatia ciano encolhe de um ano para o outro, a rede passou a atrair proporcionalmente mais jovens que já trabalharam.",
    porque: "Barra 100% empilhada é a forma mais simples de comparar a mesma parte-do-todo entre dois anos.",
  },
  "p1-rank": {
    t: "Ranking de unidades",
    o: "Percentual de inscritos sem experiência profissional em cada unidade, no ano escolhido no topo. Clique numa linha para destacar a unidade no dashboard inteiro.",
    ler: [["cyan", "Barra ciano: ≥ 60% sem experiência."], ["orange", "Barra laranja: maioria apertada (< 60%)."], [null, "Linha tracejada: 50% — à direita dela, sem experiência é maioria."], [null, "Traço branco: o valor da mesma unidade no outro ano."]],
    ex: "Barra terminando antes do traço branco = a unidade tinha mais jovens sem experiência no outro ano.",
    porque: "Responde \"são maioria em TODAS as unidades?\": o ranking ordenado com a linha dos 50% mostra de uma vez quem está acima e quão perto da linha está o último colocado.",
  },
  "p1-slope": {
    t: "Inclinação 2025 → 2026",
    o: "Cada linha é uma unidade presente nos dois anos; a ponta esquerda é o % sem experiência no primeiro ano e a direita no segundo.",
    ler: [["red", "Vermelho: caiu mais de 5 p.p."], ["green", "Verde: subiu mais de 5 p.p."], ["muted", "Cinza: estável (variação até 5 p.p.)."], [null, "Legenda clicável: liga e desliga cada grupo."]],
    ex: "Uma linha vermelha íngreme é uma unidade que mudou muito de perfil de um ano para o outro.",
    porque: "Responde \"como a proporção mudou de 2025 para 2026\": a inclinação codifica a mudança diretamente, para todas as unidades no mesmo quadro.",
    cuidado: "Unidades com poucos inscritos oscilam mais por acaso; confira o n no tooltip.",
  },
  "p1-gap": {
    t: "Concorrência × perfil",
    o: "Cada bolha é uma unidade. Horizontal: inscrições por vaga (escala logarítmica). Vertical: % de inscritos sem experiência. Tamanho: total de inscrições. O botão ▶ anima a passagem de um ano para o outro.",
    ler: [["cyan", "Bolhas: unidades (destacada = foco)."], [null, "Linha tracejada inclinada: tendência linear do ano mostrado e o r de Pearson."], [null, "Rastro: de onde a unidade veio no ano anterior."]],
    ex: "Se as bolhas mais à direita (mais concorridas) ficam mais baixas, unidades disputadas atraem proporcionalmente menos jovens sem experiência.",
    porque: "Responde \"as unidades mais concorridas atraem menos esse público?\": a dispersão mostra a relação entre duas medidas, e a animação no tempo (estilo Gapminder) mostra se a relação se mantém.",
    cuidado: "Correlação entre unidades não diz nada sobre cada jovem (falácia ecológica). E poucas unidades = r instável.",
  },
  "p1-dumbbell": {
    t: "Concorrência aparente × real",
    o: "Para cada unidade, inscrições por vaga contando todas as inscrições (ponto escuro) e contando só os jovens que se inscreveram APENAS nela (ponto ciano).",
    ler: [["text", "Ponto cheio: concorrência aparente (todas as inscrições)."], ["cyan", "Ponto ciano: demanda exclusiva."], [null, "Distância entre os dois: quanto da procura é dividida com outras unidades."]],
    ex: "Um haltere longo indica que boa parte dos candidatos também tentou outras unidades — a disputa real é menor do que o número de inscritos sugere.",
    porque: "O haltere (dumbbell) compara dois valores da mesma unidade lado a lado, sem empilhar barras.",
    cuidado: "A identificação de quem se inscreveu em mais de uma unidade usa nascimento + sexo + bairro; gêmeos ou homônimos podem ser confundidos.",
  },
  "p1-arc": {
    t: "Disputa entre unidades",
    o: "Cada arco liga duas unidades que dividiram candidatos no mesmo ano. A espessura é o número de jovens inscritos nas duas.",
    ler: [["purple", "Arcos: pares de unidades com 5+ jovens em comum."], [null, "Círculo: tamanho proporcional aos jovens da unidade que também tentaram outra."], [null, "Passe o mouse numa unidade para isolar as conexões dela."]],
    ex: "Arcos grossos entre unidades da mesma cidade mostram que elas competem pelo mesmo público.",
    porque: "O diagrama de arcos mostra uma rede (quem divide candidatos com quem) mantendo as unidades alinhadas e legíveis, ao contrário de um grafo de força que muda a cada carga.",
    cuidado: "Pares com menos de 5 jovens em comum foram omitidos (LGPD).",
  },
  "p2-waffle": {
    t: "De cada 100 jovens",
    o: "Distribuição da renda familiar per capita dos inscritos do grupo escolhido, em 100 quadrados. Cada quadrado = 1% de quem informou renda.",
    ler: [["purple", "Mais escuro = mais vulnerável. Faixas em frações do salário mínimo do ano."], [null, "1/4 SM é o corte do BPC; 1/2 SM é o corte de baixa renda do CadÚnico."]],
    ex: "Se 60 quadrados estão nas duas faixas mais escuras, 60% vivem com até meio salário mínimo por pessoa.",
    porque: "O waffle traduz um percentual em algo contável — mais fácil de lembrar numa apresentação do que uma pizza.",
  },
  "p2-hist": {
    t: "Distribuição da renda per capita",
    o: "Quantos inscritos há em cada faixa de 0,1 salário mínimo de renda per capita, em % do grupo, comparando sem e com experiência.",
    ler: [["cyan", "Área ciano: sem experiência."], ["orange", "Linha laranja: com experiência."], [null, "Linhas verticais: 1/4 SM (BPC), 1/2 SM (CadÚnico) e 1 SM."]],
    ex: "Se a área ciano está mais à esquerda que a linha laranja, quem nunca trabalhou vem de famílias mais pobres.",
    porque: "O histograma mostra a forma da distribuição (onde se concentra, quão longa é a cauda), que uma média esconderia.",
    cuidado: "Renda é autodeclarada. Valores acima de 2 SM foram somados na última barra.",
  },
  "p2-butterfly": {
    t: "Sem × com experiência",
    o: "Para a variável escolhida, o % de cada categoria entre os sem experiência (à esquerda) e os com experiência (à direita).",
    ler: [["cyan", "Esquerda: sem experiência."], ["orange", "Direita: com experiência."], [null, "Coluna à direita: diferença em pontos percentuais."]],
    ex: "Se \"1º EM\" é longo à esquerda e curto à direita, quem nunca trabalhou está mais no início do ensino médio.",
    porque: "O gráfico borboleta (pirâmide) compara dois perfis categoria a categoria no mesmo eixo, sem misturar as escalas.",
  },
  "p2-box": {
    t: "Renda per capita por unidade",
    o: "Para cada unidade, como se distribui a renda familiar per capita dos inscritos do grupo escolhido.",
    ler: [["purple", "Caixa: metade central dos inscritos (25% a 75%)."], [null, "Haste: de 10% a 90%."], ["text", "Ponto: mediana (metade ganha menos que isso)."], [null, "Linhas verticais: 1/4, 1/2 e 1 salário mínimo."]],
    ex: "Uma caixa toda à esquerda da linha de 1/2 SM indica que 75% dos inscritos daquela unidade estão abaixo do corte do CadÚnico.",
    porque: "O boxplot compara distribuições inteiras entre muitas unidades numa coluna só — mostra centro e dispersão, não só a média.",
    cuidado: "Unidades com menos de 10 respostas válidas não têm caixa.",
  },
  "p2-heat": {
    t: "Mapa de calor: unidade × faixa de renda",
    o: "% dos inscritos de cada unidade (linha) em cada faixa de renda per capita (coluna). Cada linha soma 100%.",
    ler: [["purple", "Mais intenso = maior parcela da unidade naquela faixa."], [null, "Clique no cabeçalho de uma coluna para ordenar as unidades por ela."]],
    ex: "Ordenando por \"Até 1/4 SM\", as primeiras linhas são as unidades que mais alcançam os jovens mais pobres.",
    porque: "O heatmap permite ler a matriz inteira de uma vez e achar padrões de linha (unidades parecidas) e de coluna.",
    cuidado: "Células com menos de 5 pessoas aparecem como \"<5\" (LGPD).",
  },
  "p2-small": {
    t: "Small multiples",
    o: "Um mini gráfico por unidade com a distribuição da variável escolhida entre os inscritos sem experiência. A marca tracejada é a média da rede.",
    ler: [["cyan", "Barras: a unidade."], [null, "Traço: a rede inteira, para comparação."], [null, "Clique num mini gráfico para destacar a unidade."]],
    ex: "Uma unidade cujas barras ficam abaixo dos traços na faixa \"Até 1/4 SM\" alcança menos jovens extremamente pobres que a média.",
    porque: "Small multiples repetem o mesmo gráfico com a mesma escala, então o olho compara as formas entre unidades sem ler números.",
  },
  "p3-bars": {
    t: "Canais de chegada",
    o: "% dos inscritos que citaram cada canal ao responder \"como conheceu o Pescar\". Uma pessoa pode citar mais de um canal, então a soma passa de 100%.",
    ler: [["orange", "Laranja: indicação informal (amigos, parentes, ex-alunos)."], ["green", "Verde: institucional (escola, CRAS/CREAS)."], ["blue", "Azul: digital (site, redes sociais)."], [null, "Traço branco: o valor no outro ano."]],
    porque: "Barra horizontal ordenada é a forma mais precisa de comparar tamanhos entre categorias com nomes longos.",
  },
  "p3-heat": {
    t: "Mapa de calor: unidade × canal",
    o: "% dos inscritos de cada unidade que citaram cada canal.",
    ler: [["green", "Mais intenso = canal mais citado na unidade."], [null, "Clique no cabeçalho para ordenar as unidades por um canal."]],
    ex: "Ordenando por CRAS/CREAS, aparecem as unidades onde a rede de assistência social de fato encaminha jovens.",
    porque: "Responde \"por quais canais os jovens chegam EM CADA UNIDADE\": a matriz unidade × canal mostra onde cada canal funciona.",
    cuidado: "Células com menos de 5 pessoas aparecem como \"<5\".",
  },
  "p3-ci": {
    t: "Perfil por canal, com incerteza",
    o: "Para quem chegou por cada canal: % sem experiência (esquerda) e % com renda per capita até 1/2 salário mínimo (direita). A barra horizontal é o intervalo de confiança de 95% (Wilson).",
    ler: [["green", "Ponto: proporção observada, na cor do grupo do canal."], [null, "Barra: intervalo de 95% — onde a proporção real provavelmente está."], [null, "Linha tracejada: média de todos os inscritos."]],
    ex: "Se o intervalo do CRAS/CREAS fica inteiro à direita da linha tracejada, o canal traz um público comprovadamente mais vulnerável que a média, não por acaso.",
    porque: "Responde \"os canais institucionais trazem um público mais vulnerável?\": o gráfico de pontos com intervalo mostra a diferença E o quanto dá para confiar nela — essencial com canais pequenos.",
    cuidado: "Canais com poucos inscritos têm intervalos largos. Quem citou vários canais conta em cada um.",
  },
  "p3-sankey": {
    t: "Fluxo canal → experiência → renda",
    o: "Cada jovem é contado uma vez, pelo canal mais institucional que citou, e segue até a sua experiência e a sua faixa de renda per capita. A largura das faixas é o número de jovens.",
    ler: [["green", "Cor da faixa: grupo do canal de origem."], [null, "Passe o mouse num bloco ou faixa para seguir só aquele caminho."]],
    ex: "Seguindo a faixa verde (institucional), dá para ver quantos dos que chegaram pela escola ou pelo CRAS terminam em \"Até 1/4 SM\".",
    porque: "O diagrama de Sankey mostra como um público se divide em etapas sucessivas, mantendo o total visível.",
    cuidado: "Regra de canal único: CRAS/CREAS e escola têm prioridade sobre os demais quando o jovem citou mais de um.",
  },
  "dados-pipeline": {
    t: "Etapas do tratamento",
    o: "Cada cartão é uma etapa do pipeline de dados, com o total de registros depois dela e quantos foram removidos ou marcados.",
    porque: "Torna o pré-processamento auditável: qualquer número do dashboard pode ser rastreado até a etapa que o produziu.",
  },
  "dados-completude": {
    t: "Completude por planilha",
    o: "% de linhas preenchidas em cada campo padronizado, para cada planilha (unidade + ano).",
    ler: [["green", "Mais intenso = mais preenchido."], ["red", "Texto vermelho: menos de 70% preenchido."]],
    ex: "Uma linha clara inteira é uma planilha em que muitos inscritos não responderam o questionário.",
    porque: "O heatmap de completude é a análise exploratória da qualidade dos dados: mostra onde as respostas faltam antes de qualquer conclusão.",
  },
};
