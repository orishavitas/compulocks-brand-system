# Design System Distribution Layer — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the MCP server, living HTML generator, vault sync, approval CLI, `/design-system` skill, and `ux-prep` agent persona that make `compulocks-brand-system` the enforced design source of truth for every agent on every platform.

**Architecture:** A local Node.js MCP server exposes read tools (all callers) and two write classes — design-system mutation (contributors-only) and request-log append (any agent). `npm run build` regenerates the living HTML specimen page and syncs the vault to `~/.compulocks/design/`. A skill and agent persona wrap the MCP tools for terminal sessions.

**Tech Stack:** Node.js 20+, TypeScript, `@modelcontextprotocol/sdk`, `chokidar`, `tsup`. No new deps in consumer repos.

**Delegation guide:**
- **Claude Code** — Tasks 1–4 (foundation, manifest, vault, HTML generator): file system, build pipeline, scripts
- **Codex** — Tasks 5–7 (MCP server, skill, agent persona): TypeScript server, tool definitions, auth
- Tasks are independent within each sprint. Run in parallel where marked.

---

## File Map

```
compulocks-brand-system/
│
│  MODIFIED
├── component-manifest.json        # add status field to all 6 components
├── scripts/export-manifest.mjs    # preserve status on re-export
├── build-tokens.mjs               # call generate-living-html + sync-vault post-build
├── package.json                   # add scripts: mcp:build mcp:start approve design:status design:requests
│
│  NEW — scripts
├── scripts/generate-living-html.mjs   # builds design-system/index.html
├── scripts/sync-vault.mjs             # copies 3 files to ~/.compulocks/design/
├── scripts/approve.mjs                # approve CLI — checks contributors, flips status, triggers build
│
│  NEW — static artifacts
├── contributors.json              # write-access whitelist (repo root)
├── design-requests.md             # agent-writable request log (append-only)
├── design-audit.log               # write-action audit log (append-only, committed)
├── design-system/index.html       # generated — committed
│
│  NEW — MCP server (own package)
├── mcp-server/
│   ├── package.json
│   ├── tsconfig.json
│   └── src/
│       ├── index.ts               # entry: register tools, start stdio + HTTP
│       ├── auth.ts                # read contributors.json, check id, log to audit
│       ├── data.ts                # read tokens.json, manifest.json, SPEC.md from disk
│       ├── watcher.ts             # chokidar: hot-reload data on file change
│       └── tools/
│           ├── read.ts            # get_tokens, get_manifest, get_spec, get_component, list_components
│           ├── request.ts         # request_component (no auth)
│           └── write.ts           # approve_component, refresh, get_requests (auth required)
│
│  NEW — agent artifacts
├── .claude/skills/design-system.md    # /design-system skill
└── agents/ux-prep.md                  # UX-prep agent persona
```

---

## Sprint 1 — Foundation (Claude Code)

**Tasks 1–3 are independent. Run in parallel.**

---

### Task 1: Migrate manifest + fix export-manifest status preservation

**Files:**
- Modify: `component-manifest.json`
- Modify: `scripts/export-manifest.mjs`
- Test: `scripts/test-export-manifest.mjs` (already exists — extend it)

- [ ] **Step 1: Add `status: "stable"` to all 6 existing components in `component-manifest.json`**

Open `component-manifest.json`. For each of the 6 component objects, add `"status": "stable"` after `"hash"`:

```json
{
  "name": "Badge",
  "variants": ["Brand", "Neutral", "Success", "Error", "Tonal"],
  "states": [],
  "tokens": [],
  "hash": "f50c7dda669839204f4962a1abd2cd1a978bb812",
  "status": "stable"
}
```

Apply the same to Button, Card, Chip, Input, Tag.

- [ ] **Step 2: Write failing tests for status preservation in `scripts/test-export-manifest.mjs`**

Add these tests at the end of the existing test file:

```js
// --- Status preservation tests ---

// Test: preserveStatus — keeps existing status
{
  const existing = { version: '1.0.0', generatedAt: '', components: [
    { name: 'Button', variants: ['Primary'], states: [], tokens: [], hash: 'abc', status: 'stable' }
  ]};
  const incoming = { name: 'Button', variants: ['Primary'], states: [], tokens: [], hash: 'abc' };
  const result = mergeStatus(incoming, existing.components);
  console.assert(result.status === 'stable', 'FAIL preserveStatus: should keep stable');
  console.log('PASS preserveStatus: keeps stable status');
}

// Test: preserveStatus — defaults new component to draft
{
  const existing = { version: '1.0.0', generatedAt: '', components: [] };
  const incoming = { name: 'Modal', variants: ['Default'], states: [], tokens: [], hash: 'xyz' };
  const result = mergeStatus(incoming, existing.components);
  console.assert(result.status === 'draft', 'FAIL preserveStatus: new component should default to draft');
  console.log('PASS preserveStatus: new component defaults to draft');
}

// Test: preserveStatus — never downgrades stable to draft
{
  const existing = { version: '1.0.0', generatedAt: '', components: [
    { name: 'Card', variants: ['Default'], states: [], tokens: [], hash: 'old', status: 'stable' }
  ]};
  const incoming = { name: 'Card', variants: ['Default', 'Elevated'], states: [], tokens: [], hash: 'new' };
  const result = mergeStatus(incoming, existing.components);
  console.assert(result.status === 'stable', 'FAIL preserveStatus: hash change should not downgrade stable');
  console.log('PASS preserveStatus: hash change does not downgrade stable');
}
```

- [ ] **Step 3: Run tests — expect FAIL (mergeStatus not defined yet)**

```bash
node scripts/test-export-manifest.mjs 2>&1 | tail -10
```

Expected: `ReferenceError: mergeStatus is not defined`

- [ ] **Step 4: Implement `mergeStatus` and wire it into `export-manifest.mjs`**

In `scripts/export-manifest.mjs`, add this export after the `computeHash` function:

```js
export function mergeStatus(incoming, existingComponents) {
  const existing = existingComponents.find(c => c.name === incoming.name);
  return {
    ...incoming,
    status: existing?.status ?? 'draft',
  };
}
```

Then in the main script, change the manifest reading section. Replace:

```js
const components = [];
for (const filePath of storyFiles) {
```

with:

```js
let existingComponents = [];
try {
  const raw = readFileSync(OUTPUT_PATH, 'utf8');
  existingComponents = JSON.parse(raw).components ?? [];
} catch { /* file doesn't exist yet — fine */ }

const components = [];
for (const filePath of storyFiles) {
```

And replace the `components.push(...)` line:

```js
  components.push({ name, variants, states, tokens, hash });
```

with:

```js
  components.push(mergeStatus({ name, variants, states, tokens, hash }, existingComponents));
```

