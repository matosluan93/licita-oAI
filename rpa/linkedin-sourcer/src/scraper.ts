import fs from 'node:fs/promises';
import path from 'node:path';
import type { Page } from 'playwright';
import {
  assertLinkedInAllowedUrl,
  DOWNLOADS_DIR,
  LINKEDIN_BASE,
  OUTPUT_DIR,
  randomDelay,
  sanitizeFilename,
} from './config.js';
import type { ScrapedProfile, StefaniniCompany } from './types.js';

export async function ensureDirs(): Promise<void> {
  await fs.mkdir(OUTPUT_DIR, { recursive: true });
  await fs.mkdir(DOWNLOADS_DIR, { recursive: true });
}

export async function searchPeople(page: Page, query: string, maxResults: number): Promise<string[]> {
  const searchUrl = `${LINKEDIN_BASE}/search/results/people/?keywords=${encodeURIComponent(query)}&origin=GLOBAL_SEARCH_HEADER`;
  assertLinkedInAllowedUrl(searchUrl, 'Busca LinkedIn');
  console.log(`Buscando: ${query}`);
  await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await randomDelay(2200, 3800);
  return collectProfileUrls(page, maxResults);
}

export async function searchCompanyPeople(
  page: Page,
  company: StefaniniCompany,
  query: string,
  maxResults: number
): Promise<string[]> {
  const companyUrl = company.linkedinUrl || `${LINKEDIN_BASE}/company/${company.linkedinSlug}/`;
  const searchUrl = `${companyUrl.replace(/\/$/, '')}/people/?keywords=${encodeURIComponent(query)}`;
  assertLinkedInAllowedUrl(searchUrl, `Empresa ${company.name}`);
  console.log(`Buscando em ${company.name}: ${query}`);
  await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await randomDelay(2400, 4200);
  return collectProfileUrls(page, maxResults);
}

async function collectProfileUrls(page: Page, maxResults: number): Promise<string[]> {
  const profileUrls = new Set<string>();

  for (let cycle = 0; cycle < 8 && profileUrls.size < maxResults; cycle++) {
    const links = await page.$$eval('a[href*="/in/"]', (anchors: HTMLAnchorElement[]) =>
      anchors
        .map((anchor: HTMLAnchorElement) => anchor.href.split('?')[0])
        .filter((href: string) => /linkedin\.com\/in\/[^/]+\/?$/.test(href))
    );

    for (const url of links) {
      profileUrls.add(url.replace(/\/$/, ''));
      if (profileUrls.size >= maxResults) break;
    }

    const nextButton = page.locator('button[aria-label="Proxima"], button[aria-label="Próxima"], button[aria-label="Next"]').first();
    if ((await nextButton.isVisible().catch(() => false)) && profileUrls.size < maxResults) {
      await nextButton.click().catch(() => undefined);
      await randomDelay(2200, 3600);
    } else {
      await page.evaluate(() => window.scrollBy(0, window.innerHeight * 1.4));
      await randomDelay(1600, 2800);
    }
  }

  console.log(`Encontrados ${profileUrls.size} perfis.`);
  return Array.from(profileUrls).slice(0, maxResults);
}

