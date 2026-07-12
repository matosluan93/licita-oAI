import { buildBooleanSearchQuery } from './stefaniniCompanies';
import type { EditalRequirements, StefaniniCompany } from './types';

const TECH_TERMS = [
  'React',
  'Next.js',
  'TypeScript',
  'JavaScript',
  'Node.js',
  'Java',
  'Spring',
  'Python',
  'AWS',
  'Azure',
  'Docker',
  'Kubernetes',
  'SQL',
  'PostgreSQL',
  'Scrum',
  'SAP',
  'ServiceNow',
  'Power BI',
  'DevOps',
  'QA',
  'Selenium',
];

export function extractRequirementsHeuristically(text: string, companies: StefaniniCompany[]): EditalRequirements {
  const compact = text.replace(/\s+/g, ' ').trim();
  const lower = compact.toLowerCase();
  const cargo = findAfterLabel(compact, ['cargo', 'vaga', 'posicao', 'titulo']) || inferTitle(compact);
  const quantidade = inferQuantity(compact);
  const senioridade = inferSeniority(lower);
  const competenciasTecnicas = TECH_TERMS.filter(term => lower.includes(term.toLowerCase())).slice(0, 10);
  const certificacoes = extractCertifications(compact);
  const idiomas = extractLanguages(lower);
  const localizacao = findAfterLabel(compact, ['localizacao', 'local', 'cidade']) || (lower.includes('remoto') ? 'Remoto' : '');
  const experienciaMinima = compact.match(/(\d+\+?\s*(anos|ano)\s+de\s+experiencia)/i)?.[1] || '';
  const keywordsLinkedIn = [...new Set([cargo, ...competenciasTecnicas].filter(Boolean))].slice(0, 8);

  return {
    cargo,
    cargosSolicitados: [{ cargo, quantidade }],
    senioridade,
    descricao: compact.slice(0, 320),
    competenciasTecnicas,
    competenciasComportamentais: ['comunicacao', 'colaboracao', 'organizacao'].filter(term => lower.includes(term)),
    certificacoes,
    idiomas,
    experienciaMinima,
    localizacao,
    keywordsLinkedIn,
    booleanSearchQuery: buildBooleanSearchQuery(companies, keywordsLinkedIn),
  };
}

function inferQuantity(text: string): number {
  const explicit = text.match(/(?:quantidade|vagas?|posicoes|posições)\s*[:\-]?\s*(\d{1,3})/i)?.[1];
  if (explicit) return Number(explicit);

  const beforeVagas = text.match(/(\d{1,3})\s+(?:vagas?|posicoes|posições)/i)?.[1];
  if (beforeVagas) return Number(beforeVagas);

  return 1;
}

function findAfterLabel(text: string, labels: string[]): string {
  for (const label of labels) {
    const regex = new RegExp(`${label}\\s*[:\\-]\\s*([^\\n\\r.]{3,80})`, 'i');
    const match = text.match(regex);
    if (match?.[1]) return match[1].trim();
  }
  return '';
}

function inferTitle(text: string): string {
  const firstLine = text.split(/[\n\r.]/).map(line => line.trim()).find(Boolean);
  return firstLine?.slice(0, 70) || 'Profissional de Tecnologia';
}

function inferSeniority(text: string): string {
  if (text.includes('senior') || text.includes('senior')) return 'Senior';
  if (text.includes('pleno')) return 'Pleno';
  if (text.includes('junior') || text.includes('jr')) return 'Junior';
  if (text.includes('especialista')) return 'Especialista';
  if (text.includes('gerente')) return 'Gerente';
  return '';
}

function extractCertifications(text: string): string[] {
  const matches = text.match(/\b(AWS|Azure|PMP|ITIL|Scrum|Salesforce|SAP|Oracle|Microsoft)[^\n,;.]{0,45}/gi) || [];
  return [...new Set(matches.map(match => match.trim()))].slice(0, 6);
}

function extractLanguages(text: string): string[] {
  const languages: string[] = [];
  if (text.includes('ingles') || text.includes('english')) languages.push('Ingles');
  if (text.includes('espanhol') || text.includes('spanish')) languages.push('Espanhol');
  return languages;
}
