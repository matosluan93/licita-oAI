import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dirname = path.dirname(fileURLToPath(import.meta.url));

export const SESSION_DIR = path.join(dirname, '..', '.linkedin-session');
export const OUTPUT_DIR = path.join(dirname, '..', 'output');
export const DOWNLOADS_DIR = path.join(dirname, '..', 'downloads');
export const DEFAULT_DOCUMENTS_ROOT = path.join(os.homedir(), 'Documents', 'LicitAI');
export const LINKEDIN_BASE = 'https://www.linkedin.com';
export const LINKEDIN_ALLOWED_HOSTS = ['linkedin.com', 'licdn.com'];

export function randomDelay(minMs: number, maxMs: number): Promise<void> {
  const ms = minMs + Math.random() * (maxMs - minMs);
  return new Promise(resolve => setTimeout(resolve, ms));
}

export function sanitizeFilename(value: string): string {
  return value.replace(/[^a-zA-Z0-9-_]/g, '_').slice(0, 90);
}

export function isLinkedInAllowedUrl(value: string): boolean {
  if (value.startsWith('about:') || value.startsWith('data:') || value.startsWith('blob:')) return true;

  try {
    const { hostname, protocol } = new URL(value);
    if (protocol !== 'http:' && protocol !== 'https:') return false;
    return LINKEDIN_ALLOWED_HOSTS.some(host => hostname === host || hostname.endsWith(`.${host}`));
  } catch {
    return false;
  }
}

export function assertLinkedInAllowedUrl(value: string, label = 'URL'): void {
  if (!isLinkedInAllowedUrl(value)) {
    throw new Error(`${label} fora do LinkedIn bloqueada pelo LicitAI: ${value}`);
  }
}
