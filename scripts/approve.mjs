#!/usr/bin/env node
import { readFileSync, writeFileSync, appendFileSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';
import { createInterface } from 'node:readline';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, '..');
const MANIFEST_PATH = join(REPO_ROOT, 'component-manifest.json');
const CONTRIBUTORS_PATH = join(REPO_ROOT, 'contributors.json');
const AUDIT_LOG_PATH = join(REPO_ROOT, 'design-audit.log');

const componentName = process.argv[2];
const contributorId = process.env.COMPULOCKS_CONTRIBUTOR;

if (!componentName) {
  console.error('Usage: node scripts/approve.mjs <ComponentName>');
  console.error('Set COMPULOCKS_CONTRIBUTOR env var or you will be prompted.');
  process.exit(1);
}

async function getContributorId() {
  if (contributorId) return contributorId;
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  return new Promise(resolve => {
    rl.question('Contributor ID (email): ', answer => { rl.close(); resolve(answer.trim()); });
  });
}

function checkAuth(id) {
  const { contributors } = JSON.parse(readFileSync(CONTRIBUTORS_PATH, 'utf8'));
  return contributors.some(c => c.id === id);
}

function auditLog(id, action, detail) {
  const entry = `${new Date().toISOString()} | ${id} | ${action} | ${detail}\n`;
  appendFileSync(AUDIT_LOG_PATH, entry, 'utf8');
}

async function main() {
  const id = await getContributorId();

  if (!checkAuth(id)) {
    auditLog(id, 'APPROVE_REJECTED', `${componentName} - not in contributors list`);
    console.error(`[approve] REJECTED: ${id} is not an authorized contributor.`);
    console.error('[approve] Add them to contributors.json via PR first.');
    process.exit(1);
  }

  const manifest = JSON.parse(readFileSync(MANIFEST_PATH, 'utf8'));
  const component = manifest.components.find(c => c.name === componentName);

  if (!component) {
    console.error(`[approve] Component "${componentName}" not found in manifest.`);
    console.error(`Available: ${manifest.components.map(c => c.name).join(', ')}`);
    process.exit(1);
  }

  if (component.status === 'stable') {
    console.log(`[approve] "${componentName}" is already stable - no-op.`);
    process.exit(0);
  }

  component.status = 'stable';
  writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2) + '\n', 'utf8');
  auditLog(id, 'APPROVED', componentName);

  console.log(`[approve] "${componentName}" approved -> stable`);
  console.log('[approve] Triggering build + vault sync...');

  execSync('npm run build', { cwd: REPO_ROOT, stdio: 'inherit' });
  console.log(`[approve] Done. All agents can now use ${componentName}.`);
}

main().catch(err => { console.error(err); process.exit(1); });
