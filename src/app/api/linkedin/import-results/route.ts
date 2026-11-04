import { NextRequest, NextResponse } from 'next/server';
import { readJson, requestError } from '@/lib/linkedin/request-body';
import { completeJson } from '@/lib/linkedin/openai';
import { scoreProfile } from '@/lib/linkedin/scoring';
import type { EditalRequirements, LinkedInProfileResult, RpaExportPayload } from '@/lib/linkedin/types';

export async function POST(request: NextRequest) {
  try {
    const body = await readJson(request);
    const { payload, requirements, rescoreWithAi = false } = body as {
      payload: RpaExportPayload;
      requirements: EditalRequirements;
      rescoreWithAi?: boolean;
    };

    if (!Array.isArray(payload?.profiles) || !payload.profiles.length || payload.profiles.length > 100) {
      return NextResponse.json({ error: 'O arquivo deve conter entre 1 e 100 perfis.' }, { status: 400 });
    }

    if (!requirements || ![requirements.competenciasTecnicas, requirements.keywordsLinkedIn, requirements.certificacoes]
      .every(values => Array.isArray(values) && values.every(value => typeof value === "string")) ||
      payload.profiles.some(profile => !profile || typeof profile.name !== "string" ||
        [profile.experience, profile.skills].some(value => value != null && !Array.isArray(value)))) {
      return NextResponse.json({ error: "Perfis ou requisitos inválidos." }, { status: 400 });
    }

    let profiles: LinkedInProfileResult[] = payload.profiles.map((profile, index) => {
      const scoring = scoreProfile(profile, requirements);
      return {
        id: `lp-${Date.now()}-${index}`,
        campaignId: payload.campaignId,
        ...profile,
        ...scoring,
      };
    });

    if (rescoreWithAi && process.env.OPENAI_API_KEY) {
      profiles = await rescoreProfilesWithAi(process.env.OPENAI_API_KEY, profiles, requirements);
    }

    profiles.sort((a, b) => b.matchScore - a.matchScore);

    return NextResponse.json({
      campaignId: payload.campaignId,
      importedAt: new Date().toISOString(),
      totalProfiles: profiles.length,
      profiles,
    });
  } catch (error) {
    return requestError(error, "Falha ao importar resultados.");
  }
}

async function rescoreProfilesWithAi(
  apiKey: string,
  profiles: LinkedInProfileResult[],
  requirements: EditalRequirements
): Promise<LinkedInProfileResult[]> {
  const result = await completeJson<{
    scores: Array<{ name: string; matchScore: number; matchEvidence: string[]; gaps: string[] }>;
  }>({
    apiKey,
    system:
      'Voce e recrutador senior. Avalie aderencia ao edital e retorne JSON no formato { "scores": [{ "name": string, "matchScore": number, "matchEvidence": string[], "gaps": string[] }] }.',
    user: JSON.stringify({
      requirements,
      profiles: profiles.map(profile => ({
        name: profile.name,
        headline: profile.headline,
        company: profile.company,
        skills: profile.skills,
        experience: profile.experience?.slice(0, 4),
      })),
    }),
    maxTokens: 3000,
  });

  return profiles.map(profile => {
    const score = result.scores?.find(item => item.name === profile.name);
    if (!score) return profile;
    return {
      ...profile,
      matchScore: Math.min(100, Math.max(0, Number(score.matchScore) || profile.matchScore)),
      matchEvidence: score.matchEvidence || profile.matchEvidence,
      gaps: score.gaps || profile.gaps,
    };
  });
}
