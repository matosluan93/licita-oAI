export interface StefaniniCompany {
  id: string;
  name: string;
  linkedinSlug?: string;
  linkedinUrl?: string;
  searchKeyword: string;
  aliases?: string[];
}

export interface EditalRequirements {
  cargo: string;
  cargosSolicitados?: RequestedRole[];
  senioridade: string;
  descricao: string;
  competenciasTecnicas: string[];
  competenciasComportamentais: string[];
  certificacoes: string[];
  idiomas: string[];
  experienciaMinima: string;
  localizacao: string;
  keywordsLinkedIn: string[];
  booleanSearchQuery: string;
}

export interface RequestedRole {
  cargo: string;
  quantidade: number;
}

export interface SourcingCampaign {
  id: string;
  name: string;
  editalText?: string;
  requirements: EditalRequirements;
  companies: StefaniniCompany[];
  maxProfiles: number;
  delayBetweenProfilesMs: number;
  headless: boolean;
  createdAt: string;
  status: 'draft' | 'ready' | 'running' | 'completed' | 'failed';
}

export interface LinkedInProfileResult {
  id: string;
  campaignId: string;
  name: string;
  headline: string;
  location: string;
  company: string;
  companySlugs?: string[];
  profileUrl: string;
  resumeUrl?: string;
  resumeDownloaded: boolean;
  about?: string;
  experience?: string[];
  skills?: string[];
  matchScore: number;
  matchEvidence: string[];
  gaps: string[];
  scrapedAt: string;
}

export interface RpaSearchConfig {
  campaignId: string;
  campaignName: string;
  requirements: EditalRequirements;
  companies: StefaniniCompany[];
  maxProfiles: number;
  delayBetweenProfilesMs: number;
  headless: boolean;
}

export interface RpaExportPayload {
  campaignId: string;
  exportedAt: string;
  profiles: Array<{
    name: string;
    headline: string;
    location: string;
    company: string;
    companySlugs?: string[];
    profileUrl: string;
    resumeUrl?: string;
    resumeDownloaded: boolean;
    about?: string;
    experience?: string[];
    skills?: string[];
    scrapedAt: string;
  }>;
}

export interface ImportResultsResponse {
  campaignId: string;
  importedAt: string;
  totalProfiles: number;
  profiles: LinkedInProfileResult[];
}