export async function scrapeProfile(page: Page, profileUrl: string): Promise<ScrapedProfile | null> {
  try {
    assertLinkedInAllowedUrl(profileUrl, 'Perfil LinkedIn');
    await page.goto(profileUrl, { waitUntil: 'domcontentloaded', timeout: 50000 });
    await randomDelay(2200, 4200);
    await page.evaluate(() => window.scrollBy(0, window.innerHeight));
    await randomDelay(900, 1500);

    const name = normalize((await page.locator('h1').first().textContent().catch(() => '')) || '') || 'Desconhecido';
    const headline = normalize(
      (await page.locator('.text-body-medium.break-words, [data-generated-suggestion-target]').first().textContent().catch(() => '')) || ''
    );
    const location = normalize(
      (await page.locator('.text-body-small.inline.t-black--light.break-words, span.text-body-small').first().textContent().catch(() => '')) || ''
    );
    const about = normalize(
      (await page.locator('#about ~ div, section:has(#about) .inline-show-more-text, [data-section="summary"]').first().textContent().catch(() => '')) ||
        ''
    ).slice(0, 2200);
    const experience = (
      await page.locator('#experience ~ div li, section:has(#experience) li').allTextContents().catch(() => [])
    )
      .map(normalize)
      .filter(Boolean)
      .slice(0, 8);
    const skills = (
      await page.locator('#skills ~ div li span[aria-hidden="true"], section:has(#skills) li span[aria-hidden="true"]').allTextContents().catch(() => [])
    )
      .map(normalize)
      .filter(Boolean)
      .slice(0, 16);

    const companySlugs = await extractCompanySlugs(page);
    const company = inferCompany(experience, headline);
    const resume = await tryDownloadResume(page, name);

    return {
      name,
      headline,
      location,
      company,
      companySlugs,
      profileUrl,
      resumeUrl: resume.resumeUrl,
      resumeDownloaded: resume.resumeDownloaded,
      about,
      experience,
      skills,
      scrapedAt: new Date().toISOString(),
    };
  } catch (error) {
    console.warn(`Erro ao ler ${profileUrl}:`, error instanceof Error ? error.message : error);
    return null;
  }
}

export async function saveResults(campaignId: string, profiles: ScrapedProfile[]): Promise<string> {
  const outputPath = path.join(OUTPUT_DIR, `results-${sanitizeFilename(campaignId)}.json`);
  await fs.writeFile(
    outputPath,
    JSON.stringify({ campaignId, exportedAt: new Date().toISOString(), profiles }, null, 2),
    'utf-8'
  );
  return outputPath;
}

function normalize(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

function inferCompany(experience: string[], headline: string): string {
  const firstExperience = experience[0] || '';
  const known = [
    'Stefanini Group',
    'Stefanini Cyber',
    'Stefanini IHM',
    'Stefanini Artificial Intelligence',
    'Topaz',
    'Scala IT',
    'N1 IT',
    'Necxt Stefanini',
    'Stefanini Singulahr',
    'HAUS',
    'Escala 24x7',
    'Stefanini',
  ];
  return known.find(company => `${firstExperience} ${headline}`.toLowerCase().includes(company.toLowerCase())) || firstExperience.split(' ').slice(0, 4).join(' ');
}

async function extractCompanySlugs(page: Page): Promise<string[]> {
  const hrefs = await page
    .$$eval('a[href*="/company/"]', (anchors: HTMLAnchorElement[]) =>
      anchors.map((anchor: HTMLAnchorElement) => anchor.href)
    )
    .catch(() => []);

  return [
    ...new Set(
      hrefs
        .map(href => href.match(/\/company\/([^/?#]+)/)?.[1]?.toLowerCase())
        .filter((slug): slug is string => Boolean(slug))
    ),
  ];
}

async function tryDownloadResume(page: Page, name: string): Promise<{ resumeUrl?: string; resumeDownloaded: boolean }> {
  const moreButton = page.locator('button[aria-label*="Mais"], button[aria-label*="More"]').first();
  if (await moreButton.isVisible().catch(() => false)) {
    await moreButton.click().catch(() => undefined);
    await randomDelay(600, 1200);
  }

  const resumeLink = page.locator('a[href*="resume"], a[download], a:has-text("Curriculo"), a:has-text("Currículo"), a:has-text("Resume")').first();
  if (!(await resumeLink.isVisible().catch(() => false))) {
    return { resumeDownloaded: false };
  }

  let resumeUrl = (await resumeLink.getAttribute('href').catch(() => undefined)) || undefined;
  if (resumeUrl && !resumeUrl.startsWith('http')) resumeUrl = `${LINKEDIN_BASE}${resumeUrl}`;

  const downloadPromise = page.waitForEvent('download', { timeout: 8000 }).catch(() => null);
  await resumeLink.click().catch(() => undefined);
  const download = await downloadPromise;

  if (!download) return { resumeUrl, resumeDownloaded: false };

  const savePath = path.join(DOWNLOADS_DIR, `${sanitizeFilename(name)}-curriculo.pdf`);
  await download.saveAs(savePath);
  return { resumeUrl: savePath, resumeDownloaded: true };
}
