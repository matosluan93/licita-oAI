import type { EditalRequirements, LinkedInProfileResult, RpaExportPayload } from './types';

export function scoreProfile(
  profile: RpaExportPayload['profiles'][number],
  requirements: EditalRequirements
): Pick<LinkedInProfileResult, 'matchScore' | 'matchEvidence' | 'gaps'> {
  const text = [
    profile.name,
    profile.headline,
    profile.location,
    profile.company,
    profile.about,
    ...(profile.experience || []),
    ...(profile.skills || []),
  ]
    .join(' ')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

  const evidence: string[] = [];
  const gaps: string[] = [];
  let score = 35;

  for (const skill of requirements.competenciasTecnicas.slice(0, 8)) {
    if (containsTerm(text, skill)) {
      score += 7;
      evidence.push(`Competencia tecnica: ${skill}`);
    } else {
      gaps.push(`Sem evidencia de ${skill}`);
    }
  }

  for (const keyword of requirements.keywordsLinkedIn.slice(0, 5)) {
    if (containsTerm(text, keyword)) {
      score += 4;
      evidence.push(`Palavra-chave encontrada: ${keyword}`);
    }
  }

  if (requirements.cargo && containsTerm(text, requirements.cargo.split(' ')[0])) {
    score += 9;
    evidence.push(`Cargo relacionado a ${requirements.cargo}`);
  }

  if (requirements.senioridade && containsTerm(text, requirements.senioridade)) {
    score += 5;
    evidence.push(`Senioridade compativel: ${requirements.senioridade}`);
  }

  for (const certification of requirements.certificacoes.slice(0, 3)) {
    if (containsTerm(text, certification)) {
      score += 5;
      evidence.push(`Certificacao: ${certification}`);
    }
  }

  return {
    matchScore: Math.min(100, Math.max(0, score)),
    matchEvidence: evidence.slice(0, 6),
    gaps: gaps.slice(0, 5),
  };
}

function containsTerm(normalizedText: string, term: string): boolean {
  const normalizedTerm = term
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
  return normalizedTerm.length > 1 && normalizedText.includes(normalizedTerm);
}
