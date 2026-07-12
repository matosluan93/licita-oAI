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

export interface StefaniniCompany {
  id: string;
  name: string;
  linkedinSlug?: string;
  linkedinUrl?: string;
  searchKeyword: string;
  aliases?: string[];
}

export interface RpaSearchConfig {
  campaignId: string;
  campaignName: string;
  clientName: string;
  documentationRoot?: string;
  requirements: EditalRequirements;
  companies: StefaniniCompany[];
  maxProfiles: number;
  delayBetweenProfilesMs: number;
  headless: boolean;
  safety?: Partial<RpaSafetyConfig>;
}

export interface RpaSafetyConfig {
  maxProfilesPerRun: number;
  dailyProfileLimit: number;
  pauseEveryProfiles: number;
  pauseBetweenBatchesMs: number;
  downloadResumes: boolean;
  confirmBeforeResumeDownload: boolean;
  stopOnCheckpoint: boolean;
}

export interface ScrapedProfile {
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
}
