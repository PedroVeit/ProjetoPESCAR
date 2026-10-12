import { useEffect, useMemo, useState, useCallback, lazy, Suspense } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { C, updateTheme } from "./constants/theme";
import { GROUPS, ORDER, TAB_INFO } from "./constants/tabs";
import { DataProvider, FilterProvider, useDataState, useFilters } from "./data/store";
import { NavCtx } from "./components/story";
import { Seg } from "./components/atoms";
import ErrorBoundary from "./components/ErrorBoundary";

const TABS = {
  historia: lazy(() => import("./tabs/TabHistoria")),
  p1a: lazy(() => import("./tabs/TabP1a")),
  p1b: lazy(() => import("./tabs/TabP1b")),
  p2a: lazy(() => import("./tabs/TabP2a")),
  p2b: lazy(() => import("./tabs/TabP2b")),
  p3a: lazy(() => import("./tabs/TabP3a")),
  p3b: lazy(() => import("./tabs/TabP3b")),
  respostas: lazy(() => import("./tabs/TabRespostas")),
  dados: lazy(() => import("./tabs/TabDados")),
};

const THEME_KEY = "pescar-theme";
const lerTema = () => { try { return localStorage.getItem(THEME_KEY) || "default"; } catch { return "default"; } };
const tabDoHash = () => { const h = location.hash.replace(/^#\/?/, ""); return ORDER.includes(h) ? h : "historia"; };

export default function App() {
  const [theme, setTheme] = useState(lerTema);
  // C é global de módulo: atualiza ANTES de os filhos renderizarem.
  useMemo(() => updateTheme(theme), [theme]);
  useEffect(() => {
    document.body.style.background = C.bg;
    document.body.style.color = C.text;
    try { localStorage.setItem(THEME_KEY, theme); } catch { /* sem storage */ }
  }, [theme]);

  return <DataProvider><FilterProvider>
    <Shell theme={theme} setTheme={setTheme} />
  </FilterProvider></DataProvider>;
}

function Shell({ theme, setTheme }) {
  const { data, erro } = useDataState();
  const [tab, setTab] = useState(tabDoHash);

  const go = useCallback(k => {
    if (!ORDER.includes(k)) return;
    history.pushState(null, "", `#/${k}`);
    setTab(k);
    window.scrollTo({ top: 0, behavior: "instant" });
  }, []);

  useEffect(() => {
    const onHash = () => setTab(tabDoHash());
    window.addEventListener("popstate", onHash);
    return () => window.removeEventListener("popstate", onHash);
  }, []);

  // Modo apresentação: ← → trocam de capítulo (fora de campos de formulário).
  useEffect(() => {
    const onKey = e => {
      if (e.target.closest?.("input, select, textarea") || e.altKey || e.ctrlKey || e.metaKey) return;
      const i = ORDER.indexOf(tab);
      if (e.key === "ArrowRight" && i < ORDER.length - 1) go(ORDER[i + 1]);
      if (e.key === "ArrowLeft" && i > 0) go(ORDER[i - 1]);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [tab, go]);

  const Tab = TABS[tab];

  return <NavCtx.Provider value={{ tab, go }}>
    <div style={{ minHeight: "100vh", background: C.bg, color: C.text, fontFamily: "'DM Sans', system-ui, sans-serif" }}>
      <Header theme={theme} setTheme={setTheme} tab={tab} />
      <div className="shell">
        <Sidebar tab={tab} go={go} data={data} />
        <main className="main">
          {erro && <Erro msg={erro} />}
          {!erro && !data && <Carregando />}
          {data && <AnimatePresence mode="wait">
            <motion.div key={tab} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
              transition={{ duration: .32, ease: [0.22, 1, 0.36, 1] }}>
              <ErrorBoundary resetKey={tab}><Suspense fallback={<Carregando />}><Tab /></Suspense></ErrorBoundary>
            </motion.div>
          </AnimatePresence>}
        </main>
      </div>
    </div>
  </NavCtx.Provider>;
}

// ---------------------------------------------------------------------------

function Logo() {
  return <svg width="30" height="30" viewBox="0 0 32 32" aria-hidden="true">
    <defs><linearGradient id="lg-logo" x1="0" x2="1" y1="0" y2="1"><stop offset="0" stopColor={C.cyan} /><stop offset="1" stopColor={C.purple} /></linearGradient></defs>
    <rect width="32" height="32" rx="9" fill="url(#lg-logo)" />
    {[0, 1, 2, 3].map(i => <rect key={i} x={7 + i * 5} y={22 - [5, 9, 13, 8][i]} width="3.4" height={[5, 9, 13, 8][i]} rx="1.2" fill={C.bg} opacity={.9} />)}
  </svg>;
}

function Header({ theme, setTheme, tab }) {
  const { data } = useDataState();
  const { ano, setAno, foco, setFoco, limparFoco } = useFilters();
  const anos = data?.meta.anos || [];
  const info = TAB_INFO[tab];
  return <header style={{ position: "sticky", top: 0, zIndex: 50, height: 54, display: "flex", alignItems: "center", gap: 14, padding: "0 16px",
    background: `${C.bg}e6`, backdropFilter: "blur(10px)", borderBottom: `1px solid ${C.border}` }}>
    <Logo />
    <div style={{ minWidth: 0 }}>
      <div style={{ fontSize: 14.5, fontWeight: 750, letterSpacing: -0.2, whiteSpace: "nowrap" }}>Pescar em Dados</div>
      <div style={{ fontSize: 10.5, color: C.muted, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
        {info.sec} · <span style={{ color: C[info.col] }}>{info.label}</span>
      </div>
    </div>
    <div style={{ flex: 1 }} />
    {data && <>
      <Seg value={ano} onChange={setAno} options={[{ v: 0, l: "Todos os anos" }, ...anos.map(a => ({ v: a, l: String(a) }))]} />
      <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
        <select aria-label="Unidade em foco" value={foco ?? ""} onChange={e => e.target.value === "" ? limparFoco() : setFoco(Number(e.target.value))}
          style={{ appearance: "none", background: foco != null ? `${C.yellow}1c` : C.bg, color: foco != null ? C.yellow : C.muted,
            border: `1px solid ${foco != null ? C.yellow : C.border}`, borderRadius: 8, padding: "6px 28px 6px 10px", fontSize: 11.5, fontWeight: 600, cursor: "pointer", maxWidth: 210 }}>
          <option value="">Destacar unidade…</option>
          {[...data.unidades].sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR")).map(u => <option key={u.id} value={u.id}>{u.nome}</option>)}
        </select>
        <span style={{ position: "absolute", right: 10, pointerEvents: "none", fontSize: 9, color: C.muted }}>▼</span>
      </div>
    </>}
    <ThemeToggle theme={theme} setTheme={setTheme} />
  </header>;
}

function ThemeToggle({ theme, setTheme }) {
  const opts = [["dark", "◐", "Escuro"], ["default", "◑", "Padrão"], ["light", "○", "Claro"]];
  return <div role="group" aria-label="Tema" style={{ display: "flex", border: `1px solid ${C.border}`, borderRadius: 8, padding: 2, background: C.bg }}>
    {opts.map(([k, ic, l]) => <button key={k} title={`Tema ${l}`} onClick={() => setTheme(k)} style={{
      width: 26, height: 24, border: 0, borderRadius: 6, cursor: "pointer", fontSize: 13,
      background: theme === k ? `${C.blue}22` : "transparent", color: theme === k ? C.blue : C.muted, transition: "all .15s",
    }}>{ic}</button>)}
  </div>;
}

function Sidebar({ tab, go, data }) {
  const i = ORDER.indexOf(tab);
  return <aside className="sidebar" style={{ background: C.bg, borderRight: `1px solid ${C.border}` }}>
    <div className="sidebar-inner" style={{ position: "sticky", top: 54, maxHeight: "calc(100vh - 54px)", overflowY: "auto", padding: "12px 0" }}>
      {GROUPS.map(({ sec, col, items, n }) => {
        const c = C[col];
        return <div key={sec} style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 9, color: c, textTransform: "uppercase", letterSpacing: 1.3, fontWeight: 800, padding: "4px 14px", display: "flex", alignItems: "center", gap: 6, whiteSpace: "nowrap" }}>
            {n ? <span style={{ background: c, color: C.bg, borderRadius: 4, padding: "0 5px", fontSize: 9 }}>{n}</span>
              : <span style={{ width: 6, height: 6, borderRadius: "50%", background: c }} />}
            {sec.replace(/^P\d · /, "")}
          </div>
          {items.map(([k, label, sub]) => {
            const act = tab === k;
            return <button key={k} onClick={() => go(k)} className={act ? "nav-btn active" : "nav-btn"} style={{
              display: "block", width: "100%", textAlign: "left", padding: "6px 14px", border: "none", cursor: "pointer",
              borderLeft: `2px solid ${act ? c : "transparent"}`, background: act ? `${c}1a` : "transparent", transition: "all .12s", whiteSpace: "nowrap",
            }}>
              <div style={{ fontSize: 12.5, fontWeight: act ? 700 : 550, color: act ? c : C.text, opacity: act ? 1 : .82 }}>{label}</div>
              <div style={{ fontSize: 10, color: C.muted }}>{sub}</div>
            </button>;
          })}
        </div>;
      })}
      <div style={{ padding: "10px 14px", borderTop: `1px solid ${C.border}`, marginTop: 6 }}>
        <div style={{ fontSize: 9.5, color: C.muted, marginBottom: 6 }}>Capítulo {i + 1} de {ORDER.length} · use ← →</div>
        <div style={{ height: 3, background: C.border, borderRadius: 2, overflow: "hidden" }}>
          <motion.div animate={{ width: `${((i + 1) / ORDER.length) * 100}%` }} transition={{ duration: .5, ease: [0.22, 1, 0.36, 1] }}
            style={{ height: 3, background: `linear-gradient(90deg, ${C.cyan}, ${C.purple}, ${C.green})` }} />
        </div>
        {data && <div style={{ fontSize: 9.5, color: C.muted, marginTop: 10, lineHeight: 1.5 }}>
          Dados agregados gerados em {new Date(data.meta.gerado_em).toLocaleDateString("pt-BR")}<br />
          {data.meta.arquivos} planilhas · {data.unidades.length} unidades
        </div>}
      </div>
    </div>
  </aside>;
}

function Carregando() {
  return <div style={{ display: "grid", gap: 12 }}>
    {[120, 260, 220].map((h, i) => <div key={i} style={{ height: h, borderRadius: 12, background: C.card, border: `1px solid ${C.border}`, animation: `pulse 1.4s ease ${i * .15}s infinite` }} />)}
  </div>;
}

function Erro({ msg }) {
  return <div style={{ padding: 20, borderRadius: 12, border: `1px solid ${C.red}55`, background: `${C.red}10`, fontSize: 13, lineHeight: 1.7 }}>
    <b style={{ color: C.red }}>Não foi possível carregar os dados</b> ({msg}).<br />
    Gere o arquivo agregado com <code>npm run dados</code> (precisa das planilhas em <code>data/</code>) e recarregue a página.
  </div>;
}
