import { NextRequest, NextResponse } from 'next/server';
import { extractRequirementsHeuristically } from '@/lib/linkedin/heuristics';
import { completeJson } from '@/lib/linkedin/openai';
import { buildBooleanSearchQuery, getCompaniesByIds } from '@/lib/linkedin/stefaniniCompanies';
import type { EditalRequirements } from '@/lib/linkedin/types';

const SYSTEM_PROMPT = `Voce e especialista em recrutamento e selecao. Extraia requisitos de editais de vaga.
Retorne apenas JSON valido com: cargo, cargosSolicitados, senioridade, descricao, competenciasTecnicas, competenciasComportamentais, certificacoes, idiomas, experienciaMinima, localizacao, keywordsLinkedIn.
cargosSolicitados deve ser um array de objetos { "cargo": string, "quantidade": number }. Se nao houver quantidade explicita, use 1.`;

async function extractTextFromBody(body: {
  editalText?: string;
  editalBase64?: string;
  filename?: string;
}): Promise<string> {
  if (body.editalText?.trim()) return body.editalText.trim();

  if (!body.editalBase64) return '';

  const base64Data = body.editalBase64.replace(/^data:[^;]+;base64,/, '');
  const buffer = Buffer.from(base64Data, 'base64');
  const filename = (body.filename || '').toLowerCase();

  if (filename.endsWith('.pdf')) {
    const pdfParse = (await import('pdf-parse')).default;
    const parsed = await pdfParse(buffer);
    return parsed.text.trim();
  }

  return buffer.toString('utf-8').trim();
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { companyIds = [] } = body as { companyIds?: string[] };
    const companies = getCompaniesByIds(companyIds);
    const text = await extractTextFromBody(body);

    if (!text) {
      return NextResponse.json(
        { error: 'Informe o texto do edital ou anexe um PDF textual. PDFs escaneados exigem OCR.' },
        { status: 400 }
      );
    }

    let parsed: Omit<EditalRequirements, 'booleanSearchQuery'>;
    const apiKey = process.env.OPENAI_API_KEY;

    if (apiKey) {
      parsed = await completeJson<Omit<EditalRequirements, 'booleanSearchQuery'>>({
        apiKey,
        system: SYSTEM_PROMPT,
        user: text,
      });
    } else {
      const fallback = extractRequirementsHeuristically(text, companies);
      parsed = fallback;
    }

    const keywords = parsed.keywordsLinkedIn?.length
      ? parsed.keywordsLinkedIn
      : [parsed.cargo, ...(parsed.competenciasTecnicas || [])].filter(Boolean).slice(0, 8);

    const requirements: EditalRequirements = {
      cargo: parsed.cargo || 'Profissional de Tecnologia',
      cargosSolicitados: parsed.cargosSolicitados?.length
        ? parsed.cargosSolicitados
        : [{ cargo: parsed.cargo || 'Profissional de Tecnologia', quantidade: 1 }],
      senioridade: parsed.senioridade || '',
      descricao: parsed.descricao || text.slice(0, 320),
      competenciasTecnicas: parsed.competenciasTecnicas || [],
      competenciasComportamentais: parsed.competenciasComportamentais || [],
      certificacoes: parsed.certificacoes || [],
      idiomas: parsed.idiomas || [],
      experienciaMinima: parsed.experienciaMinima || '',
      localizacao: parsed.localizacao || '',
      keywordsLinkedIn: keywords,
      booleanSearchQuery: buildBooleanSearchQuery(companies, keywords),
    };

    return NextResponse.json({
      requirements,
      companies,
      mode: apiKey ? 'ai' : 'heuristic',
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Falha ao analisar edital.', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
