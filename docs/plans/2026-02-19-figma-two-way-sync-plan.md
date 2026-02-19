# Two-Way Figma Sync — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a free two-way sync system between `tokens/*.json` and Figma using a custom Figma plugin and n8n workflows.

**Architecture:** Custom Figma plugin (Pull/Push buttons) communicates with n8n via HTTP webhooks. n8n handles format translation (DTCG ↔ Figma) and GitHub API operations (fetch files, create PRs). A token guide markdown file is auto-generated during build.

**Tech Stack:** TypeScript (Figma Plugin API), n8n (workflow automation), Style Dictionary v5, GitHub API

**Design doc:** `docs/plans/2026-02-19-figma-two-way-sync-design.md`

---

## Phase 1: Token Guide (HMI Layer)

This is self-contained and immediately useful. Build it first.

### Task 1: Add token guide generator to build script

**Files:**
- Modify: `build-tokens.mjs`
- Output: `token_guide.md` (auto-generated, root of repo)

**Step 1: Read the current build script**

Read `build-tokens.mjs` to understand the current structure. The script uses Style Dictionary v5 ESM API.

**Step 2: Add the guide generator function**

After the `await sd.buildAllPlatforms()` line in `build-tokens.mjs`, add a new function that:

1. Reads `tokens/color.json`, `tokens/typography.json`, `tokens/spacing.json`
2. Walks the token tree, collecting all tokens with `$value`
3. Generates markdown tables grouped by category

Add this code after line 76 (`await sd.buildAllPlatforms()`):

```javascript
import { readFileSync, writeFileSync } from 'fs';

// --- Token Guide Generator ---
function generateTokenGuide() {
  const color = JSON.parse(readFileSync('tokens/color.json', 'utf8'));
  const typography = JSON.parse(readFileSync('tokens/typography.json', 'utf8'));
  const spacing = JSON.parse(readFileSync('tokens/spacing.json', 'utf8'));

  function collectTokens(obj, prefix = '') {
    const results = [];
    for (const [key, val] of Object.entries(obj)) {
      const path = prefix ? `${prefix}.${key}` : key;
      if (val && typeof val === 'object' && '$value' in val) {
        results.push({ path, ...val });
      } else if (val && typeof val === 'object') {
        results.push(...collectTokens(val, path));
      }
    }
    return results;
  }

  const colors = collectTokens(color);
  const fonts = collectTokens(typography).filter(t => t.path.startsWith('font.'));
  const textStyles = collectTokens(typography).filter(t => t.path.startsWith('textStyle.'));
  const spacings = collectTokens(spacing);

  let md = `# Compulocks Brand Token Guide\n`;
  md += `> Auto-generated from tokens/*.json — do not edit directly\n\n`;

  // Colors
  md += `## Colors\n\n`;
  md += `| Token | Value | Description |\n`;
  md += `|-------|-------|-------------|\n`;
  for (const t of colors) {
    md += `| \`${t.path}\` | \`${t['$value']}\` | ${t['$description'] || ''} |\n`;
  }
  md += `\n`;

  // Typography - Fonts
  md += `## Typography\n\n`;
  md += `### Font Families & Weights\n\n`;
  md += `| Token | Value | Description |\n`;
  md += `|-------|-------|-------------|\n`;
  for (const t of fonts) {
    md += `| \`${t.path}\` | ${t['$value']} | ${t['$description'] || ''} |\n`;
  }
  md += `\n`;

  // Typography - Text Styles
  md += `### Text Styles\n\n`;
  md += `| Style | Properties | Description |\n`;
  md += `|-------|-----------|-------------|\n`;
  for (const t of textStyles) {
    // Text styles have sub-properties, not a single $value
    const props = [];
    for (const [k, v] of Object.entries(t)) {
      if (k.startsWith('$') || k === 'path') continue;
      // skip non-token sub-objects
    }
    md += `| \`${t.path}\` | — | ${t['$description'] || ''} |\n`;
  }
  md += `\n`;

  // Spacing
  md += `## Spacing Scale\n\n`;
  md += `| Token | Value | px | Description |\n`;
  md += `|-------|-------|-----|-------------|\n`;
  for (const t of spacings) {
    const rem = parseFloat(t['$value']);
    const px = rem * 16;
    md += `| \`${t.path}\` | ${t['$value']} | ${px}px | ${t['$description'] || ''} |\n`;
  }
  md += `\n`;

  writeFileSync('token_guide.md', md);
  console.log('Token guide generated — token_guide.md');
}

