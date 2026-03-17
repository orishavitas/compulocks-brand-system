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

  const textStyles: FigmaTextStyle[] = figma.getLocalTextStyles().map(s => ({
    name: s.name,
    fontFamily: s.fontName.family,
    fontWeight: 400,
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
