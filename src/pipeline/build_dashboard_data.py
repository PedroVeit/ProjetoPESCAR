"""
Pipeline de dados do dashboard Projeto Pescar.

Lê as planilhas de inscritos (uma por unidade/ano), o Controle NIGE e a
planilha de endereços; padroniza, limpa, enriquece e integra; e grava UM json
agregado que o dashboard consome.

Nenhuma linha individual sai daqui. O json só tem contagens e estatísticas
agregadas, e toda contagem entre 1 e K_MIN-1 é suprimida (vira null) — os
inscritos são em boa parte adolescentes, e uma célula "1 jovem" numa unidade
pode identificar alguém (LGPD, arts. 12 e 14).

Para incluir um ano novo basta colocar as planilhas em --inscritos seguindo o
padrão "<Unidade> <Ano>.xlsx" e rodar de novo: nada aqui é fixo por ano.

Uso
---
    python src/pipeline/build_dashboard_data.py \
        --inscritos data/ \
        --nige data/Controle_NIGE_editado.xlsm \
        --enderecos "data/Endereços unidades Pescar.xlsx" \
        --saida dashboard/public/data/pescar.json

Requer: pandas, openpyxl
"""

from __future__ import annotations

import argparse
import json
import re
import unicodedata
from collections import Counter, defaultdict
from datetime import datetime
from itertools import combinations
from pathlib import Path

import numpy as np
import pandas as pd

# ---------------------------------------------------------------------------
# Parâmetros
# ---------------------------------------------------------------------------

# Menor contagem publicada. Células de 1 a K_MIN-1 viram null.
K_MIN = 5

# Salário mínimo nacional do ano letivo (R$). Usado para expressar a renda per
# capita em frações de SM, que é como as políticas sociais cortam faixas
# (CadÚnico: até 1/2 SM per capita; BPC: até 1/4 SM).
# 2025: Decreto 12.342/2024. 2026: valor vigente em jan/2026 — conferir.
SALARIO_MINIMO = {2024: 1412, 2025: 1518, 2026: 1621}

# Faixas de renda per capita, em salários mínimos.
FAIXAS_RENDA = [
    ("Até 1/4 SM", 0.0, 0.25),
    ("1/4 a 1/2 SM", 0.25, 0.5),
    ("1/2 a 1 SM", 0.5, 1.0),
    ("Acima de 1 SM", 1.0, np.inf),
]

# Renda familiar declarada fora deste intervalo é tratada como erro de
# digitação (há respostas como 5.551.982.000.000). Entre 1 e 99 também: são
# quase sempre o número de pessoas digitado no campo errado.
RENDA_MIN_VALIDA, RENDA_MAX_VALIDA = 100, 30000

IDADES = ["Até 15", "16", "17", "18", "19 ou mais"]

ESCOLARIDADE = ["Até 8º EF", "9º EF", "EJA", "1º EM", "2º EM", "3º EM", "EM concluído", "Outro"]

MORADIA = ["Própria", "Financiada", "Alugada", "Emprestada/cedida", "Ocupação", "Instituição/abrigo"]

TURNO = ["Manhã", "Tarde", "Noite"]

# Canais. A pergunta aceita mais de uma resposta (separadas por "|").
CANAIS = [
    "Amigos", "Parentes", "Ex-aluno Pescar", "Escola", "CRAS/CREAS",
    "Site", "Redes sociais", "Filho(a) de funcionário", "Mídia", "Outros",
]
GRUPO_CANAL = {
    "Amigos": "Informal", "Parentes": "Informal", "Ex-aluno Pescar": "Informal",
    "Escola": "Institucional", "CRAS/CREAS": "Institucional",
    "Site": "Digital", "Redes sociais": "Digital",
    "Filho(a) de funcionário": "Empresa", "Mídia": "Mídia", "Outros": "Outros",
}
GRUPOS = ["Institucional", "Empresa", "Digital", "Mídia", "Informal", "Outros"]
# Para o diagrama de fluxo cada jovem precisa de UM canal. Vale o mais
# institucional que ele citou — é o que a pergunta 3 quer isolar.
PRIORIDADE_GRUPO = {g: i for i, g in enumerate(GRUPOS)}