generateTokenGuide();
```

Note: The `import` for `fs` must be at the top of the file. Move `import { readFileSync, writeFileSync } from 'fs';` to line 2.

**Step 3: Handle textStyle tokens properly**

The `textStyle` tokens in `typography.json` are composite — they have sub-properties like `fontFamily`, `fontWeight`, `textTransform` instead of a single `$value`. The `collectTokens` function above won't catch them because they don't have `$value` at the textStyle level.

Update the text styles section to read the raw JSON structure directly:

```javascript
// Text Styles — read directly from typography.json since they're composite
const rawTextStyles = typography.textStyle || {};
md += `### Text Styles\n\n`;
md += `| Style | Font | Weight | Transform | Description |\n`;
md += `|-------|------|--------|-----------|-------------|\n`;
for (const [name, style] of Object.entries(rawTextStyles)) {
  const font = style.fontFamily?.['$value'] || '—';
  const weight = style.fontWeight?.['$value'] || '—';
  const transform = style.textTransform?.['$value'] || '—';
  const desc = style['$description'] || '';
  md += `| \`textStyle.${name}\` | ${font} | ${weight} | ${transform} | ${desc} |\n`;
}
md += `\n`;
```

**Step 4: Run the build**

Run: `npm run build`
Expected: All existing outputs still generate, plus a new `token_guide.md` in the project root.

**Step 5: Verify the generated guide**

Read `token_guide.md` and confirm:
- Colors table has 2 entries (primary, highlight)
- Font families table has entries for family.primary, family.secondary, weight.regular, weight.medium
- Text styles table has 5 entries with font/weight/transform columns populated
- Spacing table has 10 entries with correct px calculations

**Step 6: Add token_guide.md to .gitignore or track it**

Decision: **Track it in git.** It's small, human-readable, and useful in PRs as a diff-friendly view of token changes.

**Step 7: Commit**

```bash
git add build-tokens.mjs token_guide.md
git commit -m "feat: auto-generate token_guide.md during build"
```

---

## Phase 2: Format Translation Library

Shared utility functions for converting between DTCG and Figma formats. Used by both the Figma plugin and n8n workflows.

### Task 2: Create the DTCG-to-Figma converter

**Files:**
- Create: `lib/dtcg-to-figma.mjs`
- Create: `lib/dtcg-to-figma.test.mjs`

**Step 1: Write failing tests**

Create `lib/dtcg-to-figma.test.mjs`:

```javascript
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { hexToFigmaRgb, remToPx, dtcgToFigmaVariables, dtcgToFigmaTextStyles } from './dtcg-to-figma.mjs';

describe('hexToFigmaRgb', () => {
  it('converts 6-digit hex to Figma RGBA', () => {
    const result = hexToFigmaRgb('#1D1F4A');
    assert.deepStrictEqual(result, { r: 0.114, g: 0.122, b: 0.29, a: 1 });
  });

  it('handles lowercase hex', () => {
    const result = hexToFigmaRgb('#ffffff');
    assert.deepStrictEqual(result, { r: 1, g: 1, b: 1, a: 1 });
  });
});

describe('remToPx', () => {
  it('converts rem string to px number', () => {
    assert.strictEqual(remToPx('1rem'), 16);
    assert.strictEqual(remToPx('0.25rem'), 4);
    assert.strictEqual(remToPx('4rem'), 64);
  });
});

describe('dtcgToFigmaVariables', () => {
  it('converts color tokens to Figma variable format', () => {
    const colorJson = {
      color: {
        brand: {
          primary: { '$value': '#1D1F4A', '$type': 'color', '$description': 'Navy' }
        }
      }
    };
    const result = dtcgToFigmaVariables({ color: colorJson });
    assert.ok(result.collections.find(c => c.name === 'Brand'));
    const brandVars = result.collections.find(c => c.name === 'Brand').variables;
    assert.strictEqual(brandVars[0].name, 'color/brand/primary');
    assert.strictEqual(brandVars[0].type, 'COLOR');
    assert.deepStrictEqual(brandVars[0].value, { r: 0.114, g: 0.122, b: 0.29, a: 1 });
  });

  it('converts spacing tokens to Figma variable format', () => {
    const spacingJson = {
      spacing: {
        '4': { '$value': '1rem', '$type': 'dimension', '$description': '16px' }
      }
    };
    const result = dtcgToFigmaVariables({ spacing: spacingJson });
    const spacingVars = result.collections.find(c => c.name === 'Spacing').variables;
    assert.strictEqual(spacingVars[0].name, 'spacing/4');
    assert.strictEqual(spacingVars[0].type, 'FLOAT');
    assert.strictEqual(spacingVars[0].value, 16);
  });
});