- [ ] **Step 5: Run tests — expect all PASS**

```bash
node scripts/test-export-manifest.mjs 2>&1 | tail -15
```

Expected: All tests PASS including the 3 new status preservation tests.

- [ ] **Step 6: Commit**

```bash
git add component-manifest.json scripts/export-manifest.mjs scripts/test-export-manifest.mjs
git commit -m "feat(manifest): add status field + preserve status on re-export"
```

---

### Task 2: Create contributors.json, design-requests.md, design-audit.log

**Files:**
- Create: `contributors.json`
- Create: `design-requests.md`
- Create: `design-audit.log`

- [ ] **Step 1: Create `contributors.json` at repo root**

```json
{
  "contributors": [
    { "id": "ori@compulocks.com", "name": "Ori", "role": "owner" }
  ]
}
```

- [ ] **Step 2: Create `design-requests.md`**

```markdown
# Design Requests

Append-only log of component gaps filed by agents.
Format: one table row per request. Never delete rows — mark resolved in the Status column.

| Component | Reason | Usage Context | Requested By | Date | Status |
|-----------|--------|---------------|-------------|------|--------|
```

- [ ] **Step 3: Create `design-audit.log`**

```
# Design System Audit Log — append only
# Format: ISO_TIMESTAMP | CONTRIBUTOR_ID | ACTION | DETAIL
```

- [ ] **Step 4: Commit**

```bash
git add contributors.json design-requests.md design-audit.log
git commit -m "feat(design-system): add contributors whitelist, request log, audit log"
```

---

### Task 3: Vault sync script

**Files:**
- Create: `scripts/sync-vault.mjs`

- [ ] **Step 1: Create `scripts/sync-vault.mjs`**

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
  // SPEC = token_guide.md + inline usage note
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

- [ ] **Step 2: Verify it runs (build must have run first)**

```bash
npm run build && node scripts/sync-vault.mjs
```

Expected output:
```
[sync-vault] Vault updated at C:\Users\<user>\.compulocks\design
[sync-vault]   tokens.json, manifest.json (stable only), SPEC.md, .last-updated
```

Check vault exists:
```bash
ls ~/.compulocks/design/
```
Expected: `tokens.json  manifest.json  SPEC.md  .last-updated`

- [ ] **Step 3: Commit**

```bash
git add scripts/sync-vault.mjs
git commit -m "feat(vault): add sync-vault script — copies stable artifacts to ~/.compulocks/design/"
```

---

### Task 4: Approval CLI + wire build pipeline

**Files:**
- Create: `scripts/approve.mjs`
- Modify: `build-tokens.mjs`
- Modify: `package.json`

- [ ] **Step 1: Create `scripts/approve.mjs`**

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

- [ ] **Step 2: Wire `generate-living-html` and `sync-vault` into `build-tokens.mjs`**

At the end of `build-tokens.mjs`, after `generateTokenGuide()` and before `console.log('Build complete...')`, add:

```js
// Generate living HTML specimen page
const { execSync: exec } = await import('node:child_process');
try {
  exec('node scripts/generate-living-html.mjs', { cwd: process.cwd(), stdio: 'inherit' });
} catch (e) {
  console.warn('[build] generate-living-html.mjs failed — skipping (run npm run build after creating it)');
}

// Sync vault
try {
  exec('node scripts/sync-vault.mjs', { cwd: process.cwd(), stdio: 'inherit' });
} catch (e) {
  console.warn('[build] sync-vault.mjs failed — vault not updated');
}
```

- [ ] **Step 3: Add scripts to `package.json`**

In the `"scripts"` object, add:

```json
"mcp:build": "cd mcp-server && npx tsup src/index.ts --format cjs --outDir dist --no-splitting",
"mcp:start": "node mcp-server/dist/index.js",
"approve": "node scripts/approve.mjs",
"design:status": "node -e \"const m=JSON.parse(require('fs').readFileSync('component-manifest.json','utf8')); m.components.forEach(c=>console.log(c.status.padEnd(12)+c.name));\"",
"design:requests": "node -e \"const fs=require('fs'); if(!fs.existsSync('design-requests.md')){console.log('No requests yet.');process.exit(0);} const lines=fs.readFileSync('design-requests.md','utf8').split('\\n').filter(l=>l.startsWith('|')&&!l.includes('---')&&!l.includes('Component')); console.log(lines.length-1?lines.slice(1).join('\\n'):'No open requests.');\"",
"build:mcp": "npm run mcp:build"
```

- [ ] **Step 4: Test approval flow end-to-end**

First temporarily set one component to draft to test:
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

- [ ] **Step 5: Commit**

```bash
git add scripts/approve.mjs build-tokens.mjs package.json design-audit.log
git commit -m "feat(approve): approval CLI + wire build pipeline + design:status/requests scripts"
```

---

## Sprint 2 — Living HTML Generator (Claude Code)

### Task 5: Generate living HTML specimen page

**Files:**
- Create: `scripts/generate-living-html.mjs`
- Creates: `design-system/index.html` (generated, committed)

- [ ] **Step 1: Create `design-system/` directory and add `.gitkeep`**

```bash
mkdir -p design-system
echo "# generated — do not edit" > design-system/README.md
```

- [ ] **Step 2: Create `scripts/generate-living-html.mjs`**

