import { createContext, useContext } from "react";
import { motion } from "framer-motion";
import { C } from "../constants/theme";
import { TAB_INFO, ORDER } from "../constants/tabs";

// Peças de narrativa. Cada aba de pergunta segue o mesmo arco:
//   pergunta → resposta curta (com os números) → evidências (gráficos) →
//   "o que isso significa para a Fundação" → próximo capítulo.

export const NavCtx = createContext({ tab: "historia", go: () => {} });
export const useNav = () => useContext(NavCtx);

const ease = [0.22, 1, 0.36, 1];

// Número em destaque dentro do texto.
export function Hi({ c = "cyan", children }) {
  const col = C[c] || c;
  return <b style={{ color: col, background: `${col}14`, borderRadius: 4, padding: "0 4px", fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>{children}</b>;
}

export function Pergunta({ tab, pergunta, resposta, children }) {
  const info = TAB_INFO[tab];
  const col = C[info.col];
  return <motion.header initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .5, ease }}
    style={{ position: "relative", marginBottom: 16, padding: "20px 22px 18px", borderRadius: 14, overflow: "hidden",
      background: `linear-gradient(120deg, ${col}16, ${C.card} 55%)`, border: `1px solid ${C.border}` }}>
    <motion.div initial={{ scaleY: 0 }} animate={{ scaleY: 1 }} transition={{ duration: .6, ease, delay: .1 }}
      style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 4, background: col, transformOrigin: "top" }} />
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
      {info.n && <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: 1.4, color: C.bg, background: col, borderRadius: 5, padding: "2px 7px" }}>PERGUNTA {info.n}</span>}
      <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1.4, color: col, textTransform: "uppercase" }}>{info.sec.replace(/^P\d · /, "")} · {info.label}</span>
    </div>
    <h1 style={{ fontSize: "clamp(18px, 2.2vw, 25px)", lineHeight: 1.3, color: C.text, fontWeight: 650, maxWidth: 980, letterSpacing: -0.2 }}>{pergunta}</h1>
    {resposta && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: .35, duration: .5 }}
      style={{ marginTop: 14, display: "flex", gap: 10, alignItems: "flex-start", maxWidth: 980 }}>
      <span style={{ fontSize: 9.5, fontWeight: 800, letterSpacing: 1.3, color: C.muted, border: `1px solid ${C.border}`, borderRadius: 4, padding: "3px 6px", marginTop: 2, whiteSpace: "nowrap" }}>RESPOSTA CURTA</span>
      <p style={{ fontSize: 14, lineHeight: 1.7, color: C.text, opacity: .92 }}>{resposta}</p>
    </motion.div>}
    {children}
  </motion.header>;
}

// Bloco de seção dentro da aba: título narrativo + subtítulo explicando o que
// o leitor deve procurar no gráfico abaixo.
export function Secao({ titulo, sub, children }) {
  return <section style={{ marginTop: 22 }}>
    <motion.div initial={{ opacity: 0, x: -8 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true, amount: .6 }} transition={{ duration: .45, ease }}
      style={{ marginBottom: 10 }}>
      <h2 style={{ fontSize: 15, color: C.text, fontWeight: 650 }}>{titulo}</h2>
      {sub && <p style={{ fontSize: 12.5, color: C.muted, marginTop: 3, lineHeight: 1.55, maxWidth: 900 }}>{sub}</p>}
    </motion.div>
    {children}
  </section>;
}

export function Takeaway({ children, titulo = "O que isso significa para a Fundação", c = "yellow" }) {
  const col = C[c] || c;
  return <motion.aside initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: .4 }} transition={{ duration: .55, ease }}
    style={{ marginTop: 24, padding: "16px 18px", borderRadius: 12, background: `${col}0f`, border: `1px solid ${col}40`, display: "flex", gap: 14 }}>
    <div style={{ fontSize: 20, lineHeight: 1, color: col }}>➜</div>
    <div>
      <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: 1.4, color: col, textTransform: "uppercase", marginBottom: 6 }}>{titulo}</div>
      <div style={{ fontSize: 13.5, color: C.text, lineHeight: 1.7 }}>{children}</div>
    </div>
  </motion.aside>;
}

export function Proximo({ tab }) {
  const { go } = useNav();
  const i = ORDER.indexOf(tab);
  const next = ORDER[i + 1], prev = ORDER[i - 1];
  const card = (k, dir) => {
    if (!k) return <span />;
    const inf = TAB_INFO[k];
    const col = C[inf.col];
    return <motion.button whileHover={{ y: -2 }} whileTap={{ scale: .98 }} onClick={() => go(k)} style={{
      textAlign: dir === "next" ? "right" : "left", cursor: "pointer", background: C.card, border: `1px solid ${C.border}`,
      borderRadius: 10, padding: "10px 14px", color: C.text, minWidth: 0, maxWidth: 340, flex: 1,
    }}>
      <div style={{ fontSize: 9.5, color: C.muted, letterSpacing: 1.2, fontWeight: 700 }}>{dir === "next" ? "PRÓXIMO CAPÍTULO →" : "← CAPÍTULO ANTERIOR"}</div>
      <div style={{ fontSize: 13.5, fontWeight: 700, color: col, marginTop: 3 }}>{inf.label}</div>
      <div style={{ fontSize: 11, color: C.muted }}>{inf.sec} · {inf.sub}</div>
    </motion.button>;
  };
  return <nav style={{ display: "flex", justifyContent: "space-between", gap: 12, marginTop: 28 }}>
    {card(prev, "prev")}{card(next, "next")}
  </nav>;
}

// Aviso de amostra: aparece onde a supressão LGPD ou n pequeno afeta a leitura.
export function Nota({ children, c = "muted" }) {
  return <div style={{ fontSize: 11, color: C[c] || c, marginTop: 8, lineHeight: 1.5, opacity: .9 }}>{children}</div>;
}
