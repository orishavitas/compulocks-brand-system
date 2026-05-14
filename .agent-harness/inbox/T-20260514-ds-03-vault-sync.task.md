# Task Packet: T-20260514-ds-03-vault-sync

**Type:** code_implementation
**Sprint:** Design System Distribution Layer — Sprint 1
**Sequence:** 3 of 7 (parallel with T-01, T-02)
**Plan:** docs/superpowers/plans/2026-05-14-design-system-distribution.md — Task 3
**Repo:** compulocks-brand-system
**Branch:** task/T-20260514-ds-03-vault-sync

## Objective

Create `scripts/sync-vault.mjs` — copies `tokens.json`, stable-only `manifest.json`, and a generated `SPEC.md` to `~/.compulocks/design/` for offline terminal agent access.

## Scope

One new file: `scripts/sync-vault.mjs`. No existing files modified in this task.

### Step 1 — Create scripts/sync-vault.mjs

```js
#!/usr/bin/env node
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';
import { resolve, dirname } from 'node:path';
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
  return `# Compulocks Design System — Agent Spec\n\n` +
    `## Usage Rules\n\n` +
    `- Use CSS custom properties from tokens.json — never hardcode colors, spacing, or type values\n` +
    `- Only use components listed in manifest.json (status: stable)\n` +
    `- If a component you need is missing, call request_component — do not improvise styles\n` +
    `- Dark mode: wrap overrides in [data-theme='dark'] selector\n\n` +
    `## Token Reference\n\n${tokenGuide}`;
}

ensureVaultDir();

writeFileSync(join(VAULT_DIR, 'tokens.json'), readRepoFile('build/json/tokens.json'), 'utf8');
writeFileSync(join(VAULT_DIR, 'manifest.json'), buildManifestStableOnly(), 'utf8');
writeFileSync(join(VAULT_DIR, 'SPEC.md'), buildSpec(), 'utf8');
writeFileSync(join(VAULT_DIR, '.last-updated'), new Date().toISOString(), 'utf8');

console.log(`[sync-vault] Vault updated at ${VAULT_DIR}`);
console.log(`[sync-vault]   tokens.json, manifest.json (stable only), SPEC.md, .last-updated`);
```

### Step 2 — Verify it runs

```bash
npm run build && node scripts/sync-vault.mjs
```

Expected output:
```
[sync-vault] Vault updated at C:\Users\OriShavit\.compulocks\design
[sync-vault]   tokens.json, manifest.json (stable only), SPEC.md, .last-updated
```

Then verify vault contents:
```bash
ls ~/.compulocks/design/
```
Expected: `tokens.json  manifest.json  SPEC.md  .last-updated`

Verify manifest.json only contains stable components:
```bash
node -e "const m=JSON.parse(require('fs').readFileSync(require('os').homedir()+'/.compulocks/design/manifest.json','utf8')); console.log(m.components.map(c=>c.status+' '+c.name).join('\n'));"
```
Expected: all entries show `stable`.

### Step 3 — Commit

```bash
git add scripts/sync-vault.mjs
git commit -m "feat(vault): add sync-vault script — copies stable artifacts to ~/.compulocks/design/"
```

## Acceptance Criteria

- [ ] `scripts/sync-vault.mjs` exists and runs without errors after `npm run build`
- [ ] `~/.compulocks/design/` contains `tokens.json`, `manifest.json`, `SPEC.md`, `.last-updated`
- [ ] `manifest.json` in vault contains only `status: stable` components
- [ ] `.last-updated` contains an ISO timestamp
- [ ] Committed on branch `task/T-20260514-ds-03-vault-sync`

## Notes

- Script reads from `build/json/tokens.json` — requires `npm run build` to have run first
- Vault path uses `homedir()` — resolves correctly on Windows (`C:\Users\<user>\.compulocks\design`) and macOS/Linux (`~/.compulocks/design`)
- `buildSpec()` wraps `token_guide.md` with usage-rule header — this is the agent-facing SPEC.md
- Script must be idempotent — running it multiple times overwrites safely, never corrupts
