#!/usr/bin/env node
import fs from 'node:fs/promises';
import { isLoggedIn, launchBrowser } from './browser.js';
import { randomDelay } from './config.js';
import { saveExcelReport } from './excelReport.js';
import { organizeDocumentationStructure } from './oneDriveStructure.js';
import { ensureDirs, saveResults, scrapeProfile, searchCompanyPeople, searchPeople } from './scraper.js';
import type { RpaSearchConfig, StefaniniCompany } from './types.js';

function parseArgs(): { configPath: string } {
  const args = process.argv.slice(2);
  const configIndex = args.indexOf('--config');
  if (configIndex === -1 || !args[configIndex + 1]) {
    console.error('Uso: npm run search -- --config <caminho/campaign.json>');
    process.exit(1);
  }
  return { configPath: args[configIndex + 1] };
}

async function main() {
  const { configPath } = parseArgs();
  const config = JSON.parse(await fs.readFile(configPath, 'utf-8')) as RpaSearchConfig;

  console.log(`Campanha: ${config.campaignName}`);
  console.log(`ID: ${config.campaignId}`);
  console.log(`Limite: ${config.maxProfiles}`);

  await ensureDirs();
  const context = await launchBrowser(config.headless);
  const page = context.pages()[0] || (await context.newPage());

  try {
    if (!(await isLoggedIn(page))) {
      throw new Error('Sessao LinkedIn ausente ou expirada. Execute npm run login.');
    }

    const searchTerms = [
      config.requirements.cargo,
      ...config.requirements.keywordsLinkedIn,
      ...config.requirements.competenciasTecnicas.slice(0, 4),
    ]
      .filter(Boolean)
      .join(' ');

    const allUrls = new Set<string>();
    for (const company of config.companies.filter(company => company.linkedinSlug || company.linkedinUrl)) {
      if (allUrls.size >= config.maxProfiles) break;
      const urls = await searchCompanyPeople(page, company, searchTerms, config.maxProfiles - allUrls.size);
      urls.forEach(url => allUrls.add(url));
      await randomDelay(3000, 5200);
    }

    if (allUrls.size === 0) {
      console.log('Nenhum perfil encontrado nas paginas de empresas. Tentando busca booleana como fallback controlado.');
      const urls = await searchPeople(page, config.requirements.booleanSearchQuery, config.maxProfiles);
      urls.forEach(url => allUrls.add(url));
    }

    const profileUrls = Array.from(allUrls).slice(0, config.maxProfiles);
    const profiles = [];

    for (let index = 0; index < profileUrls.length; index++) {
      const url = profileUrls[index];
      console.log(`[${index + 1}/${profileUrls.length}] ${url}`);
      const profile = await scrapeProfile(page, url);
      if (!profile) continue;

      const matchesCompany = belongsToSelectedCompanies(profile, config.companies);

      if (matchesCompany) {
        profiles.push(profile);
        console.log(`Salvo: ${profile.name}`);
      } else {
        console.log(`Ignorado por empresa: ${profile.name}`);
      }

      await randomDelay(config.delayBetweenProfilesMs, config.delayBetweenProfilesMs + 1800);
    }

    const outputPath = await saveResults(config.campaignId, profiles);
    const excelPath = await saveExcelReport(config, profiles);
    const documentationPath = await organizeDocumentationStructure(config, profiles);
    console.log(`Concluido. JSON gerado: ${outputPath}`);
    console.log(`Excel gerado: ${excelPath}`);
    console.log(`Estrutura de documentacao gerada: ${documentationPath}`);
  } finally {
    await context.close();
  }
}

main().catch(error => {
  console.error('Erro:', error instanceof Error ? error.message : error);
  process.exit(1);
});

function belongsToSelectedCompanies(
  profile: { company: string; headline: string; experience?: string[]; companySlugs?: string[] },
  companies: StefaniniCompany[]
): boolean {
  const officialSlugs = new Set(companies.map(company => company.linkedinSlug?.toLowerCase()).filter(Boolean));
  const profileSlugs = profile.companySlugs || [];

  if (profileSlugs.some(slug => officialSlugs.has(slug.toLowerCase()))) {
    return true;
  }

  const text = [profile.company, profile.headline, ...(profile.experience || [])].join(' ').toLowerCase();
  return companies.some(company => {
    const terms = [company.searchKeyword, company.name, ...(company.aliases || [])]
      .map(term => term.toLowerCase())
      .filter(term => term.length > 2);
    return terms.some(term => text.includes(term));
  });
}
