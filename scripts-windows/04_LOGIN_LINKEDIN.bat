@echo off
setlocal

set "PROJECT_DIR=%~dp0.."
set "RPA_DIR=%PROJECT_DIR%\rpa\linkedin-sourcer"
set "NODE_DIR=%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin"
set "PNPM=%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\bin\fallback\pnpm.cmd"

if not exist "%NODE_DIR%\node.exe" (
  echo ERRO: Node interno do Codex nao encontrado.
  echo Rode primeiro: scripts-windows\00_VERIFICAR_NODE_CODEX.bat
  pause
  exit /b 1
)

set "PATH=%NODE_DIR%;%PATH%"
cd /d "%RPA_DIR%"

echo.
echo Abrindo navegador para login manual no LinkedIn...
echo Faca login e aguarde o feed carregar.
echo.
"%PNPM%" run login

pause
