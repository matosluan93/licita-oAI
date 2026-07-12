# LicitAI

RPA local com Playwright para coletar perfis do LinkedIn a partir do JSON exportado pela aplicacao LicitAI.

## Instalar

```bash
cd rpa/linkedin-sourcer
npm install
npx playwright install chromium
```

## Login

```bash
npm run login
```

O navegador abre para login manual. A sessao fica salva em `.linkedin-session/`.

## Buscar perfis

```bash
npm run search -- --config caminho/para/linkedin-campaign.json
```

O RPA usa os links oficiais de empresas no LinkedIn exportados pela aplicacao, acessando
`/company/<slug>/people/` para reduzir resultados fora do grupo. Ao visitar cada perfil,
ele tambem coleta links `/company/...` presentes no perfil e so salva candidatos que batem
com os slugs oficiais ou com os aliases configurados.

O navegador do RPA e bloqueado para acessar apenas dominios do LinkedIn e os assets oficiais
necessarios da propria plataforma (`linkedin.com` e `licdn.com`). Ele nao navega em
OneDrive, SharePoint, Google ou outros sites.

## Modo responsavel

Por padrao, o LicitAI aplica controles conservadores sem deixar o RPA inutilizavel:

- ate 30 perfis por execucao;
- ate 80 perfis por dia, registrados em `output/daily-usage.json`;
- pausa maior a cada 8 perfis;
- parada automatica em captcha, checkpoint ou verificacao de seguranca;
- log de auditoria em `output/audit-log.ndjson`;
- downloads de curriculo habilitados, mas podem ser desligados.

Flags uteis:

```bash
npm run search -- --config caminho/para/linkedin-campaign.json --no-resume-downloads
npm run search -- --config caminho/para/linkedin-campaign.json --confirm-downloads
```

Use `--no-resume-downloads` quando quiser gerar apenas Excel e links. Use
`--confirm-downloads` quando quiser aprovar manualmente cada curriculo antes do download.

O resultado fica em dois arquivos:

- `output/results-<campaignId>.json`, para importar na tela `/linkedin-sourcing`.
- `output/licitacao-<campaignId>.xlsx`, para abrir no Excel com abas de resumo, cargos e links dos perfis.

## Pasta de documentos

A estrutura `Pregoes 2026/Julho/<Cliente>/<Perfil>/<Profissional>/` nao fica dentro do projeto. Por padrao, ela e criada em:

```text
C:\Users\<seu-usuario>\Documents\LicitAI\Pregoes 2026\Julho\<Cliente>\<Perfil>\<Profissional>\
```

Para gravar direto na pasta sincronizada do OneDrive/SharePoint, passe o destino no comando:

```bash
npm run search -- --config caminho/para/linkedin-campaign.json --documents-root "C:\Users\seu-usuario\OneDrive - Stefanini\Documents\Time Certificacoes\Pregoes"
```

Ou defina a variavel de ambiente:

```powershell
$env:LICITAI_DOCUMENTS_ROOT="C:\Users\seu-usuario\OneDrive - Stefanini\Documents\Time Certificacoes\Pregoes"
npm run search -- --config caminho/para/linkedin-campaign.json
```

Cada pasta de profissional recebe:

- curriculo baixado, quando o LinkedIn disponibilizar o download;
- `perfil-linkedin.txt`, com nome, perfil solicitado, link do LinkedIn, empresa, headline e dados coletados.

## Cuidados

- Use apenas em contexto autorizado.
- Respeite LGPD, politicas internas e termos das plataformas.
- O LinkedIn muda HTML com frequencia; seletores podem precisar de ajuste.
