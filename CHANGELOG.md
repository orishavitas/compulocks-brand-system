# CHANGELOG

## 2026-05-14 - Design System Distribution Layer

### Added
- Added component status governance to `component-manifest.json` and status preservation in `scripts/export-manifest.mjs`.
- Added root governance files: `contributors.json`, `design-requests.md`, and `design-audit.log`.
- Added `scripts/sync-vault.mjs` for local agent artifacts in `~/.compulocks/design/`.
- Added `scripts/approve.mjs`, design status/request package scripts, and build hooks for living HTML plus vault sync.
- Added `scripts/generate-living-html.mjs` and generated `design-system/index.html` as the human approval surface.
- Added `mcp-server/` with 9 MCP tools: 5 read tools plus request, approve, refresh, and request-list tools.
- Added Task 8 Claude-facing distribution artifacts: `.claude/settings.json`, `.claude/skills/design-system.md`, and `agents/ux-prep.md`.
- Added `.agent-harness/outbox/` result files for T-20260514-ds-01 through T-20260514-ds-07.

### Changed
- `npm run build` now regenerates the living HTML approval page when available and syncs stable design artifacts to the local Compulocks design vault.
- Approval and MCP mutation checks use `contributors.json` for authorization and append to `design-audit.log`; `request_component` remains unauthenticated by design.

### Verification
- `node scripts/test-export-manifest.mjs` - 19 passed, 0 failed.
- `npm run build` - generated Style Dictionary outputs, token guide, living HTML, and vault sync.
- `npm run design:status` - all six components stable.
- `npm run design:requests` - no open requests after restored smoke-test fixtures.
- `cd mcp-server && npm run build` - TypeScript/tsup build passed.
- MCP smoke test passed for all 9 tools, including request append, unauthorized rejection, authorized draft approval, no-op approval, refresh, and `get_requests`.
- `npm run mcp:build` - rebuilt Task 8 MCP dist; stdio `tools/list` output showed all 9 tools.

### Notes
- Codex performed the Task 8 pickup on 2026-05-14 after the closeout artifacts were pushed remotely; Task 8 was pushed and final remote head is `626b522`.
- Local dirty/untracked artifacts remain for Graphify/cache, `.agent-harness/`, `.playwright-mcp/`, `.superpowers/`, and `tokens/size.json`.

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

## v0.7.0 — 2026-04-08

**Session 7: Component redesign — Design Kit alignment**

### v0.7.1 — Token expansion
- Added color tokens: `green-dark` (#009966), `green-light` (#1db274), `surface` (#f2f2f2), `white`, `outline` (#e0e0e0)
- New `tokens/borderRadius.json`: sm/md/lg/xl/full (6–9999px)
- New `tokens/shadow.json`: sm/md/lg (navy rgba shadows)
- New `tokens/animation.json`: fast/normal/slow (120/200/350ms)
- `build-tokens.mjs` generates `build/css/typography.css` with 5 Design Kit utility classes
- `token_guide.md` extended with Border Radius, Shadows, Animation sections

### v0.7.2 — Component redesign (Design Kit hard rules)
- **Button**: pill radius (9999px), CTA variant (green #009966), hover states, weight 600
- **Card**: 24px radius, #f2f2f2 bg, #e0e0e0 border, shadow token — matches Design Kit `.content-card` spec
- **Input**: 8px radius, neutral outline #C5C6D0, cream bg #FDFBFF, focus ring via useState
- **Badge**: success uses brand green (#009966), new `tonal` variant (navy tint)
- **Tag**: pill radius (9999px), asymmetric padding on removable variant
- **Chip** (new): filter/selection component, default/selected variants, aria-pressed, pill shape

### v0.7.3 — Manifest + distribution
- `component-manifest.json` regenerated with 6 components (added Chip)
- `dist/index.d.ts` exports Chip, ChipProps, ChipVariant
- `test-consumer` build verified

### Known issues / next session
- Figma plugin Pull/Push only moves design tokens (Variables), not component visuals
- Sync Components creates placeholder scaffolding, not real visual components
- Proposed: expandable sync UI with mode selector (Tokens | Components | Style Guide | All)
- Naming conventions for components/tokens — deferred

## v0.8.0 — 2026-04-13

**Session 8: Push fix + real component visuals**

### v0.8.1 — n8n workflow-b: Push now fully implemented
- `n8n/workflow-b-figma-to-code.json` — `Transform Figma to DTCG` node now contains the full inline converter (was a stub returning `{}`)
- `Commit Files` node now makes real GitHub Contents API PUT requests for each token file, fetching existing SHA for updates
- Push flow: Figma Variables → DTCG JSON → branch → commit → PR

### v0.8.2 — Figma plugin: real component visuals in Sync
- `figma-plugin/code.ts` — `buildComponentsPage` now renders styled component visuals instead of navy placeholders
- Each component type (Button, Badge, Tag, Chip, Card, Input) renders with correct Design Kit styles: radius, colors, padding, typography weight
- `renderComponentNode()` helper reads live token values via `figma.variables.getLocalVariables()` with hex fallbacks
- `figma-plugin/code.js` rebuilt (23.6kb)