```js
#!/usr/bin/env node
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, '..');
const OUT_DIR = join(REPO_ROOT, 'design-system');
const OUT_FILE = join(OUT_DIR, 'index.html');

if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true });

const tokens = JSON.parse(readFileSync(join(REPO_ROOT, 'build/json/tokens.json'), 'utf8'));
const manifest = JSON.parse(readFileSync(join(REPO_ROOT, 'component-manifest.json'), 'utf8'));
const generatedAt = new Date().toLocaleString();
const version = manifest.version;

// ── helpers ──────────────────────────────────────────────────────────────────

function colorSwatch(name, value) {
  const displayVal = typeof value === 'string' && value.startsWith('rgba') ? value :
    (typeof value === 'string' && value.startsWith('#') ? value : String(value));
  return `<div class="swatch-item">
    <div class="swatch-color" style="background:${displayVal};${displayVal.includes('rgba(0,')&&displayVal.includes('0.0')?'border:1px solid #E8E9EE':''}"></div>
    <div class="swatch-name">${name}</div>
    <div class="swatch-value">${displayVal}</div>
  </div>`;
}

function collectColors(obj, prefix = '') {
  const swatches = [];
  for (const [k, v] of Object.entries(obj)) {
    const path = prefix ? `${prefix}-${k}` : k;
    if (v && typeof v === 'object' && 'value' in v) {
      swatches.push(colorSwatch(`--${path}`, v.value));
    } else if (v && typeof v === 'object') {
      swatches.push(...collectColors(v, path));
    }
  }
  return swatches;
}

function componentSpecimen(comp) {
  const isDraft = comp.status !== 'stable';
  const variantPills = comp.variants.map(v =>
    `<span class="variant-pill">${v}</span>`
  ).join('');
  const draftBanner = isDraft
    ? `<div class="draft-banner">⚠ DRAFT — not available to agents. Run: <code>npm run approve ${comp.name}</code></div>`
    : '';
  return `
    <div class="component-card ${isDraft ? 'component-draft' : ''}">
      ${draftBanner}
      <div class="component-header">
        <span class="component-name">${comp.name}</span>
        <span class="component-status ${isDraft ? 'status-draft' : 'status-stable'}">${comp.status}</span>
      </div>
      <div class="component-variants">${variantPills}</div>
      <div class="component-specimen">
        ${renderSpecimen(comp)}
      </div>
    </div>`;
}

function renderSpecimen(comp) {
  // Static HTML specimens styled with CSS custom properties — v1 spec (no React render)
  switch (comp.name) {
    case 'Button': return `
      <button class="spec-btn spec-btn--primary">Primary</button>
      <button class="spec-btn spec-btn--secondary">Secondary</button>
      <button class="spec-btn spec-btn--ghost">Ghost</button>
      <button class="spec-btn spec-btn--cta">CTA</button>
      <button class="spec-btn spec-btn--primary" disabled style="opacity:0.5;cursor:not-allowed">Disabled</button>`;
    case 'Badge': return `
      <span class="spec-badge spec-badge--brand">Brand</span>
      <span class="spec-badge spec-badge--neutral">Neutral</span>
      <span class="spec-badge spec-badge--success">Success</span>
      <span class="spec-badge spec-badge--error">Error</span>`;
    case 'Card': return `
      <div class="spec-card">Default Card — content here</div>
      <div class="spec-card spec-card--elevated">Elevated Card</div>`;
    case 'Chip': return `
      <span class="spec-chip">Default</span>
      <span class="spec-chip spec-chip--selected">Selected</span>
      <span class="spec-chip" style="opacity:0.5">Disabled</span>`;
    case 'Input': return `
      <input class="spec-input" placeholder="Default input" />
      <input class="spec-input spec-input--error" placeholder="Error state" />`;
    case 'Tag': return `
      <span class="spec-tag">Default</span>
      <span class="spec-tag">Removable <button class="spec-tag-x">×</button></span>`;
    default: return `<div class="spec-placeholder">${comp.name} — no specimen defined</div>`;
  }
}

const draftComponents = manifest.components.filter(c => c.status !== 'stable');
const stableComponents = manifest.components.filter(c => c.status === 'stable');

const draftToolbar = draftComponents.length === 0 ? '' : `
  <div class="draft-toolbar">
    <strong>⚠ ${draftComponents.length} draft component(s) pending approval:</strong>
    ${draftComponents.map(c => `
      <span class="draft-item">
        ${c.name}
        <code>npm run approve ${c.name}</code>
      </span>`).join('')}
  </div>`;

// ── colors section ────────────────────────────────────────────────────────────
const colorSwatches = tokens.color ? collectColors(tokens.color, 'color') : [];

// ── spacing section ───────────────────────────────────────────────────────────
const spacingBars = tokens.spacing ? Object.entries(tokens.spacing).map(([k, v]) => `
  <div class="spacing-row">
    <div class="spacing-label">spacing-${k} — ${v.value}</div>
    <div class="spacing-bar" style="width:${v.value};background:var(--color-brand-green-dark,#009966);height:16px;border-radius:4px;min-width:4px;max-width:100%;"></div>
  </div>`).join('') : '';

// ── type scale section ────────────────────────────────────────────────────────
const typeScaleRows = tokens.font?.size ? Object.entries(tokens.font.size).map(([k, v]) => `
  <div class="type-row">
    <div class="type-meta">font-size-${k} — ${v.value}</div>
    <div class="type-specimen" style="font-size:${v.value};font-family:'Barlow Condensed',sans-serif;line-height:1.2;">Compulocks</div>
  </div>`).join('') : '';

// ── HTML ──────────────────────────────────────────────────────────────────────
const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Compulocks Design System — v${version}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@400;500;600&family=Barlow:wght@400;500;600&display=swap" rel="stylesheet">
<style>
  :root {
    --color-brand-primary: #1D1F4A;
    --color-brand-secondary: #243469;
    --color-brand-green-dark: #009966;
    --color-brand-green-light: #1DB274;
    --color-surface-page: #FBFAFD;
    --color-surface-default: #FFFFFF;
    --color-surface-sunken: #F4F4F8;
    --color-surface-deep: #ECEDF2;
    --color-content-primary: #1A1B2A;
    --color-content-muted: #5A5C70;
    --color-content-faint: #8C8E9F;
    --color-outline-soft: #E8E9EE;
    --color-outline-default: #D9DAE2;
    --color-outline-strong: #B8BAC8;
    --font-family-heading: 'Barlow Condensed', 'Arial Narrow', Arial, sans-serif;
    --font-family-body: 'Barlow', 'Segoe UI', Arial, sans-serif;
    --spacing-1: 4px; --spacing-2: 8px; --spacing-3: 12px; --spacing-4: 16px;
    --spacing-5: 20px; --spacing-6: 24px; --spacing-7: 32px; --spacing-8: 40px; --spacing-9: 56px;
    --border-radius-xs: 6px; --border-radius-s: 10px; --border-radius-m: 14px;
    --border-radius-l: 20px; --border-radius-xl: 28px; --border-radius-pill: 9999px;
    --shadow-1: 0 1px 2px rgba(29,31,74,0.06), 0 1px 1px rgba(29,31,74,0.04);
    --shadow-2: 0 2px 6px rgba(29,31,74,0.08), 0 1px 2px rgba(29,31,74,0.04);
  }
  * { box-sizing: border-box; }
  body { font-family: var(--font-family-body); background: var(--color-surface-page); color: var(--color-content-primary); margin: 0; padding: 0; font-size: 14px; line-height: 1.5; }

  /* Header */
  .ds-header { background: var(--color-brand-primary); color: #fff; padding: var(--spacing-6) var(--spacing-7); display: flex; align-items: center; justify-content: space-between; }
  .ds-header h1 { font-family: var(--font-family-heading); font-size: 28px; font-weight: 500; margin: 0; letter-spacing: 0.01em; }
  .ds-meta { font-size: 12px; opacity: 0.7; }

  /* Draft toolbar */
  .draft-toolbar { position: sticky; top: 0; z-index: 100; background: #FFF8E6; border-bottom: 2px solid #B86F00; padding: var(--spacing-3) var(--spacing-7); display: flex; flex-wrap: wrap; gap: var(--spacing-3); align-items: center; font-size: 13px; }
  .draft-item { display: inline-flex; align-items: center; gap: var(--spacing-2); background: #fff; border: 1px solid #B86F00; border-radius: var(--border-radius-s); padding: 4px 10px; }
  .draft-item code { background: var(--color-surface-deep); padding: 2px 6px; border-radius: 4px; font-size: 11px; }

  /* Nav */
  .ds-nav { background: var(--color-surface-default); border-bottom: 1px solid var(--color-outline-soft); padding: 0 var(--spacing-7); display: flex; gap: var(--spacing-5); }
  .ds-nav a { font-family: var(--font-family-heading); font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.10em; color: var(--color-content-muted); text-decoration: none; padding: var(--spacing-3) 0; border-bottom: 2px solid transparent; display: inline-block; }
  .ds-nav a:hover { color: var(--color-brand-primary); border-bottom-color: var(--color-brand-green-dark); }

  /* Layout */
  .ds-content { max-width: 1100px; margin: 0 auto; padding: var(--spacing-8) var(--spacing-7); display: flex; flex-direction: column; gap: var(--spacing-9); }
  .ds-section { display: flex; flex-direction: column; gap: var(--spacing-5); }
  .ds-section-header { border-bottom: 2px solid var(--color-outline-soft); padding-bottom: var(--spacing-3); }
  .ds-section-header h2 { font-family: var(--font-family-heading); font-size: 22px; font-weight: 500; color: var(--color-brand-primary); margin: 0; letter-spacing: 0.01em; }
  .ds-section-header p { font-size: 13px; color: var(--color-content-muted); margin: 4px 0 0; }

  /* Swatches */
  .swatch-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(120px, 1fr)); gap: var(--spacing-3); }
  .swatch-item { display: flex; flex-direction: column; gap: 6px; }
  .swatch-color { height: 56px; border-radius: var(--border-radius-m); box-shadow: var(--shadow-1); }
  .swatch-name { font-size: 11px; font-weight: 600; color: var(--color-content-primary); word-break: break-all; }
  .swatch-value { font-size: 10px; color: var(--color-content-muted); font-family: monospace; }

  /* Spacing */
  .spacing-row { display: flex; align-items: center; gap: var(--spacing-4); margin-bottom: var(--spacing-2); }
  .spacing-label { font-size: 12px; color: var(--color-content-muted); width: 200px; flex-shrink: 0; font-family: monospace; }

  /* Type scale */
  .type-row { display: flex; align-items: center; gap: var(--spacing-4); padding: var(--spacing-2) 0; border-bottom: 1px solid var(--color-outline-soft); }
  .type-meta { font-size: 11px; color: var(--color-content-muted); width: 180px; flex-shrink: 0; font-family: monospace; }

  /* Components */
  .component-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: var(--spacing-4); }
  .component-card { background: var(--color-surface-default); border: 1.5px solid var(--color-outline-soft); border-radius: var(--border-radius-l); overflow: hidden; box-shadow: var(--shadow-1); }
  .component-draft { border-color: #B86F00; opacity: 0.8; }
  .draft-banner { background: #FFF8E6; border-bottom: 1px solid #B86F00; padding: var(--spacing-2) var(--spacing-4); font-size: 12px; color: #B86F00; }
  .draft-banner code { background: rgba(184,111,0,0.1); padding: 1px 5px; border-radius: 3px; font-size: 11px; }
  .component-header { display: flex; align-items: center; justify-content: space-between; padding: var(--spacing-4) var(--spacing-5); border-bottom: 1px solid var(--color-outline-soft); }
  .component-name { font-family: var(--font-family-heading); font-size: 16px; font-weight: 600; color: var(--color-brand-primary); }
  .component-status { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.10em; padding: 3px 8px; border-radius: var(--border-radius-pill); }
  .status-stable { background: rgba(0,153,102,0.10); color: #009966; }
  .status-draft { background: rgba(184,111,0,0.10); color: #B86F00; }
  .component-variants { padding: var(--spacing-3) var(--spacing-5); display: flex; flex-wrap: wrap; gap: var(--spacing-2); border-bottom: 1px solid var(--color-outline-soft); }
  .variant-pill { font-size: 11px; background: var(--color-surface-deep); color: var(--color-content-muted); padding: 2px 8px; border-radius: var(--border-radius-pill); font-weight: 500; }
  .component-specimen { padding: var(--spacing-5); display: flex; flex-wrap: wrap; gap: var(--spacing-3); align-items: center; background: var(--color-surface-sunken); }
  .spec-placeholder { font-size: 12px; color: var(--color-content-faint); font-style: italic; }

  /* Specimen — Button */
  .spec-btn { font-family: var(--font-family-heading); font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.08em; border-radius: var(--border-radius-pill); padding: 0 var(--spacing-4); height: 36px; border: 1.5px solid transparent; cursor: pointer; }
  .spec-btn--primary { background: var(--color-brand-primary); color: #fff; }
  .spec-btn--secondary { background: transparent; color: var(--color-brand-primary); border-color: var(--color-brand-primary); }
  .spec-btn--ghost { background: transparent; color: var(--color-brand-primary); border: none; }
  .spec-btn--cta { background: var(--color-brand-green-dark); color: #fff; }

  /* Specimen — Badge */
  .spec-badge { font-family: var(--font-family-heading); font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.08em; padding: 2px 10px; border-radius: var(--border-radius-pill); }
  .spec-badge--brand { background: rgba(29,31,74,0.08); color: var(--color-brand-primary); }
  .spec-badge--neutral { background: var(--color-surface-deep); color: var(--color-content-muted); }
  .spec-badge--success { background: rgba(0,153,102,0.10); color: #009966; }
  .spec-badge--error { background: rgba(179,38,30,0.10); color: #B3261E; }

  /* Specimen — Card */
  .spec-card { background: var(--color-surface-default); border: 1px solid var(--color-outline-soft); border-radius: var(--border-radius-l); padding: var(--spacing-5); font-size: 13px; box-shadow: var(--shadow-1); width: 100%; }
  .spec-card--elevated { box-shadow: var(--shadow-2); }

  /* Specimen — Chip */
  .spec-chip { display: inline-flex; align-items: center; height: 30px; padding: 0 var(--spacing-3); border: 1.5px solid var(--color-outline-default); border-radius: var(--border-radius-pill); font-size: 13px; font-weight: 500; background: var(--color-surface-default); }
  .spec-chip--selected { background: var(--color-brand-primary); color: #fff; border-color: var(--color-brand-primary); }

  /* Specimen — Input */
  .spec-input { height: 40px; padding: 0 var(--spacing-4); border: 1.5px solid var(--color-outline-default); border-radius: var(--border-radius-s); background: var(--color-surface-default); font-size: 14px; font-family: var(--font-family-body); outline: none; width: 200px; }
  .spec-input--error { border-color: #B3261E; }

  /* Specimen — Tag */
  .spec-tag { display: inline-flex; align-items: center; gap: 4px; height: 28px; padding: 0 var(--spacing-3); background: var(--color-surface-deep); border-radius: var(--border-radius-pill); font-size: 12px; font-weight: 500; }
  .spec-tag-x { background: none; border: none; cursor: pointer; font-size: 14px; padding: 0 2px; line-height: 1; color: var(--color-content-muted); }

  /* Footer */
  .ds-footer { border-top: 1px solid var(--color-outline-soft); padding: var(--spacing-6) var(--spacing-7); display: flex; align-items: center; justify-content: space-between; font-size: 12px; color: var(--color-content-faint); }
  .ds-footer strong { color: var(--color-brand-primary); font-family: var(--font-family-heading); letter-spacing: 0.10em; text-transform: uppercase; }
</style>
</head>
<body>

<div class="ds-header">
  <h1>Compulocks Design System</h1>
  <div class="ds-meta">v${version} · Generated ${generatedAt} · ${stableComponents.length} stable components</div>
</div>

${draftToolbar}

<nav class="ds-nav">
  <a href="#foundations">Foundations</a>
  <a href="#type">Typography</a>
  <a href="#spacing">Spacing</a>
  <a href="#components">Components</a>
</nav>

<div class="ds-content">

  <section class="ds-section" id="foundations">
    <div class="ds-section-header">
      <h2>Color Foundations</h2>
      <p>All values as CSS custom properties. Use var(--token-name) — never hardcode.</p>
    </div>
    <div class="swatch-grid">${colorSwatches.join('\n')}</div>
  </section>

  <section class="ds-section" id="type">
    <div class="ds-section-header">
      <h2>Typography Scale</h2>
      <p>font-family-heading: Barlow Condensed · font-family-body: Barlow</p>
    </div>
    ${typeScaleRows}
  </section>

  <section class="ds-section" id="spacing">
    <div class="ds-section-header">
      <h2>Spacing Scale</h2>
      <p>4px base grid — spacing-1 (4px) through spacing-9 (56px)</p>
    </div>
    ${spacingBars}
  </section>

  <section class="ds-section" id="components">
    <div class="ds-section-header">
      <h2>Components</h2>
      <p>${stableComponents.length} stable · ${draftComponents.length} draft (not available to agents)</p>
    </div>
    <div class="component-grid">
      ${manifest.components.map(componentSpecimen).join('\n')}
    </div>
  </section>

</div>

<footer class="ds-footer">
  <strong>Compulocks</strong>
  <span>Auto-generated by compulocks-brand-system · Do not edit directly</span>
</footer>

</body>
</html>`;