# Campos padronizados e como reconhecê-los no cabeçalho (já normalizado).
# As planilhas vêm em vários layouts; só o que está aqui é lido.
CAMPOS = {
    "respondeu": lambda c: c.startswith("respondeu socio"),
    "codigo": lambda c: c.startswith("codigo do candidato"),
    "nascimento": lambda c: "nascimento" in c,
    "sexo": lambda c: c == "sexo",
    "canal": lambda c: "como" in c and "conheceu" in c,
    "bairro": lambda c: c == "bairro",
    "cidade": lambda c: c == "cidade",
    "uf": lambda c: c.startswith("unidade federativa") or c == "uf",
    "idade_decl": lambda c: c.startswith("qual sua idade"),
    "moradores": lambda c: "moram com voce" in c,
    "renda": lambda c: c.startswith("renda familiar"),
    # Layout antigo de 2025 pergunta "A MORADIA É?" com as mesmas opções.
    "moradia": lambda c: "tipo de sua moradia" in c or c.startswith("a moradia e"),
    "estuda": lambda c: "estuda atualmente" in c,
    "escolaridade": lambda c: "que ano voce estudou" in c,
    "turno": lambda c: c.startswith("horario das aulas"),
    "curso_prof": lambda c: "curso profissionalizante" in c,
    "experiencia": lambda c: "trabalhou com carteira" in c,
    # Lidos só para medir completude; NÃO entram em nenhuma agregação
    # publicada (dados sensíveis, LGPD art. 5º II) — ver README.
    "raca": lambda c: c in ("raca", "raca cor", "cor raca", "cor"),
    "deficiencia": lambda c: c.startswith("tem deficiencia"),
}
CAMPOS_COMPLETUDE = [
    "experiencia", "renda", "moradores", "moradia", "escolaridade", "estuda",
    "turno", "curso_prof", "canal", "idade_decl", "cidade",
]

RE_ARQUIVO = re.compile(r"^(?P<u>.+?)\s+(?P<a>20\d{2})(?:\s*-\s*(?P<t>\d+))?\s*$")


# ---------------------------------------------------------------------------
# Utilidades
# ---------------------------------------------------------------------------

def norm(s) -> str:
    """minúsculo, sem acento, só letras/dígitos separados por espaço."""
    s = unicodedata.normalize("NFKD", str(s)).encode("ascii", "ignore").decode()
    return re.sub(r"[^a-z0-9]+", " ", s.lower()).strip()


def sup(n) -> int | None:
    """Contagem publicável: 1..K_MIN-1 vira None."""
    n = int(n)
    return None if 0 < n < K_MIN else n


def vazio(v) -> bool:
    return v is None or (isinstance(v, float) and np.isnan(v)) or str(v).strip() in ("", "nan", "NaN", "None")


def parse_valor(v) -> float:
    """Valor monetário digitado livremente: '1400', '1.400', '1.400,00', 'R$ 1400'."""
    if vazio(v):
        return np.nan
    s = re.sub(r"[^\d,\.]", "", str(v).strip().lower().replace("r$", ""))
    if not re.search(r"\d", s):
        return np.nan
    if "," in s and "." in s:
        s = s.replace(".", "").replace(",", ".")
    elif "," in s:
        ent, dec = s.rsplit(",", 1)
        s = ent.replace(",", "") + ("." + dec if len(dec) <= 2 else dec)
    elif s.count(".") >= 1:
        ent, dec = s.rsplit(".", 1)
        s = s.replace(".", "") if len(dec) == 3 else ent.replace(".", "") + "." + dec
    try:
        return float(s)
    except ValueError:
        return np.nan


def parse_int(v, lo, hi):
    x = parse_valor(v)
    if np.isnan(x) or x != int(x) or not lo <= x <= hi:
        return np.nan
    return int(x)


# ---------------------------------------------------------------------------
# Classificadores (uma resposta crua -> categoria padronizada)
# ---------------------------------------------------------------------------

def cls_experiencia(v):
    if vazio(v):
        return None
    s = norm(v)
    if s.startswith("se sim") or s.startswith("sim"):
        return "com"
    if s.startswith("nao") or s == "n":
        return "sem"
    return None


