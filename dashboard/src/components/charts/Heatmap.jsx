import { useState } from "react";
import { motion } from "framer-motion";
import { C, alpha } from "../../constants/theme";
import { cellHL, Readout } from "./chartInteract";

// Heatmap em tabela HTML: realce de linha e
// coluna sob o cursor, números crus na barra de leitura abaixo. Clicar num
// cabeçalho ordena as linhas por aquela coluna — com animação de layout, para
// o leitor ver as unidades trocando de posição.
//
// rows: [{ k, label }] · cols: [{ k, label, col }]
// cell(r, c) → { v: 0..1 | null, txt, sup }
export default function Heatmap({ rows, cols, cell, scaleMax, readout, foco, onPick, sortDefault = null, labelW = 170 }) {
  const [hc, setHc] = useState(null);
  const [sortBy, setSortBy] = useState(sortDefault);
  const max = scaleMax ?? Math.max(0.01, ...rows.flatMap(r => cols.map(c => cell(r, c).v ?? 0)));
  const sc = cols.find(c => c.k === sortBy);
  const ordered = !sc ? rows : [...rows].sort((a, b) => (cell(b, sc).v ?? -1) - (cell(a, sc).v ?? -1));

  return <div style={{ overflowX: "auto" }}>
    <table style={{ borderCollapse: "separate", borderSpacing: 2, width: "100%", fontSize: 11, tableLayout: "fixed", minWidth: labelW + cols.length * 52 }} onMouseLeave={() => setHc(null)}>
      <colgroup><col style={{ width: labelW }} />{cols.map(c => <col key={c.k} />)}</colgroup>
      <thead><tr>
        <th />
        {cols.map((c, ci) => {
          const act = sortBy === c.k;
          return <th key={c.k} onClick={() => setSortBy(s => (s === c.k ? null : c.k))} title="Clique para ordenar" style={{
            fontSize: 9.5, fontWeight: 800, color: act ? (c.col || C.text) : C.muted, padding: "4px 2px 6px", cursor: "pointer", verticalAlign: "bottom",
            lineHeight: 1.2, borderBottom: `2px solid ${act ? (c.col || C.text) : hc?.c === ci ? C.text : "transparent"}`, transition: "all .15s",
          }}>{c.label}{act ? " ▾" : ""}</th>;
        })}
      </tr></thead>
      <tbody>
        {ordered.map((r, ri) => {
          const isF = r.k === foco;
          return <motion.tr layout="position" key={r.k} transition={{ type: "spring", stiffness: 300, damping: 32 }}>
            <td onClick={() => onPick?.(r.k)} style={{ textAlign: "right", paddingRight: 8, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
              color: isF ? C.yellow : hc?.r === ri ? C.text : C.muted, fontWeight: isF || hc?.r === ri ? 700 : 500, cursor: onPick ? "pointer" : "default" }}>{r.label}</td>
            {cols.map((c, ci) => {
              const x = cell(r, c);
              const base = c.col || C.purple;
              const t = x.v == null ? 0 : Math.min(1, x.v / max);
              return <td key={c.k} onMouseEnter={() => setHc({ r: ri, c: ci, row: r, col: c })} style={{
                background: x.v == null ? `repeating-linear-gradient(45deg, ${C.border}, ${C.border} 3px, transparent 3px, transparent 6px)` : alpha(base, 0.08 + t * 0.85),
                color: t > .55 ? C.bg : C.text, textAlign: "center", padding: "5px 2px", borderRadius: 4, fontWeight: 650,
                fontFamily: "ui-monospace, monospace", fontSize: 10.5, cursor: "crosshair",
                outline: isF ? `1px solid ${C.yellow}88` : "none", ...cellHL(hc, ri, ci),
              }}>{x.txt}</td>;
            })}
          </motion.tr>;
        })}
      </tbody>
    </table>
    <Readout vazio="passe o mouse numa célula · clique num cabeçalho para ordenar">{hc && readout ? readout(hc.row, hc.col) : null}</Readout>
  </div>;
}
