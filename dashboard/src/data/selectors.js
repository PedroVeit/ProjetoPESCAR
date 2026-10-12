// Funções puras que recortam o json agregado para cada gráfico. Nenhuma delas
// recria dado individual: só somam contagens já agregadas pelo pipeline.
//
// Convenção de supressão: contagem 1–4 chega como null. Onde o total é exato
// (ex.: respondentes da unidade), o complemento é recuperado por subtração;
// onde não dá, o valor fica null e o gráfico mostra "<5".

export const anosDe = (D, ano) => (ano === 0 ? D.meta.anos : [ano]);
export const nomeU = (D, id) => D.unidades[id]?.nome ?? `#${id}`;
export const K = D => D.meta.k_min;

// ---------- formatação pt-BR ----------
const nf = (d = 0) => ({ minimumFractionDigits: d, maximumFractionDigits: d });
export const fmtN = n => (n == null ? "—" : Math.round(n).toLocaleString("pt-BR"));
export const fmtP = (p, d = 0) => (p == null || !isFinite(p) ? "—" : `${(p * 100).toLocaleString("pt-BR", nf(d))}%`);
export const fmtPP = (x, d = 1) => (x == null || !isFinite(x) ? "—" : `${x > 0 ? "+" : ""}${(x * 100).toLocaleString("pt-BR", nf(d))} p.p.`);
export const fmtX = (x, d = 1) => (x == null || !isFinite(x) ? "—" : `${x.toLocaleString("pt-BR", nf(d))}`);
export const fmtSM = (x, d = 2) => (x == null ? "—" : `${x.toLocaleString("pt-BR", nf(d))} SM`);
export const fmtBRL = x => (x == null ? "—" : x.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }));
export const anoLbl = ano => (ano === 0 ? "2025 + 2026" : String(ano));

// ---------- estatística ----------
export function wilson(k, n, z = 1.96) {
  if (!n) return [0, 0];
  const p = k / n, d = 1 + (z * z) / n;
  const c = (p + (z * z) / (2 * n)) / d;
  const h = (z * Math.sqrt((p * (1 - p)) / n + (z * z) / (4 * n * n))) / d;
  return [Math.max(0, c - h), Math.min(1, c + h)];
}

export function pearson(xs, ys) {
  const n = xs.length;
  if (n < 3) return null;
  const mx = xs.reduce((a, b) => a + b, 0) / n, my = ys.reduce((a, b) => a + b, 0) / n;
  let sxy = 0, sxx = 0, syy = 0;
  for (let i = 0; i < n; i++) { const dx = xs[i] - mx, dy = ys[i] - my; sxy += dx * dy; sxx += dx * dx; syy += dy * dy; }
  if (!sxx || !syy) return null;
  return { r: sxy / Math.sqrt(sxx * syy), b: sxy / sxx, a: my - (sxy / sxx) * mx };
}

// ---------- panorama ----------
export function panorama(D, ano) {
  const anos = anosDe(D, ano);
  const z = { inscricoes: 0, pessoas: 0, multi: 0, responderam: 0, sem: 0, com: 0, renda_valida: 0, ate_meio_sm: 0, vagas: 0 };
  const us = new Set();
  for (const p of D.panorama) if (anos.includes(p.ano)) for (const k in z) z[k] += p[k];
  for (const r of D.p1) if (anos.includes(r.ano)) us.add(r.u);
  return { ...z, unidades: us.size, pctSem: z.responderam ? z.sem / z.responderam : null };
}

// ---------- P1 ----------
function semCom(r) {
  let { sem, com } = r;
  if (sem == null && com != null) sem = r.resp - com;
  if (com == null && sem != null) com = r.resp - sem;
  return sem == null ? null : { sem, com };
}

export function p1PorUnidade(D, ano) {
  const anos = anosDe(D, ano);
  const m = new Map();
  for (const r of D.p1) {
    if (!anos.includes(r.ano)) continue;
    const o = m.get(r.u) || { u: r.u, nome: nomeU(D, r.u), inscricoes: 0, resp: 0, sem: 0, com: 0, ok: true, vagas: 0, inscV: 0, matric: 0, multi: 0, multiSup: false };
    o.inscricoes += r.inscricoes;
    o.resp += r.resp;
    const sc = semCom(r);
    if (sc) { o.sem += sc.sem; o.com += sc.com; } else o.ok = false;
    if (r.vagas != null && r.vagas > 0) { o.vagas += r.vagas; o.matric += r.matric || 0; o.inscV += r.inscricoes; }
    if (r.multi == null) o.multiSup = true; else o.multi += r.multi;
    m.set(r.u, o);
  }
  return [...m.values()].map(o => ({
    ...o,
    pct: o.ok && o.resp >= K(D) ? o.sem / o.resp : null,
    cv: o.vagas ? o.inscV / o.vagas : null,
    // Demanda exclusiva: só os jovens que se inscreveram apenas nesta unidade.
    cvReal: o.vagas ? (o.inscV - (o.inscV === o.inscricoes ? o.multi : o.multi * (o.inscV / o.inscricoes))) / o.vagas : null,
    pctMulti: o.inscricoes ? o.multi / o.inscricoes : null,
  }));
}

