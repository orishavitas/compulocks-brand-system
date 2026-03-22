# CLAUDE.md

## Project Overview

Compulocks brand design token system. Single source of truth for colors, typography, and spacing across all apps, web apps, and documents.

Built on **Style Dictionary v5** — human-editable JSON tokens auto-generate platform-specific outputs (CSS, SCSS, TypeScript, JSON).

## Commands

```bash
npm run build          # Generate all platform outputs + token_guide.md from tokens/*.json
npm run build:plugin   # Compile Figma plugin TypeScript → JavaScript
npm run clean          # Remove build/ directory
npm run export-manifest    # Generate component-manifest.json from stories
```

## Architecture

```
tokens/              # Source of truth — edit these
├── color.json       # Brand colors
├── typography.json  # Font families, weights, text styles
└── spacing.json     # 4px/8px grid spacing scale

lib/                 # Shared utilities
├── dtcg-to-figma.mjs       # DTCG → Figma format converter
└── figma-to-dtcg.mjs       # Figma → DTCG format converter

figma-plugin/        # Custom Figma plugin (Pull/Push sync)
├── manifest.json
├── code.ts          # Main thread — reads/writes Figma Variables & Styles
└── ui.html          # UI — Pull/Push buttons + status

scripts/
├── export-manifest.mjs    # Static story parser → component-manifest.json
└── test-export-manifest.mjs  # Unit tests for the parser

n8n/                 # n8n workflow configs + setup guide
├── README.md
├── workflow-a-code-to-figma.json
└── workflow-b-figma-to-code.json

docs/plans/          # Design docs and implementation plans
build-tokens.mjs     # Style Dictionary v5 build script + token guide generator
FIGMA_SYNC.md        # Setup guide for Figma plugin + n8n sync

build/               # Auto-generated — do NOT edit
├── css/variables.css       # CSS custom properties
├── scss/_variables.scss    # SCSS variables
├── ts/tokens.ts            # TypeScript constants
└── json/tokens.json        # Flat JSON for tools/plugins

token_guide.md       # Auto-generated — human-readable token dictionary
```

## Token Structure

**Colors:** `color.brand.primary`, `color.brand.highlight`
**Fonts:** `font.family.primary` (Barlow Condensed), `font.family.secondary` (Barlow)
**Weights:** `font.weight.regular` (400), `font.weight.medium` (500)
**Text Styles:** `textStyle.bigShortTitle`, `bigLongTitle`, `bigParagraph`, `smallParagraph`, `smallText`
**Spacing:** `spacing.1` (4px) through `spacing.16` (64px)

## Editing Tokens

Edit JSON files in `tokens/`. Use DTCG format:
```json
{
  "tokenName": {
    "$value": "#1D1F4A",
    "$type": "color",
    "$description": "What this token is for"
  }
}
```

Reference other tokens: `"$value": "{font.family.primary}"`

After editing, run `npm run build` to regenerate outputs.

## Versioning

This project uses semantic versioning with session-based tracking:

- **X.0.0** (major) — bumped only when explicitly requested by the user
- **0.X.0** (minor) — bumped once per session (each work session = one minor bump)
- **0.0.X** (patch) — bumped per plan executed within a session

See `CHANGELOG.md` for full history.

## Cross-Project Usage

This repo is the **design reference** for:
- **mrd-producer-webapp** — unified dashboard, tool cards, documents table, login page all styled from these tokens
- M3 Expressive tonal palette in `mrd-producer-webapp/app/globals.css` is derived from `color.brand.primary` (#1D1F4A)

When adding tokens here, consider downstream consumers. Run `npm run build` and check that CSS/TS/JSON outputs are correct before pushing.

## Implementation Status

### Figma Plugin — Ready to Test
All plugin files exist and are compiled:
- `figma-plugin/manifest.json` — plugin metadata, network access to all domains
- `figma-plugin/code.ts` — main thread source (TypeScript)
- `figma-plugin/code.js` — compiled output (esbuild, ready to use)
- `figma-plugin/ui.html` — Pull/Push UI with n8n webhook URL input

**To load for testing:**
1. Open Figma → Plugins → Development → Import plugin from manifest
2. Select `figma-plugin/manifest.json`
3. Run "Compulocks Token Sync" from Development plugins

**To rebuild after code changes:**
```bash
npm run build:plugin
```

### n8n Workflows
- `n8n/workflow-a-code-to-figma.json` — importable workflow for Code→Figma pull
- `n8n/workflow-b-figma-to-code.json` — importable workflow for Figma→Code push (PR creation)
- `n8n/README.md` — full setup instructions

**n8n status (2026-02-23):**
- Instance: `https://orishavit84.app.n8n.cloud/` (Community 2.6.4)
- Both workflows published and active
- GitHub webhook live and delivering to n8n ✓
- Figma plugin base URL: `https://orishavit84.app.n8n.cloud/webhook`
- Workflow A Transform node: use `require('axios')` — n8n 2.6.4 has no `fetch` or `$http`
- Transform node fetches all 3 token files via GitHub Contents API, decodes base64, converts DTCG→Figma format
- **In progress:** Transform node debugging — axios pending test

### Manifest Pipeline — Complete
- `scripts/export-manifest.mjs` — static story parser, SHA-1 hashing
- `scripts/test-export-manifest.mjs` — unit tests, all passing
- `.githooks/pre-push` — auto-commits manifest on push
- `component-manifest.json` — committed to repo root, consumed by Figma plugin
- `n8n/workflow-a-code-to-figma.json` — extended to fetch manifest on push

## Key Rules

- NEVER edit files in `build/` — they are auto-generated
- ALWAYS run `npm run build` after changing tokens
- ALWAYS run `npm run build:plugin` after changing `figma-plugin/code.ts`
- ALWAYS update `CHANGELOG.md` following the versioning rules above
- Check `MEMORY.md` before starting work for accumulated context

## Publishing

### Package identity
- **npm package name:** `@compulocks/ui`
- **Registry:** public npm (`registry.npmjs.org`)

### Pre-publish checklist
1. `npm run build:all` — regenerate tokens + dist/
2. `npm pack --dry-run` — verify only dist/ in tarball
3. Verify `dist/styles.css` has `:root { ... }` token variables
4. Bump version in `package.json`
5. `cd test-consumer && npm run dev` — confirm no errors

### Publish
```bash
npm login
npm publish --access public
```

### Consumer usage
```bash
npm install @compulocks/ui
```
```tsx
import { Button, Card, Badge, Tag, Input } from '@compulocks/ui';
import '@compulocks/ui/styles.css';
```