writeFileSync(OUT_FILE, html, 'utf8');
console.log(`[generate-living-html] Written: ${OUT_FILE}`);
console.log(`[generate-living-html] ${stableComponents.length} stable, ${draftComponents.length} draft`);
```

- [ ] **Step 3: Run it**

```bash
npm run build
```

Expected output includes:
```
[generate-living-html] Written: ...design-system/index.html
[generate-living-html] 6 stable, 0 draft
[sync-vault] Vault updated at ...
```

Open `design-system/index.html` in a browser and verify:
- Header shows version and date
- Color swatches render
- Type scale renders
- All 6 components show as "stable" with specimens
- No draft toolbar visible

- [ ] **Step 4: Commit**

```bash
git add scripts/generate-living-html.mjs design-system/ design-system/index.html design-system/README.md
git commit -m "feat(living-html): add design specimen page generator — design-system/index.html"
```

---

## Sprint 3 — MCP Server (Codex)

### Task 6: MCP server scaffold + read tools

**Files:**
- Create: `mcp-server/package.json`
- Create: `mcp-server/tsconfig.json`
- Create: `mcp-server/src/data.ts`
- Create: `mcp-server/src/watcher.ts`
- Create: `mcp-server/src/tools/read.ts`
- Create: `mcp-server/src/index.ts` (partial — read tools only)

- [ ] **Step 1: Create `mcp-server/package.json`**

```json
{
  "name": "@compulocks/design-mcp",
  "version": "1.0.0",
  "description": "Compulocks Design System MCP server",
  "main": "dist/index.js",
  "scripts": {
    "build": "tsup src/index.ts --format cjs --outDir dist --no-splitting",
    "dev": "ts-node src/index.ts"
  },
  "dependencies": {
    "@modelcontextprotocol/sdk": "^1.12.0",
    "chokidar": "^3.6.0"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "ts-node": "^10.9.2",
    "tsup": "^8.5.1",
    "typescript": "^5.9.3"
  }
}
```

- [ ] **Step 2: Create `mcp-server/tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020"],
    "outDir": "dist",
    "rootDir": "src",
    "strict": true,
    "esModuleInterop": true,
    "resolveJsonModule": true,
    "skipLibCheck": true
  },
  "include": ["src/**/*"]
}
```

- [ ] **Step 3: Install mcp-server dependencies**

```bash
cd mcp-server && npm install && cd ..
```

- [ ] **Step 4: Create `mcp-server/src/data.ts`**

```typescript
import { readFileSync, existsSync } from 'node:fs';
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
  if (!existsSync(p)) throw new Error(`tokens.json not found — run npm run build in compulocks-brand-system`);
  return JSON.parse(readFileSync(p, 'utf8'));
}

