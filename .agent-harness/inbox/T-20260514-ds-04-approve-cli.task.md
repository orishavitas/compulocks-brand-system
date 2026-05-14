# Task Packet: T-20260514-ds-04-approve-cli

**Type:** code_implementation
**Sprint:** Design System Distribution Layer — Sprint 1 (continued)
**Sequence:** 4 of 7 (depends on T-01, T-02, T-03 — run after all three are merged)
**Plan:** docs/superpowers/plans/2026-05-14-design-system-distribution.md — Task 4
**Repo:** compulocks-brand-system
**Branch:** task/T-20260514-ds-04-approve-cli

## Objective

Create `scripts/approve.mjs` (approval CLI with contributor auth + audit log), wire `generate-living-html` and `sync-vault` into `build-tokens.mjs`, and add the design management scripts to `package.json`.

## Dependencies

Requires T-01 (status field), T-02 (contributors.json, design-audit.log), T-03 (sync-vault.mjs) to be merged first. Merge from master before starting.

```bash
git checkout master && git pull && git checkout -b task/T-20260514-ds-04-approve-cli
```

## Scope

Three files modified, one new file created.

### Step 1 — Create scripts/approve.mjs

```js
#!/usr/bin/env node
import { readFileSync, writeFileSync, appendFileSync, existsSync } from 'node:fs';
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
    auditLog(id, 'APPROVE_REJECTED', `${componentName} — not in contributors list`);
    console.error(`[approve] REJECTED: ${id} is not an authorized contributor.`);
    console.error(`[approve] Add them to contributors.json via PR first.`);
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
    console.log(`[approve] "${componentName}" is already stable — no-op.`);
    process.exit(0);
  }

  component.status = 'stable';
  writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2) + '\n', 'utf8');
  auditLog(id, 'APPROVED', componentName);

  console.log(`[approve] "${componentName}" approved → stable`);
  console.log('[approve] Triggering build + vault sync...');

  execSync('npm run build', { cwd: REPO_ROOT, stdio: 'inherit' });
  console.log(`[approve] Done. All agents can now use ${componentName}.`);
}

main().catch(err => { console.error(err); process.exit(1); });
```

### Step 2 — Wire generate-living-html and sync-vault into build-tokens.mjs

Read `build-tokens.mjs`. Find the end of the main build function — after `generateTokenGuide()` runs and before the final `console.log('Build complete...')` (or equivalent closing line).

Add these two try/catch blocks there:

```js
// Generate living HTML specimen page
const { execSync: exec } = await import('node:child_process');
try {
  exec('node scripts/generate-living-html.mjs', { cwd: process.cwd(), stdio: 'inherit' });
} catch (e) {
  console.warn('[build] generate-living-html.mjs failed — skipping');
}

// Sync vault
try {
  exec('node scripts/sync-vault.mjs', { cwd: process.cwd(), stdio: 'inherit' });
} catch (e) {
  console.warn('[build] sync-vault.mjs failed — vault not updated');
}
```

Note: `generate-living-html.mjs` does not exist yet (that is Task 5). The try/catch means build does not fail if the file is absent — it logs a warning and continues.

### Step 3 — Add scripts to package.json

In the `"scripts"` object, add:

```json
"mcp:build": "cd mcp-server && npx tsup src/index.ts --format cjs --outDir dist --no-splitting",
"mcp:start": "node mcp-server/dist/index.js",
"approve": "node scripts/approve.mjs",
"design:status": "node -e \"const m=JSON.parse(require('fs').readFileSync('component-manifest.json','utf8')); m.components.forEach(c=>console.log(c.status.padEnd(12)+c.name));\"",
"design:requests": "node -e \"const fs=require('fs'); if(!fs.existsSync('design-requests.md')){console.log('No requests yet.');process.exit(0);} const lines=fs.readFileSync('design-requests.md','utf8').split('\\n').filter(l=>l.startsWith('|')&&!l.includes('---')&&!l.includes('Component')); console.log(lines.length?lines.join('\\n'):'No open requests.');\"",
"build:mcp": "npm run mcp:build"
```

### Step 4 — Test approval flow end-to-end

Temporarily set Chip to draft:
```bash
node -e "const fs=require('fs');const m=JSON.parse(fs.readFileSync('component-manifest.json','utf8'));m.components.find(c=>c.name==='Chip').status='draft';fs.writeFileSync('component-manifest.json',JSON.stringify(m,null,2)+'\n');"
```

Run approve:
```bash
COMPULOCKS_CONTRIBUTOR=ori@compulocks.com node scripts/approve.mjs Chip
```

Expected:
```
[approve] "Chip" approved → stable
[approve] Triggering build + vault sync...
...
[approve] Done. All agents can now use Chip.
```

Verify audit log:
```bash
tail -1 design-audit.log
```
Expected: `2026-... | ori@compulocks.com | APPROVED | Chip`

Test rejection:
```bash
COMPULOCKS_CONTRIBUTOR=notreal@example.com node scripts/approve.mjs Chip
```
Expected: exit code 1, "not an authorized contributor", rejection logged to design-audit.log.

Test idempotence:
```bash
COMPULOCKS_CONTRIBUTOR=ori@compulocks.com node scripts/approve.mjs Chip
```
Expected: `"Chip" is already stable — no-op.`

Test design:status:
```bash
npm run design:status
```
Expected: 6 rows, all showing `stable`.

### Step 5 — Commit

```bash
git add scripts/approve.mjs build-tokens.mjs package.json design-audit.log
git commit -m "feat(approve): approval CLI + wire build pipeline + design:status/requests scripts"
```

## Acceptance Criteria

- [ ] `COMPULOCKS_CONTRIBUTOR=ori@compulocks.com node scripts/approve.mjs <DraftComponent>` approves, triggers build, logs to audit log
- [ ] Unauthorized contributor → exit 1 + rejection logged to `design-audit.log`
- [ ] Approving an already-stable component is a no-op (no error, no build triggered)
- [ ] `npm run build` runs `sync-vault.mjs` (and does not fail if `generate-living-html.mjs` is absent)
- [ ] `npm run design:status` prints all 6 components with status
- [ ] `npm run design:requests` prints "No open requests." or lists table rows
- [ ] All committed on branch `task/T-20260514-ds-04-approve-cli`

## Notes

- Read `build-tokens.mjs` carefully before editing — find the correct insertion point after token guide generation
- The `execSync` import in build-tokens.mjs may need adjustment depending on whether the file is ESM or CJS — check the file's `import`/`require` style first
- `design-audit.log` must already exist (created in T-02) for `appendFileSync` to work reliably on all platforms — if it does not exist, `appendFileSync` will create it, which is acceptable