export function slope(D) {
  const [a0, a1] = D.meta.anos.slice(-2);
  const A = new Map(p1PorUnidade(D, a0).map(r => [r.u, r]));
  const B = new Map(p1PorUnidade(D, a1).map(r => [r.u, r]));
  const out = [];
  for (const [u, ra] of A) {
    const rb = B.get(u);
    if (!rb || ra.pct == null || rb.pct == null) continue;
    out.push({ u, nome: ra.nome, a: ra.pct, b: rb.pct, d: rb.pct - ra.pct, na: ra.resp, nb: rb.resp });
  }
  return { anos: [a0, a1], linhas: out };
}

export function sobreposicao(D, ano) {
  const anos = anosDe(D, ano);
  const m = new Map();
  for (const s of D.sobreposicao) {
    if (!anos.includes(s.ano)) continue;
    const k = `${s.a}|${s.b}`;
    m.set(k, { a: s.a, b: s.b, n: (m.get(k)?.n || 0) + s.n });
  }
  return [...m.values()].sort((x, y) => y.n - x.n);
}

// ---------- P2 ----------
const expsDe = exp => (exp === "todos" ? ["sem", "com"] : [exp]);

export function dist(D, v, ano, exp, u = null) {
  const V = D.p2.vars[v];
  const anos = anosDe(D, ano), exps = expsDe(exp);
  const n = V.cats.map(() => 0);
  let sup = false;
  if (u == null) {
    for (const [a, e, ci, x] of V.totais) if (anos.includes(a) && exps.includes(e)) n[ci] += x;
  } else {
    for (const [uu, a, e, ci, x] of V.linhas) {
      if (uu !== u || !anos.includes(a) || !exps.includes(e)) continue;
      if (x == null) sup = true; else n[ci] += x;
    }
  }
  const tot = n.reduce((s, x) => s + x, 0);
  return { rotulo: V.rotulo, cats: V.cats, n, tot, pct: n.map(x => (tot ? x / tot : 0)), sup };
}

export function rendaQ(D, u, ano, exp) {
  const hit = D.p2.renda_q.find(r => r.u === (u ?? -1) && r.ano === ano && r.exp === exp);
  if (!hit) return null;
  const [p10, p25, p50, p75, p90, n] = hit.q;
  return { p10, p25, p50, p75, p90, n };
}

export function rendaHist(D, ano, exp) {
  return D.p2.renda_hist.find(r => r.ano === ano && r.exp === exp)?.bins || [];
}

// ---------- P3 ----------
export function canais(D, ano, u = null) {
  const anos = anosDe(D, ano);
  const out = D.meta.canais.map((nome, c) => ({ c, nome, grupo: D.meta.grupo_canal[nome], n: 0, sem: 0, rv: 0, meio: 0, sup: false }));
  const src = u == null ? D.p3.totais : D.p3.linhas.filter(r => r.u === u);
  for (const t of src) {
    if (!anos.includes(t.ano)) continue;
    const o = out[t.c];
    for (const k of ["n", "sem", "rv", "meio"]) { if (t[k] == null) o.sup = true; else o[k] += t[k]; }
  }
  const base = u == null ? panorama(D, ano).responderam : (p1PorUnidade(D, ano).find(r => r.u === u)?.resp || 0);
  return { base, linhas: out.map(o => ({ ...o, share: base ? o.n / base : 0 })) };
}

export function canalQ(D, ano, c) {
  // Quantis de renda por canal só existem por ano; com "todos" usa o mais recente.
  const a = ano === 0 ? D.meta.anos[D.meta.anos.length - 1] : ano;
  return D.p3.totais.find(t => t.ano === a && t.c === c)?.q || null;
}

export function heatCanal(D, ano) {
  const anos = anosDe(D, ano);
  const resp = new Map(p1PorUnidade(D, ano).map(r => [r.u, r.resp]));
  const m = new Map();
  for (const t of D.p3.linhas) {
    if (!anos.includes(t.ano)) continue;
    const k = `${t.u}|${t.c}`;
    const o = m.get(k) || { n: 0, sup: false };
    if (t.n == null) o.sup = true; else o.n += t.n;
    m.set(k, o);
  }
  return { resp, get: (u, c) => m.get(`${u}|${c}`) || { n: 0, sup: false } };
}

export function fluxo(D, ano) {
  const anos = anosDe(D, ano);
  const m = new Map();
  for (const f of D.p3.fluxo) {
    if (!anos.includes(f.ano) || f.n == null) continue;
    const k = `${f.g}|${f.exp}|${f.f}`;
    m.set(k, { g: f.g, exp: f.exp, f: f.f, n: (m.get(k)?.n || 0) + f.n });
  }
  return [...m.values()];
}
