# LicitAI - Busca LinkedIn

Aplicacao Next.js para sourcing de candidatos a partir de editais, com RPA local para LinkedIn e ranking de aderencia.

## Rodar a aplicacao

```bash
npm install
cp .env.example .env
npm run dev
```

Acesse `http://localhost:4028/linkedin-sourcing`.

## Rodar o RPA

```bash
cd rpa/linkedin-sourcer
npm install
npx playwright install chromium
npm run login
npm run search -- --config caminho/para/linkedin-campaign.json
```

O RPA gera dois arquivos em `rpa/linkedin-sourcer/output/`:

- `results-<campaignId>.json`, para reimportar na aplicacao.
- `licitacao-<campaignId>.xlsx`, com resumo da licitacao, cargos solicitados, quantidades e links dos perfis.

As buscas do navegador ficam restritas ao LinkedIn. O RPA bloqueia acesso fora de
`linkedin.com` e `licdn.com`; ele nao entra em OneDrive/SharePoint pela web.

O modo responsavel vem ativo por padrao: limite de 30 perfis por execucao, limite
diario de 80 perfis, pausa maior a cada 8 perfis, parada em captcha/checkpoint e
log de auditoria em `rpa/linkedin-sourcer/output/audit-log.ndjson`. Para rodar sem
baixar curriculos, use `--no-resume-downloads`; para aprovar cada download, use
`--confirm-downloads`.

A estrutura de documentos nao deve ficar dentro do projeto. Por padrao, o destino e:

```text
C:\Users\<seu-usuario>\Documents\LicitAI\Pregoes 2026\Julho\<Cliente>\<Perfil>\<Profissional>\
```

Para gravar direto na pasta sincronizada do OneDrive/SharePoint, informe o caminho no comando:

```bash
npm run search -- --config caminho/para/linkedin-campaign.json --documents-root "C:\Users\seu-usuario\OneDrive - Stefanini\Documents\Time Certificacoes\Pregoes"
```

Tambem e possivel definir a variavel de ambiente antes de executar:

```powershell
$env:LICITAI_DOCUMENTS_ROOT="C:\Users\seu-usuario\OneDrive - Stefanini\Documents\Time Certificacoes\Pregoes"
npm run search -- --config caminho/para/linkedin-campaign.json
```

Dentro da pasta de cada profissional ficam o curriculo baixado, quando houver, e um
`perfil-linkedin.txt` com os dados e link do perfil.

## Estrutura

- `src/app/linkedin-sourcing`: interface principal, com upload de edital em PDF ou texto.
- `src/app/api/linkedin`: APIs de analise, exportacao e importacao.
- `src/lib/linkedin`: dominio, empresas, scoring e IA.
- `rpa/linkedin-sourcer`: automacao local Playwright.
- `supabase/migrations`: schema opcional para persistencia.

## Observacoes legais

A automacao do LinkedIn pode contrariar termos da plataforma. Use apenas em contexto autorizado, com baixo volume, e respeitando LGPD e politicas internas.
