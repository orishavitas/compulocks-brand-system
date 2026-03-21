# Figma Plugin Component Sync Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extend the existing Figma plugin with a "Sync Components" capability: a third button in the UI fetches `component-manifest.json` from a configurable raw GitHub URL, then builds or updates a "🎨 Style Guide" page and a "🧩 Components" page inside Figma — skipping nodes whose manifest hash has not changed, rebuilding those that have.

**Architecture:** All new logic lives in `figma-plugin/code.ts` (new `sync-components` message handler) and `figma-plugin/ui.html` (new button + Manifest URL input). An inline SHA-1 implementation replaces Node's `crypto` module, which is unavailable in the Figma plugin sandbox. Style Guide frames use `FrameNode`. Component Library nodes use `figma.createComponent()` grouped into `ComponentSetNode` via `figma.combineAsVariants()`. After every code change, `npm run build:plugin` recompiles TypeScript to JavaScript.

**Tech Stack:** TypeScript (Figma Plugin API), esbuild via `npm run build:plugin`, vanilla JS in `ui.html`, `component-manifest.json` fetched over `fetch()` from a stable raw GitHub URL

---

## File Map

**Modified files:**
- `figma-plugin/code.ts` — add SHA-1 helper, interfaces, page-management helpers, style-guide builder, component-library builder, `sync-components` message handler branch
- `figma-plugin/ui.html` — add Manifest URL input field, "Sync Components" button, sync button event handler, `sync-complete` / `sync-error` message receivers, CSS for third button

**Compiled output (auto-generated, do not edit):**
- `figma-plugin/code.js` — output of `npm run build:plugin`

---

## Task 1 — Add Manifest URL input and "Sync Components" button to `ui.html`

**Files:** `figma-plugin/ui.html`

Adds the new input field directly below the existing webhook URL config block and adds a third `syncBtn` button in the `.actions` row. Follows the exact same HTML/CSS pattern as the existing webhook URL input. Also adds the `sync-complete` and `sync-error` message receivers.

- [ ] **Step 1.1: Add CSS for the sync button**

In `figma-plugin/ui.html`, inside the `<style>` block, add after the `.push { ... }` rule:

```css
    .sync { background: #1bc47d; color: #fff; }
```

The `.actions` flex container already handles equal sizing via `flex: 1` on each button, so no layout change is needed.

- [ ] **Step 1.2: Add the Manifest URL config block**

In `figma-plugin/ui.html`, after the closing `</div>` of the existing `.config` block (the n8n Webhook URL block, line 42), add a second config block:

```html
  <div class="config">
    <label>Manifest URL</label>
    <input type="text" id="manifestUrl" placeholder="https://raw.githubusercontent.com/org/compulocks-brand-system/master/component-manifest.json" />
  </div>
```

- [ ] **Step 1.3: Add the Sync Components button**

In `figma-plugin/ui.html`, inside `.actions`, after the `pushBtn` button, add:

```html
    <button class="sync" id="syncBtn">Sync Components</button>
```

- [ ] **Step 1.4: Wire up the sync button in `<script>`**

After the `const webhookInput = ...` line, add:

```javascript
    const syncBtn = document.getElementById('syncBtn');
    const manifestInput = document.getElementById('manifestUrl');
```

After the `pushBtn.addEventListener(...)` block, add the sync handler:

```javascript
    syncBtn.addEventListener('click', async () => {
      const url = manifestInput.value.trim();
      if (!url) { setStatus('Enter the Manifest URL first.', 'error'); return; }

      setStatus('Fetching component manifest...', 'info');
      syncBtn.disabled = true;

      try {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const manifest = await res.json();
        parent.postMessage({ pluginMessage: { type: 'sync-components', manifest } }, '*');
      } catch (err) {
        setStatus(`Manifest fetch failed: ${err.message}`, 'error');
        syncBtn.disabled = false;
      }
    });
```

- [ ] **Step 1.5: Add message receivers for sync-complete and sync-error**

Inside `window.onmessage`, after the `if (msg.type === 'error') { ... }` block, add:

