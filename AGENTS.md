# AGENTS.md

## Project Overview

Compulocks brand design token system and Design System Distribution Layer. Single source of truth for colors, typography, spacing, component registry status, and agent-facing design artifacts across apps, web apps, and documents.

Built on **Style Dictionary v5** — human-editable JSON tokens auto-generate platform-specific outputs (CSS, SCSS, TypeScript, JSON).

## Task Pickup

When `.agent-harness/inbox/*.task.md` files exist, read the lowest-numbered task packet before changing files. Work on the branch named in the packet and write `.agent-harness/outbox/<task_id>.result.md` before claiming done.

Sprint 1 status as of 2026-05-14:
- T-20260514-ds-01-manifest-status: done on `task/T-20260514-ds-01-manifest-status`, commit `aaf0d68`.
- T-20260514-ds-02-static-artifacts: done on `task/T-20260514-ds-02-static-artifacts`, commit `7b16fdb`.
- T-20260514-ds-03-vault-sync: done on `task/T-20260514-ds-03-vault-sync`, commit `7d56a6a`.
- T-20260514-ds-04-approve-cli: done on `task/T-20260514-ds-04-approve-cli`, commit `c4e0ec0`.
- T-20260514-ds-05-living-html: done on `task/T-20260514-ds-05-living-html`, commit `3fa4e7b`.
- T-20260514-ds-06-mcp-read: done on `task/T-20260514-ds-06-mcp-read`, commit `410193b`.
- T-20260514-ds-07-mcp-write: done on `task/T-20260514-ds-07-mcp-write`, commit `6063c29`.

The Design System Distribution Layer task branches are stacked in local history and merged locally on `master` via `94992b0`, with pre-push auto-manifest commit `f5eb383` on top. Outbox results exist for T-01 through T-07. Codex did not push during the 2026-05-14 closeout.

## UI Task Intake SOP

Before any UI-based output or review, including HTML review, dashboard work, web app screens, frontend components, design critique, layout changes, generated mockups, or implementation plans that affect user-facing UI, load `docs/design-system-distribution/ui-task-intake-sop.md`.

Codex must then load the current design system through the best available local path:
- Preferred shell/local path: `~/.compulocks/design/manifest.json`, `~/.compulocks/design/tokens.json`, and `~/.compulocks/design/SPEC.md`.
- Repo fallback: `component-manifest.json`, `build/json/tokens.json`, and `design-system/index.html`.
- If working in a Claude Code context with MCP tools available, use the `compulocks-design` MCP server first.

For UI work, stable manifest components and design tokens are mandatory inputs. Do not invent components or hardcode design values. If a needed component is missing, file or recommend a `request_component` design request and mark that part blocked.

## Commands

```bash
npm run build               # Generate all platform outputs from tokens/*.json
npm run clean               # Remove build/ directory
npm run export-manifest     # Generate component-manifest.json from stories and preserve status fields
node scripts/sync-vault.mjs # Copy stable design artifacts to ~/.compulocks/design/
npm run approve <Name>      # Approve a draft component; requires COMPULOCKS_CONTRIBUTOR
npm run design:status       # Print component status rows
npm run design:requests     # Print open design request rows
npm run mcp:build           # Build MCP server into mcp-server/dist/
npm run mcp:start           # Start MCP server on stdio
```

## Architecture

```
tokens/              # Source of truth — edit these
├── color.json       # Brand colors
├── typography.json  # Font families, weights, text styles
└── spacing.json     # 4px/8px grid spacing scale

FIGMA_SYNC.md        # Guide for syncing tokens with Figma board
build-tokens.mjs     # Style Dictionary v5 build script
component-manifest.json # Component registry with status: draft | stable | deprecated
contributors.json    # Write-access whitelist
design-requests.md   # Append-only component request log
design-audit.log     # Append-only design system audit log
scripts/sync-vault.mjs # Stable artifact sync to ~/.compulocks/design/
scripts/approve.mjs    # Contributor-authorized local approval CLI
scripts/generate-living-html.mjs # Generates design-system/index.html
design-system/index.html # Generated approval/specimen surface
mcp-server/          # Local MCP server exposing 9 design system tools

build/               # Auto-generated — do NOT edit
├── css/variables.css       # CSS custom properties
├── scss/_variables.scss    # SCSS variables
├── ts/tokens.ts            # TypeScript constants
└── json/tokens.json        # Flat JSON for tools/plugins
```

## Token Structure

- **Colors:** `color.brand.primary`, `color.brand.highlight`
- **Fonts:** `font.family.primary` (Barlow Condensed), `font.family.secondary` (Barlow)
- **Weights:** `font.weight.regular` (400), `font.weight.medium` (500)
- **Text Styles:** `textStyle.bigShortTitle`, `bigLongTitle`, `bigParagraph`, `smallParagraph`, `smallText`
- **Spacing:** `spacing.1` (4px) through `spacing.16` (64px)

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
- Preserve existing `component-manifest.json` status values on export; new components default to `draft`
- `~/.compulocks/design/manifest.json` must expose stable components only

## graphify

This project has a graphify knowledge graph at graphify-out/.

Rules:
- Before answering architecture or codebase questions, read graphify-out/GRAPH_REPORT.md for god nodes and community structure
- If graphify-out/wiki/index.md exists, navigate it instead of reading raw files
- After modifying code files in this session, run `graphify update .` to keep the graph current (AST-only, no API cost)
