import ExcelJS from 'exceljs';
import fs from 'node:fs/promises';
import path from 'node:path';
import { OUTPUT_DIR, sanitizeFilename } from './config.js';
import type { RpaSearchConfig, ScrapedProfile } from './types.js';

export async function saveExcelReport(config: RpaSearchConfig, profiles: ScrapedProfile[]): Promise<string> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'LicitAI';
  workbook.created = new Date();

  const roles = normalizeRoles(config);
  addResumoSheet(workbook, config, profiles, roles);
  addCargosSheet(workbook, roles, profiles);
  addPerfisSheet(workbook, config, profiles);

  const outputPath = path.join(OUTPUT_DIR, `licitacao-${sanitizeFilename(config.campaignId)}.xlsx`);
  await fs.mkdir(OUTPUT_DIR, { recursive: true });
  await workbook.xlsx.writeFile(outputPath);
  return outputPath;
}

function normalizeRoles(config: RpaSearchConfig): Array<{ cargo: string; quantidade: number }> {
  const roles = config.requirements.cargosSolicitados?.length
    ? config.requirements.cargosSolicitados
    : [{ cargo: config.requirements.cargo || config.campaignName, quantidade: config.maxProfiles }];

  return roles.map(role => ({
    cargo: role.cargo || config.requirements.cargo || config.campaignName,
    quantidade: Number(role.quantidade) > 0 ? Number(role.quantidade) : 1,
  }));
}

function addResumoSheet(
  workbook: ExcelJS.Workbook,
  config: RpaSearchConfig,
  profiles: ScrapedProfile[],
  roles: Array<{ cargo: string; quantidade: number }>
) {
  const sheet = workbook.addWorksheet('Resumo', { views: [{ state: 'frozen', ySplit: 1 }] });
  sheet.columns = [
    { key: 'campo', width: 28 },
    { key: 'valor', width: 82 },
  ];

  sheet.addRow(['Campo', 'Valor']);
  sheet.addRows([
    ['Licitação/Campanha', config.campaignName],
    ['ID', config.campaignId],
    ['Gerado em', new Date()],
    ['Empresas pesquisadas', config.companies.map(company => company.name).join(', ')],
    ['Cargos solicitados', roles.map(role => `${role.cargo} (${role.quantidade})`).join(', ')],
    ['Quantidade total solicitada', roles.reduce((sum, role) => sum + role.quantidade, 0)],
    ['Perfis encontrados', profiles.length],
    ['Query booleana', config.requirements.booleanSearchQuery],
  ]);

  styleHeader(sheet.getRow(1));
  sheet.getColumn('valor').alignment = { wrapText: true, vertical: 'top' };
  sheet.getCell('B4').numFmt = 'yyyy-mm-dd hh:mm';
}

function addCargosSheet(
  workbook: ExcelJS.Workbook,
  roles: Array<{ cargo: string; quantidade: number }>,
  profiles: ScrapedProfile[]
) {
  const sheet = workbook.addWorksheet('Cargos', { views: [{ state: 'frozen', ySplit: 1 }] });
  sheet.columns = [
    { header: 'Cargo solicitado', key: 'cargo', width: 42 },
    { header: 'Quantidade solicitada', key: 'quantidade', width: 22 },
    { header: 'Perfis encontrados', key: 'encontrados', width: 20 },
  ];

  const perRoleCount = Math.max(0, profiles.length);
  for (const role of roles) {
    sheet.addRow({
      cargo: role.cargo,
      quantidade: role.quantidade,
      encontrados: perRoleCount,
    });
  }

  styleHeader(sheet.getRow(1));
  sheet.getColumn('quantidade').numFmt = '#,##0';
  sheet.getColumn('encontrados').numFmt = '#,##0';
}

function addPerfisSheet(workbook: ExcelJS.Workbook, config: RpaSearchConfig, profiles: ScrapedProfile[]) {
  const sheet = workbook.addWorksheet('Perfis', { views: [{ state: 'frozen', ySplit: 1 }] });
  sheet.columns = [
    { header: 'Licitação/Campanha', key: 'campaign', width: 30 },
    { header: 'Cargo solicitado', key: 'role', width: 34 },
    { header: 'Nome', key: 'name', width: 30 },
    { header: 'Headline', key: 'headline', width: 52 },
    { header: 'Empresa', key: 'company', width: 26 },
    { header: 'Localização', key: 'location', width: 26 },
    { header: 'Perfil LinkedIn', key: 'profileUrl', width: 44 },
    { header: 'Currículo baixado', key: 'resumeDownloaded', width: 18 },
    { header: 'Arquivo currículo', key: 'resumeUrl', width: 48 },
    { header: 'Coletado em', key: 'scrapedAt', width: 22 },
  ];

  const roleName = config.requirements.cargosSolicitados?.[0]?.cargo || config.requirements.cargo || config.campaignName;

  for (const profile of profiles) {
    const row = sheet.addRow({
      campaign: config.campaignName,
      role: roleName,
      name: profile.name,
      headline: profile.headline,
      company: profile.company,
      location: profile.location,
      profileUrl: profile.profileUrl,
      resumeDownloaded: profile.resumeDownloaded ? 'Sim' : 'Não',
      resumeUrl: profile.resumeUrl || '',
      scrapedAt: profile.scrapedAt ? new Date(profile.scrapedAt) : '',
    });

    row.getCell('profileUrl').value = {
      text: profile.profileUrl,
      hyperlink: profile.profileUrl,
    };
    row.getCell('profileUrl').font = { color: { argb: 'FF0E7490' }, underline: true };

    if (profile.resumeUrl) {
      row.getCell('resumeUrl').value = {
        text: profile.resumeUrl,
        hyperlink: profile.resumeUrl.startsWith('http') ? profile.resumeUrl : `file:///${profile.resumeUrl.replace(/\\/g, '/')}`,
      };
      row.getCell('resumeUrl').font = { color: { argb: 'FF0E7490' }, underline: true };
    }
  }

  styleHeader(sheet.getRow(1));
  sheet.getColumn('headline').alignment = { wrapText: true, vertical: 'top' };
  sheet.getColumn('scrapedAt').numFmt = 'yyyy-mm-dd hh:mm';
  sheet.autoFilter = 'A1:J1';
}

function styleHeader(row: ExcelJS.Row) {
  row.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  row.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF162033' },
  };
  row.alignment = { vertical: 'middle', wrapText: true };
  row.eachCell(cell => {
    cell.border = {
      bottom: { style: 'thin', color: { argb: 'FFD9E1EC' } },
    };
  });
}
