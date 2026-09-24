"""
Indicador-proxy: % de candidatos sem experiência profissional prévia
                 x taxa de matrícula, por unidade e ano.

Contexto
--------
A prioridade declarada pelo Projeto Pescar é selecionar jovens SEM
experiência profissional prévia. Não existe (ainda) um ID que ligue um
candidato específico das planilhas de inscrição a uma linha do
Controle_NIGE (que só tem números agregados por turma). Por isso, este
script calcula um indicador-proxy no nível unidade/ano:

    pct_sem_exp      = % de candidatos que responderam "Não" ter
                        trabalhado com carteira assinada ou estágio
    taxa_matricula   = matriculados / candidatos (nível agregado)
    candidatos_vaga  = candidatos / vagas ofertadas

IMPORTANTE (limitação metodológica): a correlação entre essas colunas é
ECOLÓGICA (nível unidade/ano), não individual. Não garante que, dentro
de uma unidade, foram os candidatos sem experiência que de fato foram
matriculados. Ver checkpoint de 01/10 sobre a existência de uma lista
nominal de aprovados.

Uso
---
    python indicador_proxy_experiencia.py \
        --dados-dir ./dados \
        --nige ./dados/Controle_NIGE_editado_1.xlsm \
        --saida ./output/indicador_proxy.csv

Requer: pandas, openpyxl
"""

from __future__ import annotations

import argparse
import re
import unicodedata
from pathlib import Path

import pandas as pd

# ---------------------------------------------------------------------------
# Configuração
# ---------------------------------------------------------------------------

# Nome das colunas nas planilhas de candidatos (após strip), conforme
# identificado no profiling do dataset 2025/2026.
COL_CODIGO = "Codigo do Candidato"
COL_TRABALHOU = "JÁ TRABALHOU COM CARTEIRA ASSINADA OU ESTÁGIO?"

# Prefixo de arquivo a excluir dos loops (planilha de referência, não de
# candidatos).
PREFIXO_EXCLUIR = "Endere"

# Regex de nome de arquivo: <Unidade>_<Ano>[_N].xlsx
RE_NOME_ARQUIVO = re.compile(r"(.+?)_(\d{4})(?:.*)?\.xlsx$")


# ---------------------------------------------------------------------------
# Normalização de nomes de unidade
# ---------------------------------------------------------------------------

def normalizar_unidade(nome: str) -> str:
    """Normaliza o nome de uma unidade para permitir o join entre bases
    que grafam o mesmo nome de formas diferentes
    (ex.: 'CJT_TRT4' vs 'Comunidade Jurídico Trabalhista TRT4').

    Resolve apenas divergências ortográficas/de formatação (acentos,
    caixa, pontuação). Não resolve sinônimos ("CJT" vs "Comunidade
    Jurídico Trabalhista") — isso requer uma tabela de-para manual,
    a ser construída a partir da lista de nomes divergentes que este
    script reporta.
    """
    s = unicodedata.normalize("NFKD", str(nome)).encode("ascii", "ignore").decode()
    s = re.sub(r"[^a-zA-Z0-9]+", " ", s).strip().lower()
    return s


# ---------------------------------------------------------------------------
# Carregamento das planilhas de candidatos
# ---------------------------------------------------------------------------

def carregar_candidatos(dados_dir: Path) -> pd.DataFrame:
    """Lê todas as planilhas de candidatos (Planilha2), extrai unidade/ano
    do nome do arquivo e classifica a experiência profissional prévia.
    """
    registros = []

    for arquivo in sorted(dados_dir.glob("*.xlsx")):
        if arquivo.name.startswith(PREFIXO_EXCLUIR):
            continue

        m = RE_NOME_ARQUIVO.match(arquivo.name)
        if not m:
            print(f"[aviso] nome de arquivo fora do padrão, ignorado: {arquivo.name}")
            continue
        unidade_raw, ano = m.group(1).replace("_", " ").strip(), int(m.group(2))

        # A aba de dados é normalmente 'Planilha2', mas há uma exceção
        # conhecida (Linck_máquinas_2025.xlsx usa 'Planilha3').
        df = None
        for aba in ("Planilha2", "Planilha3"):
            try:
                df = pd.read_excel(arquivo, sheet_name=aba, dtype=str)
                break
            except ValueError:
                continue
        if df is None:
            print(f"[aviso] nenhuma aba de dados reconhecida em {arquivo.name}, ignorado")
            continue

        df.columns = [c.strip() for c in df.columns]
        if COL_CODIGO not in df.columns or COL_TRABALHOU not in df.columns:
            print(f"[aviso] colunas esperadas ausentes em {arquivo.name}, ignorado")
            continue

        resposta = df[COL_TRABALHOU].astype(str).str.strip()
        sem_exp = resposta.eq("Não")
        tem_exp = resposta.str.startswith("Se sim")
        valida = sem_exp | tem_exp  # descarta NaN/respostas fora do padrão

        registros.append(
            pd.DataFrame(
                {
                    "unidade_norm": normalizar_unidade(unidade_raw),
                    "unidade_raw": unidade_raw,
                    "ano": ano,
                    "candidato_valido": valida,
                    "sem_experiencia": sem_exp & valida,
                }
            )
        )

    if not registros:
        raise RuntimeError(f"Nenhuma planilha de candidatos válida encontrada em {dados_dir}")

    return pd.concat(registros, ignore_index=True)


