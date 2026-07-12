import type { StefaniniCompany } from './types';

export const STEFANINI_GROUP_COMPANIES: StefaniniCompany[] = [
  {
    id: 'stefanini',
    name: 'Stefanini Group',
    linkedinSlug: 'stefanini',
    linkedinUrl: 'https://www.linkedin.com/company/stefanini/',
    searchKeyword: 'Stefanini',
    aliases: ['Stefanini Group'],
  },
  {
    id: 'topaz',
    name: 'Topaz',
    linkedinSlug: 'topazevolution',
    linkedinUrl: 'https://www.linkedin.com/company/topazevolution/',
    searchKeyword: 'Topaz',
    aliases: ['Topaz Stefanini', 'Topaz Evolution'],
  },
  {
    id: 'stefanini-cyber',
    name: 'Stefanini Cyber',
    linkedinSlug: 'stefaninicyber',
    linkedinUrl: 'https://www.linkedin.com/company/stefaninicyber/',
    searchKeyword: 'Stefanini Cyber',
    aliases: ['Cyber Stefanini'],
  },
  {
    id: 'stefanini-artificial-intelligence',
    name: 'Stefanini Artificial Intelligence - SAI',
    linkedinSlug: 'stefanini',
    linkedinUrl: 'https://www.linkedin.com/company/stefanini/',
    searchKeyword: 'Stefanini Artificial Intelligence',
    aliases: ['SAI', 'SAI Stefanini', 'Stefanini AI'],
  },
  {
    id: 'ihm-stefanini',
    name: 'Stefanini IHM',
    linkedinSlug: 'stefaniniihm',
    linkedinUrl: 'https://www.linkedin.com/company/stefaniniihm/',
    searchKeyword: 'Stefanini IHM',
    aliases: ['IHM Stefanini', 'IHM'],
  },
  {
    id: 'scala',
    name: 'Stefanini Scala',
    linkedinSlug: 'scalait',
    linkedinUrl: 'https://www.linkedin.com/company/scalait/',
    searchKeyword: 'Stefanini Scala',
    aliases: ['Scala', 'Scala IT', 'Scala Stefanini'],
  },
  {
    id: 'n1-it-stefanini',
    name: 'N1 IT',
    linkedinSlug: 'n1it',
    linkedinUrl: 'https://www.linkedin.com/company/n1it/',
    searchKeyword: 'N1 IT',
    aliases: ['N1 IT Stefanini', 'N1IT'],
  },
  {
    id: 'necxt-stefanini',
    name: 'Necxt Stefanini',
    linkedinSlug: 'necxt-stefanini',
    linkedinUrl: 'https://www.linkedin.com/company/necxt-stefanini/',
    searchKeyword: 'Necxt Stefanini',
    aliases: ['Necxt'],
  },
  {
    id: 'stefanini-singulahr',
    name: 'Stefanini Singulahr',
    linkedinSlug: 'stefaninisingulahr',
    linkedinUrl: 'https://www.linkedin.com/company/stefaninisingulahr/',
    searchKeyword: 'Stefanini Singulahr',
    aliases: ['Singulahr'],
  },
  {
    id: 'haus',
    name: 'HAUS',
    linkedinSlug: 'ecossistemahaus',
    linkedinUrl: 'https://www.linkedin.com/company/ecossistemahaus/',
    searchKeyword: 'HAUS',
    aliases: ['Ecossistema HAUS', 'Haus Stefanini'],
  },
  {
    id: 'escala-24x7',
    name: 'Escala 24x7',
    linkedinSlug: 'escala-24x7-inc',
    linkedinUrl: 'https://www.linkedin.com/company/escala-24x7-inc/',
    searchKeyword: 'Escala 24x7',
    aliases: ['Escala 24x7 by Stefanini', 'Escala24x7'],
  },
];

export function getCompaniesByIds(ids: string[]): StefaniniCompany[] {
  return STEFANINI_GROUP_COMPANIES.filter(company => ids.includes(company.id));
}

export function buildBooleanSearchQuery(companies: StefaniniCompany[], keywords: string[]): string {
  const companyTerms = [
    ...new Set(companies.flatMap(company => [company.searchKeyword, ...(company.aliases || [])]).filter(Boolean)),
  ];

  const companyPart = companyTerms.length ? companyTerms.map(quoteTerm).join(' OR ') : quoteTerm('Stefanini');

  const cleanKeywords = keywords.map(keyword => keyword.trim()).filter(Boolean).slice(0, 8);
  const keywordPart = cleanKeywords.length
    ? cleanKeywords.map(quoteTerm).join(' OR ')
    : quoteTerm('technology');

  return `(${companyPart}) AND (${keywordPart})`;
}

function quoteTerm(term: string): string {
  return term.includes(' ') ? `"${term}"` : term;
}