def cls_idade(v):
    x = parse_int(v, 13, 29)
    if np.isnan(x):
        return None
    if x <= 15:
        return "Até 15"
    if x >= 19:
        return "19 ou mais"
    return str(int(x))


def cls_escolaridade(v):
    if vazio(v):
        return None
    s = norm(v)
    if "eja" in s:
        return "EJA"
    if "concluido" in s and "medio" in s:
        return "EM concluído"
    m = re.search(r"(\d)\s*o?\s*ano", s)
    if m and "medio" in s:
        return f"{m.group(1)}º EM" if m.group(1) in "123" else "Outro"
    if m and "fundamental" in s:
        return "9º EF" if m.group(1) == "9" else "Até 8º EF"
    return "Outro"


def cls_moradia(v):
    if vazio(v):
        return None
    s = norm(v)
    for chave, cat in [("propria", "Própria"), ("financiada", "Financiada"), ("alugada", "Alugada"),
                       ("emprestada", "Emprestada/cedida"), ("cedida", "Emprestada/cedida"),
                       ("ocupacao", "Ocupação"), ("invasao", "Ocupação"),
                       ("instituicao", "Instituição/abrigo"), ("abrigo", "Instituição/abrigo")]:
        if chave in s:
            return cat
    return None


def cls_turno(v):
    if vazio(v):
        return None
    s = norm(v)
    return {"manha": "Manhã", "tarde": "Tarde", "noite": "Noite"}.get(s.split()[0] if s else "", None)


def cls_sim_nao(v):
    if vazio(v):
        return None
    s = norm(v)
    if s.startswith("se sim") or s.startswith("sim"):
        return "Sim"
    if s.startswith("nao"):
        return "Não"
    return None


def cls_canal(item: str) -> str:
    s = norm(item)
    if "participou" in s:
        return "Ex-aluno Pescar"
    if "amigo" in s:
        return "Amigos"
    if "parente" in s:
        return "Parentes"
    if "escola" in s:
        return "Escola"
    if re.search(r"\bcreas\b|\bcras\b", s):
        return "CRAS/CREAS"
    if "site" in s:
        return "Site"
    if any(k in s for k in ("facebook", "instagram", "rede", "whatsapp", "tiktok")):
        return "Redes sociais"
    if "funcionario" in s or "terceirizado" in s:
        return "Filho(a) de funcionário"
    if any(k in s for k in ("jornal", "radio", "tv", "televis", "revista")):
        return "Mídia"
    return "Outros"


def canais_de(v) -> list[str]:
    if vazio(v):
        return []
    return sorted({cls_canal(p) for p in str(v).split("|") if p.strip()}, key=CANAIS.index)


def faixa_renda(sm):
    if sm is None or np.isnan(sm):
        return None
    for nome, lo, hi in FAIXAS_RENDA:
        if lo <= sm < hi:
            return nome
    return None


# ---------------------------------------------------------------------------
# Leitura das planilhas de inscritos
# ---------------------------------------------------------------------------

def mapear_colunas(cols) -> dict[str, str]:
    """{campo_padronizado: coluna_original}"""
    out = {}
    for col in cols:
        c = norm(col)
        for campo, regra in CAMPOS.items():
            if campo not in out and regra(c):
                out[campo] = col
                break
    return out


def ler_planilha(arquivo: Path):
    """Escolhe a aba de dados (a que tem o campo de experiência e mais linhas)."""
    melhor = None
    for aba in pd.ExcelFile(arquivo).sheet_names:
        df = pd.read_excel(arquivo, sheet_name=aba, dtype=str)
        mapa = mapear_colunas(df.columns)
        if "experiencia" in mapa or "codigo" in mapa:
            if melhor is None or len(df) > len(melhor[0]):
                melhor = (df, mapa, aba)
    return melhor


