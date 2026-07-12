import fs from 'node:fs/promises';
import path from 'node:path';
import { OUTPUT_DIR, sanitizeFilename } from './config.js';
import type { RequestedRole, RpaSearchConfig, ScrapedProfile } from './types.js';

const MONTHS_PT_BR = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
];

export async function organizeDocumentationStructure(
  config: RpaSearchConfig,
  profiles: ScrapedProfile[]
): Promise<string> {
  const now = new Date();
  const yearFolder = `Pregões ${now.getFullYear()}`;
  const monthFolder = MONTHS_PT_BR[now.getMonth()];
  const clientFolder = safePathSegment(config.clientName || config.campaignName || 'Cliente não informado');
  const baseDir = path.join(OUTPUT_DIR, yearFolder, monthFolder, clientFolder);
  const roles = normalizeRoles(config);
  const assignments = assignProfilesToRoles(profiles, roles);

  await fs.mkdir(baseDir, { recursive: true });

  for (const role of roles) {
    await fs.mkdir(path.join(baseDir, safePathSegment(role.cargo)), { recursive: true });
  }

  for (const assignment of assignments) {
    const roleDir = path.join(baseDir, safePathSegment(assignment.role.cargo));
    const professionalDir = path.join(roleDir, safePathSegment(assignment.profile.name));
    await fs.mkdir(professionalDir, { recursive: true });
    await writeProfileSummary(professionalDir, assignment.profile, assignment.role);
    await copyResumeIfAvailable(professionalDir, assignment.profile);
  }

  return baseDir;
}

function normalizeRoles(config: RpaSearchConfig): RequestedRole[] {
  const roles = config.requirements.cargosSolicitados?.length
    ? config.requirements.cargosSolicitados
    : [{ cargo: config.requirements.cargo || config.campaignName, quantidade: config.maxProfiles }];

  return roles.map(role => ({
    cargo: role.cargo || config.requirements.cargo || config.campaignName,
    quantidade: Number(role.quantidade) > 0 ? Number(role.quantidade) : 1,
  }));
}

function assignProfilesToRoles(
  profiles: ScrapedProfile[],
  roles: RequestedRole[]
): Array<{ profile: ScrapedProfile; role: RequestedRole }> {
  const assignments: Array<{ profile: ScrapedProfile; role: RequestedRole }> = [];
  const roleCounts = new Map<string, number>();

  for (const profile of profiles) {
    const role = findBestRole(profile, roles, roleCounts);
    assignments.push({ profile, role });
    roleCounts.set(role.cargo, (roleCounts.get(role.cargo) || 0) + 1);
  }

  return assignments;
}

function findBestRole(profile: ScrapedProfile, roles: RequestedRole[], roleCounts: Map<string, number>): RequestedRole {
  const text = [profile.headline, profile.about, ...(profile.experience || []), ...(profile.skills || [])]
    .join(' ')
    .toLowerCase();

  const matchingRole = roles.find(role => text.includes(role.cargo.toLowerCase()));
  if (matchingRole) return matchingRole;

  return (
    roles.find(role => (roleCounts.get(role.cargo) || 0) < role.quantidade) ||
    roles[0] ||
    { cargo: 'Perfil não identificado', quantidade: 1 }
  );
}

async function writeProfileSummary(professionalDir: string, profile: ScrapedProfile, role: RequestedRole) {
  const content = [
    `Nome: ${profile.name}`,
    `Perfil solicitado: ${role.cargo}`,
    `Quantidade solicitada para o perfil: ${role.quantidade}`,
    `Headline: ${profile.headline}`,
    `Empresa: ${profile.company}`,
    `Localização: ${profile.location}`,
    `LinkedIn: ${profile.profileUrl}`,
    `Currículo baixado: ${profile.resumeDownloaded ? 'Sim' : 'Não'}`,
    profile.resumeUrl ? `Arquivo currículo original: ${profile.resumeUrl}` : '',
    `Coletado em: ${profile.scrapedAt}`,
    '',
    'Experiências:',
    ...(profile.experience || []).map(item => `- ${item}`),
    '',
    'Skills:',
    ...(profile.skills || []).map(item => `- ${item}`),
  ]
    .filter(line => line !== '')
    .join('\n');

  await fs.writeFile(path.join(professionalDir, 'perfil-linkedin.txt'), content, 'utf-8');
}

async function copyResumeIfAvailable(professionalDir: string, profile: ScrapedProfile) {
  if (!profile.resumeDownloaded || !profile.resumeUrl || profile.resumeUrl.startsWith('http')) return;

  const extension = path.extname(profile.resumeUrl) || '.pdf';
  const destination = path.join(professionalDir, `${sanitizeFilename(profile.name)}-curriculo${extension}`);

  await fs.copyFile(profile.resumeUrl, destination).catch(async error => {
    const note = `Não foi possível copiar o currículo automaticamente.\nOrigem: ${profile.resumeUrl}\nErro: ${
      error instanceof Error ? error.message : String(error)
    }\n`;
    await fs.writeFile(path.join(professionalDir, 'curriculo-pendente.txt'), note, 'utf-8');
  });
}

function safePathSegment(value: string): string {
  const cleaned = value
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, '_')
    .replace(/\s+/g, ' ')
    .trim();
  return cleaned.slice(0, 120) || 'Sem nome';
}