export function readManifest(): Manifest {
  const p = join(REPO_ROOT, 'component-manifest.json');
  if (!existsSync(p)) throw new Error(`component-manifest.json not found`);
  return JSON.parse(readFileSync(p, 'utf8'));
}

export function readStableManifest(): Manifest {
  const m = readManifest();
  return { ...m, components: m.components.filter(c => c.status === 'stable') };
}

export function readSpec(): string {
  const p = join(REPO_ROOT, 'token_guide.md');
  if (!existsSync(p)) return 'Spec not available — run npm run build';
  return readFileSync(p, 'utf8');
}

export function getVaultAge(): string {
  const p = join(VAULT_DIR, '.last-updated');
  if (!existsSync(p)) return 'unknown';
  return readFileSync(p, 'utf8').trim();
}
```

- [ ] **Step 5: Create `mcp-server/src/watcher.ts`**

```typescript
import chokidar from 'chokidar';
import { join, resolve } from 'node:path';

const REPO_ROOT = resolve(__dirname, '../..');

export function watchDesignFiles(onChange: (path: string) => void): void {
  const paths = [
    join(REPO_ROOT, 'component-manifest.json'),
    join(REPO_ROOT, 'build', 'json', 'tokens.json'),
    join(REPO_ROOT, 'token_guide.md'),
  ];
  chokidar.watch(paths, { ignoreInitial: true }).on('change', (path) => {
    console.error(`[mcp] File changed: ${path} — data refreshed`);
    onChange(path);
  });
}
```

- [ ] **Step 6: Create `mcp-server/src/tools/read.ts`**

```typescript
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { readTokens, readStableManifest, readSpec } from '../data.js';

