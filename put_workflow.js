const https = require('https');

// Transform code - reads from $node references (nodes run in series before this)
const transformCode = [
  '// Decode token files from GitHub base64 responses',
  'const color = JSON.parse(Buffer.from($node["Fetch color.json"].json.content, "base64").toString());',
  'const typography = JSON.parse(Buffer.from($node["Fetch typography.json"].json.content, "base64").toString());',
  'const spacing = JSON.parse(Buffer.from($node["Fetch spacing.json"].json.content, "base64").toString());',
  '',
  'function hexRgb(hex) {',
  '  const h = hex.replace("#", "");',
  '  const r = Math.round(parseInt(h.slice(0,2),16)/255*1000)/1000;',
  '  const g = Math.round(parseInt(h.slice(2,4),16)/255*1000)/1000;',
  '  const b = Math.round(parseInt(h.slice(4,6),16)/255*1000)/1000;',
  '  return { r: r, g: g, b: b, a: 1 };',
  '}',
  '',
  'function remPx(v) { return parseFloat(v) * 16; }',
  '',
  'function collect(obj, prefix) {',
  '  if (!prefix) prefix = "";',
  '  var out = [];',
  '  var keys = Object.keys(obj);',
  '  for (var i = 0; i < keys.length; i++) {',
  '    var key = keys[i];',
  '    var val = obj[key];',
  '    var path = prefix ? prefix + "/" + key : key;',
  '    if (val && typeof val === "object" && "$value" in val) {',
  '      out.push({ path: path, value: val["$value"], type: val["$type"], desc: val["$description"] || "" });',
  '    } else if (val && typeof val === "object" && key[0] !== "$") {',
  '      var sub = collect(val, path);',
  '      for (var j = 0; j < sub.length; j++) out.push(sub[j]);',
  '    }',
  '  }',
  '  return out;',
  '}',
  '',
  'var colorTokens = collect(color);',
  'var spacingTokens = collect(spacing);',
  '',
  'var collections = [',
  '  {',
  '    name: "Brand",',
  '    variables: colorTokens.map(function(t) {',
  '      return { name: t.path, type: "COLOR", value: hexRgb(t.value), description: t.desc };',
  '    })',
  '  },',
  '  {',
  '    name: "Spacing",',
  '    variables: spacingTokens.map(function(t) {',
  '      return { name: t.path, type: "FLOAT", value: remPx(t.value), description: t.desc };',
  '    })',
  '  }',
  '];',
  '',
  'var typoTokens = collect(typography);',
  'var lookup = {};',
  'for (var i = 0; i < typoTokens.length; i++) {',
  "  lookup[typoTokens[i].path.replace(/\\//g, '.')] = typoTokens[i].value;",
  '}',
  '',
  'function resolve(val) {',
  '  if (typeof val !== "string") return val;',
  "  var m = val.match(/^\\{(.+)\\}$/);",
  '  if (m) return lookup[m[1]] || val;',
  '  return val;',
  '}',
  '',
  'var textStyles = [];',
  'var styleKeys = Object.keys(typography.textStyle || {});',
  'for (var i = 0; i < styleKeys.length; i++) {',
  '  var name = styleKeys[i];',
  '  var s = typography.textStyle[name];',
  "  var ff = s.fontFamily ? resolve(s.fontFamily['$value']).replace(/'/g, '').split(',')[0].trim() : '';",
  "  var fw = s.fontWeight ? Number(resolve(s.fontWeight['$value'])) : 400;",
  "  var tt = s.textTransform ? resolve(s.textTransform['$value']) : '';",
  "  var desc = s['$description'] || '';",
  '  textStyles.push({',
  '    name: "Text Styles/" + name,',
  '    fontFamily: ff,',
  '    fontWeight: fw,',
  '    description: tt ? desc + " | textTransform: " + tt : desc',
  '  });',
  '}',
  '',
  'return [{ json: { collections: collections, textStyles: textStyles } }];'
].join('\n');

// GitHub HTTP Request node parameters factory
function ghHttpNode(name, id, file, posX, posY) {
  return {
    parameters: {
      url: 'https://api.github.com/repos/orishavitas/compulocks-brand-system/contents/tokens/' + file + '?ref=master',
      sendHeaders: true,
      headerParameters: {
        parameters: [
          { name: 'Authorization', value: 'Bearer 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' },
          { name: 'Accept', value: 'application/vnd.github.v3+json' },
          { name: 'User-Agent', value: 'n8n-compulocks' }
        ]
      },
      options: {}
    },
    name: name,
    type: 'n8n-nodes-base.httpRequest',
    typeVersion: 3,
    position: [posX, posY],
    id: id
  };
}

