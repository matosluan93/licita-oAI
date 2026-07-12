import fs from 'node:fs/promises';
import path from 'node:path';
import type { Page } from 'playwright';
import { OUTPUT_DIR, randomDelay } from './config.js';
import type { RpaSafetyConfig, RpaSearchConfig } from './types.js';

const DEFAULT_SAFETY: RpaSafetyConfig = {
  maxProfilesPerRun: 30,
  dailyProfileLimit: 100,
  pauseEveryProfiles: 8,
  pauseBetweenBatchesMs: 90000,
  downloadResumes: true,
  confirmBeforeResumeDownload: false,
  stopOnCheckpoint: true,
};

interface DailyUsage {
  date: string;
  profilesVisited: number;
  profilesSaved: number;
}

export function resolveSafetyConfig(config: RpaSearchConfig): RpaSafetyConfig {
  const safety = { ...DEFAULT_SAFETY, ...(config.safety || {}) };

  return {
    maxProfilesPerRun: clampNumber(safety.maxProfilesPerRun, 1, 50, DEFAULT_SAFETY.maxProfilesPerRun),
    dailyProfileLimit: clampNumber(safety.dailyProfileLimit, 1, 150, DEFAULT_SAFETY.dailyProfileLimit),
    pauseEveryProfiles: clampNumber(safety.pauseEveryProfiles, 1, 20, DEFAULT_SAFETY.pauseEveryProfiles),
    pauseBetweenBatchesMs: clampNumber(safety.pauseBetweenBatchesMs, 30000, 10 * 60 * 1000, DEFAULT_SAFETY.pauseBetweenBatchesMs),
    downloadResumes: Boolean(safety.downloadResumes),
    confirmBeforeResumeDownload: Boolean(safety.confirmBeforeResumeDownload),
    stopOnCheckpoint: safety.stopOnCheckpoint !== false,
  };
}

export function getEffectiveProfileLimit(config: RpaSearchConfig, safety: RpaSafetyConfig): number {
  return Math.min(config.maxProfiles, safety.maxProfilesPerRun);
}

export async function ensureDailyAllowance(safety: RpaSafetyConfig, requestedProfiles: number): Promise<number> {
  const usage = await readDailyUsage();
  const remaining = Math.max(0, safety.dailyProfileLimit - usage.profilesSaved);
  const allowed = Math.min(requestedProfiles, remaining);

  if (allowed <= 0) {
    throw new Error(
      `Limite diario conservador atingido (${usage.profilesSaved}/${safety.dailyProfileLimit} perfis salvos). Tente novamente amanha.`
    );
  }

  if (allowed < requestedProfiles) {
    console.log(`Limite diario aplicado: esta execucao sera reduzida para ${allowed} perfis.`);
  }

  return allowed;
}

export async function recordProfileVisit(): Promise<void> {
  const usage = await readDailyUsage();
  usage.profilesVisited += 1;
  await fs.writeFile(getUsagePath(), JSON.stringify(usage, null, 2), 'utf-8');
}

export async function recordSavedProfile(): Promise<void> {
  const usage = await readDailyUsage();
  usage.profilesSaved += 1;
  await fs.writeFile(getUsagePath(), JSON.stringify(usage, null, 2), 'utf-8');
}

export async function getRemainingSavedProfilesToday(safety: RpaSafetyConfig): Promise<number> {
  const usage = await readDailyUsage();
  return Math.max(0, safety.dailyProfileLimit - usage.profilesSaved);
}

export async function restIfNeeded(processedProfiles: number, safety: RpaSafetyConfig): Promise<void> {
  if (processedProfiles === 0 || processedProfiles % safety.pauseEveryProfiles !== 0) return;

  const min = safety.pauseBetweenBatchesMs;
  const max = Math.round(safety.pauseBetweenBatchesMs * 1.45);
  console.log(`Pausa conservadora apos ${processedProfiles} perfis.`);
  await randomDelay(min, max);
}

export async function assertPageIsSafe(page: Page, stage: string, safety: RpaSafetyConfig): Promise<void> {
  if (!safety.stopOnCheckpoint) return;

  const url = page.url().toLowerCase();
  if (url.includes('/checkpoint') || url.includes('/captcha') || url.includes('/challenge')) {
    throw new Error(`LinkedIn exibiu checkpoint/captcha durante ${stage}. RPA pausado para evitar insistencia.`);
  }

  const bodyText = await page.locator('body').innerText({ timeout: 2500 }).catch(() => '');
  if (/captcha|checkpoint|security check|verifica[cç][aã]o de seguran[cç]a/i.test(bodyText)) {
    throw new Error(`Possivel captcha/checkpoint detectado durante ${stage}. RPA pausado para revisao manual.`);
  }
}

export async function appendAuditEvent(event: Record<string, unknown>): Promise<void> {
  await fs.mkdir(OUTPUT_DIR, { recursive: true });
  const line = JSON.stringify({ at: new Date().toISOString(), ...event });
  await fs.appendFile(path.join(OUTPUT_DIR, 'audit-log.ndjson'), `${line}\n`, 'utf-8');
}

async function readDailyUsage(): Promise<DailyUsage> {
  await fs.mkdir(OUTPUT_DIR, { recursive: true });
  const today = new Date().toISOString().slice(0, 10);
  const fallback: DailyUsage = { date: today, profilesVisited: 0, profilesSaved: 0 };

  const raw = await fs.readFile(getUsagePath(), 'utf-8').catch(() => '');
  if (!raw) return fallback;

  try {
    const parsed = JSON.parse(raw) as DailyUsage;
    if (parsed.date !== today) return fallback;
    return {
      date: parsed.date,
      profilesVisited: Number(parsed.profilesVisited) || 0,
      profilesSaved: Number(parsed.profilesSaved) || 0,
    };
  } catch {
    return fallback;
  }
}

function getUsagePath(): string {
  return path.join(OUTPUT_DIR, 'daily-usage.json');
}

function clampNumber(value: number, min: number, max: number, fallback: number): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, Math.round(parsed)));
}