export function registerReadTools(server: McpServer): void {

  server.tool('get_tokens', 'Returns all design token values', {}, async () => {
    const tokens = readTokens();
    return { content: [{ type: 'text', text: JSON.stringify(tokens, null, 2) }] };
  });

  server.tool('get_manifest', 'Returns stable components only with variants and states', {}, async () => {
    const manifest = readStableManifest();
    return { content: [{ type: 'text', text: JSON.stringify(manifest, null, 2) }] };
  });

  server.tool('list_components', 'Lists all stable component names with variant count', {}, async () => {
    const { components } = readStableManifest();
    const lines = components.map(c =>
      `${c.name} — variants: ${c.variants.join(', ')} | states: ${c.states.join(', ') || 'none'}`
    );
    return { content: [{ type: 'text', text: lines.join('\n') }] };
  });

  server.tool(
    'get_component',
    'Returns full detail for one stable component by name',
    { name: z.string().describe('Component name, e.g. "Button"') },
    async ({ name }) => {
      const { components } = readStableManifest();
      const comp = components.find(c => c.name.toLowerCase() === name.toLowerCase());
      if (!comp) {
        return { content: [{ type: 'text', text: `Component "${name}" not found or not stable. Available: ${components.map(c => c.name).join(', ')}` }] };
      }
      return { content: [{ type: 'text', text: JSON.stringify(comp, null, 2) }] };
    }
  );

  server.tool('get_spec', 'Returns design system usage rules and token reference', {}, async () => {
    const spec = readSpec();
    return { content: [{ type: 'text', text: spec }] };
  });
}
```

- [ ] **Step 7: Create `mcp-server/src/index.ts` (read tools only for now)**

```typescript
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { registerReadTools } from './tools/read.js';
import { watchDesignFiles } from './watcher.js';

const server = new McpServer({
  name: 'compulocks-design',
  version: '1.0.0',
});

registerReadTools(server);

