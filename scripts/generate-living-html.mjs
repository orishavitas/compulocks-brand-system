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

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function kebabFromFlatKey(key) {
  return key
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1-$2')
    .toLowerCase();
}

function tokenEntries(prefix) {
  return Object.entries(tokens)
    .filter(([key]) => key.startsWith(prefix))
    .map(([key, value]) => ({ key, name: kebabFromFlatKey(key), value }));
}

function cssVariables() {
  return Object.entries(tokens)
    .map(([key, value]) => `    --${kebabFromFlatKey(key)}: ${value};`)
    .join('\n');
}

function colorSwatch({ name, value }) {
  const safeName = escapeHtml(name);
  const safeValue = escapeHtml(value);
  const border = String(value).toLowerCase() === '#ffffff' ? ' border: 1px solid var(--color-outline-default);' : '';
  return `<div class="swatch-item">
    <div class="swatch-color" style="background:${safeValue};${border}"></div>
    <div class="swatch-name">--${safeName}</div>
    <div class="swatch-value">${safeValue}</div>
  </div>`;
}

function spacingBar({ name, value }) {
  const px = Number.parseFloat(String(value));
  const width = Number.isFinite(px) ? Math.max(px * 4, 8) : 24;
  return `<div class="spacing-row">
    <div class="spacing-label">--${escapeHtml(name)}</div>
    <div class="spacing-track"><div class="spacing-bar" style="width:${width}px"></div></div>
    <code>${escapeHtml(value)}</code>
  </div>`;
}

function typeScaleRow({ name, value }) {
  return `<div class="type-row">
    <div class="type-meta">--${escapeHtml(name)} <code>${escapeHtml(value)}</code></div>
    <div class="type-specimen" style="font-size:${escapeHtml(value)}">Compulocks</div>
  </div>`;
}

function componentSpecimen(comp) {
  const isDraft = comp.status !== 'stable';
  const variantPills = comp.variants.map(v => `<span class="variant-pill">${escapeHtml(v)}</span>`).join('');
  const draftBanner = isDraft
    ? `<div class="draft-banner">Draft component. Approve with <code>npm run approve ${escapeHtml(comp.name)}</code>.</div>`
    : '';

  return `<article class="component-card ${isDraft ? 'component-draft' : ''}">
    ${draftBanner}
    <div class="component-header">
      <span class="component-name">${escapeHtml(comp.name)}</span>
      <span class="component-status ${isDraft ? 'status-draft' : 'status-stable'}">${escapeHtml(comp.status)}</span>
    </div>
    <div class="component-variants">${variantPills}</div>
    <div class="component-specimen">${renderSpecimen(comp)}</div>
  </article>`;
}

function renderSpecimen(comp) {
  switch (comp.name) {
    case 'Button': return `
      <button class="spec-btn spec-btn--primary">Primary</button>
      <button class="spec-btn spec-btn--secondary">Secondary</button>
      <button class="spec-btn spec-btn--ghost">Ghost</button>
      <button class="spec-btn spec-btn--cta">CTA</button>
      <button class="spec-btn spec-btn--primary" disabled>Disabled</button>`;
    case 'Badge': return `
      <span class="spec-badge spec-badge--brand">Brand</span>
      <span class="spec-badge spec-badge--neutral">Neutral</span>
      <span class="spec-badge spec-badge--success">Success</span>
      <span class="spec-badge spec-badge--error">Error</span>`;
    case 'Card': return `
      <div class="spec-card">Default card content</div>
      <div class="spec-card spec-card--elevated">Elevated card content</div>`;
    case 'Chip': return `
      <span class="spec-chip">Default</span>
      <span class="spec-chip spec-chip--selected">Selected</span>
      <span class="spec-chip spec-disabled">Disabled</span>`;
    case 'Input': return `
      <input class="spec-input" placeholder="Default input" />
      <input class="spec-input spec-input--error" placeholder="Error state" />
      <input class="spec-input" placeholder="Disabled input" disabled />`;
    case 'Tag': return `
      <span class="spec-tag">Default</span>
      <span class="spec-tag">Removable <button class="spec-tag-x" aria-label="Remove tag">x</button></span>`;
    default: return `<div class="spec-placeholder">${escapeHtml(comp.name)} specimen not defined</div>`;
  }
}

const draftComponents = manifest.components.filter(c => c.status !== 'stable');
const stableComponents = manifest.components.filter(c => c.status === 'stable');
const colorSwatches = tokenEntries('Color').map(colorSwatch).join('\n');
const spacingBars = tokenEntries('Spacing').map(spacingBar).join('\n');
const typeScaleRows = tokenEntries('FontSize').map(typeScaleRow).join('\n');

