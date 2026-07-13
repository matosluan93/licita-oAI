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

set "PATH=%NODE_DIR%;%PATH%"
cd /d "%PROJECT_DIR%"

if not exist "%PROJECT_DIR%\node_modules\next\dist\bin\next" (
  echo.
  echo ERRO: Dependencias da aplicacao web nao encontradas.
  echo Rode primeiro: 01_INSTALAR_APLICACAO_WEB.bat
  echo.
  pause
  exit /b 1
)

echo.
echo Iniciando LicitAI em:
echo http://localhost:4028/linkedin-sourcing
echo.
echo Nao feche esta janela enquanto estiver usando a aplicacao.
echo.
"%NODE_DIR%\node.exe" "%PROJECT_DIR%\node_modules\next\dist\bin\next" dev -p 4028

pause
