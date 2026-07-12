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

O resultado fica em dois arquivos:

- `output/results-<campaignId>.json`, para importar na tela `/linkedin-sourcing`.
- `output/licitacao-<campaignId>.xlsx`, para abrir no Excel com abas de resumo, cargos e links dos perfis.

Além disso, o LicitAI organiza os documentos na mesma lógica esperada para o OneDrive:

```text
output/Pregões 2026/Julho/<Cliente>/<Perfil>/<Profissional>/
```

Cada pasta de profissional recebe:

- currículo baixado, quando o LinkedIn disponibilizar o download;
- `perfil-linkedin.txt`, com nome, perfil solicitado, link do LinkedIn, empresa, headline e dados coletados.

## Cuidados

- Use apenas em contexto autorizado.
- Respeite LGPD, politicas internas e termos das plataformas.
- O LinkedIn muda HTML com frequencia; seletores podem precisar de ajuste.
