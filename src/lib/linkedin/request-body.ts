import { NextResponse } from 'next/server';

const MAX_JSON_BYTES = 8 * 1024 * 1024;

class RequestBodyError extends Error {
  constructor(readonly status: number, message: string) {
    super(message);
  }
}

export async function readJson(request: Request): Promise<Record<string, unknown>> {
  const invalid = () => new RequestBodyError(400, 'Envie um objeto JSON válido.');
  if (!request.body || !request.headers.get('content-type')?.toLowerCase().startsWith('application/json')) {
    throw invalid();
  }
  const tooLarge = () => new RequestBodyError(413, 'Arquivo ou texto acima do limite de 8 MB.');
  if (Number(request.headers.get('content-length')) > MAX_JSON_BYTES) throw tooLarge();
  const reader = request.body.getReader();
  const decoder = new TextDecoder('utf-8', { fatal: true });
  const chunks: string[] = [];
  let bytes = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > MAX_JSON_BYTES) {
        await reader.cancel().catch(() => {});
        throw tooLarge();
      }
      chunks.push(decoder.decode(value, { stream: true }));
    }
    chunks.push(decoder.decode());
    const data: unknown = JSON.parse(chunks.join(''));
    if (!data || typeof data !== 'object' || Array.isArray(data)) throw invalid();
    return data as Record<string, unknown>;
  } catch (error) {
    throw error instanceof RequestBodyError ? error : invalid();
  } finally {
    reader.releaseLock();
  }
}

export function requestError(error: unknown, message: string) {
  const isBodyError = error instanceof RequestBodyError;
  return NextResponse.json({ error: isBodyError ? error.message : message }, {
    status: isBodyError ? error.status : 500,
    headers: { 'Cache-Control': 'no-store' },
  });
}
