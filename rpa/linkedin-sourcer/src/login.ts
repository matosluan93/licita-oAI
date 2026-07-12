#!/usr/bin/env node
import { launchBrowser, waitForManualLogin } from './browser.js';

async function main() {
  console.log('LicitAI - Login LinkedIn');
  const context = await launchBrowser(false);
  const page = context.pages()[0] || (await context.newPage());

  try {
    await waitForManualLogin(page);
    console.log('Sessao pronta. Execute npm run search -- --config <arquivo.json>.');
  } finally {
    await context.close();
  }
}

main().catch(error => {
  console.error('Erro:', error instanceof Error ? error.message : error);
  process.exit(1);
});
