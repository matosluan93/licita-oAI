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

## Estrutura

- `src/app/linkedin-sourcing`: interface principal, com upload de edital em PDF ou texto.
- `src/app/api/linkedin`: APIs de analise, exportacao e importacao.
- `src/lib/linkedin`: dominio, empresas, scoring e IA.
- `rpa/linkedin-sourcer`: automacao local Playwright.
- `supabase/migrations`: schema opcional para persistencia.

## Observacoes legais

A automacao do LinkedIn pode contrariar termos da plataforma. Use apenas em contexto autorizado, com baixo volume, e respeitando LGPD e politicas internas.
