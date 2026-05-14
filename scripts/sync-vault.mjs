#!/usr/bin/env node
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { homedir } from 'node:os';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, '..');
const VAULT_DIR = join(homedir(), '.compulocks', 'design');

function ensureVaultDir() {
  if (!existsSync(VAULT_DIR)) {
    mkdirSync(VAULT_DIR, { recursive: true });
    console.log(`[sync-vault] Created vault at ${VAULT_DIR}`);
  }
}

function readRepoFile(relPath) {
  const full = join(REPO_ROOT, relPath);
  if (!existsSync(full)) throw new Error(`Source file not found: ${full}`);
  return readFileSync(full, 'utf8');
}

function buildManifestStableOnly() {
  const raw = JSON.parse(readRepoFile('component-manifest.json'));
  return JSON.stringify({
    ...raw,
    components: raw.components.filter(c => c.status === 'stable'),
  }, null, 2);
}

function buildSpec() {
  const tokenGuide = readRepoFile('token_guide.md');
  return `# Compulocks Design System - Agent Spec\n\n` +
    `## Usage Rules\n\n` +
    `- Use CSS custom properties from tokens.json - never hardcode colors, spacing, or type values\n` +
    `- Only use components listed in manifest.json (status: stable)\n` +
    `- If a component you need is missing, call request_component - do not improvise styles\n` +
    `- Dark mode: wrap overrides in [data-theme='dark'] selector\n\n` +
    `## Token Reference\n\n${tokenGuide}`;
}

ensureVaultDir();

writeFileSync(join(VAULT_DIR, 'tokens.json'), readRepoFile('build/json/tokens.json'), 'utf8');
writeFileSync(join(VAULT_DIR, 'manifest.json'), buildManifestStableOnly(), 'utf8');
writeFileSync(join(VAULT_DIR, 'SPEC.md'), buildSpec(), 'utf8');
writeFileSync(join(VAULT_DIR, '.last-updated'), new Date().toISOString(), 'utf8');

console.log(`[sync-vault] Vault updated at ${VAULT_DIR}`);
console.log('[sync-vault]   tokens.json, manifest.json (stable only), SPEC.md, .last-updated');