def carregar_inscritos(pasta: Path, log: list):
    arquivos = sorted(p for p in pasta.rglob("*.xlsx") if not norm(p.name).startswith("endere"))
    partes, layouts, ignorados = [], Counter(), []
    for arq in arquivos:
        m = RE_ARQUIVO.match(arq.stem)
        if not m:
            ignorados.append(arq.name)
            continue
        lido = ler_planilha(arq)
        if lido is None:
            ignorados.append(arq.name)
            continue
        df, mapa, aba = lido
        layouts[tuple(norm(c) for c in df.columns)] += 1
        unidade = re.sub(r"\s+", " ", m.group("u")).strip()
        bruto = pd.DataFrame({campo: df[col] if col in df else None for campo, col in mapa.items()})
        for campo in CAMPOS:
            if campo not in bruto:
                bruto[campo] = None
        bruto["unidade"] = unidade
        bruto["ano"] = int(m.group("a"))
        bruto["arquivo"] = arq.name
        partes.append(bruto)

    if not partes:
        raise SystemExit(f"Nenhuma planilha de inscritos reconhecida em {pasta}")
    df = pd.concat(partes, ignore_index=True)
    log.append({"etapa": "Leitura", "n": len(df),
                "txt": f"{len(partes)} planilhas lidas em {len(layouts)} layouts de coluna diferentes, "
                       f"unificadas em {len(CAMPOS)} campos padronizados."})
    if ignorados:
        print("[aviso] arquivos fora do padrão '<Unidade> <Ano>.xlsx', ignorados:", ignorados)
    return df, len(partes), len(layouts)


# ---------------------------------------------------------------------------
# Limpeza, padronização e enriquecimento
# ---------------------------------------------------------------------------

def tratar(df: pd.DataFrame, log: list) -> pd.DataFrame:
    for c in df.columns:
        if df[c].dtype == object:
            df[c] = df[c].map(lambda v: None if vazio(v) else str(v).strip())

    n0 = len(df)
    df = df[df.codigo.notna() | df.experiencia.notna()].copy()
    if n0 - len(df):
        log.append({"etapa": "Linhas vazias", "n": len(df), "rem": n0 - len(df),
                    "txt": "Linhas sem código de candidato e sem respostas removidas."})

    # Mesmo candidato duas vezes na mesma planilha (reenvio do formulário).
    n0 = len(df)
    df["nasc"] = pd.to_datetime(df.nascimento, errors="coerce").dt.strftime("%Y-%m-%d")
    df = df.drop_duplicates(subset=["arquivo", "codigo", "nasc"], keep="last")
    log.append({"etapa": "Reenvios", "n": len(df), "rem": n0 - len(df),
                "txt": "Inscrição repetida do mesmo código na mesma planilha: mantida a última."})

    df["respondeu"] = df.respondeu.map(lambda v: None if v is None else norm(v).startswith("sim"))
    df["exp"] = df.experiencia.map(cls_experiencia)
    df["idade"] = df.idade_decl.map(cls_idade)
    df["escol"] = df.escolaridade.map(cls_escolaridade)
    df["morad"] = df.moradia.map(cls_moradia)
    df["turno_c"] = df.turno.map(cls_turno)
    df["estuda_c"] = df.estuda.map(cls_sim_nao)
    df["curso_c"] = df.curso_prof.map(cls_sim_nao)
    df["canais"] = df.canal.map(canais_de)

    # Renda per capita = renda familiar / (moradores + 1). A pergunta é
    # "quantas pessoas moram COM VOCÊ", então o próprio jovem não está no número.
    renda = df.renda.map(parse_valor)
    invalida = renda.notna() & ((renda > RENDA_MAX_VALIDA) | ((renda > 0) & (renda < RENDA_MIN_VALIDA)))
    renda = renda.mask(invalida)
    morad = df.moradores.map(lambda v: parse_int(v, 0, 20))
    df["renda_pc"] = renda / (morad + 1)
    df["renda_pc_sm"] = df.renda_pc / df.ano.map(SALARIO_MINIMO)
    df["faixa_renda"] = df.renda_pc_sm.map(faixa_renda)

    sem_socio = int((df.respondeu == False).sum())  # noqa: E712
    log.append({"etapa": "Questionário socioeconômico", "n": int(df.exp.notna().sum()), "rem": sem_socio,
                "txt": f"{sem_socio} inscritos não responderam o questionário (sem experiência nem renda). "
                       "Ficam no total de inscrições, fora das proporções."})
    log.append({"etapa": "Renda", "n": int(df.renda_pc.notna().sum()), "rem": int(invalida.sum()),
                "txt": f"{int(invalida.sum())} rendas fora de R$ {RENDA_MIN_VALIDA}–{RENDA_MAX_VALIDA:,} "
                       "descartadas como erro de digitação. Renda per capita = renda ÷ (moradores + 1), "
                       "convertida em salários mínimos do ano."})
    return df


