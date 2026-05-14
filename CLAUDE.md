# CLAUDE.md

## Project Overview

Compulocks brand design token system and Design System Distribution Layer. Single source of truth for colors, typography, spacing, component registry status, and agent-facing design artifacts across apps, web apps, and documents.

Built on **Style Dictionary v5** — human-editable JSON tokens auto-generate platform-specific outputs (CSS, SCSS, TypeScript, JSON).

## Commands

```bash
npm run build          # Generate all platform outputs + token_guide.md from tokens/*.json
npm run build:plugin   # Compile Figma plugin TypeScript → JavaScript
npm run clean          # Remove build/ directory
npm run export-manifest    # Generate component-manifest.json from stories and preserve statuses
npm run approve <Name>     # Approve a draft component; requires COMPULOCKS_CONTRIBUTOR
npm run design:status      # Print component status rows
npm run design:requests    # Print open design request rows
npm run mcp:build          # Build the design system MCP server
npm run mcp:start          # Start the MCP server on stdio
```

## UI Task Intake SOP

Before any UI-based output or review, including HTML review, dashboard work, web app screens, frontend components, design critique, layout changes, generated mockups, or implementation plans that affect user-facing UI, load `docs/design-system-distribution/ui-task-intake-sop.md`.

Claude Code should use the `compulocks-design` MCP server from `.claude/settings.json` first:
- `list_components`
- `get_tokens`
- `get_spec`

If MCP is unavailable, read the local vault artifacts at `~/.compulocks/design/manifest.json`, `~/.compulocks/design/tokens.json`, and `~/.compulocks/design/SPEC.md`. If the vault is unavailable, fall back to `component-manifest.json`, `build/json/tokens.json`, and `design-system/index.html`.

For UI work, stable manifest components and design tokens are mandatory inputs. Do not invent components or hardcode design values. If a needed component is missing, use `/design-system request` or `request_component` and mark that part blocked.

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

### Figma Plugin — Working ✅
- `figma-plugin/manifest.json` — plugin metadata, network access to all domains
- `figma-plugin/code.ts` — Pull, Push, Sync Components handlers
- `figma-plugin/code.js` — compiled output (esbuild)
- `figma-plugin/ui.html` — 3 buttons (Pull / Push / Sync Components) + n8n webhook URL + GitHub token inputs

**Plugin inputs:**
- n8n Webhook URL: `https://orishavit84.app.n8n.cloud/webhook` (no trailing slash)
- GitHub Token: fine-grained or classic PAT with `repo` read scope (for private repo manifest fetch)

**Buttons:**
- **Pull** — fetches tokens from n8n → applies to Figma Variables + Text Styles ✅
- **Push** — reads Figma Variables → POSTs to n8n (HTTP 500 from n8n — deferred) ⚠️
- **Sync Components** — fetches manifest via GitHub Contents API → creates/updates Style Guide + Components pages ✅

**To rebuild after code changes:**
```bash
npm run build:plugin
```

### n8n Workflows
- `n8n/workflow-a-code-to-figma.json` — Code→Figma pull (active, working)
- `n8n/workflow-b-figma-to-code.json` — Figma→Code push PR (active, returns 500 — deferred)
- `n8n/README.md` — full setup instructions

**n8n status (2026-03-22):**
- Instance: `https://orishavit84.app.n8n.cloud/` (Community 2.6.4)
- GitHub webhook live and delivering ✓
- Figma plugin base URL: `https://orishavit84.app.n8n.cloud/webhook`
- Workflow A Transform node: uses `require('axios')` — n8n 2.6.4 has no `fetch` or `$http`

### Manifest Pipeline — Complete ✅
- `scripts/export-manifest.mjs` — static story parser, SHA-1 hashing
- `scripts/test-export-manifest.mjs` — 19 unit tests, all passing
- `.githooks/pre-push` — auto-commits manifest on every push
- `component-manifest.json` — committed to repo root, 6 components
- `n8n/workflow-a-code-to-figma.json` — extended to fetch manifest on push

### Component Library — Complete ✅
- `components/` — 6 React components (Button, Card, Input, Badge, Tag, Chip)
- `npm run storybook` — Storybook 10 on localhost:6006
- `npm run build:components` — tsup builds `dist/` (CJS + ESM + types + styles.css)
- `test-consumer/` — local Vite app to verify `@compulocks/ui` imports
- Package name: `@compulocks/ui` v0.1.0 — ready to publish to npm

## Design System Distribution Layer (added 2026-05-14)

Agent-safe design system access now lives in repo artifacts, a local MCP server, and a synced local vault.