describe('dtcgToFigmaTextStyles', () => {
  it('converts text style tokens to Figma text style format', () => {
    const typographyJson = {
      font: {
        family: { primary: { '$value': "'Barlow Condensed', sans-serif" } },
        weight: { medium: { '$value': '500' } }
      },
      textStyle: {
        bigShortTitle: {
          fontFamily: { '$value': '{font.family.primary}' },
          fontWeight: { '$value': '{font.weight.medium}' },
          textTransform: { '$value': 'uppercase' },
          '$description': 'Large short headlines'
        }
      }
    };
    const result = dtcgToFigmaTextStyles(typographyJson);
    assert.strictEqual(result[0].name, 'Text Styles/bigShortTitle');
    assert.strictEqual(result[0].fontFamily, 'Barlow Condensed');
    assert.strictEqual(result[0].fontWeight, 500);
    assert.strictEqual(result[0].description, 'Large short headlines | textTransform: uppercase');
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `node --test lib/dtcg-to-figma.test.mjs`
Expected: FAIL — module not found

**Step 3: Write the converter**

Create `lib/dtcg-to-figma.mjs`:

```javascript
/**
 * DTCG → Figma format converters
 * Converts Design Token Community Group format to Figma Variable/Style structures.
 */

/** Convert hex color string to Figma RGBA (0-1 range, 3 decimal places) */
export function hexToFigmaRgb(hex) {
  const h = hex.replace('#', '');
  const r = Math.round((parseInt(h.substring(0, 2), 16) / 255) * 1000) / 1000;
  const g = Math.round((parseInt(h.substring(2, 4), 16) / 255) * 1000) / 1000;
  const b = Math.round((parseInt(h.substring(4, 6), 16) / 255) * 1000) / 1000;
  return { r, g, b, a: 1 };
}

/** Convert rem string to px number */
export function remToPx(remStr) {
  return parseFloat(remStr) * 16;
}

/** Walk a DTCG token tree, collecting leaf tokens (those with $value) */
function collectTokens(obj, prefix = '') {
  const results = [];
  for (const [key, val] of Object.entries(obj)) {
    const path = prefix ? `${prefix}/${key}` : key;
    if (val && typeof val === 'object' && '$value' in val) {
      results.push({ path, value: val['$value'], type: val['$type'], description: val['$description'] || '' });
    } else if (val && typeof val === 'object' && !key.startsWith('$')) {
      results.push(...collectTokens(val, path));
    }
  }
  return results;
}

/**
 * Convert DTCG token files to Figma Variable collections.
 * Input: { color: <color.json contents>, spacing: <spacing.json contents> }
 * Output: { collections: [{ name, variables: [{ name, type, value, description }] }] }
 */
export function dtcgToFigmaVariables({ color, spacing }) {
  const collections = [];

  if (color) {
    const colorTokens = collectTokens(color);
    collections.push({
      name: 'Brand',
      variables: colorTokens.map(t => ({
        name: t.path,
        type: 'COLOR',
        value: hexToFigmaRgb(t.value),
        description: t.description
      }))
    });
  }

  if (spacing) {
    const spacingTokens = collectTokens(spacing);
    collections.push({
      name: 'Spacing',
      variables: spacingTokens.map(t => ({
        name: t.path,
        type: 'FLOAT',
        value: remToPx(t.value),
        description: t.description
      }))
    });
  }

  return { collections };
}

/**
 * Convert DTCG typography tokens to Figma Text Style format.
 * Resolves {references} to actual values.
 * Input: typography.json contents
 * Output: [{ name, fontFamily, fontWeight, description }]
 */
export function dtcgToFigmaTextStyles(typography) {
  const textStyles = typography.textStyle || {};
  const results = [];

  // Build a lookup for resolving references
  const refLookup = {};
  const allTokens = collectTokens(typography);
  for (const t of allTokens) {
    // Store with dot-separated path for reference resolution
    refLookup[t.path.replace(/\//g, '.')] = t.value;
  }

  function resolveRef(val) {
    if (typeof val !== 'string') return val;
    const match = val.match(/^\{(.+)\}$/);
    if (match) return refLookup[match[1]] || val;
    return val;
  }

  function cleanFontFamily(val) {
    // "'Barlow Condensed', sans-serif" → "Barlow Condensed"
    return val.replace(/'/g, '').split(',')[0].trim();
  }

  for (const [name, style] of Object.entries(textStyles)) {
    const fontFamily = style.fontFamily ? cleanFontFamily(resolveRef(style.fontFamily['$value'])) : '';
    const fontWeight = style.fontWeight ? Number(resolveRef(style.fontWeight['$value'])) : 400;
    const textTransform = style.textTransform ? resolveRef(style.textTransform['$value']) : '';
    const desc = style['$description'] || '';
    const fullDesc = textTransform ? `${desc} | textTransform: ${textTransform}` : desc;

    results.push({
      name: `Text Styles/${name}`,
      fontFamily,
      fontWeight,
      description: fullDesc
    });
  }

  return results;
}
```

**Step 4: Run tests to verify they pass**

Run: `node --test lib/dtcg-to-figma.test.mjs`
Expected: All tests PASS

**Step 5: Commit**

```bash
git add lib/dtcg-to-figma.mjs lib/dtcg-to-figma.test.mjs
git commit -m "feat: add DTCG to Figma format converter with tests"
```

---

### Task 3: Create the Figma-to-DTCG converter

**Files:**
- Create: `lib/figma-to-dtcg.mjs`
- Create: `lib/figma-to-dtcg.test.mjs`

**Step 1: Write failing tests**

Create `lib/figma-to-dtcg.test.mjs`:

```javascript
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { figmaRgbToHex, pxToRem, figmaToTokenFiles } from './figma-to-dtcg.mjs';

describe('figmaRgbToHex', () => {
  it('converts Figma RGBA to hex string', () => {
    assert.strictEqual(figmaRgbToHex({ r: 0.114, g: 0.122, b: 0.29, a: 1 }), '#1D1F4A');
  });

  it('converts white', () => {
    assert.strictEqual(figmaRgbToHex({ r: 1, g: 1, b: 1, a: 1 }), '#FFFFFF');
  });
});

describe('pxToRem', () => {
  it('converts px number to rem string', () => {
    assert.strictEqual(pxToRem(16), '1rem');
    assert.strictEqual(pxToRem(4), '0.25rem');
    assert.strictEqual(pxToRem(64), '4rem');
  });
});

describe('figmaToTokenFiles', () => {
  it('reconstructs color.json from Figma variables', () => {
    const figmaData = {
      collections: [{
        name: 'Brand',
        variables: [{
          name: 'color/brand/primary',
          type: 'COLOR',
          value: { r: 0.114, g: 0.122, b: 0.29, a: 1 },
          description: 'Navy'
        }]
      }]
    };
    const result = figmaToTokenFiles(figmaData);
    assert.strictEqual(result['color.json'].color.brand.primary['$value'], '#1D1F4A');
    assert.strictEqual(result['color.json'].color.brand.primary['$type'], 'color');
    assert.strictEqual(result['color.json'].color.brand.primary['$description'], 'Navy');
  });

  it('reconstructs spacing.json from Figma variables', () => {
    const figmaData = {
      collections: [{
        name: 'Spacing',
        variables: [{
          name: 'spacing/4',
          type: 'FLOAT',
          value: 16,
          description: '16px'
        }]
      }]
    };
    const result = figmaToTokenFiles(figmaData);
    assert.strictEqual(result['spacing.json'].spacing['4']['$value'], '1rem');
    assert.strictEqual(result['spacing.json'].spacing['4']['$type'], 'dimension');
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `node --test lib/figma-to-dtcg.test.mjs`
Expected: FAIL — module not found

**Step 3: Write the converter**

Create `lib/figma-to-dtcg.mjs`:

```javascript
/**
 * Figma → DTCG format converters
 * Converts Figma Variable/Style structures back to Design Token Community Group format.
 */

/** Convert Figma RGBA (0-1 range) to hex string */
export function figmaRgbToHex({ r, g, b }) {
  const toHex = (n) => Math.round(n * 255).toString(16).padStart(2, '0').toUpperCase();
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/** Convert px number to rem string */
export function pxToRem(px) {
  return `${px / 16}rem`;
}

/** Set a value in a nested object using a slash-separated path */
function setNested(obj, slashPath, value) {
  const parts = slashPath.split('/');
  let current = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    if (!current[parts[i]]) current[parts[i]] = {};
    current = current[parts[i]];
  }
  current[parts[parts.length - 1]] = value;
}

/** Map Figma collection name to output filename */
const COLLECTION_FILE_MAP = {
  'Brand': 'color.json',
  'Spacing': 'spacing.json'
};

/** Map Figma variable type to DTCG $type */
const TYPE_MAP = {
  'COLOR': 'color',
  'FLOAT': 'dimension'
};

/**
 * Convert Figma variable collections back to DTCG token files.
 * Input: { collections: [{ name, variables: [{ name, type, value, description }] }] }
 * Output: { 'color.json': {...}, 'spacing.json': {...} }
 */
export function figmaToTokenFiles(figmaData) {
  const files = {};

  for (const collection of figmaData.collections) {
    const fileName = COLLECTION_FILE_MAP[collection.name];
    if (!fileName) continue;

    const root = {};
    for (const variable of collection.variables) {
      let tokenValue;
      if (variable.type === 'COLOR') {
        tokenValue = figmaRgbToHex(variable.value);
      } else if (variable.type === 'FLOAT') {
        tokenValue = pxToRem(variable.value);
      } else {
        tokenValue = variable.value;
      }

      const token = {
        '$value': tokenValue,
        '$type': TYPE_MAP[variable.type] || variable.type
      };
      if (variable.description) {
        token['$description'] = variable.description;
      }

      setNested(root, variable.name, token);
    }

    files[fileName] = root;
  }

  return files;
}
```

**Step 4: Run tests to verify they pass**

Run: `node --test lib/figma-to-dtcg.test.mjs`
Expected: All tests PASS

**Step 5: Commit**

```bash
git add lib/figma-to-dtcg.mjs lib/figma-to-dtcg.test.mjs
git commit -m "feat: add Figma to DTCG format converter with tests"
```

---

## Phase 3: Figma Plugin

### Task 4: Scaffold the Figma plugin

**Files:**
- Create: `figma-plugin/manifest.json`
- Create: `figma-plugin/code.ts`
- Create: `figma-plugin/ui.html`

**Step 1: Create manifest.json**

```json
{
  "name": "Compulocks Token Sync",
  "id": "compulocks-token-sync",
  "api": "1.0.0",
  "main": "code.js",
  "ui": "ui.html",
  "editorType": ["figma"],
  "networkAccess": {
    "allowedDomains": ["*"]
  }
}
```

Note: `networkAccess.allowedDomains` allows the plugin to make HTTP requests to n8n. In production, restrict this to your n8n domain.

**Step 2: Create ui.html**

```html
<!DOCTYPE html>
<html>
<head>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: Inter, sans-serif; padding: 16px; background: #2c2c2c; color: #fff; }
    h2 { font-size: 14px; margin-bottom: 12px; color: #e0e0e0; }
    .config { margin-bottom: 16px; }
    .config label { display: block; font-size: 11px; color: #999; margin-bottom: 4px; }
    .config input {
      width: 100%; padding: 8px; border: 1px solid #555; border-radius: 4px;
      background: #3c3c3c; color: #fff; font-size: 12px;
    }
    .actions { display: flex; gap: 8px; margin-top: 16px; }
    button {
      flex: 1; padding: 10px; border: none; border-radius: 6px;
      font-size: 13px; font-weight: 600; cursor: pointer;
    }
    .pull { background: #18A0FB; color: #fff; }
    .push { background: #7B61FF; color: #fff; }
    button:hover { opacity: 0.9; }
    button:disabled { opacity: 0.4; cursor: not-allowed; }
    #status {
      margin-top: 12px; padding: 8px; border-radius: 4px;
      font-size: 11px; background: #3c3c3c; min-height: 24px;
    }
    .success { color: #1bc47d; }
    .error { color: #f24822; }
    .info { color: #18A0FB; }
  </style>
</head>
<body>
  <h2>Compulocks Token Sync</h2>

  <div class="config">
    <label>n8n Webhook URL</label>
    <input type="text" id="webhookUrl" placeholder="https://your-n8n.example.com/webhook/..." />
  </div>

  <div class="actions">
    <button class="pull" id="pullBtn">Pull from Repo</button>
    <button class="push" id="pushBtn">Push to Repo</button>
  </div>

  <div id="status"></div>

  <script>
    const statusEl = document.getElementById('status');
    const pullBtn = document.getElementById('pullBtn');
    const pushBtn = document.getElementById('pushBtn');
    const webhookInput = document.getElementById('webhookUrl');

    function setStatus(msg, type = 'info') {
      statusEl.innerHTML = `<span class="${type}">${msg}</span>`;
    }

    function getWebhookUrl() {
      return webhookInput.value.trim();
    }

    // Pull: fetch tokens from n8n, send to plugin main thread
    pullBtn.addEventListener('click', async () => {
      const url = getWebhookUrl();
      if (!url) { setStatus('Enter your n8n webhook URL first.', 'error'); return; }

      setStatus('Pulling tokens from repo...', 'info');
      pullBtn.disabled = true;

      try {
        const res = await fetch(url + '/pull', { method: 'GET' });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        parent.postMessage({ pluginMessage: { type: 'pull', data } }, '*');
      } catch (err) {
        setStatus(`Pull failed: ${err.message}`, 'error');
        pullBtn.disabled = false;
      }
    });

    // Push: ask plugin main thread for current variables, then POST to n8n
    pushBtn.addEventListener('click', () => {
      setStatus('Reading Figma variables...', 'info');
      pushBtn.disabled = true;
      parent.postMessage({ pluginMessage: { type: 'push-request' } }, '*');
    });

    // Messages from plugin main thread
    window.onmessage = async (event) => {
      const msg = event.data.pluginMessage;
      if (!msg) return;

      if (msg.type === 'pull-complete') {
        setStatus(`Pulled ${msg.count} variables successfully.`, 'success');
        pullBtn.disabled = false;
      }

      if (msg.type === 'push-data') {
        const url = getWebhookUrl();
        try {
          const res = await fetch(url + '/push', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(msg.data)
          });
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const result = await res.json();
          setStatus(`Pushed! PR created: ${result.prUrl || 'check n8n'}`, 'success');
        } catch (err) {
          setStatus(`Push failed: ${err.message}`, 'error');
        }
        pushBtn.disabled = false;
      }

      if (msg.type === 'error') {
        setStatus(msg.message, 'error');
        pullBtn.disabled = false;
        pushBtn.disabled = false;
      }
    };
  </script>
</body>
</html>
```

**Step 3: Create code.ts (plugin main thread)**

```typescript
// Compulocks Token Sync — Figma Plugin Main Thread
// Handles reading/writing Figma Variables and Text Styles

figma.showUI(__html__, { width: 320, height: 280 });

// --- PULL: Apply tokens from repo to Figma ---

interface FigmaColorValue { r: number; g: number; b: number; a: number; }

interface FigmaVariable {
  name: string;
  type: 'COLOR' | 'FLOAT';
  value: FigmaColorValue | number;
  description: string;
}

interface FigmaCollection {
  name: string;
  variables: FigmaVariable[];
}

interface FigmaTextStyle {
  name: string;
  fontFamily: string;
  fontWeight: number;
  description: string;
}

interface PullData {
  collections: FigmaCollection[];
  textStyles: FigmaTextStyle[];
}

async function applyVariables(data: PullData) {
  let count = 0;

  for (const collection of data.collections) {
    // Find or create the variable collection
    const existingCollections = figma.variables.getLocalVariableCollections();
    let varCollection = existingCollections.find(c => c.name === collection.name);
    if (!varCollection) {
      varCollection = figma.variables.createVariableCollection(collection.name);
    }
    const modeId = varCollection.modes[0].modeId;

    for (const v of collection.variables) {
      // Find or create the variable
      const existing = figma.variables.getLocalVariables().find(
        lv => lv.name === v.name && lv.variableCollectionId === varCollection!.id
      );

      let figmaVar: Variable;
      if (existing) {
        figmaVar = existing;
      } else {
        const resolvedType = v.type === 'COLOR' ? 'COLOR' : 'FLOAT';
        figmaVar = figma.variables.createVariable(v.name, varCollection, resolvedType);
      }

      if (v.type === 'COLOR') {
        figmaVar.setValueForMode(modeId, v.value as RGBA);
      } else {
        figmaVar.setValueForMode(modeId, v.value as number);
      }

      figmaVar.description = v.description;
      count++;
    }
  }

  // Apply text styles
  if (data.textStyles) {
    for (const ts of data.textStyles) {
      const existing = figma.getLocalTextStyles().find(s => s.name === ts.name);
      let style: TextStyle;
      if (existing) {
        style = existing;
      } else {
        style = figma.createTextStyle();
        style.name = ts.name;
      }

      await figma.loadFontAsync({ family: ts.fontFamily, style: 'Regular' });
      style.fontName = { family: ts.fontFamily, style: 'Regular' };
      // Note: Figma doesn't directly support fontWeight on TextStyle —
      // the weight is encoded in the font style name (e.g. "Medium", "Bold")
      style.description = ts.description;
      count++;
    }
  }

  return count;
}

// --- PUSH: Read Figma variables and send to UI for export ---

function readVariables() {
  const collections: FigmaCollection[] = [];

  for (const vc of figma.variables.getLocalVariableCollections()) {
    const variables: FigmaVariable[] = [];
    const modeId = vc.modes[0].modeId;

    for (const varId of vc.variableIds) {
      const v = figma.variables.getVariableById(varId);
      if (!v) continue;

      const value = v.resolveForConsumer({ mode: modeId }).value;
      variables.push({
        name: v.name,
        type: v.resolvedType as 'COLOR' | 'FLOAT',
        value: value as FigmaColorValue | number,
        description: v.description
      });
    }

    collections.push({ name: vc.name, variables });
  }

  // Read text styles
  const textStyles: FigmaTextStyle[] = figma.getLocalTextStyles().map(s => ({
    name: s.name,
    fontFamily: s.fontName.family,
    fontWeight: 400, // Default — Figma encodes weight in style name
    description: s.description
  }));

  return { collections, textStyles };
}

// --- Message handler ---

figma.ui.onmessage = async (msg) => {
  if (msg.type === 'pull') {
    try {
      const count = await applyVariables(msg.data as PullData);
      figma.ui.postMessage({ type: 'pull-complete', count });
    } catch (err: any) {
      figma.ui.postMessage({ type: 'error', message: `Pull error: ${err.message}` });
    }
  }

  if (msg.type === 'push-request') {
    try {
      const data = readVariables();
      figma.ui.postMessage({ type: 'push-data', data });
    } catch (err: any) {
      figma.ui.postMessage({ type: 'error', message: `Push error: ${err.message}` });
    }
  }
};
```

**Step 4: Add a build step for the plugin**

The plugin needs `code.ts` compiled to `code.js`. Add to `package.json`:

```json
"scripts": {
  "build": "node build-tokens.mjs",
  "build:plugin": "npx esbuild figma-plugin/code.ts --bundle --outfile=figma-plugin/code.js --target=es2020",
  "clean": "rm -rf build/"
}
```

Install esbuild as a dev dependency:

```bash
npm install --save-dev esbuild
```

**Step 5: Build the plugin**

Run: `npm run build:plugin`
Expected: `figma-plugin/code.js` is generated

**Step 6: Commit**

```bash
git add figma-plugin/ package.json package-lock.json
git commit -m "feat: add Figma plugin for token sync (Pull/Push)"
```

---

## Phase 4: n8n Workflows

These are configured in n8n's UI, not as code files. We'll document the exact workflow configurations.

### Task 5: Create the Code→Figma n8n workflow (Workflow A)

**Files:**
- Create: `n8n/workflow-a-code-to-figma.json` (n8n export for reference/import)
- Create: `n8n/README.md` (setup instructions)

**Step 1: Document the workflow nodes**

Create `n8n/README.md` with setup instructions:

```markdown
# n8n Workflows for Figma Sync

## Prerequisites

- n8n instance (self-hosted or cloud free tier)
- GitHub personal access token with `repo` scope
- This repository configured with a webhook

## Workflow A: Code → Figma

Keeps latest tokens ready for the Figma plugin to pull.

### Nodes

1. **GitHub Webhook Trigger**
   - Event: Push
   - Repository: compulocks-brand-system
   - Filter: only trigger if commits touch `tokens/` files

2. **HTTP Request — Fetch color.json**
   - GET `https://raw.githubusercontent.com/{owner}/{repo}/master/tokens/color.json`
   - Authentication: GitHub token header

3. **HTTP Request — Fetch typography.json**
   - Same pattern as above

4. **HTTP Request — Fetch spacing.json**
   - Same pattern as above

5. **Code Node — Transform DTCG → Figma**
   - Paste the conversion logic from `lib/dtcg-to-figma.mjs`
   - Input: the three JSON files
   - Output: { collections: [...], textStyles: [...] }

6. **Respond to Webhook — Store result**
   - This workflow also exposes a GET `/pull` endpoint
   - Returns the transformed data to the Figma plugin

### Alternative: Use two separate workflows
- Workflow A1: GitHub webhook trigger → fetch + transform → store in n8n static data
- Workflow A2: Webhook GET `/pull` → read from static data → respond

## Workflow B: Figma → Code

Creates a PR when the designer pushes from Figma.

### Nodes

1. **Webhook Trigger — POST /push**
   - Receives JSON payload from Figma plugin

2. **Code Node — Transform Figma → DTCG**
   - Paste the conversion logic from `lib/figma-to-dtcg.mjs`
   - Input: { collections: [...], textStyles: [...] }
   - Output: { 'color.json': {...}, 'spacing.json': {...}, 'typography.json': {...} }

3. **HTTP Request — Get current files from GitHub**
   - Fetch current token files to diff against

4. **Code Node — Diff**
   - Compare transformed output with current files
   - If no changes, stop workflow

5. **HTTP Request — Create branch**
   - POST to GitHub API: create ref `figma-sync/YYYY-MM-DD-HHMMSS` from master

6. **HTTP Request — Commit files**
   - PUT to GitHub API: update each changed token file on the new branch

7. **HTTP Request — Create PR**
   - POST to GitHub API: create pull request from the new branch to master
   - Title: "Figma token sync — [date]"
   - Body: list of changed tokens

8. **Respond to Webhook**
   - Return { prUrl: "..." } to the Figma plugin
```

**Step 2: Create the n8n export JSON for Workflow A**

Create `n8n/workflow-a-code-to-figma.json` — this is an importable n8n workflow:

```json
{
  "name": "Compulocks: Code → Figma Token Sync",
  "nodes": [
    {
      "name": "GitHub Push Webhook",
      "type": "n8n-nodes-base.webhookTrigger",
      "position": [240, 300],
      "parameters": {
        "httpMethod": "POST",
        "path": "github-push"
      }
    },
    {
      "name": "Filter Token Changes",
      "type": "n8n-nodes-base.if",
      "position": [440, 300],
      "parameters": {
        "conditions": {
          "string": [{
            "value1": "={{ JSON.stringify($json.commits) }}",
            "operation": "contains",
            "value2": "tokens/"
          }]
        }
      }
    },
    {
      "name": "Fetch Token Files",
      "type": "n8n-nodes-base.httpRequest",
      "position": [640, 300],
      "parameters": {
        "method": "GET",
        "url": "https://api.github.com/repos/{{$env.GITHUB_OWNER}}/{{$env.GITHUB_REPO}}/contents/tokens",
        "authentication": "genericCredentialType",
        "genericAuthType": "httpHeaderAuth",
        "options": { "response": { "response": { "responseFormat": "json" } } }
      }
    },
    {
      "name": "Transform DTCG to Figma",
      "type": "n8n-nodes-base.code",
      "position": [840, 300],
      "parameters": {
        "jsCode": "// Paste dtcg-to-figma conversion logic here\n// See lib/dtcg-to-figma.mjs for the full implementation\n\n// This node receives the raw token JSON files and converts them\n// to the Figma variable format.\n// Output is stored in n8n static data for the Pull endpoint.\n\nconst data = $input.all();\n// ... transformation logic ...\nreturn [{ json: { collections: [], textStyles: [] } }];"
      }
    },
    {
      "name": "Store for Pull",
      "type": "n8n-nodes-base.code",
      "position": [1040, 300],
      "parameters": {
        "jsCode": "const staticData = $getWorkflowStaticData('global');\nstaticData.latestTokens = $input.first().json;\nreturn $input.all();"
      }
    }
  ],
  "connections": {
    "GitHub Push Webhook": { "main": [[ { "node": "Filter Token Changes" } ]] },
    "Filter Token Changes": { "main": [[ { "node": "Fetch Token Files" } ]] },
    "Fetch Token Files": { "main": [[ { "node": "Transform DTCG to Figma" } ]] },
    "Transform DTCG to Figma": { "main": [[ { "node": "Store for Pull" } ]] }
  }
}
```

**Step 3: Create the n8n export JSON for Workflow B (Pull endpoint + Figma→Code)**

Create `n8n/workflow-b-figma-to-code.json` with similar structure for the push/pull webhook endpoints. Follow the node descriptions in the README.

**Step 4: Commit**

```bash
git add n8n/
git commit -m "feat: add n8n workflow configs and setup guide"
```

---

## Phase 5: Integration & Documentation

### Task 6: Update FIGMA_SYNC.md with new workflow

**Files:**
- Modify: `FIGMA_SYNC.md`

**Step 1: Rewrite FIGMA_SYNC.md**

Replace the current manual Tokens Studio instructions with the new plugin + n8n workflow. Keep it as a concise setup guide:

1. How to install the Figma plugin (load from `figma-plugin/` as a development plugin)
2. How to configure n8n (import workflows, set environment variables)
3. How to configure the GitHub webhook
4. How to use Pull/Push

**Step 2: Commit**

```bash
git add FIGMA_SYNC.md
git commit -m "docs: update FIGMA_SYNC.md for plugin + n8n workflow"
```

### Task 7: Update CLAUDE.md and CHANGELOG.md

**Files:**
- Modify: `CLAUDE.md`
- Modify: `CHANGELOG.md`

**Step 1: Add new commands and architecture to CLAUDE.md**

Add `npm run build:plugin` to the Commands section. Add `figma-plugin/` and `n8n/` to the Architecture section. Add `lib/` for the format converters.

**Step 2: Update CHANGELOG.md**

Add a new minor version entry documenting the token guide generator, format translation library, Figma plugin, and n8n workflow configs.

**Step 3: Commit**

```bash
git add CLAUDE.md CHANGELOG.md
git commit -m "docs: update project docs for Figma sync system"
```

---

## Execution Order

```
Phase 1: Token Guide (Task 1)           — immediately useful, no external deps
Phase 2: Format Translation (Tasks 2-3) — pure functions, fully testable
Phase 3: Figma Plugin (Task 4)          — depends on Phase 2 format knowledge
Phase 4: n8n Workflows (Task 5)         — depends on Phase 2 converters
Phase 5: Documentation (Tasks 6-7)      — final polish
```

Each phase builds on the previous one. Every task ends with a commit. Tests run before commits in Phase 2.