def marcar_pessoas(df: pd.DataFrame, log: list) -> pd.DataFrame:
    """O código do candidato recomeça em cada planilha, então não identifica a
    pessoa entre unidades. A chave aproximada é nascimento + sexo + bairro +
    cidade, dentro do mesmo ano."""
    chave = df.nasc.fillna("") + "|" + df.sexo.fillna("") + "|" + df.bairro.map(
        lambda v: norm(v) if v else "") + "|" + df.cidade.map(lambda v: norm(v) if v else "")
    valida = df.nasc.notna() & df.sexo.notna() & df.bairro.notna()
    df["pessoa"] = np.where(valida, df.ano.astype(str) + "|" + chave, "linha" + df.index.astype(str))
    n_unid = df.groupby("pessoa").unidade.transform("nunique")
    df["multi"] = n_unid > 1
    pessoas = df.pessoa.nunique()
    multi = df[df.multi].pessoa.nunique()
    log.append({"etapa": "Jovens únicos", "n": pessoas, "rem": len(df) - pessoas,
                "txt": f"{multi} jovens se inscreveram em mais de uma unidade no mesmo ano "
                       "(chave: nascimento + sexo + bairro + cidade). As inscrições continuam "
                       "contando para cada unidade; a concorrência 'real' usa os jovens únicos."})
    return df


# ---------------------------------------------------------------------------
# Controle NIGE e endereços
# ---------------------------------------------------------------------------

# De-para manual para unidades cujo nome no NIGE não se parece com o do
# arquivo de inscritos. Chave: nome normalizado da planilha de inscritos.
DE_PARA = {
    "hub assistente administrativo": ["HUB PESCAR - ADM_(Aprendiz)tarde"],
    "hub servicos de comercio": ["HUB Pescar - SCOM_(Aprendiz)-Manhã"],
}

STOP = {"grupo", "instituto", "fundacao", "de", "da", "do", "das", "dos", "e", "consorcio",
        "unidade", "pescar", "projeto", "sa", "s", "a", "ltda", "upp", "rs"}


def tokens(nome) -> frozenset:
    return frozenset(t for t in norm(nome).split() if t not in STOP)


def casar(nome: str, candidatos: dict[str, frozenset]):
    """Casa um nome de unidade com a melhor chave de `candidatos` por tokens."""
    alvo = tokens(nome)
    if not alvo:
        return None
    melhor, score = None, 0.0
    for chave, tk in candidatos.items():
        if not tk:
            continue
        inter = len(alvo & tk)
        if not inter:
            continue
        s = inter / len(alvo | tk) + (0.5 if alvo <= tk or tk <= alvo else 0)
        if s > score:
            melhor, score = chave, s
    return melhor if score >= 0.5 else None


def carregar_nige(caminho: Path):
    ct = pd.read_excel(caminho, sheet_name="Controle de Turma", header=1)
    ct = ct[pd.to_numeric(ct["ID"], errors="coerce").notna()].copy()
    col = {norm(c): c for c in ct.columns}
    # "Nº de Vagas" normaliza para "no de vagas": casa por trecho, não por prefixo.
    pega = lambda trecho: next(v for k, v in col.items() if trecho in k)  # noqa: E731
    out = pd.DataFrame({
        "unidade": ct[pega("unidade")].astype(str).str.strip(),
        "ano": pd.to_numeric(ct[pega("ano letivo")], errors="coerce"),
        "vagas": pd.to_numeric(ct[pega("de vagas")], errors="coerce"),
        "matric": pd.to_numeric(ct[pega("matriculados")], errors="coerce"),
        "municipio": ct[pega("municipio")].astype(str).str.strip(),
        "uf": ct[pega("uf")].astype(str).str.strip(),
    })
    return out.dropna(subset=["ano"])