def agregar_candidatos(cand: pd.DataFrame) -> pd.DataFrame:
    """Agrega candidatos por unidade/ano: total válido, % sem experiência."""
    valido = cand[cand.candidato_valido]
    agg = (
        valido.groupby(["unidade_norm", "ano"])
        .agg(candidatos=("sem_experiencia", "size"), sem_exp=("sem_experiencia", "sum"))
        .reset_index()
    )
    agg["pct_sem_exp"] = (agg.sem_exp / agg.candidatos * 100).round(1)
    return agg


# ---------------------------------------------------------------------------
# Carregamento do Controle_NIGE
# ---------------------------------------------------------------------------

def carregar_nige(caminho_nige: Path) -> pd.DataFrame:
    """Lê a aba 'Controle de Turma' do Controle_NIGE e agrega vagas e
    matriculados por unidade/ano letivo.
    """
    ct = pd.read_excel(caminho_nige, sheet_name="Controle de Turma", header=1)
    ct = ct[pd.to_numeric(ct["ID"], errors="coerce").notna()].copy()

    ct["unidade_norm"] = ct["Unidade"].map(normalizar_unidade)
    ct["ano"] = pd.to_numeric(ct["Ano Letivo:"], errors="coerce")

    nige = (
        ct.groupby(["unidade_norm", "ano"])
        .agg(
            vagas=("Nº de Vagas", lambda s: pd.to_numeric(s, errors="coerce").sum()),
            matriculados=("Nº Matriculados", lambda s: pd.to_numeric(s, errors="coerce").sum()),
            turmas=("ID", "count"),
        )
        .reset_index()
    )
    return nige


# ---------------------------------------------------------------------------
# Indicador-proxy
# ---------------------------------------------------------------------------

def construir_indicador_proxy(dados_dir: Path, caminho_nige: Path) -> pd.DataFrame:
    """Une candidatos e NIGE por unidade/ano e calcula o indicador-proxy.

    Retorna um DataFrame com uma linha por combinação unidade/ano que
    teve match nas duas fontes, mais colunas de diagnóstico de
    cobertura (quantas combinações não deram match em cada lado).
    """
    cand_raw = carregar_candidatos(dados_dir)
    cand = agregar_candidatos(cand_raw)
    nige = carregar_nige(caminho_nige)

    merged = cand.merge(nige, on=["unidade_norm", "ano"], how="outer", indicator=True)

    sem_match_candidatos = merged[merged._merge == "left_only"]
    sem_match_nige = merged[merged._merge == "right_only"]
    if len(sem_match_candidatos):
        print(
            f"[diagnóstico] {len(sem_match_candidatos)} combinações unidade/ano "
            "têm planilha de candidatos mas não têm turma correspondente no NIGE "
            "(nome de unidade provavelmente divergente — ver tabela de-para)."
        )
    if len(sem_match_nige):
        print(
            f"[diagnóstico] {len(sem_match_nige)} combinações unidade/ano existem "
            "no NIGE mas não têm planilha de candidatos entre os arquivos lidos."
        )

    proxy = merged[merged._merge == "both"].drop(columns="_merge").copy()
    proxy["candidatos_por_vaga"] = (proxy.candidatos / proxy.vagas).round(2)
    proxy["taxa_matricula"] = (proxy.matriculados / proxy.candidatos * 100).round(1)

    return proxy.sort_values(["ano", "unidade_norm"]).reset_index(drop=True)


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------

def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--dados-dir", type=Path, required=True, help="Pasta com as planilhas de candidatos (.xlsx)")
    parser.add_argument("--nige", type=Path, required=True, help="Caminho do arquivo Controle_NIGE (.xlsm)")
    parser.add_argument("--saida", type=Path, default=Path("indicador_proxy.csv"), help="Caminho do CSV de saída")
    args = parser.parse_args()

    proxy = construir_indicador_proxy(args.dados_dir, args.nige)

    args.saida.parent.mkdir(parents=True, exist_ok=True)
    proxy.to_csv(args.saida, index=False)

    print(f"\n{len(proxy)} combinações unidade/ano com indicador-proxy calculado.")
    print(f"Arquivo salvo em: {args.saida}")
    print("\nCorrelações (nível unidade/ano — ver limitação ecológica no docstring):")
    print(proxy[["pct_sem_exp", "taxa_matricula", "candidatos_por_vaga"]].corr().round(3))


if __name__ == "__main__":
    main()
