import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dirname = path.dirname(fileURLToPath(import.meta.url));

export const SESSION_DIR = path.join(dirname, '..', '.linkedin-session');
export const OUTPUT_DIR = path.join(dirname, '..', 'output');
export const DOWNLOADS_DIR = path.join(dirname, '..', 'downloads');
export const LINKEDIN_BASE = 'https://www.linkedin.com';

export function randomDelay(minMs: number, maxMs: number): Promise<void> {
  const ms = minMs + Math.random() * (maxMs - minMs);
  return new Promise(resolve => setTimeout(resolve, ms));
}

export function sanitizeFilename(value: string): string {
  return value.replace(/[^a-zA-Z0-9-_]/g, '_').slice(0, 90);
}
