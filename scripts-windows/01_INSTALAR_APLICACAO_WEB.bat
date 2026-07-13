@echo off
setlocal

set "PROJECT_DIR=%~dp0.."
set "NODE_DIR=%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin"
set "PNPM=%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\bin\fallback\pnpm.cmd"

if not exist "%NODE_DIR%\node.exe" (
  echo ERRO: Node interno do Codex nao encontrado.
  echo Rode primeiro: scripts-windows\00_VERIFICAR_NODE_CODEX.bat
  pause
  exit /b 1
)

if not exist "%PNPM%" (
  echo ERRO: pnpm interno do Codex nao encontrado.
  echo Rode primeiro: scripts-windows\00_VERIFICAR_NODE_CODEX.bat
  pause
  exit /b 1
)

set "PATH=%NODE_DIR%;%PATH%"
cd /d "%PROJECT_DIR%"

echo.
echo Instalando dependencias da aplicacao web LicitAI...
echo Pasta: %CD%
echo.
if exist "%PROJECT_DIR%\node_modules\next\dist\bin\next" (
  echo Dependencias ja encontradas. Pulando instalacao.
) else (
  call "%PNPM%" install --ignore-scripts
)

echo.
if exist "%PROJECT_DIR%\node_modules\next\dist\bin\next" (
  echo Dependencias principais encontradas. Pode continuar.
) else (
  echo.
  echo ATENCAO: A instalacao terminou, mas nao encontrei o Next em node_modules.
  echo Copie as ultimas linhas acima e envie para analise.
)

echo Finalizado.
pause