const draftToolbar = draftComponents.length === 0 ? '' : `<div class="draft-toolbar">
  <strong>${draftComponents.length} draft component(s) pending approval</strong>
  ${draftComponents.map(c => `<span class="draft-item">${escapeHtml(c.name)} <code>npm run approve ${escapeHtml(c.name)}</code></span>`).join('')}
</div>`;

const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Compulocks Design System - v${escapeHtml(version)}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@400;500;600&family=Barlow:wght@400;500;600&display=swap" rel="stylesheet">
<style>
  :root {
${cssVariables()}
    --font-family-heading-fallback: 'Barlow Condensed', 'Arial Narrow', Arial, sans-serif;
    --font-family-body-fallback: 'Barlow', 'Segoe UI', Arial, sans-serif;
  }
  * { box-sizing: border-box; }
  body { margin: 0; background: var(--color-surface-page, #fbfafd); color: var(--color-content-primary, #1a1b2a); font-family: var(--font-family-body-fallback); font-size: 14px; line-height: 1.5; }
  .ds-header { background: var(--color-brand-primary, #1d1f4a); color: #fff; padding: var(--spacing-7, 32px); display: flex; align-items: flex-end; justify-content: space-between; gap: var(--spacing-5, 20px); }
  .ds-header h1 { margin: 0; font-family: var(--font-family-heading-fallback); font-size: 34px; font-weight: 500; letter-spacing: 0; }
  .ds-meta { text-align: right; color: rgba(255,255,255,0.78); font-size: 12px; }
  .draft-toolbar { position: sticky; top: 0; z-index: 10; display: flex; flex-wrap: wrap; gap: var(--spacing-3, 12px); align-items: center; padding: var(--spacing-3, 12px) var(--spacing-7, 32px); background: #fff8e6; border-bottom: 2px solid #b86f00; color: #5f3900; }
  .draft-item { display: inline-flex; align-items: center; gap: var(--spacing-2, 8px); border: 1px solid #b86f00; border-radius: var(--border-radius-s, 10px); background: #fff; padding: 4px 10px; }
  code { font-family: Consolas, 'SFMono-Regular', monospace; font-size: 12px; }
  .ds-nav { display: flex; gap: var(--spacing-5, 20px); padding: 0 var(--spacing-7, 32px); background: var(--color-surface-default, #fff); border-bottom: 1px solid var(--color-outline-soft, #e8e9ee); }
  .ds-nav a { display: inline-block; padding: var(--spacing-3, 12px) 0; border-bottom: 2px solid transparent; color: var(--color-content-muted, #5a5c70); font-family: var(--font-family-heading-fallback); font-size: 13px; font-weight: 600; text-decoration: none; text-transform: uppercase; letter-spacing: 0; }
  .ds-nav a:hover { color: var(--color-brand-primary, #1d1f4a); border-bottom-color: var(--color-brand-green-dark, #009966); }
  .ds-content { max-width: 1180px; margin: 0 auto; padding: var(--spacing-8, 40px) var(--spacing-7, 32px); display: flex; flex-direction: column; gap: var(--spacing-9, 56px); }
  .ds-section { display: flex; flex-direction: column; gap: var(--spacing-5, 20px); }
  .ds-section-header { border-bottom: 2px solid var(--color-outline-soft, #e8e9ee); padding-bottom: var(--spacing-3, 12px); }
  .ds-section-header h2 { margin: 0; color: var(--color-brand-primary, #1d1f4a); font-family: var(--font-family-heading-fallback); font-size: 24px; font-weight: 500; letter-spacing: 0; }
  .ds-section-header p { margin: 4px 0 0; color: var(--color-content-muted, #5a5c70); font-size: 13px; }
  .swatch-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: var(--spacing-4, 16px); }
  .swatch-item { display: flex; flex-direction: column; gap: 6px; min-width: 0; }
  .swatch-color { height: 64px; border-radius: var(--border-radius-m, 14px); box-shadow: var(--shadow-1, 0 1px 2px rgba(29,31,74,0.06)); }
  .swatch-name { color: var(--color-content-primary, #1a1b2a); font-size: 11px; font-weight: 600; overflow-wrap: anywhere; }
  .swatch-value { color: var(--color-content-muted, #5a5c70); font-family: Consolas, 'SFMono-Regular', monospace; font-size: 11px; }
  .spacing-row { display: grid; grid-template-columns: minmax(150px, 220px) 1fr 70px; align-items: center; gap: var(--spacing-4, 16px); padding: var(--spacing-2, 8px) 0; border-bottom: 1px solid var(--color-outline-soft, #e8e9ee); }
  .spacing-label, .type-meta { color: var(--color-content-muted, #5a5c70); font-family: Consolas, 'SFMono-Regular', monospace; font-size: 12px; overflow-wrap: anywhere; }
  .spacing-track { min-width: 0; }
  .spacing-bar { height: 16px; min-width: 8px; max-width: 100%; border-radius: var(--border-radius-xs, 6px); background: var(--color-brand-green-dark, #009966); }
  .type-row { display: grid; grid-template-columns: minmax(180px, 260px) 1fr; align-items: center; gap: var(--spacing-4, 16px); padding: var(--spacing-3, 12px) 0; border-bottom: 1px solid var(--color-outline-soft, #e8e9ee); }
  .type-specimen { font-family: var(--font-family-heading-fallback); line-height: 1.15; color: var(--color-brand-primary, #1d1f4a); }
  .component-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: var(--spacing-4, 16px); }
  .component-card { overflow: hidden; border: 1.5px solid var(--color-outline-soft, #e8e9ee); border-radius: var(--border-radius-l, 20px); background: var(--color-surface-default, #fff); box-shadow: var(--shadow-1, 0 1px 2px rgba(29,31,74,0.06)); }
  .component-draft { border-color: #b86f00; opacity: 0.78; }
  .draft-banner { padding: var(--spacing-2, 8px) var(--spacing-4, 16px); border-bottom: 1px solid #b86f00; background: #fff8e6; color: #5f3900; font-size: 12px; }
  .component-header { display: flex; align-items: center; justify-content: space-between; gap: var(--spacing-3, 12px); padding: var(--spacing-4, 16px) var(--spacing-5, 20px); border-bottom: 1px solid var(--color-outline-soft, #e8e9ee); }
  .component-name { color: var(--color-brand-primary, #1d1f4a); font-family: var(--font-family-heading-fallback); font-size: 18px; font-weight: 600; }
  .component-status { flex: 0 0 auto; border-radius: var(--border-radius-pill, 9999px); padding: 3px 8px; font-size: 10px; font-weight: 700; letter-spacing: 0; text-transform: uppercase; }
  .status-stable { background: rgba(0,153,102,0.12); color: #007a52; }
  .status-draft { background: rgba(184,111,0,0.14); color: #7a4900; }
  .component-variants { display: flex; flex-wrap: wrap; gap: var(--spacing-2, 8px); padding: var(--spacing-3, 12px) var(--spacing-5, 20px); border-bottom: 1px solid var(--color-outline-soft, #e8e9ee); }
  .variant-pill { border-radius: var(--border-radius-pill, 9999px); background: var(--color-surface-deep, #ecedf2); color: var(--color-content-muted, #5a5c70); padding: 2px 8px; font-size: 11px; font-weight: 500; }
  .component-specimen { display: flex; flex-wrap: wrap; align-items: center; gap: var(--spacing-3, 12px); min-height: 104px; padding: var(--spacing-5, 20px); background: var(--color-surface-sunken, #f4f4f8); }
  .spec-btn { height: var(--size-button, 36px); border: 1.5px solid transparent; border-radius: var(--border-radius-pill, 9999px); padding: 0 var(--spacing-4, 16px); font-family: var(--font-family-heading-fallback); font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 0; cursor: pointer; }
  .spec-btn:disabled, .spec-disabled, .spec-input:disabled { opacity: 0.5; cursor: not-allowed; }
  .spec-btn--primary { background: var(--color-brand-primary, #1d1f4a); color: #fff; }
  .spec-btn--secondary { background: transparent; color: var(--color-brand-primary, #1d1f4a); border-color: var(--color-brand-primary, #1d1f4a); }
  .spec-btn--ghost { background: transparent; color: var(--color-brand-primary, #1d1f4a); border-color: transparent; }
  .spec-btn--cta { background: var(--color-brand-green-dark, #009966); color: #fff; }
  .spec-badge { border-radius: var(--border-radius-pill, 9999px); padding: 2px 10px; font-family: var(--font-family-heading-fallback); font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0; }
  .spec-badge--brand { background: rgba(29,31,74,0.08); color: var(--color-brand-primary, #1d1f4a); }
  .spec-badge--neutral { background: var(--color-surface-deep, #ecedf2); color: var(--color-content-muted, #5a5c70); }
  .spec-badge--success { background: rgba(0,153,102,0.12); color: #007a52; }
  .spec-badge--error { background: rgba(179,38,30,0.12); color: #a6241d; }
  .spec-card { width: 100%; border: 1px solid var(--color-outline-soft, #e8e9ee); border-radius: var(--border-radius-l, 20px); background: var(--color-surface-default, #fff); box-shadow: var(--shadow-1, 0 1px 2px rgba(29,31,74,0.06)); padding: var(--spacing-5, 20px); font-size: 13px; }
  .spec-card--elevated { box-shadow: var(--shadow-2, 0 2px 6px rgba(29,31,74,0.08)); }
  .spec-chip { display: inline-flex; align-items: center; height: var(--size-chip, 30px); border: 1.5px solid var(--color-outline-default, #d9dae2); border-radius: var(--border-radius-pill, 9999px); background: var(--color-surface-default, #fff); padding: 0 var(--spacing-3, 12px); font-size: 13px; font-weight: 500; }
  .spec-chip--selected { background: var(--color-brand-primary, #1d1f4a); color: #fff; border-color: var(--color-brand-primary, #1d1f4a); }
  .spec-input { width: min(220px, 100%); height: var(--size-input, 40px); border: 1.5px solid var(--color-outline-default, #d9dae2); border-radius: var(--border-radius-s, 10px); background: var(--color-surface-default, #fff); padding: 0 var(--spacing-4, 16px); color: var(--color-content-primary, #1a1b2a); font-family: var(--font-family-body-fallback); font-size: 14px; }
  .spec-input--error { border-color: #a6241d; }
  .spec-tag { display: inline-flex; align-items: center; gap: 4px; height: 28px; border-radius: var(--border-radius-pill, 9999px); background: var(--color-surface-deep, #ecedf2); padding: 0 var(--spacing-3, 12px); font-size: 12px; font-weight: 500; }
  .spec-tag-x { border: 0; background: transparent; color: var(--color-content-muted, #5a5c70); cursor: pointer; font-size: 14px; line-height: 1; padding: 0 2px; }
  .ds-footer { display: flex; align-items: center; justify-content: space-between; gap: var(--spacing-4, 16px); border-top: 1px solid var(--color-outline-soft, #e8e9ee); padding: var(--spacing-6, 24px) var(--spacing-7, 32px); color: var(--color-content-faint, #8c8e9f); font-size: 12px; }
  .ds-footer strong { color: var(--color-brand-primary, #1d1f4a); font-family: var(--font-family-heading-fallback); font-weight: 600; text-transform: uppercase; letter-spacing: 0; }
  @media (max-width: 720px) {
    .ds-header, .ds-footer { align-items: flex-start; flex-direction: column; }
    .ds-meta { text-align: left; }
    .ds-nav { overflow-x: auto; }
    .ds-content { padding: var(--spacing-6, 24px) var(--spacing-4, 16px); }
    .spacing-row, .type-row { grid-template-columns: 1fr; }
  }
</style>
</head>
<body>
${draftToolbar}
<header class="ds-header">
  <h1>Compulocks Design System</h1>
  <div class="ds-meta">v${escapeHtml(version)}<br>Last generated ${escapeHtml(generatedAt)}<br>${stableComponents.length} stable components</div>
</header>
<nav class="ds-nav">
  <a href="#foundations">Foundations</a>
  <a href="#type">Typography</a>
  <a href="#spacing">Spacing</a>
  <a href="#components">Components</a>
</nav>
<main class="ds-content">
  <section class="ds-section" id="foundations">
    <div class="ds-section-header">
      <h2>Color Foundations</h2>
      <p>Generated from flat token output as CSS custom properties.</p>
    </div>
    <div class="swatch-grid">${colorSwatches}</div>
  </section>
  <section class="ds-section" id="type">
    <div class="ds-section-header">
      <h2>Typography Scale</h2>
      <p>Barlow Condensed for display and Barlow for body text.</p>
    </div>
    ${typeScaleRows}
  </section>
  <section class="ds-section" id="spacing">
    <div class="ds-section-header">
      <h2>Spacing Scale</h2>
      <p>Spacing values shown as proportional bars.</p>
    </div>
    ${spacingBars}
  </section>
  <section class="ds-section" id="components">
    <div class="ds-section-header">
      <h2>Components</h2>
      <p>${stableComponents.length} stable, ${draftComponents.length} draft.</p>
    </div>
    <div class="component-grid">${manifest.components.map(componentSpecimen).join('\n')}</div>
  </section>
</main>
<footer class="ds-footer">
  <strong>Compulocks</strong>
  <span>Auto-generated by compulocks-brand-system. Do not edit directly.</span>
</footer>
</body>
</html>`;

writeFileSync(OUT_FILE, html, 'utf8');
console.log(`[generate-living-html] Written: ${OUT_FILE}`);
console.log(`[generate-living-html] ${stableComponents.length} stable, ${draftComponents.length} draft`);