const workflow = {
  name: "Compulocks: Code \u2192 Figma Token Sync",
  nodes: [
    {
      parameters: { httpMethod: "POST", path: "github-push", options: {} },
      name: "GitHub Push Webhook",
      type: "n8n-nodes-base.webhook",
      typeVersion: 1,
      position: [688, 304],
      id: "8e2a88de-04b5-439f-b211-d43efdea481a",
      webhookId: "26944eb4-2c94-4b1c-a924-ba932dc5c5e9"
    },
    {
      parameters: {
        conditions: {
          string: [{
            value1: "={{ JSON.stringify($json.body.commits) }}",
            operation: "contains",
            value2: "tokens/"
          }]
        }
      },
      name: "Filter Token Changes",
      type: "n8n-nodes-base.if",
      typeVersion: 1,
      position: [912, 192],
      id: "4e5ec1e5-0d86-42d2-8019-9fe9937ad135"
    },
    // 3 HTTP Request nodes in series
    ghHttpNode("Fetch color.json",      "d6a2a2f7-3d55-4226-a35c-0cf703505eb6", "color.json",      1120, 304),
    ghHttpNode("Fetch typography.json", "1a0e3aca-5355-43c6-8e26-61a1ae5badeb", "typography.json", 1344, 304),
    ghHttpNode("Fetch spacing.json",    "a6d789f3-dc3a-4af2-a666-e35a44d55214", "spacing.json",    1568, 304),
    // Transform reads from all 3 via $node references
    {
      parameters: { jsCode: transformCode },
      name: "Transform DTCG to Figma",
      type: "n8n-nodes-base.code",
      typeVersion: 1,
      position: [1792, 304],
      id: "e6ffd90f-b2b9-4953-afaa-47b70c00d5e3"
    },
    {
      parameters: { jsCode: "const staticData = $getWorkflowStaticData('global');\nstaticData.latestTokens = $input.first().json;\nreturn $input.all();" },
      name: "Store for Pull",
      type: "n8n-nodes-base.code",
      typeVersion: 1,
      position: [2016, 304],
      id: "7a038df9-f1a8-466c-ba75-5cdf011b0a05"
    },
    {
      parameters: { path: "pull", responseMode: "lastNode", responseData: "allEntries", options: {} },
      name: "Pull Webhook",
      type: "n8n-nodes-base.webhook",
      typeVersion: 1,
      position: [688, 480],
      id: "803cefc6-0763-4324-933f-39de2d438108",
      webhookId: "54dca2da-bb22-4589-9a7e-633e6301c621"
    },
    {
      parameters: { jsCode: "const staticData = $getWorkflowStaticData('global');\nreturn [{ json: staticData.latestTokens || { collections: [], textStyles: [] } }];" },
      name: "Return Stored Tokens",
      type: "n8n-nodes-base.code",
      typeVersion: 1,
      position: [912, 560],
      id: "63c81be6-0236-4a7b-8e8f-3c9c0de7461e"
    }
  ],
  // Serial connections: Filter(true) → color → typography → spacing → Transform → Store
  connections: {
    "GitHub Push Webhook": {
      main: [[{ node: "Filter Token Changes", type: "main", index: 0 }]]
    },
    "Filter Token Changes": {
      main: [
        [{ node: "Fetch color.json", type: "main", index: 0 }],
        []
      ]
    },
    "Fetch color.json": {
      main: [[{ node: "Fetch typography.json", type: "main", index: 0 }]]
    },
    "Fetch typography.json": {
      main: [[{ node: "Fetch spacing.json", type: "main", index: 0 }]]
    },
    "Fetch spacing.json": {
      main: [[{ node: "Transform DTCG to Figma", type: "main", index: 0 }]]
    },
    "Transform DTCG to Figma": {
      main: [[{ node: "Store for Pull", type: "main", index: 0 }]]
    },
    "Pull Webhook": {
      main: [[{ node: "Return Stored Tokens", type: "main", index: 0 }]]
    }
  },
  settings: {
    executionOrder: "v1"
  },
  staticData: null
};

const bodyStr = JSON.stringify(workflow);
console.log('Payload size:', bodyStr.length, 'bytes');
console.log('Nodes:', workflow.nodes.map(n => n.name));
console.log('Connections:', Object.keys(workflow.connections));
console.log('');
console.log('Sending PUT to n8n...');

const options = {
  hostname: 'orishavit84.app.n8n.cloud',
  path: '/api/v1/workflows/ZiELy9_nFZyX9TzDbIlWL',
  method: 'PUT',
  headers: {
    'X-N8N-API-KEY': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIwMzA3Mjk5MC1jN2UzLTQ5YTMtODc4YS0wMWU4MzhiOTRjOWEiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiZDkyMGY5NzktNTU4NS00NWQ5LWFhZTctZjEzMzBjN2UzODhjIiwiaWF0IjoxNzczNzgxODEwLCJleHAiOjE3NzYyODY4MDB9.VeFM3eYVD0kSXhyEfff1bJC7ii4ueqvzVoxbx4qjjVs',
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(bodyStr)
  }
};

const req = https.request(options, (res) => {
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    console.log('HTTP Status:', res.statusCode);
    try {
      const parsed = JSON.parse(data);
      if (res.statusCode === 200) {
        console.log('SUCCESS! Workflow updated.');
        console.log('Active:', parsed.active);
        console.log('Nodes:', (parsed.nodes || []).map(n => n.name));
        console.log('Connections:', Object.keys(parsed.connections || {}));
      } else {
        console.log('ERROR response:', JSON.stringify(parsed, null, 2).slice(0, 800));
      }
    } catch(e) {
      console.log('Raw response:', data.slice(0, 500));
    }
  });
});

req.on('error', (e) => { console.error('Request error:', e.message); });
req.write(bodyStr);
req.end();
