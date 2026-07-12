#!/usr/bin/env node
import fs from 'node:fs/promises';
import { isLoggedIn, launchBrowser } from './browser.js';
import { randomDelay } from './config.js';
import { saveExcelReport } from './excelReport.js';
import { organizeDocumentationStructure } from './oneDriveStructure.js';
import {
  appendAuditEvent,
  assertPageIsSafe,
  ensureDailyAllowance,
  getEffectiveProfileLimit,
  recordProfileVisit,
  resolveSafetyConfig,
  restIfNeeded,
} from './safety.js';
import { ensureDirs, saveResults, scrapeProfile, searchCompanyPeople, searchPeople } from './scraper.js';
import type { RpaSearchConfig, StefaniniCompany } from './types.js';

function parseArgs(): {
  configPath: string;
  documentsRoot?: string;
  noResumeDownloads: boolean;
  confirmDownloads: boolean;
} {
  const args = process.argv.slice(2);
  const configIndex = args.indexOf('--config');
  if (configIndex === -1 || !args[configIndex + 1]) {
    console.error(
      'Uso: npm run search -- --config <caminho/campaign.json> [--documents-root <pasta>] [--no-resume-downloads] [--confirm-downloads]'
    );
    process.exit(1);
  }

  const documentsRootIndex = args.indexOf('--documents-root');
  const documentsRoot = documentsRootIndex >= 0 ? args[documentsRootIndex + 1] : undefined;

  return {
    configPath: args[configIndex + 1],
    documentsRoot,
    noResumeDownloads: args.includes('--no-resume-downloads'),
    confirmDownloads: args.includes('--confirm-downloads'),
  };
}

async function main() {
  const { configPath, documentsRoot, noResumeDownloads, confirmDownloads } = parseArgs();
  const config = JSON.parse(await fs.readFile(configPath, 'utf-8')) as RpaSearchConfig;
  if (documentsRoot) {
    config.documentationRoot = documentsRoot;
  }

  config.safety = {
    ...config.safety,
    downloadResumes: noResumeDownloads ? false : config.safety?.downloadResumes ?? true,
    confirmBeforeResumeDownload: confirmDownloads || Boolean(config.safety?.confirmBeforeResumeDownload),
  };
  const safety = resolveSafetyConfig(config);
  const requestedLimit = getEffectiveProfileLimit(config, safety);
  const effectiveLimit = await ensureDailyAllowance(safety, requestedLimit);

  console.log(`Campanha: ${config.campaignName}`);
  console.log(`ID: ${config.campaignId}`);
  console.log(`Limite solicitado: ${config.maxProfiles}`);
  console.log(`Limite aplicado nesta execucao: ${effectiveLimit}`);
  console.log(`Downloads de curriculo: ${safety.downloadResumes ? 'habilitados' : 'desabilitados'}`);

  await appendAuditEvent({
    type: 'run_started',
    campaignId: config.campaignId,
    campaignName: config.campaignName,
    requestedLimit: config.maxProfiles,
    effectiveLimit,
    safety,
  });

  await ensureDirs();
  const context = await launchBrowser(config.headless);
  const page = context.pages()[0] || (await context.newPage());

  try {
    if (!(await isLoggedIn(page))) {
      throw new Error('Sessao LinkedIn ausente ou expirada. Execute npm run login.');
    }
    await assertPageIsSafe(page, 'login', safety);

    const searchTerms = [
      config.requirements.cargo,
      ...config.requirements.keywordsLinkedIn,
      ...config.requirements.competenciasTecnicas.slice(0, 4),
    ]
      .filter(Boolean)
      .join(' ');

    const allUrls = new Set<string>();
    for (const company of config.companies.filter(company => company.linkedinSlug || company.linkedinUrl)) {
      if (allUrls.size >= effectiveLimit) break;
      const urls = await searchCompanyPeople(page, company, searchTerms, effectiveLimit - allUrls.size, safety);
      urls.forEach(url => allUrls.add(url));
      await randomDelay(config.delayBetweenProfilesMs, config.delayBetweenProfilesMs + 2200);
    }

    if (allUrls.size === 0) {
      console.log('Nenhum perfil encontrado nas paginas de empresas. Tentando busca booleana como fallback controlado.');
      const urls = await searchPeople(page, config.requirements.booleanSearchQuery, effectiveLimit, safety);
      urls.forEach(url => allUrls.add(url));
    }

    const profileUrls = Array.from(allUrls).slice(0, effectiveLimit);
    const profiles = [];

    for (let index = 0; index < profileUrls.length; index++) {
      const url = profileUrls[index];
      console.log(`[${index + 1}/${profileUrls.length}] ${url}`);
      const profile = await scrapeProfile(page, url, {
        downloadResumes: safety.downloadResumes,
        confirmBeforeResumeDownload: safety.confirmBeforeResumeDownload,
        safety,
      });
      await recordProfileVisit();
      await appendAuditEvent({ type: 'profile_visited', campaignId: config.campaignId, profileUrl: url });
      if (!profile) continue;

      const matchesCompany = belongsToSelectedCompanies(profile, config.companies);

      if (matchesCompany) {
        profiles.push(profile);
        console.log(`Salvo: ${profile.name}`);
      } else {
        console.log(`Ignorado por empresa: ${profile.name}`);
      }

      await randomDelay(config.delayBetweenProfilesMs, config.delayBetweenProfilesMs + 1800);
      await restIfNeeded(index + 1, safety);
    }

    const outputPath = await saveResults(config.campaignId, profiles);
    const excelPath = await saveExcelReport(config, profiles);
    const documentationPath = await organizeDocumentationStructure(config, profiles);
    console.log(`Concluido. JSON gerado: ${outputPath}`);
    console.log(`Excel gerado: ${excelPath}`);
    console.log(`Estrutura de documentacao gerada: ${documentationPath}`);
    await appendAuditEvent({
      type: 'run_completed',
      campaignId: config.campaignId,
      savedProfiles: profiles.length,
      json: outputPath,
      excel: excelPath,
      documentation: documentationPath,
    });
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
