@echo off
setlocal

set "NODE_DIR=%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin"
set "PNPM=%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\bin\fallback\pnpm.cmd"

if not exist "%NODE_DIR%\node.exe" (
  echo.
  echo ERRO: Nao encontrei o Node interno do Codex em:
  echo %NODE_DIR%\node.exe
  echo.
  echo Se a maquina da empresa nao permite instalar Node, peca ao TI uma destas opcoes:
  echo 1. Instalar Node.js LTS oficialmente.
  echo 2. Liberar Node.js portable para esta pasta do projeto.
  echo.
  pause
  exit /b 1
)

if not exist "%PNPM%" (
  echo.
  echo ERRO: Nao encontrei o pnpm interno do Codex em:
  echo %PNPM%
  echo.
  pause
  exit /b 1
)

set "PATH=%NODE_DIR%;%PATH%"

echo.
echo Node encontrado:
node -v
echo.
echo PNPM encontrado:
"%PNPM%" -v
echo.
echo Tudo certo para usar os scripts do LicitAI sem instalar Node globalmente.
echo.
pause
