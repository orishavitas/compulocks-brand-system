#!/usr/bin/env node
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, '..');
const COMPONENTS_DIR = join(REPO_ROOT, 'components');
const OUTPUT_PATH = join(REPO_ROOT, 'component-manifest.json');
const DRY_RUN = process.argv.includes('--dry-run');

export function extractTitle(source) {
  const m = source.match(/title\s*:\s*['"`]([^'"`]+)['"`]/);
  return m ? m[1] : null;
}
export function extractNamedExports(source) {
  const matches = [...source.matchAll(/^export\s+const\s+(\w+)\s*:/gm)];
  return matches.map(m => m[1]).filter(name => name !== 'default');
}
export function extractArgTypesKeys(source) {
  const start = source.indexOf('argTypes');
  if (start === -1) return [];
  let depth = 0, begin = -1;
  for (let i = start; i < source.length; i++) {
    if (source[i] === '{') { depth++; if (depth === 1) begin = i; }
    else if (source[i] === '}') {
      depth--;
      if (depth === 0) {
        const block = source.slice(begin + 1, i);
        const keys = [];
        let d = 0, key = '';
        for (let j = 0; j < block.length; j++) {
          const c = block[j];
          if (c === '{' || c === '[') d++;
          else if (c === '}' || c === ']') d--;
          else if (d === 0 && c === ':') { const k = key.trim(); if (k) keys.push(k); key = ''; continue; }
          else if (d === 0 && c !== ',') key += c;
        }
        return keys;
      }
    }
  }
  return [];
}
export function computeHash(name, variants, states) {
  const input = name + JSON.stringify([...variants].sort()) + JSON.stringify([...states].sort());
  return createHash('sha1').update(input).digest('hex');
}

function findStoryFiles(dir) {
  const results = [];
  let entries;
  try { entries = readdirSync(dir, { withFileTypes: true }); } catch { return results; }
  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) results.push(...findStoryFiles(fullPath));
    else if (entry.isFile() && entry.name.endsWith('.stories.tsx')) results.push(fullPath);
  }
  return results;
}

function inferTokens(source) {
  const varRefs = [...source.matchAll(/var\(--([a-z0-9-]+)\)/g)];
  return [...new Set(varRefs.map(m => m[1].replace(/-/g, '.')))];
}

const storyFiles = findStoryFiles(COMPONENTS_DIR);
if (storyFiles.length === 0) {
  console.warn('[export-manifest] Warning: no *.stories.tsx files found under components/');
}

const components = [];
for (const filePath of storyFiles) {
  const source = readFileSync(filePath, 'utf8');
  const fullTitle = extractTitle(source);
  if (!fullTitle) { console.warn(`[export-manifest] Skipping ${filePath} — no title found`); continue; }
  const name = fullTitle.split('/').at(-1).trim();
  const variants = extractNamedExports(source);
  const states = extractArgTypesKeys(source).filter(k => k !== 'variant');
  const tokens = inferTokens(source);
  const hash = computeHash(name, variants, states);
  components.push({ name, variants, states, tokens, hash });
}

components.sort((a, b) => a.name.localeCompare(b.name));
const manifest = { version: '1.0.0', generatedAt: new Date().toISOString(), components };
const json = JSON.stringify(manifest, null, 2);

if (DRY_RUN) {
  console.log(json);
} else {
  writeFileSync(OUTPUT_PATH, json + '\n', 'utf8');
  console.log(`[export-manifest] Written: ${OUTPUT_PATH}`);
  console.log(`[export-manifest] ${components.length} component(s): ${components.map(c => c.name).join(', ')}`);
}
