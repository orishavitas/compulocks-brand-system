# CLAUDE.md

## Project Overview

Compulocks brand design token system. Single source of truth for colors, typography, and spacing across all apps, web apps, and documents.

Built on **Style Dictionary v5** — human-editable JSON tokens auto-generate platform-specific outputs (CSS, SCSS, TypeScript, JSON).

## Commands

```bash
npm run build          # Generate all platform outputs + token_guide.md from tokens/*.json
npm run build:plugin   # Compile Figma plugin TypeScript → JavaScript
npm run clean          # Remove build/ directory
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

## Key Rules

- NEVER edit files in `build/` — they are auto-generated
- ALWAYS run `npm run build` after changing tokens
- ALWAYS update `CHANGELOG.md` following the versioning rules above
- Check `MEMORY.md` before starting work for accumulated context