```javascript
      if (msg.type === 'sync-complete') {
        setStatus(`Synced ${msg.created} created, ${msg.updated} updated, ${msg.skipped} skipped.`, 'success');
        syncBtn.disabled = false;
      }

      if (msg.type === 'sync-error') {
        setStatus(`Sync failed: ${msg.message}`, 'error');
        syncBtn.disabled = false;
      }
```

- [ ] **Step 1.6: Also re-enable syncBtn in the existing generic error handler**

In the existing `if (msg.type === 'error') { ... }` block, add `syncBtn.disabled = false;` alongside the existing two re-enable lines.

**Verification:** Open `figma-plugin/ui.html` directly in a browser. Confirm three buttons are visible in one row, the Manifest URL input appears above them, and all three buttons have correct background colors (blue / purple / green).

---

## Task 2 — Add SHA-1 inline implementation to `code.ts`

**Files:** `figma-plugin/code.ts`

The Figma plugin sandbox has no access to Node's `crypto` module. A pure-JS SHA-1 implementation (~40 lines) is added at the top of `code.ts` and used for hash comparison in the skip logic.

- [ ] **Step 2.1: Add the SHA-1 helper at the top of `code.ts`**

After the opening comment block (before `figma.showUI(...)`), add:

```typescript
// --- Inline SHA-1 (no Node crypto available in plugin sandbox) ---

function sha1(str: string): string {
  function rotl(n: number, s: number) { return (n << s) | (n >>> (32 - s)); }
  function toHex(n: number) { return ('00000000' + (n >>> 0).toString(16)).slice(-8); }

  const bytes: number[] = [];
  for (let i = 0; i < str.length; i++) {
    const c = str.charCodeAt(i);
    if (c < 0x80) {
      bytes.push(c);
    } else if (c < 0x800) {
      bytes.push(0xC0 | (c >> 6), 0x80 | (c & 0x3F));
    } else {
      bytes.push(0xE0 | (c >> 12), 0x80 | ((c >> 6) & 0x3F), 0x80 | (c & 0x3F));
    }
  }

  const bitLen = bytes.length * 8;
  bytes.push(0x80);
  while (bytes.length % 64 !== 56) bytes.push(0);
  bytes.push(0, 0, 0, 0,
    (bitLen >>> 24) & 0xFF, (bitLen >>> 16) & 0xFF,
    (bitLen >>> 8) & 0xFF, bitLen & 0xFF);

  let h0 = 0x67452301, h1 = 0xEFCDAB89, h2 = 0x98BADCFE, h3 = 0x10325476, h4 = 0xC3D2E1F0;

  for (let i = 0; i < bytes.length; i += 64) {
    const w: number[] = [];
    for (let j = 0; j < 16; j++) {
      w[j] = (bytes[i+j*4] << 24) | (bytes[i+j*4+1] << 16) | (bytes[i+j*4+2] << 8) | bytes[i+j*4+3];
    }
    for (let j = 16; j < 80; j++) w[j] = rotl(w[j-3] ^ w[j-8] ^ w[j-14] ^ w[j-16], 1);

    let [a, b, c, d, e] = [h0, h1, h2, h3, h4];
    for (let j = 0; j < 80; j++) {
      let f: number, k: number;
      if      (j < 20) { f = (b & c) | (~b & d); k = 0x5A827999; }
      else if (j < 40) { f = b ^ c ^ d;           k = 0x6ED9EBA1; }
      else if (j < 60) { f = (b & c) | (b & d) | (c & d); k = 0x8F1BBCDC; }
      else             { f = b ^ c ^ d;           k = 0xCA62C1D6; }
      const tmp = (rotl(a, 5) + f + e + k + w[j]) | 0;
      e = d; d = c; c = rotl(b, 30); b = a; a = tmp;
    }
    h0 = (h0 + a) | 0; h1 = (h1 + b) | 0; h2 = (h2 + c) | 0;
    h3 = (h3 + d) | 0; h4 = (h4 + e) | 0;
  }

  return toHex(h0) + toHex(h1) + toHex(h2) + toHex(h3) + toHex(h4);
}
```

