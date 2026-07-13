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
"%PNPM%" install

echo.
echo Finalizado.
pause
