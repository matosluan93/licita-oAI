import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { test } from 'node:test';
import { NextRequest } from 'next/server';
import { middleware } from '../src/middleware';
import { POST as parseEdital } from '../src/app/api/linkedin/parse-edital/route';
import { POST as importResults } from '../src/app/api/linkedin/import-results/route';
import { readJson, requestError } from '../src/lib/linkedin/request-body';
import { organizeDocumentationStructure } from '../rpa/linkedin-sourcer/src/oneDriveStructure';
import type { RpaSearchConfig } from '../rpa/linkedin-sourcer/src/types';

function request(body: string, headers: HeadersInit = {}) {
  return new NextRequest('http://localhost:4028/api/linkedin/parse-edital', {
    method: 'POST', body, headers: { 'content-type': 'application/json', ...headers },
  });
}

test('local access accepts same-origin and rejects forged host and cross-origin upload', async () => {
  assert.equal((await middleware(request('{}', { origin: 'http://localhost:4028' }))).status, 200);
  assert.equal((await middleware(request('{}', { host: 'untrusted.invalid' }))).status, 403);
  assert.equal((await middleware(request('{}', { origin: 'https://untrusted.invalid' }))).status, 403);
});

test('public origin requires valid credentials', async t => {
  const origin = 'https://licitai.example.invalid';
  const password = 'synthetic-only-password';
  const saved = { origin: process.env.LICITAI_PUBLIC_ORIGIN, password: process.env.LICITAI_ACCESS_PASSWORD };
  t.after(() => {
    if (saved.origin == null) delete process.env.LICITAI_PUBLIC_ORIGIN;
    else process.env.LICITAI_PUBLIC_ORIGIN = saved.origin;
    if (saved.password == null) delete process.env.LICITAI_ACCESS_PASSWORD;
    else process.env.LICITAI_ACCESS_PASSWORD = saved.password;
  });
  process.env.LICITAI_PUBLIC_ORIGIN = origin;
  process.env.LICITAI_ACCESS_PASSWORD = password;
  const denied = await middleware(new NextRequest(origin));
  assert.equal(denied.status, 401);
  assert.match(denied.headers.get('www-authenticate') ?? '', /^Basic /);
  const authorized = await middleware(new NextRequest(origin, {
    headers: { authorization: 'Basic ' + Buffer.from('licitai:' + password).toString('base64') },
  }));
  assert.equal(authorized.status, 200);
});

test('malformed, non-object, and oversized request bodies are rejected', async () => {
  for (const invalid of ['{', '[]', 'null', '{"editalText":12}']) {
    assert.equal((await parseEdital(request(invalid))).status, 400);
  }
  const tooLarge = await parseEdital(request('{}', { 'content-length': String(8 * 1024 * 1024 + 1) }));
  assert.equal(tooLarge.status, 413);
  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(new Uint8Array(8 * 1024 * 1024 + 1));
      controller.close();
    },
  });
  const streamed = new Request('http://localhost', {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: stream,
    ...{ duplex: 'half' },
  });
  await assert.rejects(readJson(streamed), /acima do limite/);
});

test('valid local edital works and imported profiles are bounded', async t => {
  const saved = process.env.OPENAI_API_KEY;
  delete process.env.OPENAI_API_KEY;
  t.after(() => { if (saved != null) process.env.OPENAI_API_KEY = saved; });
  const result = await parseEdital(request(JSON.stringify({ editalText: 'Desenvolvedor Python Sênior' })));
  assert.equal(result.status, 200);
  assert.equal((await result.json()).mode, 'heuristic');
  const imported = await importResults(request(JSON.stringify({
    payload: { profiles: Array(101).fill({ name: 'Perfil sintético' }) },
  })));
  assert.equal(imported.status, 400);
  const error = requestError(new Error('private upstream details'), 'Falha na análise.');
  assert.deepEqual(await error.json(), { error: 'Falha na análise.' });
});

test('a dot-only client and reserved Windows role stay inside the document hierarchy', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'licitai-regression-'));
  try {
    const config = {
      documentationRoot: root, clientName: '..', campaignName: 'Campanha sintética', maxProfiles: 2,
      requirements: { cargo: 'CON', cargosSolicitados: [{ cargo: 'CON', quantidade: 1 }] },
    } as RpaSearchConfig;
    const destination = await organizeDocumentationStructure(config, []);
    assert.equal(path.relative(root, destination).split(path.sep).length, 3);
    assert.equal(path.basename(destination), 'Sem nome');
    assert.deepEqual(await fs.readdir(destination), ['Sem nome']);
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});