def carregar_enderecos(caminho: Path):
    e = pd.read_excel(caminho)
    col = {norm(c): c for c in e.columns}
    nome = next(v for k, v in col.items() if k.startswith("nome da unidade"))
    cidade = next(v for k, v in col.items() if k == "cidade")
    uf = next(v for k, v in col.items() if k == "estado")
    status = next((v for k, v in col.items() if k.startswith("status")), None)
    rows = []
    for _, r in e.iterrows():
        # "Acial - Alvorada - RS": o nome útil é o primeiro trecho.
        rows.append({"nome": str(r[nome]).split(" - ")[0].strip(), "cidade": str(r[cidade]).strip(),
                     "uf": str(r[uf]).strip(), "ativa": None if status is None else str(r[status]).strip()})
    return rows


# ---------------------------------------------------------------------------
# Agregações publicadas
# ---------------------------------------------------------------------------

def quantis(x: pd.Series, minimo=10):
    x = x.dropna()
    if len(x) < minimo:
        return None
    return [round(float(v), 3) for v in np.quantile(x, [0.1, 0.25, 0.5, 0.75, 0.9])] + [int(len(x))]


def construir(df: pd.DataFrame, nige: pd.DataFrame | None, ender: list | None,
              log: list, n_arquivos: int, n_layouts: int) -> dict:
    anos = sorted(int(a) for a in df.ano.unique())
    nomes = sorted(df.unidade.unique(), key=norm)
    uid = {n: i for i, n in enumerate(nomes)}
    df["u"] = df.unidade.map(uid)

    # ---------- unidades + integração NIGE / endereços ----------
    unidades = [{"id": uid[n], "nome": n} for n in nomes]
    vagas = {}
    sem_nige = []
    if nige is not None:
        chaves = {k: tokens(k) for k in nige.unidade.unique()}
        for u in unidades:
            manual = DE_PARA.get(norm(u["nome"]))
            k = " + ".join(manual) if manual else casar(u["nome"], chaves)
            u["nige"] = k
            if k is None:
                sem_nige.append(u["nome"])
                continue
            sub = nige[nige.unidade.isin(manual)] if manual else nige[nige.unidade == k]
            u["cidade"] = sub.municipio.mode().iat[0].title() if len(sub) else None
            u["uf"] = sub.uf.mode().iat[0] if len(sub) else None
            for ano, g in sub.groupby("ano"):
                vagas[(u["id"], int(ano))] = (int(g.vagas.sum()), int(g.matric.sum()), int(len(g)))
        log.append({"etapa": "Integração NIGE", "n": len(unidades) - len(sem_nige),
                    "rem": len(sem_nige),
                    "txt": "Unidades casadas com o Controle NIGE por similaridade de nome "
                           f"(vagas e matrículas). Sem correspondência: {', '.join(sem_nige) or 'nenhuma'}."})
    if ender:
        chaves = {i: tokens(r["nome"]) for i, r in enumerate(ender)}
        for u in unidades:
            i = casar(u["nome"], chaves)
            if i is not None:
                u.setdefault("cidade", ender[i]["cidade"].title())
                u.setdefault("uf", ender[i]["uf"])
                u["ativa"] = ender[i]["ativa"]

    # ---------- panorama ----------
    resp = df[df.exp.notna()]
    panorama = []
    for ano in anos:
        a = df[df.ano == ano]
        r = resp[resp.ano == ano]
        panorama.append({
            "ano": ano, "inscricoes": int(len(a)), "pessoas": int(a.pessoa.nunique()),
            "multi": int(a[a.multi].pessoa.nunique()), "unidades": int(a.unidade.nunique()),
            "responderam": int(len(r)), "sem": int((r.exp == "sem").sum()), "com": int((r.exp == "com").sum()),
            "renda_valida": int(a.renda_pc.notna().sum()),
            "ate_meio_sm": int((a.renda_pc_sm < 0.5).sum()),
            "vagas": int(sum(v[0] for (u, an), v in vagas.items() if an == ano)),
        })

    # ---------- P1: prioridade e concorrência ----------
    p1 = []
    for (u, ano), g in df.groupby(["u", "ano"]):
        r = g[g.exp.notna()]
        v = vagas.get((u, ano))
        pessoas = g.pessoa.nunique()
        # jovens desta unidade que NÃO se inscreveram em outra: a demanda exclusiva
        exclusivos = g[~g.multi].pessoa.nunique()
        p1.append({
            "u": int(u), "ano": int(ano), "inscricoes": int(len(g)), "resp": int(len(r)),
            "sem": sup((r.exp == "sem").sum()), "com": sup((r.exp == "com").sum()),
            "multi": sup(pessoas - exclusivos),
            "vagas": v[0] if v else None, "matric": v[1] if v else None, "turmas": v[2] if v else None,
        })

    # Sobreposição entre unidades: pares de unidades que dividem jovens.
    pares = Counter()
    for (pessoa, ano), g in df[df.multi].groupby(["pessoa", "ano"]):
        for a, b in combinations(sorted(set(g.u)), 2):
            pares[(int(a), int(b), int(ano))] += 1
    sobreposicao = [{"a": a, "b": b, "ano": ano, "n": n} for (a, b, ano), n in pares.items() if n >= K_MIN]

    # ---------- P2: perfil ----------
    variaveis = {
        "faixa_renda": ("Renda per capita", [f[0] for f in FAIXAS_RENDA]),
        "idade": ("Idade declarada", IDADES),
        "escol": ("Escolaridade", ESCOLARIDADE),
        "morad": ("Moradia", MORADIA),
        "turno_c": ("Turno da escola", TURNO),
        "estuda_c": ("Estuda atualmente", ["Sim", "Não"]),
        "curso_c": ("Já fez curso profissionalizante", ["Sim", "Não"]),
    }
    p2 = {"vars": {}, "renda_q": [], "renda_hist": []}
    base = resp  # só quem respondeu: experiência conhecida
    for var, (rotulo, cats) in variaveis.items():
        sub = base[base[var].notna()]
        g = sub.groupby(["u", "ano", "exp", var]).size()
        linhas = [[int(u), int(a), e, cats.index(c), sup(n)] for (u, a, e, c), n in g.items() if c in cats]
        # Totais por categoria sem unidade (todas as unidades): números grandes,
        # publicados exatos para os gráficos agregados não sofrerem com supressão.
        gt = sub.groupby(["ano", "exp", var]).size()
        totais = [[int(a), e, cats.index(c), int(n)] for (a, e, c), n in gt.items() if c in cats]
        p2["vars"][var] = {"rotulo": rotulo, "cats": cats, "linhas": linhas, "totais": totais}

    for ano in anos + [0]:
        sa = base if ano == 0 else base[base.ano == ano]
        for e in ["sem", "com", "todos"]:
            se = sa if e == "todos" else sa[sa.exp == e]
            q = quantis(se.renda_pc_sm)
            if q:
                p2["renda_q"].append({"u": -1, "ano": ano, "exp": e, "q": q})
            for u, g in se.groupby("u"):
                q = quantis(g.renda_pc_sm)
                if q:
                    p2["renda_q"].append({"u": int(u), "ano": ano, "exp": e, "q": q})
            # Histograma de renda per capita em SM (passo 0,1 SM, cauda em 2+).
            x = se.renda_pc_sm.dropna().clip(upper=2.0)
            h, _ = np.histogram(x, bins=np.linspace(0, 2.0001, 21))
            p2["renda_hist"].append({"ano": ano, "exp": e, "bins": [sup(v) or 0 for v in h]})

    # ---------- P3: canais ----------
    linhas = []
    exp_canal = base.explode("canais").dropna(subset=["canais"])
    exp_canal = exp_canal.assign(meio=exp_canal.renda_pc_sm < 0.5, rv=exp_canal.renda_pc_sm.notna())
    for (u, ano, c), g in exp_canal.groupby(["u", "ano", "canais"]):
        linhas.append({"u": int(u), "ano": int(ano), "c": CANAIS.index(c), "n": sup(len(g)),
                       "sem": sup((g.exp == "sem").sum()), "rv": sup(g.rv.sum()), "meio": sup(g.meio.sum())})
    totais_canal = []
    for (ano, c), g in exp_canal.groupby(["ano", "canais"]):
        totais_canal.append({"ano": int(ano), "c": CANAIS.index(c), "n": int(len(g)),
                             "sem": int((g.exp == "sem").sum()), "rv": int(g.rv.sum()),
                             "meio": int(g.meio.sum()), "q": quantis(g.renda_pc_sm)})

    # Fluxo canal principal -> experiência -> faixa de renda (todas as unidades).
    def grupo_principal(cs):
        gs = [GRUPO_CANAL[c] for c in cs]
        return min(gs, key=PRIORIDADE_GRUPO.get) if gs else None
    fl = base.assign(grupo=base.canais.map(grupo_principal)).dropna(subset=["grupo", "faixa_renda"])
    fluxo = [{"ano": int(a), "g": g, "exp": e, "f": f, "n": sup(n)}
             for (a, g, e, f), n in fl.groupby(["ano", "grupo", "exp", "faixa_renda"]).size().items()]

    # ---------- qualidade dos dados ----------
    completude = []
    for (u, ano), g in df.groupby(["u", "ano"]):
        completude.append({"u": int(u), "ano": int(ano),
                           "c": {c: round(float(g[c].notna().mean()), 3) for c in CAMPOS_COMPLETUDE}})

    cidades = Counter()
    for (cid, uf), n in df.groupby([df.cidade.map(lambda v: v.title() if v else None), df.uf]).size().items():
        if cid:
            cidades[(cid, uf)] += int(n)

    return {
        "meta": {
            "gerado_em": datetime.now().isoformat(timespec="seconds"),
            "anos": anos, "k_min": K_MIN, "salario_minimo": {str(a): SALARIO_MINIMO.get(a) for a in anos},
            "arquivos": n_arquivos, "layouts": n_layouts,
            "faixas_renda": [f[0] for f in FAIXAS_RENDA],
            "canais": CANAIS, "grupo_canal": GRUPO_CANAL, "grupos": GRUPOS,
            "campos_completude": CAMPOS_COMPLETUDE,
        },
        "unidades": unidades,
        "panorama": panorama,
        "tratamento": log,
        "p1": p1,
        "sobreposicao": sobreposicao,
        "p2": p2,
        "p3": {"linhas": linhas, "totais": totais_canal, "fluxo": fluxo},
        "completude": completude,
        "cidades": [{"cidade": c, "uf": uf, "n": n} for (c, uf), n in cidades.most_common() if n >= K_MIN],
    }


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------

