import { NextRequest, NextResponse } from 'next/server';

const LOCAL_HOST = /^(?:localhost|127\.0\.0\.1|\[::1\])(?::[0-9]{1,5})?$/i;

function deny(status: number, message: string) {
  const headers = new Headers({ 'Cache-Control': 'no-store' });
  if (status === 401) headers.set('WWW-Authenticate', 'Basic realm="LicitAI", charset="UTF-8"');
  return NextResponse.json({ error: message }, { status, headers });
}

async function validCredentials(authorization: string | null, password: string) {
  if (!authorization?.startsWith('Basic ')) return false;
  try {
    const bytes = Uint8Array.from(atob(authorization.slice(6)), char => char.charCodeAt(0));
    const expected = new TextEncoder().encode('licitai:' + password);
    const [left, right] = await Promise.all([
      crypto.subtle.digest('SHA-256', bytes),
      crypto.subtle.digest('SHA-256', expected),
    ]);
    const leftBytes = new Uint8Array(left);
    const rightBytes = new Uint8Array(right);
    let mismatch = 0;
    for (let i = 0; i < leftBytes.length; i++) mismatch |= leftBytes[i] ^ rightBytes[i];
    return mismatch === 0;
  } catch {
    return false;
  }
}

export async function middleware(request: NextRequest) {
  const host = request.headers.get('host') || request.nextUrl.host;
  const origin = request.headers.get('origin');
  const publicOrigin = process.env.LICITAI_PUBLIC_ORIGIN?.replace(/\/$/, '');
  const password = process.env.LICITAI_ACCESS_PASSWORD;

  if (publicOrigin) {
    let configured: URL;
    try {
      configured = new URL(publicOrigin);
    } catch {
      return deny(503, 'Origem pública não configurada corretamente.');
    }
    if (configured.protocol !== 'https:' || configured.origin !== publicOrigin ||
        !password || password.length < 16) {
      return deny(503, 'Configure uma origem HTTPS e uma senha de acesso.');
    }
    if (host !== configured.host) return deny(403, 'Host não autorizado.');
    if (!await validCredentials(request.headers.get('authorization'), password)) {
      return deny(401, 'Autenticação necessária.');
    }
  } else if (!LOCAL_HOST.test(host)) {
    return deny(403, 'Acesso restrito ao computador local.');
  }

  if (!['GET', 'HEAD', 'OPTIONS'].includes(request.method) &&
      ((origin && origin !== (publicOrigin || 'http://' + host)) ||
        request.headers.get('sec-fetch-site') === 'cross-site')) {
    return deny(403, 'Origem não autorizada.');
  }
  const response = NextResponse.next();
  if (request.nextUrl.pathname.startsWith('/api/')) {
    response.headers.set('Cache-Control', 'no-store');
  }
  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
