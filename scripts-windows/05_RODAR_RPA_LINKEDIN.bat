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
echo Cole abaixo o caminho completo do JSON exportado pela tela do LicitAI.
echo Exemplo: C:\Users\lfsantos17\Downloads\linkedin-campaign-123.json
echo.
set /p CONFIG_PATH=Caminho do JSON: 

if not exist "%CONFIG_PATH%" (
  echo.
  echo ERRO: Arquivo JSON nao encontrado:
  echo %CONFIG_PATH%
  echo.
  pause
  exit /b 1
)

echo.
echo Se quiser informar uma pasta raiz para documentos, cole agora.
echo Se nao quiser, pressione ENTER.
echo Exemplo: C:\Users\lfsantos17\OneDrive - Stefanini\Documents\Time Certificacoes\Pregoes
echo.
set /p DOCS_ROOT=Pasta de documentos: 

echo.
echo Deseja baixar curriculos automaticamente?
echo 1 = Sim, baixar quando disponivel
echo 2 = Nao, gerar apenas Excel e links
echo 3 = Perguntar antes de cada download
set /p DOWNLOAD_MODE=Escolha 1, 2 ou 3: 

set "DOWNLOAD_ARG="
if "%DOWNLOAD_MODE%"=="2" set "DOWNLOAD_ARG=--no-resume-downloads"
if "%DOWNLOAD_MODE%"=="3" set "DOWNLOAD_ARG=--confirm-downloads"

echo.
echo Iniciando RPA...
echo.
if "%DOCS_ROOT%"=="" (
  "%PNPM%" run search -- --config "%CONFIG_PATH%" %DOWNLOAD_ARG%
) else (
  "%PNPM%" run search -- --config "%CONFIG_PATH%" --documents-root "%DOCS_ROOT%" %DOWNLOAD_ARG%
)

pause
