import { useState, useRef, useEffect } from "react";
import { C } from "../../constants/theme";
import { CHART_GUIDES } from "../../constants/chartGuides";

// Ícone "?" no canto do card + painel "como ler este gráfico". O conteúdo
// mora em constants/chartGuides.js.
// Aqui cada verbete também diz QUAL pergunta de negócio o gráfico responde e
// POR QUE essa técnica foi escolhida — é a justificativa pedida no relatório.
export default function ChartInfoTooltip({ id, corner = true, align, top = 10, right = 12 }) {
  const g = CHART_GUIDES[id];
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onDown = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    const onKey = e => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onDown); document.removeEventListener("keydown", onKey); };
  }, [open]);

  if (!g) return null;

  const wrap = corner
    ? { position: "absolute", top, right, zIndex: open ? 61 : 3 }
    : { position: "relative", display: "inline-flex", zIndex: open ? 61 : 3 };

  return <span ref={ref} className={open ? "ci-open" : undefined} style={wrap}>
    <button onClick={() => setOpen(o => !o)} aria-label="Como ler este gráfico" title="Como ler este gráfico" style={{
      width: 20, height: 20, borderRadius: "50%", padding: 0, lineHeight: 1,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: 11, fontWeight: 700, cursor: "pointer",
      border: `1px solid ${open ? C.cyan : C.border}`,
      background: open ? `${C.cyan}22` : "transparent",
      color: open ? C.cyan : C.muted, transition: "all .15s",
    }}>?</button>

    {open && <div style={{
      position: "absolute", top: 26,
      ...((align || (corner ? "right" : "left")) === "right" ? { right: 0 } : { left: 0 }),
      width: 360, maxWidth: "82vw", textAlign: "left",
      background: C.card, border: `1px solid ${C.border}`, borderRadius: 10,
      boxShadow: "0 12px 34px rgba(0,0,0,.42)", padding: "12px 14px",
      animation: "fadeUp .16s ease", cursor: "default",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8, marginBottom: 8 }}>
        <div style={{ fontSize: 10, color: C.cyan, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase" }}>
          Como ler{g.t ? ` · ${g.t}` : ""}
        </div>
        <button onClick={() => setOpen(false)} style={{ background: "none", border: "none", color: C.muted, cursor: "pointer", fontSize: 13, lineHeight: 1, padding: 0 }}>✕</button>
      </div>

      {g.o && <div style={{ fontSize: 11.5, color: C.text, lineHeight: 1.6, marginBottom: 10 }}>{g.o}</div>}

      {g.ler && <div style={{ display: "flex", flexDirection: "column", gap: 5, marginBottom: 10 }}>
        {g.ler.map(([ck, txt], i) => {
          const c = ck ? (C[ck] || ck) : C.muted;
          return <div key={i} style={{ display: "flex", gap: 7, alignItems: "flex-start" }}>
            <span style={{ width: 8, height: 8, borderRadius: 2, background: c, flexShrink: 0, marginTop: 4, opacity: ck ? 1 : .35 }} />
            <span style={{ fontSize: 11, color: C.muted, lineHeight: 1.5 }}>{txt}</span>
          </div>;
        })}
      </div>}

      {g.ex && <div style={{ fontSize: 11, color: C.muted, lineHeight: 1.55, background: C.dim, borderRadius: 6, padding: "8px 10px", marginBottom: 8 }}>
        <b style={{ color: C.text }}>Exemplo de leitura: </b>{g.ex}
      </div>}

      {g.porque && <div style={{ fontSize: 11, color: C.muted, lineHeight: 1.55, background: `${C.purple}12`, border: `1px solid ${C.purple}33`, borderRadius: 6, padding: "8px 10px", marginBottom: g.cuidado ? 8 : 0 }}>
        <b style={{ color: C.purple }}>Por que este gráfico: </b>{g.porque}
      </div>}

      {g.cuidado && <div style={{ fontSize: 11, color: C.muted, lineHeight: 1.55, background: `${C.yellow}12`, border: `1px solid ${C.yellow}33`, borderRadius: 6, padding: "8px 10px" }}>
        <b style={{ color: C.yellow }}>Cuidado: </b>{g.cuidado}
      </div>}
    </div>}
  </span>;
}
