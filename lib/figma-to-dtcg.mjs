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
