// Transform DTCG to Figma — Code node for n8n
//
// Architecture: runs AFTER Fetch color.json → Fetch typography.json → Fetch spacing.json
// (3 HTTP Request nodes in series). Reads their outputs via $node[] references.
//
// Filter condition fixed: $json.body.commits (not $json.commits) because
// n8n Webhook node nests POST body under .body

// Decode token files from GitHub base64 responses
const color = JSON.parse(Buffer.from($node["Fetch color.json"].json.content, "base64").toString());
const typography = JSON.parse(Buffer.from($node["Fetch typography.json"].json.content, "base64").toString());
const spacing = JSON.parse(Buffer.from($node["Fetch spacing.json"].json.content, "base64").toString());

function hexRgb(hex) {
  const h = hex.replace('#', '');
  const r = Math.round(parseInt(h.slice(0, 2), 16) / 255 * 1000) / 1000;
  const g = Math.round(parseInt(h.slice(2, 4), 16) / 255 * 1000) / 1000;
  const b = Math.round(parseInt(h.slice(4, 6), 16) / 255 * 1000) / 1000;
  return { r, g, b, a: 1 };
}

function remPx(v) { return parseFloat(v) * 16; }

function collect(obj, prefix) {
  if (!prefix) prefix = '';
  const out = [];
  for (const key of Object.keys(obj)) {
    const val = obj[key];
    const path = prefix ? prefix + '/' + key : key;
    if (val && typeof val === 'object' && '$value' in val) {
      out.push({ path, value: val['$value'], type: val['$type'], desc: val['$description'] || '' });
    } else if (val && typeof val === 'object' && key[0] !== '$') {
      const sub = collect(val, path);
      for (const s of sub) out.push(s);
    }
  }
  return out;
}

const colorTokens = collect(color);
const spacingTokens = collect(spacing);

const collections = [
  {
    name: 'Brand',
    variables: colorTokens.map(function(t) {
      return { name: t.path, type: 'COLOR', value: hexRgb(t.value), description: t.desc };
    })
  },
  {
    name: 'Spacing',
    variables: spacingTokens.map(function(t) {
      return { name: t.path, type: 'FLOAT', value: remPx(t.value), description: t.desc };
    })
  }
];

const typoTokens = collect(typography);
const lookup = {};
for (const t of typoTokens) {
  lookup[t.path.replace(/\//g, '.')] = t.value;
}

function resolve(val) {
  if (typeof val !== 'string') return val;
  const m = val.match(/^\{(.+)\}$/);
  if (m) return lookup[m[1]] || val;
  return val;
}

const textStyles = [];
const styles = typography.textStyle || {};
for (const name of Object.keys(styles)) {
  const s = styles[name];
  const ff = s.fontFamily ? resolve(s.fontFamily['$value']).replace(/'/g, '').split(',')[0].trim() : '';
  const fw = s.fontWeight ? Number(resolve(s.fontWeight['$value'])) : 400;
  const tt = s.textTransform ? resolve(s.textTransform['$value']) : '';
  const desc = s['$description'] || '';
  textStyles.push({
    name: 'Text Styles/' + name,
    fontFamily: ff,
    fontWeight: fw,
    description: tt ? desc + ' | textTransform: ' + tt : desc
  });
}

return [{ json: { collections, textStyles } }];
