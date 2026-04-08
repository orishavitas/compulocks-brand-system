// Compulocks Token Sync — Figma Plugin Main Thread
// Handles reading/writing Figma Variables and Text Styles

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

    let a = h0, b = h1, c = h2, d = h3, e = h4;
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

// Available for client-side hash verification if needed in future. Manifest hash is trusted from component-manifest.json.

figma.showUI(__html__, { width: 320, height: 360 });

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

async function applyVariables(data: PullData) {
  let count = 0;

  if (!data || !data.collections) throw new Error('No collections in pull response');

  for (const collection of data.collections) {
    const existingCollections = figma.variables.getLocalVariableCollections();
    let varCollection = existingCollections.find(c => c.name === collection.name);
    if (!varCollection) {
      varCollection = figma.variables.createVariableCollection(collection.name);
    }
    const modeId = varCollection.modes[0].modeId;

    for (const v of collection.variables) {
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

      const value = v.valuesByMode[modeId];
      variables.push({
        name: v.name,
        type: v.resolvedType as 'COLOR' | 'FLOAT',
        value: value as FigmaColorValue | number,
        description: v.description
      });
    }

    collections.push({ name: vc.name, variables });
  }

  const textStyles: FigmaTextStyle[] = figma.getLocalTextStyles().map(s => ({
    name: s.name,
    fontFamily: s.fontName.family,
    fontWeight: 400,
    description: s.description
  }));

  return { collections, textStyles };
}

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

async function buildStyleGuidePage(page: PageNode): Promise<void> {
  await figma.loadFontAsync({ family: 'Inter', style: 'Regular' });

  // Remove existing style guide frames we own (tagged with non-empty styleGuideSection)
  for (const node of [...page.children]) {
    if (node.getPluginData('styleGuideSection') !== '') node.remove();
  }

  let yOffset = 0;
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
    // Use valuesByMode to read the variable value (avoids resolveForConsumer typings issue)
    const value = v.valuesByMode[Object.keys(v.valuesByMode)[0]];
    const rgba = value as RGBA;

    const swatch = figma.createFrame();
    swatch.name = v.name;
    swatch.resize(80, 80);
    swatch.fills = [{ type: 'SOLID', color: { r: rgba.r, g: rgba.g, b: rgba.b }, opacity: rgba.a }];
    (swatch as FrameNode).cornerRadius = 6;

    const label = figma.createText();
    label.fontName = { family: 'Inter', style: 'Regular' };
    label.characters = v.name;
    label.fontSize = 8;
    label.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }];
    label.x = 4;
    label.y = 60;
    swatch.appendChild(label);

    colorFrame.appendChild(swatch);
  }

  page.appendChild(colorFrame);
  colorFrame.x = 0;
  colorFrame.y = yOffset;
  yOffset += colorFrame.height + GAP;

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
  typoFrame.x = 0;
  typoFrame.y = yOffset;
  yOffset += typoFrame.height + GAP;

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
    // Use valuesByMode to read the variable value (avoids resolveForConsumer typings issue)
    const value = v.valuesByMode[Object.keys(v.valuesByMode)[0]];
    const px = value as number;
    const bar = figma.createFrame();
    bar.name = v.name;
    bar.resize(Math.max(4, px), Math.max(4, px));
    bar.fills = [{ type: 'SOLID', color: { r: 0.11, g: 0.63, b: 0.49 } }];

    const barLabel = figma.createText();
    barLabel.fontName = { family: 'Inter', style: 'Regular' };
    barLabel.characters = v.name;
    barLabel.fontSize = 8;
    barLabel.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }];
    barLabel.x = 2;
    barLabel.y = 2;
    bar.appendChild(barLabel);

    spacingFrame.appendChild(bar);
  }

  page.appendChild(spacingFrame);
  spacingFrame.x = 0;
  spacingFrame.y = yOffset;
}

async function buildComponentsPage(page: PageNode, manifest: ComponentManifest, force = false): Promise<SyncResult> {
  const result: SyncResult = { created: 0, updated: 0, skipped: 0 };
  let xCursor = 0;
  const COL_GAP = 60;

  await figma.loadFontAsync({ family: 'Inter', style: 'Regular' });

  for (const component of manifest.components) {
    const existing = page.children.find(
      (n): n is ComponentSetNode =>
        n.type === 'COMPONENT_SET' && n.name === component.name
    );

    if (existing) {
      const storedHash = existing.getPluginData('manifestHash');
      if (!force && storedHash === component.hash) {
        result.skipped++;
        xCursor += existing.width + COL_GAP;
        continue;
      }
      existing.remove();
    }

    const childNodes: ComponentNode[] = [];
    const variantList = component.variants.length > 0 ? component.variants : ['default'];
    const stateList = component.states.length > 0 ? component.states : ['default'];

    for (const variant of variantList) {
      for (const state of stateList) {
        const node = figma.createComponent();
        node.name = `variant=${variant}, state=${state}`;
        node.resize(160, 48);
        node.fills = [{ type: 'SOLID', color: { r: 0.11, g: 0.13, b: 0.29 } }];

        const label = figma.createText();
        label.fontName = { family: 'Inter', style: 'Regular' };
        label.characters = `${component.name} / ${variant} / ${state}`;
        label.fontSize = 10;
        label.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }];
        label.x = 8;
        label.y = 16;
        node.appendChild(label);

        // Must be a child of the target page before combineAsVariants
        page.appendChild(node);
        childNodes.push(node);
      }
    }

    const componentSet = figma.combineAsVariants(childNodes, page as any);
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

  if (msg.type === 'sync-components') {
    try {
      const manifest = msg.manifest as ComponentManifest;
      const mode: string = msg.mode ?? 'all';

      if (!manifest || !Array.isArray(manifest.components)) {
        throw new Error('Invalid manifest: missing components array');
      }

      const result: SyncResult = { created: 0, updated: 0, skipped: 0 };

      if (mode === 'style-guide' || mode === 'all') {
        const styleGuidePage = ensurePage('🎨 Style Guide');
        figma.currentPage = styleGuidePage;
        await buildStyleGuidePage(styleGuidePage);
      }

      if (mode === 'components' || mode === 'all') {
        const componentsPage = ensurePage('🧩 Components');
        figma.currentPage = componentsPage;
        const syncResult = await buildComponentsPage(componentsPage, manifest, true);
        result.created += syncResult.created;
        result.updated += syncResult.updated;
        result.skipped += syncResult.skipped;
      }

      figma.ui.postMessage({
        type: 'sync-complete',
        created: result.created,
        updated: result.updated,
        skipped: result.skipped
      });
    } catch (err: any) {
      figma.ui.postMessage({ type: 'sync-error', message: err.message });
    }
  }
};