def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--inscritos", type=Path, required=True, help="pasta com as planilhas (busca recursiva)")
    ap.add_argument("--nige", type=Path, help="Controle_NIGE (.xlsm)")
    ap.add_argument("--enderecos", type=Path, help="planilha de endereços das unidades")
    ap.add_argument("--saida", type=Path, default=Path("dashboard/public/data/pescar.json"))
    args = ap.parse_args()

    log: list = []
    df, n_arq, n_lay = carregar_inscritos(args.inscritos, log)
    df = tratar(df, log)
    df = marcar_pessoas(df, log)
    nige = carregar_nige(args.nige) if args.nige else None
    ender = carregar_enderecos(args.enderecos) if args.enderecos else None
    log.append({"etapa": "LGPD", "n": None,
                "txt": f"Publicados só agregados; contagens de 1 a {K_MIN - 1} suprimidas. Raça, deficiência, "
                       "nome, código, nascimento e bairro não saem do pipeline (nascimento e bairro só "
                       "servem para achar inscrições repetidas)."})

    out = construir(df, nige, ender, log, n_arq, n_lay)
    args.saida.parent.mkdir(parents=True, exist_ok=True)
    args.saida.write_text(json.dumps(out, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")

    print(f"{len(df)} inscrições, {df.pessoa.nunique()} jovens únicos, {len(out['unidades'])} unidades.")
    for etapa in log:
        print(f"  - {etapa['etapa']}: {etapa['txt']}")
    print(f"Arquivo salvo em {args.saida} ({args.saida.stat().st_size / 1024:.0f} KB)")


if __name__ == "__main__":
    main()
