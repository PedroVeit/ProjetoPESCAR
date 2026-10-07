@echo off
rem ============================================================
rem  Pescar em Dados - roda o dashboard localmente
rem  Duplo clique neste arquivo. Na primeira vez instala tudo.
rem ============================================================
chcp 65001 >nul
title Pescar em Dados
cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
  echo [ERRO] Node.js nao encontrado. Instale a versao LTS em https://nodejs.org e rode de novo.
  pause
  exit /b 1
)

if not exist "node_modules" (
  echo Instalando dependencias do dashboard - so na primeira vez...
  call npm install --no-audit --no-fund
  if errorlevel 1 (
    echo [ERRO] Falha no npm install.
    pause
    exit /b 1
  )
)

rem Se as planilhas estiverem em ..\data e houver Python, regenera os dados.
rem Sem planilhas, usa o public\data\pescar.json que ja vem no repositorio.
if exist "..\data\Controle_NIGE_editado.xlsm" (
  where python >nul 2>nul
  if not errorlevel 1 (
    echo Atualizando os dados a partir das planilhas em data\ ...
    python -m pip install -q -r "..\requirements.txt"
    call npm run dados
    if errorlevel 1 echo [AVISO] O pipeline falhou - usando os dados ja gerados.
  )
)

if not exist "public\data\pescar.json" (
  echo [ERRO] public\data\pescar.json nao encontrado.
  pause
  exit /b 1
)

echo.
echo Abrindo http://localhost:5173 - feche esta janela para parar o servidor.
echo.
call npm run dev -- --port 5173 --open
pause
