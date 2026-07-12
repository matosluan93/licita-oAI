import { NextRequest, NextResponse } from 'next/server';
import { getCompaniesByIds } from '@/lib/linkedin/stefaniniCompanies';
import type { RpaSearchConfig } from '@/lib/linkedin/types';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      campaignId,
      campaignName,
      requirements,
      companyIds,
      maxProfiles = 25,
      delayBetweenProfilesMs = 3500,
      headless = false,
    } = body;

    if (!requirements || !companyIds?.length) {
      return NextResponse.json({ error: 'requirements e companyIds sao obrigatorios.' }, { status: 400 });
    }

    const config: RpaSearchConfig = {
      campaignId: campaignId || `campaign-${Date.now()}`,
      campaignName: campaignName || requirements.cargo || 'Campanha LinkedIn',
      requirements,
      companies: getCompaniesByIds(companyIds),
      maxProfiles: Math.min(50, Math.max(1, Number(maxProfiles) || 25)),
      delayBetweenProfilesMs: Math.max(2500, Number(delayBetweenProfilesMs) || 3500),
      headless: Boolean(headless),
    };

    return NextResponse.json(config);
  } catch (error) {
    return NextResponse.json(
      { error: 'Falha ao gerar configuracao RPA.', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
