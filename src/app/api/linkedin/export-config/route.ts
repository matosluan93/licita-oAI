import { NextRequest, NextResponse } from 'next/server';
import { getCompaniesByIds } from '@/lib/linkedin/stefaniniCompanies';
import type { RpaSearchConfig } from '@/lib/linkedin/types';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      campaignId,
      campaignName,
      clientName,
      requirements,
      companyIds,
      maxProfiles = 25,
      delayBetweenProfilesMs = 6500,
      headless = false,
      safety = {},
    } = body;

    if (!requirements || !companyIds?.length) {
      return NextResponse.json({ error: 'requirements e companyIds sao obrigatorios.' }, { status: 400 });
    }

    const config: RpaSearchConfig = {
      campaignId: campaignId || `campaign-${Date.now()}`,
      campaignName: campaignName || requirements.cargo || 'Campanha LinkedIn',
      clientName: clientName || campaignName || requirements.cargo || 'Cliente nao informado',
      requirements,
      companies: getCompaniesByIds(companyIds),
      maxProfiles: Math.min(50, Math.max(1, Number(maxProfiles) || 25)),
      delayBetweenProfilesMs: Math.max(5000, Number(delayBetweenProfilesMs) || 6500),
      headless: Boolean(headless),
      safety: {
        maxProfilesPerRun: Math.min(35, Math.max(1, Number(safety.maxProfilesPerRun) || 30)),
        dailyProfileLimit: Math.min(150, Math.max(1, Number(safety.dailyProfileLimit) || 100)),
        pauseEveryProfiles: Math.min(20, Math.max(1, Number(safety.pauseEveryProfiles) || 8)),
        pauseBetweenBatchesMs: Math.min(
          10 * 60 * 1000,
          Math.max(30000, Number(safety.pauseBetweenBatchesMs) || 90000)
        ),
        downloadResumes: safety.downloadResumes !== false,
        confirmBeforeResumeDownload: Boolean(safety.confirmBeforeResumeDownload),
        stopOnCheckpoint: safety.stopOnCheckpoint !== false,
      },
    };

    return NextResponse.json(config);
  } catch (error) {
    return NextResponse.json(
      { error: 'Falha ao gerar configuracao RPA.', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