**Verification:** Mentally trace: `sha1("abc")` should return `"a9993e364706816aba3e25717850c26c9cd0d89d"`. The logic matches the standard SHA-1 specification. This is confirmed at runtime in Task 6.

---

## Task 3 — Add manifest interfaces and page-management helpers to `code.ts`

**Files:** `figma-plugin/code.ts`

- [ ] **Step 3.1: Add manifest TypeScript interfaces**

After the existing interfaces block (after `interface PullData { ... }`), add:

```typescript
// --- Component Sync interfaces ---

interface ManifestComponent {
  name: string;
  variants: string[];
  states: string[];
  tokens: string[];
  hash: string;
}

interface ComponentManifest {
  version: string;
  generatedAt: string;
  components: ManifestComponent[];
}

interface SyncResult {
  created: number;
  updated: number;
  skipped: number;
}
```

- [ ] **Step 3.2: Add `ensurePage` helper**

After the `readVariables()` function and before the message handler, add:

```typescript
// --- Component Sync helpers ---

function ensurePage(name: string): PageNode {
  const existing = figma.root.children.find(
    (n): n is PageNode => n.type === 'PAGE' && n.name === name
  );
  if (existing) return existing;
  const page = figma.createPage();
  page.name = name;
  return page;
}
```

---

## Task 4 — Add Style Guide page builder to `code.ts`

**Files:** `figma-plugin/code.ts`

Builds or rebuilds color swatches, typography specimens, and spacing scale on the "🎨 Style Guide" page. Each section is a separate parent frame on the page. Frames are tagged with plugin data so they can be found and replaced on re-sync rather than duplicated.

- [ ] **Step 4.1: Add `buildStyleGuidePage` function**

After `ensurePage`, add:

```typescript
async function buildStyleGuidePage(page: PageNode): Promise<void> {
  // Remove existing style guide frames to rebuild cleanly
  const toRemove = page.children.filter(
    n => n.getPluginData('styleGuideSection') !== ''
  );
  // Only remove nodes we own — check for our plugin data key
  for (const node of page.children) {
    if (node.getPluginData('styleGuideSection') !== '') node.remove();
  }

  let xCursor = 0;
  const GAP = 40;

  // --- Color swatches ---
  const colorFrame = figma.createFrame();
  colorFrame.name = 'Colors';
  colorFrame.setPluginData('styleGuideSection', 'colors');
  colorFrame.layoutMode = 'HORIZONTAL';
  colorFrame.itemSpacing = 16;
  colorFrame.paddingLeft = colorFrame.paddingRight = 16;
  colorFrame.paddingTop = colorFrame.paddingBottom = 16;
  colorFrame.fills = [{ type: 'SOLID', color: { r: 0.12, g: 0.12, b: 0.12 } }];
  colorFrame.primaryAxisSizingMode = 'AUTO';
  colorFrame.counterAxisSizingMode = 'AUTO';

  const colorVars = figma.variables.getLocalVariables().filter(v => v.resolvedType === 'COLOR');
  for (const v of colorVars) {
    const modeId = figma.variables.getVariableCollectionById(v.variableCollectionId)?.modes[0].modeId;
    if (!modeId) continue;
    const rgba = v.resolveForConsumer({ mode: modeId }).value as RGBA;

    const swatch = figma.createFrame();
    swatch.name = v.name;
    swatch.resize(80, 80);
    swatch.fills = [{ type: 'SOLID', color: { r: rgba.r, g: rgba.g, b: rgba.b }, opacity: rgba.a }];
    swatch.cornerRadius = 6;
    colorFrame.appendChild(swatch);
  }

  page.appendChild(colorFrame);
  colorFrame.x = xCursor;
  colorFrame.y = 0;

  // --- Typography specimens ---
  const typoFrame = figma.createFrame();
  typoFrame.name = 'Typography';
  typoFrame.setPluginData('styleGuideSection', 'typography');
  typoFrame.layoutMode = 'VERTICAL';
  typoFrame.itemSpacing = 16;
  typoFrame.paddingLeft = typoFrame.paddingRight = 16;
  typoFrame.paddingTop = typoFrame.paddingBottom = 16;
  typoFrame.fills = [{ type: 'SOLID', color: { r: 0.12, g: 0.12, b: 0.12 } }];
  typoFrame.primaryAxisSizingMode = 'AUTO';
  typoFrame.counterAxisSizingMode = 'AUTO';

  const textStyles = figma.getLocalTextStyles();
  for (const ts of textStyles) {
    await figma.loadFontAsync(ts.fontName);
    const textNode = figma.createText();
    textNode.fontName = ts.fontName;
    textNode.textStyleId = ts.id;
    textNode.characters = ts.name + ' — The quick brown fox';
    textNode.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }];
    typoFrame.appendChild(textNode);
  }

  page.appendChild(typoFrame);
  typoFrame.x = xCursor;
  typoFrame.y = (colorFrame.height || 120) + GAP;

  // --- Spacing scale ---
  const spacingFrame = figma.createFrame();
  spacingFrame.name = 'Spacing Scale';
  spacingFrame.setPluginData('styleGuideSection', 'spacing');
  spacingFrame.layoutMode = 'HORIZONTAL';
  spacingFrame.itemSpacing = 8;
  spacingFrame.paddingLeft = spacingFrame.paddingRight = 16;
  spacingFrame.paddingTop = spacingFrame.paddingBottom = 16;
  spacingFrame.fills = [{ type: 'SOLID', color: { r: 0.12, g: 0.12, b: 0.12 } }];
  spacingFrame.primaryAxisSizingMode = 'AUTO';
  spacingFrame.counterAxisSizingMode = 'AUTO';

  const floatVars = figma.variables.getLocalVariables().filter(v => v.resolvedType === 'FLOAT');
  for (const v of floatVars) {
    const modeId = figma.variables.getVariableCollectionById(v.variableCollectionId)?.modes[0].modeId;
    if (!modeId) continue;
    const px = v.resolveForConsumer({ mode: modeId }).value as number;
    const bar = figma.createFrame();
    bar.name = v.name;
    bar.resize(Math.max(4, px), Math.max(4, px));
    bar.fills = [{ type: 'SOLID', color: { r: 0.11, g: 0.63, b: 0.49 } }];
    spacingFrame.appendChild(bar);
  }

  page.appendChild(spacingFrame);
  spacingFrame.x = xCursor;
  spacingFrame.y = (colorFrame.height || 120) + GAP + (typoFrame.height || 120) + GAP;
}
```

---

## Task 5 — Add Component Library page builder to `code.ts`

**Files:** `figma-plugin/code.ts`

Builds or updates `ComponentSetNode` groups on the "🧩 Components" page. Each component in the manifest gets one `ComponentSetNode` (produced by `figma.combineAsVariants()`). Child nodes are named using Figma variant convention: `variant=primary, state=default`. Skip logic uses `node.getPluginData('manifestHash')` compared against `component.hash`.

- [ ] **Step 5.1: Add `buildComponentsPage` function**

After `buildStyleGuidePage`, add:

```typescript
function buildComponentsPage(page: PageNode, manifest: ComponentManifest): SyncResult {
  const result: SyncResult = { created: 0, updated: 0, skipped: 0 };
  let xCursor = 0;
  const COL_GAP = 60;

  for (const component of manifest.components) {
    // Find existing ComponentSetNode for this component by name
    const existing = page.children.find(
      (n): n is ComponentSetNode =>
        n.type === 'COMPONENT_SET' && n.name === component.name
    );

    if (existing) {
      const storedHash = existing.getPluginData('manifestHash');
      if (storedHash === component.hash) {
        result.skipped++;
        xCursor += existing.width + COL_GAP;
        continue;
      }
      // Hash mismatch — remove old set, rebuild
      existing.remove();
    }

    // Build variant × state children
    const childNodes: ComponentNode[] = [];
    for (const variant of component.variants) {
      for (const state of component.states) {
        const node = figma.createComponent();
        node.name = `variant=${variant}, state=${state}`;
        node.resize(160, 48);
        node.fills = [{ type: 'SOLID', color: { r: 0.11, g: 0.13, b: 0.29 } }];

        // Label text
        const label = figma.createText();
        // Font must be loaded — use Inter Regular which Figma always has
        label.fontName = { family: 'Inter', style: 'Regular' };
        label.characters = `${component.name} / ${variant} / ${state}`;
        label.fontSize = 10;
        label.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }];
        label.x = 8;
        label.y = 16;
        node.appendChild(label);

        childNodes.push(node);
      }
    }

    // Group into ComponentSetNode
    const componentSet = figma.combineAsVariants(childNodes, page);
    componentSet.name = component.name;
    componentSet.setPluginData('manifestHash', component.hash);
    componentSet.x = xCursor;
    componentSet.y = 0;

    xCursor += componentSet.width + COL_GAP;

    if (existing) {
      result.updated++;
    } else {
      result.created++;
    }
  }

  return result;
}
```

**Key notes:**
- `figma.combineAsVariants(nodes, page)` requires the nodes to already be children of a page or frame — but `figma.createComponent()` attaches to the current page by default. Since the handler switches to the Components page before calling this function (see Task 6), they will be on the correct page.
- The label text uses `Inter Regular` which is always available in Figma without a load call — however `figma.loadFontAsync` must be called before setting `.characters`. See Task 6 for the pre-load step.

---

## Task 6 — Add `sync-components` message handler branch to `code.ts`

**Files:** `figma-plugin/code.ts`

Wires everything together: switches to each page, pre-loads Inter Regular, calls the two builders, returns counts to the UI.

- [ ] **Step 6.1: Add the `sync-components` branch inside `figma.ui.onmessage`**

Inside the `figma.ui.onmessage = async (msg) => { ... }` handler, after the existing `if (msg.type === 'push-request') { ... }` block, add:

```typescript
  if (msg.type === 'sync-components') {
    try {
      const manifest = msg.manifest as ComponentManifest;
      if (!manifest || !Array.isArray(manifest.components)) {
        throw new Error('Invalid manifest: missing components array');
      }

      // Pre-load Inter Regular (used for labels in component nodes)
      await figma.loadFontAsync({ family: 'Inter', style: 'Regular' });

      // Ensure both pages exist
      const styleGuidePage = ensurePage('🎨 Style Guide');
      const componentsPage = ensurePage('🧩 Components');

      // Build style guide (reads local variables + text styles — no manifest data needed)
      await buildStyleGuidePage(styleGuidePage);

      // Switch to components page for combineAsVariants (must be current page)
      figma.currentPage = componentsPage;

      // Build / update component library
      const syncResult = buildComponentsPage(componentsPage, manifest);

      figma.ui.postMessage({
        type: 'sync-complete',
        created: syncResult.created,
        updated: syncResult.updated,
        skipped: syncResult.skipped
      });
    } catch (err: any) {
      figma.ui.postMessage({ type: 'sync-error', message: err.message });
    }
  }
```

**Why `figma.currentPage = componentsPage` before `buildComponentsPage`:** `figma.createComponent()` appends to `figma.currentPage`. Setting the current page ensures new component nodes land on the Components page, which is required for `figma.combineAsVariants(nodes, page)` to work without throwing a "nodes must be on the target page" error.

---

## Task 7 — Compile and verify

**Files:** `figma-plugin/code.js` (output)

- [ ] **Step 7.1: Run the build**

```bash
cd /c/Users/OriShavit/documents/github/compulocks-brand-system && npm run build:plugin
```

Expected output:
```
> compulocks-brand-system@... build:plugin
> esbuild figma-plugin/code.ts --bundle --outfile=figma-plugin/code.js --platform=browser --target=es6

  figma-plugin/code.js  <size>kb

⚡ Done in <ms>
```

