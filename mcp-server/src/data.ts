import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { homedir } from 'node:os';

const REPO_ROOT = resolve(__dirname, '../..');
const VAULT_DIR = join(homedir(), '.compulocks', 'design');

export interface ComponentEntry {
  name: string;
  variants: string[];
  states: string[];
  tokens: string[];
  hash: string;
  status: 'draft' | 'stable' | 'deprecated';
}

export interface Manifest {
  version: string;
  generatedAt: string;
  components: ComponentEntry[];
}

export function readTokens(): Record<string, unknown> {
  const p = join(REPO_ROOT, 'build', 'json', 'tokens.json');
  if (!existsSync(p)) throw new Error('tokens.json not found - run npm run build in compulocks-brand-system');
  return JSON.parse(readFileSync(p, 'utf8'));
}

export function readManifest(): Manifest {
  const p = join(REPO_ROOT, 'component-manifest.json');
  if (!existsSync(p)) throw new Error('component-manifest.json not found');
  return JSON.parse(readFileSync(p, 'utf8'));
}

export function readStableManifest(): Manifest {
  const m = readManifest();
  return { ...m, components: m.components.filter(c => c.status === 'stable') };
}

export function readSpec(): string {
  const vaultSpec = join(VAULT_DIR, 'SPEC.md');
  if (existsSync(vaultSpec)) return readFileSync(vaultSpec, 'utf8');
  const p = join(REPO_ROOT, 'token_guide.md');
  if (!existsSync(p)) return 'Spec not available - run npm run build';
  return readFileSync(p, 'utf8');
}

export function getVaultAge(): string {
  const p = join(VAULT_DIR, '.last-updated');
  if (!existsSync(p)) return 'unknown';
  return readFileSync(p, 'utf8').trim();
}
