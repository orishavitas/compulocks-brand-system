# CHANGELOG

## v0.1.0 — 2026-02-19

**Session 1: Initial setup**

### v0.1.1 — Initial token system
- Created Style Dictionary v5 project
- Added brand tokens: colors (`primary`, `highlight`), typography (Barlow/Barlow Condensed, 5 text styles), spacing (4px–64px grid)
- Build outputs: CSS variables, SCSS variables, TypeScript constants, flat JSON
- Custom TypeScript format for nested `as const` exports

### v0.1.2 — Project docs
- Added `CLAUDE.md` with project instructions and versioning rules
- Added `MEMORY.md` with decisions, patterns, and gotchas
- Added `CHANGELOG.md` with session-based versioning

### v0.1.3 — AI agent instructions
- Added `AGENTS.md` based on `CLAUDE.md` for broader AI agent support

### v0.1.4 — Figma integration
- Added `FIGMA_SYNC.md` guide for synchronizing JSON tokens with Figma using Tokens Studio plugin

## v0.2.0 — 2026-02-20

**Session 2: Two-way Figma sync system**

### v0.2.1 — Design & planning
- Designed two-way Figma sync architecture: custom Figma plugin + n8n workflows (fully free tier)
- Added design doc: `docs/plans/2026-02-19-figma-two-way-sync-design.md`
- Added implementation plan: `docs/plans/2026-02-19-figma-two-way-sync-plan.md`
- 7 tasks across 5 phases: token guide (HMI), format converters, Figma plugin, n8n workflows, docs

### v0.2.2 — Implementation: Figma sync system (complete)
- **Token guide:** `token_guide.md` auto-generated on every `npm run build` — color/typography/spacing tables for non-technical stakeholders
- **Format converters:** `lib/dtcg-to-figma.mjs` and `lib/figma-to-dtcg.mjs` — pure JS, fully tested (11 tests, all passing)
  - DTCG→Figma: hex→RGB (0-1), rem→px, nested paths→slash paths, `{reference}` resolution
  - Figma→DTCG: RGB→hex, px→rem, slash paths→nested DTCG structure
- **Figma plugin:** `figma-plugin/` — TypeScript plugin with Pull/Push UI
  - Pull: fetches tokens from n8n, creates/updates Figma Variables (COLOR, FLOAT) and Text Styles
  - Push: reads all Variables + Text Styles, POSTs to n8n for PR creation
  - Compiled with esbuild (`npm run build:plugin`)
- **n8n workflows:** `n8n/` — importable JSON configs + setup README
  - Workflow A (Code→Figma): GitHub push webhook → transform → store for plugin pull
  - Workflow B (Figma→Code): POST from plugin → transform → create branch → commit → open PR
- **Docs:** `FIGMA_SYNC.md` rewritten with plugin + n8n setup guide

## v0.3.0 — 2026-02-20

**Session 3: Cross-project integration**

### v0.3.1 — MRD Producer dashboard design reference
- Brand tokens adopted as design reference for MRD Producer unified dashboard
- `mrd-producer-webapp` globals.css now uses M3 Expressive palette derived from brand primary `#1D1F4A`
- Dashboard design doc created referencing `compulocks-brand-system` for styling (tool cards, documents table, login page)
- MRD Producer `style-tokens.ts` expanded with M3 tonal palette, shapes, and type scale alongside original brand variants