### Governance Artifacts
- `component-manifest.json` stores component status: `draft`, `stable`, or `deprecated`.
- `contributors.json` is the write-access whitelist. Current owner contributor: `ori@compulocks.com`.
- `design-requests.md` is append-only and records missing component requests.
- `design-audit.log` is append-only and records approvals, refreshes, and authorization failures.

### Build and Vault Flow
- `npm run build` generates token outputs, `token_guide.md`, `design-system/index.html`, and synced vault artifacts.
- `scripts/sync-vault.mjs` writes stable artifacts to `~/.compulocks/design/`: `tokens.json`, stable-only `manifest.json`, `SPEC.md`, and `.last-updated`.
- `scripts/generate-living-html.mjs` generates the local specimen and approval surface at `design-system/index.html`.
- `scripts/approve.mjs` approves draft components only when `COMPULOCKS_CONTRIBUTOR` matches `contributors.json`.

### MCP Server
- Build with `npm run mcp:build`; start with `npm run mcp:start`.
- Claude project registration is in `.claude/settings.json` as `compulocks-design`, running `node ./mcp-server/dist/index.js`.
- Read tools: `get_tokens`, `get_manifest`, `list_components`, `get_component`, `get_spec`.
- Request/write tools: `request_component`, `approve_component`, `refresh`, `get_requests`.
- `request_component` is intentionally unauthenticated. `approve_component`, `refresh`, and `get_requests` require an authorized `contributor_id`.

### Claude Skill and Agent
- `.claude/skills/design-system.md` defines `/design-system` for token/component lookup, design requests, approvals, and refreshes.
- `agents/ux-prep.md` is the pre-implementation UX agent persona. It must load components, tokens, and spec before frontend work, file requests for gaps, and hand off a UI prep sheet to the coder.

## Sync Platform (added 2026-03-25)

Full source-agnostic design system sync platform lives alongside existing token/component system.
Specs: `docs/superpowers/specs/` | Research: `docs/research/`

### TypeScript compilation
```bash
npx tsc --project tsconfig.sync.json   # sync platform (Node.js, CommonJS)
cd dashboard && npx tsc --noEmit       # dashboard (Next.js bundler)
```
Both must pass before committing sync platform changes.

### Run a sync (produces real data in sync-state/)
```bash
npx tsc --project tsconfig.sync.json --noEmit false --outDir .build-sync
node -e "
  const { StorybookAgent } = require('./.build-sync/agents/storybook-agent');
  const { GitHubAgent } = require('./.build-sync/agents/github-agent');
  const { Librarian } = require('./.build-sync/librarian/librarian');
  const { QAAgentImpl } = require('./.build-sync/qa/qa-agent');
  const { MetaOrchestrator } = require('./.build-sync/orchestrator/orchestrator');
  const o = new MetaOrchestrator({ agents: [new StorybookAgent(), new GitHubAgent()], librarian: new Librarian(), qa: new QAAgentImpl() });
  o.sync({}).then(r => console.log(r.librarianSyncState.entities.length, 'entities')).catch(console.error);
"
rm -rf .build-sync
```

### Sync platform directory structure
```
adapters/          # PlatformAdapter impls (storybook + github LIVE; figma/stitch stubs)
agents/            # PlatformAgent wrappers with retry/logging
librarian/         # Diff computation + sync-state/ persistence
orchestrator/      # MetaOrchestrator coordinates agents
qa/                # Text diff (live) + visual diff (stubbed, Session G)
sync-state/        # Git-committed JSON — state.json + snapshots/ + log/
dashboard/         # Next.js 15 dashboard (cd dashboard && npm run dev)
```

### Key architectural rules
- `adapters/index.ts` — call `registerAllAdapters()` at any entry point so diff.ts can do capability-aware filtering
- Storybook adapter reads `component-manifest.json` from repo root
- GitHub adapter reads `tokens/*.json` (DTCG format) from repo root
- Figma REST Variables API requires Enterprise — use MCP or Plugin API instead
- `sync-state/` is committed to git (not gitignored) — Librarian writes here
- `tsconfig.sync.json` uses `module: commonjs` + `@types/node` — separate from root tsconfig
- Dashboard `tsconfig.json` includes `../{adapters,librarian,agents,orchestrator,qa}/**/*.ts` to resolve parent imports

### NotebookLM knowledge base
- URL: `https://notebooklm.google.com/notebook/e13977da-1275-4248-af68-d84c9302d415`
- Sources: PRD, architecture doc, scaffold plan, research doc, executive brief
- Query via `mcp__notebooklm__ask_question` — use session_id `775d6b70` to continue existing session
- Feed new architecture decisions as sources after major sessions

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
