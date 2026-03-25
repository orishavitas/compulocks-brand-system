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

## v0.4.0 — 2026-02-23

**Session 4: Figma plugin testing**

### v0.4.1 — Plugin UI testing complete
- Fixed `manifest.json`: added `reasoning` field to `networkAccess` (required by Figma API for wildcard domains)
- Fixed `ui.html`: Push button now validates empty URL before firing (was crashing with fetch parse error)
- Plugin loads in Figma Desktop, UI opens, Pull/Push buttons work correctly
- Pull validates empty URL ✓, Push validates empty URL ✓, Push reads Figma variables ✓

### v0.4.2 — n8n wiring in progress
- n8n instance: `https://orishavit84.app.n8n.cloud/` (Community 2.6.4)
- Both workflows imported and published
- GitHub webhook configured: `https://orishavit84.app.n8n.cloud/webhook/github-push`
- Figma plugin webhook base URL: `https://orishavit84.app.n8n.cloud/webhook`
- Filter Token Changes node removed (was blocking all pushes — will restore later with correct path check)
- Parallel fetch nodes (color/typography/spacing) consolidated into single Transform node using `axios` (n8n 2.6.4 has no `$http` or `fetch` — use `require('axios')`)
- Transform node code: uses `axios.get` + `Buffer.from(res.content, 'base64')` to decode GitHub API responses
- **Status: Transform node still being debugged — axios approach pending test**

## v0.5.0 — 2026-03-22

**Session 5: Full design system MVP**

### v0.5.1 — Component infrastructure (Plan 1)
- Added React 18 + TypeScript component library in `components/`
- 5 components: Button (primary/secondary/ghost), Card (default/elevated), Input (default/error), Badge (brand/neutral/success/error), Tag (default/removable)
- Storybook 10 with CSF3 stories (`npm run storybook` → localhost:6006)
- tsup build config (`npm run build:components` → `dist/` CJS + ESM + types)
- `components/tokens.css` — CSS bridge importing `build/css/variables.css` for Storybook

### v0.5.2 — Manifest pipeline (Plan 2)
- `scripts/export-manifest.mjs` — static regex parser for `*.stories.tsx`, SHA-1 hashing, no dependencies
- `scripts/test-export-manifest.mjs` — 16 unit tests, all passing
- `.githooks/pre-push` — auto-regenerates and commits `component-manifest.json` on every push
- `component-manifest.json` — committed to repo root, 5 components with name/variants/states/hash
- `n8n/workflow-a-code-to-figma.json` — extended with `Fetch component-manifest.json` httpRequest node
- `package.json` — added `prepare` (sets core.hooksPath) and `export-manifest` scripts

### v0.5.3 — Figma plugin component sync (Plan 3)
- Plugin UI: added GitHub Token input (password field) + Sync Components button (green)
- `figma-plugin/code.ts`: SHA-1 inline impl, `ensurePage`, `buildStyleGuidePage`, `buildComponentsPage`, `sync-components` handler
- Style Guide page: color swatches with labels, typography specimens, spacing scale bars with labels
- Components page: one `ComponentSetNode` per manifest component, children named `variant=X, state=Y`
- Hash-based skip logic: `node.getPluginData('manifestHash')` vs `component.hash`
- Manifest fetched via GitHub Contents API with Bearer token (private repo support)
- **Tested and working in Figma Desktop**

### v0.5.4 — npm package (Plan 4)
- `package.json` name set to `@compulocks/ui`, version `0.1.0`
- `styles.css` source file + tsup `onSuccess` hook copies to `dist/styles.css`
- `test-consumer/` — local Vite + React app verifying `@compulocks/ui` imports and styles
- `.npmignore` — excludes all dev files from published tarball
- `CLAUDE.md` updated with Publishing section

### v0.5.5 — Bug fixes
- Push crash: `resolveForConsumer({mode})` → `v.valuesByMode[modeId]` (Figma API correction)
- Pull URL: strip trailing slash before appending `/pull`
- Sync Components: `page.appendChild(node)` before `figma.combineAsVariants()` — nodes must be on target page first
- Push button (Figma→Code) returns HTTP 500 from n8n — deferred for next session

## v0.6.0 — 2026-03-25

**Session 6: Sync Platform documentation**

### v0.6.1 — Executive technical briefs (Plan 1)
- `docs/research/executive-brief-current-state-2026-03-25.md` — current state brief for senior engineers joining the project: what was built, five-layer architecture, live sync data (37 entities), stubbed components, and session roadmap through Session I
- `docs/research/executive-brief-design-thinking-2026-03-25.md` — design thinking and AI-integrated architecture brief for technical leadership: source-as-peers principle, capability-aware diff rationale, git-as-database decision, QA-as-pipeline-step design, and NotebookLM MCP integration as cross-session architectural memory

### v0.6.2 — Figma adapter: snapshot-file implementation (Plan 2)
- `adapters/figma/adapter.ts` — implemented `fetchAll()` and `ping()` using `sync-state/snapshots/figma.json`
- Figma MCP server confirmed OAuth-only (no PAT/headless path); REST Variables API requires Enterprise — snapshot-file bridges the existing Plugin/n8n push flow to the sync platform's pull architecture
- `ping()` reports snapshot count and age in minutes; returns `ok: false` with actionable message if file absent
- Both `tsconfig.sync.json` and `dashboard/tsconfig.json` pass with no errors