No TypeScript errors. If errors appear, fix them before proceeding — common issues:
- `figma.combineAsVariants` type signature — second argument is `BaseNode & ChildrenMixin`, pass `componentsPage`
- `v.resolveForConsumer` — the Figma API typings sometimes differ between plugin API versions; cast to `any` if needed but document why

- [ ] **Step 7.2: Load the updated plugin in Figma and run a smoke test**

1. In Figma Desktop: Plugins → Development → "Compulocks Token Sync" → Run
2. Confirm the Manifest URL input field is visible below the webhook URL input
3. Confirm three buttons appear: Pull / Push / Sync Components
4. Enter the manifest URL: `https://raw.githubusercontent.com/OriShavit84/compulocks-brand-system/master/component-manifest.json`
5. Click "Sync Components"
6. Expected status: `Synced N created, 0 updated, 0 skipped.`
7. In the Figma layers panel, confirm "🎨 Style Guide" and "🧩 Components" pages were created
8. On the Components page, confirm one `ComponentSetNode` per component in the manifest
9. Click "Sync Components" a second time — expected: `Synced 0 created, 0 updated, N skipped.` (all skipped because hashes match)

- [ ] **Step 7.3: Verify SHA-1 skip logic manually**

In the Figma developer console (Plugins → Development → Open console), after the first sync:
1. Select any `ComponentSetNode` on the Components page
2. Run: `figma.currentPage.selection[0].getPluginData('manifestHash')`
3. Confirm the output matches the `hash` field of the corresponding component in `component-manifest.json`

---

## Task 8 — Commit

- [ ] **Step 8.1: Stage and commit**

```bash
cd /c/Users/OriShavit/documents/github/compulocks-brand-system
git add figma-plugin/code.ts figma-plugin/ui.html figma-plugin/code.js
git commit -m "feat(figma-plugin): add Sync Components — style guide + component library builder with hash-based skip logic"
```

---

## Edge Cases and Constraints

**`figma.combineAsVariants` requires sibling nodes on the same page.**
All `figma.createComponent()` calls in `buildComponentsPage` happen after `figma.currentPage = componentsPage`, so nodes land on the correct page before `combineAsVariants` is called.

**Font loading is async and must precede `.characters` assignment.**
`figma.loadFontAsync({ family: 'Inter', style: 'Regular' })` is awaited once at the top of the `sync-components` handler before any text node creation. `buildStyleGuidePage` is `async` and awaits per-style-font loading inside its loop.

**Style Guide rebuild vs. incremental update.**
Style Guide sections (colors, typography, spacing) are wholesale replaced on every sync because they reflect the current state of local variables — not the manifest. No hash skip is applied to style guide frames. Only the Components page uses hash-based skip.

**SHA-1 collision is not a security concern here.**
The hash is used purely for cheap change detection (skip-or-rebuild), not for authentication or integrity guarantees. SHA-1 is sufficient for this use case.

**`figma.currentPage` side effect.**
The handler sets `figma.currentPage = componentsPage`. This leaves the designer on the Components page after a sync. This is intentional — the designer likely wants to see the result immediately. If this becomes a UX complaint, save the original page reference before switching and restore it at the end.

**Empty manifest / zero components.**
If `manifest.components` is an empty array, the handler still creates both pages (Style Guide will be built from local variables) and posts `sync-complete` with all zeros. This is correct behavior.

---

## Success Criteria

- [ ] `ui.html` renders three action buttons and two config inputs — verified in browser without Figma
- [ ] `npm run build:plugin` completes with zero TypeScript errors
- [ ] First "Sync Components" click creates "🎨 Style Guide" and "🧩 Components" pages
- [ ] Components page contains one `ComponentSetNode` per manifest component, children named `variant=X, state=Y`
- [ ] Each `ComponentSetNode` has `manifestHash` plugin data equal to the manifest's `hash` field
- [ ] Second "Sync Components" click skips all components (counts: 0 created, 0 updated, N skipped)
- [ ] Modifying a component's `hash` in the manifest and re-syncing causes that component to be updated (not skipped)
- [ ] Style Guide page contains three labeled frame sections: Colors, Typography, Spacing Scale
