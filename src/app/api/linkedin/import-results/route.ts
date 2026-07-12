import { NextRequest, NextResponse } from 'next/server';
import { completeJson } from '@/lib/linkedin/openai';
import { scoreProfile } from '@/lib/linkedin/scoring';
import type { EditalRequirements, LinkedInProfileResult, RpaExportPayload } from '@/lib/linkedin/types';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { payload, requirements, rescoreWithAi = false } = body as {
      payload: RpaExportPayload;
      requirements: EditalRequirements;
      rescoreWithAi?: boolean;
    };

    if (!payload?.profiles?.length) {
      return NextResponse.json({ error: 'Nenhum perfil encontrado no arquivo importado.' }, { status: 400 });
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
    return NextResponse.json(
      { error: 'Falha ao importar resultados.', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
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
