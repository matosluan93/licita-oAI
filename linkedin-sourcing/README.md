# Busca LinkedIn - LicitAI

Aplicacao para analisar editais, configurar campanhas de sourcing no LinkedIn, executar uma automacao local e ranquear perfis por aderencia.

## Fluxo

1. Acesse `http://localhost:4028/linkedin-sourcing`.
2. Cole o edital ou anexe um PDF/texto.
3. Selecione as empresas do grupo Stefanini.
4. Analise o edital.
5. Exporte a configuracao JSON com os links oficiais das empresas no LinkedIn.
6. Rode o RPA em `rpa/linkedin-sourcer`; ele busca nas paginas `/company/<slug>/people/`.
7. Use `output/licitacao-<campaignId>.xlsx` no Excel ou importe `output/results-<campaignId>.json` na tela.

## Pasta de documentos

A estrutura de documentacao fica fora do projeto:

```text
C:\Users\<seu-usuario>\Documents\LicitAI\Pregoes 2026\Julho\<Cliente>\<Perfil>\<Profissional>\
```

Para gravar direto no OneDrive/SharePoint sincronizado localmente, rode o RPA com:

```bash
npm run search -- --config caminho/para/linkedin-campaign.json --documents-root "C:\Users\seu-usuario\OneDrive - Stefanini\Documents\Time Certificacoes\Pregoes"
```

## Variaveis

Copie `.env.example` para `.env` e preencha:

```bash
OPENAI_API_KEY=sk-proj-sua-chave
NEXT_PUBLIC_SITE_URL=http://localhost:4028
LICITAI_DOCUMENTS_ROOT=C:\Users\seu-usuario\OneDrive - Stefanini\Documents\Time Certificacoes\Pregoes
```

Sem `OPENAI_API_KEY`, a aplicacao usa uma extracao heuristica para testes.

## APIs

| Endpoint | Metodo | Uso |
| --- | --- | --- |
| `/api/linkedin/parse-edital` | POST | Extrai requisitos do edital |
| `/api/linkedin/export-config` | POST | Gera JSON para o RPA |
| `/api/linkedin/import-results` | POST | Importa perfis e calcula score |

## Banco

A migration Supabase esta em `supabase/migrations/20260711140000_linkedin_sourcing.sql`.