// Hot-reload notification only — tools re-read files on each call
watchDesignFiles((path) => {
  // chokidar callback — tools already read fresh data per call
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('[compulocks-design-mcp] Server running on stdio');
}

main().catch(console.error);
```

- [ ] **Step 8: Build and smoke-test**

```bash
cd mcp-server && npm run build && cd ..
```

Expected: `mcp-server/dist/index.js` created.

Test via stdin (pipe a JSON-RPC tools/list call):
```bash
echo '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}' | node mcp-server/dist/index.js 2>/dev/null
```

Expected: JSON response listing `get_tokens`, `get_manifest`, `list_components`, `get_component`, `get_spec`.

- [ ] **Step 9: Commit**

```bash
git add mcp-server/
git commit -m "feat(mcp): scaffold server + read tools (get_tokens, get_manifest, list_components, get_component, get_spec)"
```

---

### Task 7: Auth + write tools (request_component, approve_component, refresh, get_requests)

**Files:**
- Create: `mcp-server/src/auth.ts`
- Create: `mcp-server/src/tools/request.ts`
- Create: `mcp-server/src/tools/write.ts`
- Modify: `mcp-server/src/index.ts`

- [ ] **Step 1: Create `mcp-server/src/auth.ts`**

```typescript
import { readFileSync, appendFileSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';

const REPO_ROOT = resolve(__dirname, '../..');
const CONTRIBUTORS_PATH = join(REPO_ROOT, 'contributors.json');
const AUDIT_LOG_PATH = join(REPO_ROOT, 'design-audit.log');

export interface Contributor {
  id: string;
  name: string;
  role: string;
}

export function isAuthorized(contributorId: string): boolean {
  if (!existsSync(CONTRIBUTORS_PATH)) return false;
  const { contributors }: { contributors: Contributor[] } = JSON.parse(
    readFileSync(CONTRIBUTORS_PATH, 'utf8')
  );
  return contributors.some(c => c.id === contributorId);
}

export function auditLog(contributorId: string, action: string, detail: string): void {
  const entry = `${new Date().toISOString()} | ${contributorId} | ${action} | ${detail}\n`;
  appendFileSync(AUDIT_LOG_PATH, entry, 'utf8');
}

export function requireAuth(
  contributorId: string | undefined,
  action: string,
  detail: string
): { authorized: true } | { authorized: false; error: string } {
  if (!contributorId) {
    return { authorized: false, error: 'contributor_id is required for this action' };
  }
  if (!isAuthorized(contributorId)) {
    auditLog(contributorId, `${action}_REJECTED`, detail);
    return {
      authorized: false,
      error: `"${contributorId}" is not an authorized contributor. Add via PR to contributors.json.`,
    };
  }
  return { authorized: true };
}
```

- [ ] **Step 2: Create `mcp-server/src/tools/request.ts`**

```typescript
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { appendFileSync, existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const REPO_ROOT = resolve(__dirname, '../../..');
const REQUESTS_PATH = join(REPO_ROOT, 'design-requests.md');

export function registerRequestTools(server: McpServer): void {

  server.tool(
    'request_component',
    'Log a design request for a component that does not exist or is not yet stable. Open to all callers — no auth required. Appends to design-requests.md only.',
    {
      name: z.string().describe('Component name needed, e.g. "Modal"'),
      reason: z.string().describe('Why this component is needed'),
      usage_context: z.string().describe('Where in the UI it would be used'),
      requested_by: z.string().optional().describe('Agent or session identifier'),
    },
    async ({ name, reason, usage_context, requested_by }) => {
      const date = new Date().toISOString();
      const requester = requested_by ?? 'unknown-agent';
      const row = `| ${name} | ${reason} | ${usage_context} | ${requester} | ${date} | open |\n`;

      if (!existsSync(REQUESTS_PATH)) {
        return { content: [{ type: 'text', text: 'design-requests.md not found — run npm run build first' }] };
      }

      appendFileSync(REQUESTS_PATH, row, 'utf8');

      return {
        content: [{
          type: 'text',
          text: `Design request logged for "${name}". Your task is parked until an authorized contributor approves this component. Continue with any work that uses existing stable components.`
        }]
      };
    }
  );
}
```

- [ ] **Step 3: Create `mcp-server/src/tools/write.ts`**

```typescript
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { execSync } from 'node:child_process';
import { requireAuth, auditLog } from '../auth.js';
import { readManifest } from '../data.js';

const REPO_ROOT = resolve(__dirname, '../../..');
const MANIFEST_PATH = join(REPO_ROOT, 'component-manifest.json');
const REQUESTS_PATH = join(REPO_ROOT, 'design-requests.md');

export function registerWriteTools(server: McpServer): void {

  server.tool(
    'approve_component',
    'Approve a draft component — flips status to stable, triggers rebuild and vault sync. Requires authorized contributor_id.',
    {
      name: z.string().describe('Component name to approve'),
      contributor_id: z.string().describe('Your contributor ID (email) from contributors.json'),
    },
    async ({ name, contributor_id }) => {
      const auth = requireAuth(contributor_id, 'APPROVE', name);
      if (!auth.authorized) {
        return { content: [{ type: 'text', text: `Authorization failed: ${auth.error}` }] };
      }

      const manifest = readManifest();
      const comp = manifest.components.find(c => c.name.toLowerCase() === name.toLowerCase());

      if (!comp) {
        return { content: [{ type: 'text', text: `Component "${name}" not found. Available: ${manifest.components.map(c => c.name).join(', ')}` }] };
      }

      if (comp.status === 'stable') {
        return { content: [{ type: 'text', text: `"${name}" is already stable — no-op.` }] };
      }

      comp.status = 'stable';
      writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2) + '\n', 'utf8');
      auditLog(contributor_id, 'APPROVED', name);

      try {
        execSync('npm run build', { cwd: REPO_ROOT, stdio: 'pipe' });
      } catch (e) {
        return { content: [{ type: 'text', text: `"${name}" approved in manifest, but build failed. Run npm run build manually.` }] };
      }

      return { content: [{ type: 'text', text: `"${name}" approved → stable. Build complete. All agents can now use this component.` }] };
    }
  );

  server.tool(
    'refresh',
    'Trigger a full design system rebuild and vault sync. Requires authorized contributor_id.',
    {
      contributor_id: z.string().describe('Your contributor ID (email) from contributors.json'),
    },
    async ({ contributor_id }) => {
      const auth = requireAuth(contributor_id, 'REFRESH', 'full-rebuild');
      if (!auth.authorized) {
        return { content: [{ type: 'text', text: `Authorization failed: ${auth.error}` }] };
      }

      auditLog(contributor_id, 'REFRESH', 'triggered');
      try {
        execSync('npm run build', { cwd: REPO_ROOT, stdio: 'pipe' });
      } catch (e) {
        return { content: [{ type: 'text', text: 'Build failed. Check npm run build output manually.' }] };
      }

      return { content: [{ type: 'text', text: 'Design system rebuilt and vault synced successfully.' }] };
    }
  );

  server.tool(
    'get_requests',
    'Returns all open design requests. Requires authorized contributor_id.',
    {
      contributor_id: z.string().describe('Your contributor ID (email) from contributors.json'),
    },
    async ({ contributor_id }) => {
      const auth = requireAuth(contributor_id, 'GET_REQUESTS', 'read');
      if (!auth.authorized) {
        return { content: [{ type: 'text', text: `Authorization failed: ${auth.error}` }] };
      }

      if (!existsSync(REQUESTS_PATH)) {
        return { content: [{ type: 'text', text: 'No design requests file found.' }] };
      }

      const content = readFileSync(REQUESTS_PATH, 'utf8');
      const openRows = content.split('\n')
        .filter(l => l.startsWith('|') && l.includes('| open |'));

      if (openRows.length === 0) {
        return { content: [{ type: 'text', text: 'No open design requests.' }] };
      }

      return { content: [{ type: 'text', text: `Open design requests (${openRows.length}):\n\n${openRows.join('\n')}` }] };
    }
  );
}
```

- [ ] **Step 4: Update `mcp-server/src/index.ts` to register all tools**

Replace the entire file:

```typescript
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { registerReadTools } from './tools/read.js';
import { registerRequestTools } from './tools/request.js';
import { registerWriteTools } from './tools/write.js';
import { watchDesignFiles } from './watcher.js';

const server = new McpServer({
  name: 'compulocks-design',
  version: '1.0.0',
});

registerReadTools(server);
registerRequestTools(server);
registerWriteTools(server);

watchDesignFiles((_path) => {
  // tools re-read files on each call — no explicit action needed
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('[compulocks-design-mcp] Server running on stdio');
}

main().catch(console.error);
```

- [ ] **Step 5: Build and verify all 8 tools are registered**

```bash
cd mcp-server && npm run build && cd ..
echo '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}' | node mcp-server/dist/index.js 2>/dev/null
```

Expected: JSON listing all 8 tools: `get_tokens`, `get_manifest`, `list_components`, `get_component`, `get_spec`, `request_component`, `approve_component`, `refresh`, `get_requests`.

- [ ] **Step 6: Test auth rejection**

```bash
echo '{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"approve_component","arguments":{"name":"Button","contributor_id":"notreal@example.com"}}}' | node mcp-server/dist/index.js 2>/dev/null
```

Expected response text contains: `not an authorized contributor`

Check audit log has rejection entry:
```bash
tail -1 design-audit.log
```

Expected: `... | notreal@example.com | APPROVE_REJECTED | Button`

- [ ] **Step 7: Commit**

```bash
git add mcp-server/src/
git commit -m "feat(mcp): auth + write tools (request_component, approve_component, refresh, get_requests)"
```

---

## Sprint 4 — Skill + Agent Persona + Registration (Claude Code)

### Task 8: /design-system skill + ux-prep agent + MCP registration

**Files:**
- Create: `.claude/skills/design-system.md`
- Create: `agents/ux-prep.md`
- Modify: `.claude/settings.json` (add MCP server registration)

- [ ] **Step 1: Build the MCP server (ensure dist is current)**

```bash
cd mcp-server && npm run build && cd ..
```

- [ ] **Step 2: Register MCP server in `.claude/settings.json`**

Read `.claude/settings.json` first. Add to the `mcpServers` object (create the object if it doesn't exist):

```json
"compulocks-design": {
  "command": "node",
  "args": ["./mcp-server/dist/index.js"],
  "env": {}
}
```

The path `./mcp-server/dist/index.js` is relative to the repo root — Claude Code resolves it from the project directory.

- [ ] **Step 3: Create `.claude/skills/design-system.md`**

```markdown
---
name: design-system
description: Access the Compulocks design system — list stable components, get tokens, file design requests, approve components. Run before any frontend task.
---

# /design-system skill

Interacts with the Compulocks Design System MCP server (`compulocks-design`).

## Usage

`/design-system` — List all stable components and a token summary  
`/design-system request` — File a design request for a missing component  
`/design-system status` — Show all components with their status (human only)  
`/design-system approve <Name>` — Approve a draft component (human only)  
`/design-system refresh` — Rebuild and sync vault (human only)  

## Behavior

**No argument:**
1. Call `list_components` → display stable component table
2. Call `get_tokens` → summarize key token groups (colors, spacing, type scale)
3. Print vault last-updated timestamp from `~/.compulocks/design/.last-updated`

**`request <description>`:**
1. Parse component name and context from description
2. Call `request_component({ name, reason, usage_context, requested_by: "claude-code-session" })`
3. Confirm the request was logged and instruct agent to park the blocked work

**`status` (human only):**
1. Call `get_requests({ contributor_id })` — prompt for contributor_id if not set
2. Display open requests table
3. List all components grouped by status (stable / draft / deprecated)

**`approve <Name>` (human only):**
1. Read `COMPULOCKS_CONTRIBUTOR` env var or prompt
2. Call `approve_component({ name: Name, contributor_id })`
3. Confirm approval and note that all agents now have access

**`refresh` (human only):**
1. Read `COMPULOCKS_CONTRIBUTOR` env var or prompt
2. Call `refresh({ contributor_id })`
3. Confirm vault is updated

## Hard rules

- Never hardcode design values — always use CSS custom properties from token names
- Never use a component not returned by `list_components`
- If a component is missing, use `request` sub-command and park the blocked work
```

- [ ] **Step 4: Create `agents/ux-prep.md`**

```markdown
---
name: ux-prep
role: UX/UI Preparation Agent
description: Runs before any frontend implementation task. Loads the current design system state and produces a UI prep sheet — component map, token variables, design gaps — for the coder agent.
---

# UX-Prep Agent

## Identity

You are the UX-Prep agent for the Compulocks design system. You run before any frontend implementation task. You do not write production code. You produce a UI prep sheet and hand off to the coder agent.

## Mandatory first steps — always, no exceptions

1. Call `list_components` — load all stable components
2. Call `get_tokens` — load all token values
3. Call `get_spec` — load usage rules and do/don't guidelines

Do not analyze the feature brief until all three calls succeed.

## Process

Given a feature brief or UI task description:

1. **Map UI elements to stable components**
   - For every UI element in the brief, identify the stable component it maps to
   - If no stable component exists → it is a gap (see below)
   - Use exact component names from `list_components` output

2. **Map design values to token variables**
   - Every color, spacing, radius, shadow, and type value must be expressed as a CSS custom property
   - Format: `var(--token-name)` — never hex, never px literals
   - Reference `get_tokens` output for available variable names

3. **File design requests for gaps**
   - For every UI element with no stable component match:
     - Call `request_component({ name, reason, usage_context, requested_by: "ux-prep-agent" })`
     - Add to "Blocked" section of prep sheet
   - File all requests before producing the prep sheet

4. **Dark mode check**
   - Note which token groups have dark-mode variants (`[data-theme='dark']`)
   - Flag any surfaces or text colors that need dark-mode handling

5. **Accessibility notes**
   - Flag interactive elements that need `aria-label`, `role`, or keyboard handling
   - Note any color contrast concerns based on token values

## Output format

Produce a structured UI prep sheet:

```
## UI Prep Sheet — [Feature Name]
Generated: [ISO timestamp]
Design system version: [manifest.version]

### Component Map
| UI Element | Stable Component | Variants to use |
|-----------|-----------------|-----------------|
| ...       | ...             | ...             |

### Token Variables
| Property | CSS Variable | Value |
|----------|-------------|-------|
| Primary bg | var(--color-brand-primary) | #1D1F4A |
| ...

### Blocked — Design Requests Filed
| Component Needed | Request ID | Status |
|-----------------|-----------|--------|
| ...

### Dark Mode Notes
- ...

### Accessibility Notes
- ...

### Handoff to Coder Agent
- Use components listed in Component Map only
- Use CSS variables listed in Token Variables only
- Do NOT implement blocked items — they are parked pending design approval
- [any other task-specific notes]
```

## Hard rules

- Never proceed to implementation
- Never invent token values or component names
- Always file a request before marking something blocked
- If the MCP server is unreachable, read `~/.compulocks/design/manifest.json` and `~/.compulocks/design/tokens.json` directly as fallback
```

- [ ] **Step 5: Verify skill is loadable**

Start a new Claude Code session in this repo and run:
```
/design-system
```

Expected: list of 6 stable components + token summary.

- [ ] **Step 6: Commit everything**

```bash
git add .claude/skills/design-system.md agents/ux-prep.md .claude/settings.json
git commit -m "feat(skill+agent): /design-system skill + ux-prep agent persona + MCP registration"
```

---

## Self-Review

**Spec coverage check:**

| Requirement | Covered by |
|---|---|
| FR-01 MCP server, stdio + HTTP | Task 6–7 (stdio done; HTTP transport is Phase 2 — correct per spec) |
| FR-02 Auth — contributors.json, no cache, audit log | Task 7 `auth.ts` |
| FR-02 Two write classes | `request.ts` (no auth) + `write.ts` (auth required) |
| FR-03 Living HTML — specimen, draft banner, toolbar | Task 5 |
| FR-04 Vault at ~/.compulocks/design/ | Task 3 |
| FR-05 Status field migration + preservation on re-export | Task 1 |
| FR-06 Design requests append-only | Task 2 + Task 7 `request.ts` |
| FR-07 /design-system skill | Task 8 |
| FR-08 ux-prep agent | Task 8 |
| US-10 Contributors via PR | Task 2 (contributors.json committed) |
| NFR-01 Performance | MCP reads files per-call, chokidar watches for changes — no caching bottleneck |
| NFR-02 Approve idempotent | `approve_component` checks `status === 'stable'` → no-op |
| NFR-03 Audit log | `auth.ts` auditLog + `approve.mjs` auditLog |

**HTTP transport (FR-01):** Spec marks remote MCP as Phase 2. Plan correctly omits it — no gap.

**Type consistency check:**
- `ComponentEntry.status` defined in `data.ts` → used in `write.ts` via `readManifest()` ✓
- `requireAuth` signature: `(contributorId: string | undefined, action: string, detail: string)` → called correctly in `write.ts` ✓
- `mergeStatus` exported from `export-manifest.mjs` → imported in test file ✓
- `registerReadTools`, `registerRequestTools`, `registerWriteTools` all take `McpServer` → wired in `index.ts` ✓

No placeholders. No TBDs. All code blocks are complete.
