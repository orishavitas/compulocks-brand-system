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
