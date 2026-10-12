// Tema: bases (fundo/texto/borda) por tema e
// acentos por paleta. `C` é reatribuído inteiro em updateTheme(), por isso
// NUNCA capture uma cor de C no topo de um módulo — resolva no render.

export const THEMES = {
  dark: { bg: "#000000", card: "#0a0a0a", border: "#1a1a1a", text: "#ffffff", muted: "#6b6b6b", dim: "#0f0f0f" },
  default: { bg: "#0d0f1a", card: "#131625", border: "#1e2340", text: "#e2e8f0", muted: "#7c8aa5", dim: "#141726" },
  light: { bg: "#f0f2f8", card: "#ffffff", border: "#d1d5e8", text: "#1a1f3a", muted: "#5f6676", dim: "#e8eaf4" },
};

const ACCENTS = {
  dark: { green: "#00e5a0", red: "#ff3b6b", blue: "#4d9fff", purple: "#a855f7", yellow: "#fbbf24", cyan: "#22d3ee", orange: "#fb923c" },
  light: { green: "#00a86b", red: "#e0003a", blue: "#1a6fd4", purple: "#7c3aed", yellow: "#d97706", cyan: "#0891b2", orange: "#c2410c" },
};

export let C = {};
export function updateTheme(name = "default") {
  const base = THEMES[name] || THEMES.default;
  C = { ...(name === "light" ? ACCENTS.light : ACCENTS.dark), ...base, theme: name };
}
updateTheme();

// ---- Semântica de cor do projeto (chaves de C, nunca valores) ----
// Sem experiência é o público prioritário: ciano em todo o dashboard.
export const EXP_COL = { sem: "cyan", com: "orange", nr: "muted" };
export const EXP_LBL = { sem: "Sem experiência", com: "Com experiência", nr: "Não respondeu" };
export const ANO_COL = { 2025: "purple", 2026: "blue" };
export const GRUPO_COL = { Institucional: "green", Empresa: "yellow", Digital: "blue", "Mídia": "purple", Informal: "orange", Outros: "muted" };

// Faixas de renda per capita: escala sequencial de um matiz só (roxo), mais
// intensa = mais vulnerável. Opacidades aplicadas sobre C.purple.
export const FAIXA_OP = [1, 0.7, 0.42, 0.18];

export const col = k => C[k] || k;
export const alpha = (hex, a) => {
  const h = Math.round(Math.max(0, Math.min(1, a)) * 255).toString(16).padStart(2, "0");
  return `${hex}${h}`;
};
