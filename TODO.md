# compulocks-brand-system — TODO

_Last updated: 2026-05-14 by Codex_

---

## Done - Design System Distribution Layer

- [x] T-20260514-ds-01: Added `status` to all six manifest components and preserved status during `scripts/export-manifest.mjs` re-export.
- [x] T-20260514-ds-02: Added root governance artifacts: `contributors.json`, `design-requests.md`, and `design-audit.log`.
- [x] T-20260514-ds-03: Added `scripts/sync-vault.mjs` and verified local agent artifacts in `~/.compulocks/design/`.
- [x] T-20260514-ds-04: Added `scripts/approve.mjs`, build hooks, and package scripts for approval/status/request workflows.
- [x] T-20260514-ds-05: Added `scripts/generate-living-html.mjs` and generated `design-system/index.html`.
- [x] T-20260514-ds-06: Added `mcp-server/` with read tools: `get_tokens`, `get_manifest`, `list_components`, `get_component`, `get_spec`.
- [x] T-20260514-ds-07: Added MCP auth/write tools: `request_component`, `approve_component`, `refresh`, `get_requests`.
- [x] Task 8: Added Claude MCP registration, `/design-system` skill, `ux-prep` agent persona, and distribution-layer docs.
- [x] Wrote result files for T-01 through T-07 under `.agent-harness/outbox/`.

---

## Current handoff

- Branch state: `origin/master` contains pushed closeout artifacts through `4605ede`; local `master` is ahead by one auto-manifest timestamp commit before the Task 8 commit.
- Verification passed: `node scripts/test-export-manifest.mjs`, `npm run build`, `npm run design:status`, `npm run design:requests`, `npm run mcp:build`, and MCP smoke/list coverage for all 9 tools.
- Dirty local artifacts remain: Task 8 files, Graphify output, and other local generated/cache artifacts; do not clean or delete without an explicit backup/cleanup instruction.

## Next priority

- Commit Task 8 files separately from Graphify/generated artifacts unless cleanup scope is explicitly requested.
- Review local dirty artifacts and decide what should be committed, ignored, or left local before pushing.
- If pushing, expect the repo pre-push hook to regenerate `component-manifest.json` and possibly create another auto-update commit.
- Register/use the MCP server from `mcp-server/dist/index.js` only after `cd mcp-server && npm run build` has been run locally.

---

## Done this sprint (Session 8)

- [x] `n8n/workflow-b-figma-to-code.json` — Transform + Commit nodes fully implemented (was stubs)
- [x] `figma-plugin/code.ts` — real component visuals: Button, Badge, Tag, Chip, Card, Input
- [x] `figma-plugin/code.js` rebuilt clean
- [x] Pushed all commits to origin

---

## Done (Session 7)

- [x] Token expansion: `color` (7), `borderRadius` (5), `shadow` (3), `animation/duration` (3), `spacing` (10)
- [x] Typography CSS utility classes (`build/css/typography.css`) — auto-generated on `npm run build`
- [x] Button, Card, Input, Badge, Tag, Chip — Design Kit aligned components
- [x] `component-manifest.json` regenerated (6 components)

---

## Next priority

- **Test Push in Figma Desktop** — n8n workflow-b now fully wired; test end-to-end Push → branch → PR
- **Test Sync Components** — verify rendered visuals for all 6 components in Figma
- **n8n env vars** — confirm `GITHUB_OWNER`, `GITHUB_REPO`, `GITHUB_BRANCH`, `GITHUB_TOKEN` set in n8n instance

---

## Deferred

- **Naming conventions** — token and component naming standardization
- **npm publish** — `@compulocks/ui` v0.1.0 ready, not yet published
