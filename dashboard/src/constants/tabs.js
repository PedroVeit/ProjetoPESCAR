// Navegação em capítulos. A ordem é a da narrativa: abertura, as três
// perguntas de negócio (cada uma em duas abas: o "o quê" e o "por quê") e o
// fechamento com as respostas e o tratamento dos dados.
// `col` guarda a CHAVE da cor, resolvida no render (tema troca C inteiro).

export const GROUPS = [
  { sec: "Abertura", col: "cyan", items: [["historia", "A história", "comece aqui"]] },
  { sec: "P1 · Prioridade", n: 1, col: "cyan", items: [["p1a", "Sem experiência", "são maioria?"], ["p1b", "Concorrência", "quem disputa a vaga"]] },
  { sec: "P2 · Perfil", n: 2, col: "purple", items: [["p2a", "Quem se inscreve", "perfil socioeconômico"], ["p2b", "Unidades lado a lado", "onde o perfil muda"]] },
  { sec: "P3 · Canais", n: 3, col: "green", items: [["p3a", "Canais de chegada", "como chegam"], ["p3b", "Canal × vulnerabilidade", "quem cada canal traz"]] },
  { sec: "Fechamento", col: "yellow", items: [["respostas", "Respostas", "o que descobrimos"], ["dados", "Dados & LGPD", "como tratamos"]] },
];

export const ORDER = GROUPS.flatMap(g => g.items.map(i => i[0]));
export const TAB_INFO = Object.fromEntries(GROUPS.flatMap(g => g.items.map(([k, l, s]) => [k, { label: l, sub: s, sec: g.sec, col: g.col, n: g.n }])));
