import { chromium, type BrowserContext, type Page } from 'playwright';
import { LINKEDIN_BASE, SESSION_DIR } from './config.js';

export async function launchBrowser(headless = false): Promise<BrowserContext> {
  return chromium.launchPersistentContext(SESSION_DIR, {
    headless,
    viewport: { width: 1280, height: 900 },
    acceptDownloads: true,
    slowMo: headless ? 0 : 60,
    userAgent:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  });
}

export async function isLoggedIn(page: Page): Promise<boolean> {
  await page.goto(`${LINKEDIN_BASE}/feed/`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(2000);
  const url = page.url();
  return !url.includes('/login') && !url.includes('/authwall') && !url.includes('/checkpoint');
}

export async function waitForManualLogin(page: Page): Promise<void> {
  console.log('Abra a janela do navegador e faca login no LinkedIn.');
  await page.goto(`${LINKEDIN_BASE}/login`, { waitUntil: 'domcontentloaded' });

  for (let attempt = 0; attempt < 120; attempt++) {
    await page.waitForTimeout(3000);
    const url = page.url();
    if (!url.includes('/login') && !url.includes('/authwall') && !url.includes('/checkpoint')) {
      console.log('Login detectado. Sessao salva.');
      return;
    }
  }

  throw new Error('Timeout aguardando login.');
}
