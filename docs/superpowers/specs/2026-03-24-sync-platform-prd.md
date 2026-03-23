# Compulocks Sync Platform — Product Requirements Document

**Date:** 2026-03-24
**Status:** Draft v1.0
**Author:** Jarvis (Claude Code, /yolo session)
**Stakeholder:** Ori Shavit

---

## 1. Vision

A **source-agnostic design system sync platform** that treats every tool — Storybook, Figma, GitHub, Google Stitch, or anything yet to exist — as a first-class citizen. No single tool is permanently "primary." The user declares what's authoritative at any moment, and the system syncs everything else relative to that declaration.

The platform surfaces **what's in sync, what's drifted, and what's missing** across all connected sources, and lets the user take deliberate, directional action: push from A to B, pull from B to A, or let the system propose a merge.

---

## 2. Problem Statement

Today, the Compulocks brand system has:
- Tokens (colors, typography, spacing) in JSON files → compiled to CSS/TS/SCSS
- A Figma plugin that pulls/pushes those tokens
- Storybook stories that define component variants and states
- A manifest pipeline that exports story metadata to Figma
- n8n workflows that automate some of the above

**The gaps:**
1. No single view of "what's in sync and what isn't" across all sources
2. Sync is directional and hard-coded — no ability to choose direction at runtime
3. Adding a new source (e.g. Google Stitch) requires rewriting plumbing, not plugging in an adapter
4. No verification step — syncs happen but nobody checks if Figma actually matches Storybook
5. Storybook is a passive participant — it generates the manifest but has no agency in the sync

---

## 3. Goals

| Goal | Priority |
|------|----------|
| See sync state across all sources in one view | P0 |
| Choose sync direction per component/token at runtime | P0 |
| Add new sources without changing core platform | P0 |
| Automated verification that syncs actually worked | P1 |
| Agent-driven sync that runs without user babysitting | P1 |
| Historical sync log with diffs | P2 |
| Conflict resolution UI when sources disagree | P2 |

---

## 4. Non-Goals (v1)

- Real-time live sync (polling/webhook is sufficient)
- Multi-user collaboration or access control
- Versioning/branching of design tokens
- Support for non-Compulocks design systems

---

## 5. User Stories

### As a designer/developer:
- I want to see which components are in sync between Figma and Storybook, so I can trust what I'm designing against
- I want to pull a specific component from Storybook into Figma without syncing everything
- I want to know when Figma has drifted from the code (tokens changed in code but not applied in Figma)
- I want to add Google Stitch as a source and immediately see its state relative to Figma and code

### As the system architect:
- I want to define a new adapter (e.g. Stitch) without touching core sync logic
- I want each adapter to declare its own capabilities (can read, can write, what entity types it supports)
- I want the librarian to maintain a single canonical state model that all adapters write into

---

## 6. Platform Sources (Current + Planned)

| Source | Status | Entity Types | Read | Write |
|--------|--------|-------------|------|-------|
| GitHub (tokens JSON) | Existing | tokens | ✅ | ✅ |
| Figma Variables/Styles | Existing | tokens, text-styles | ✅ | ✅ |
| Storybook Stories | Existing (passive) | components, variants, states | ✅ | ❌ |
| Figma Components | Existing | components, component-sets | ✅ | ✅ |
| Google Stitch | Planned | TBD | TBD | TBD |
| npm Registry | Future | components (published) | ✅ | ❌ |

---

## 7. Entity Types

The platform operates on these canonical entity types. Every adapter must map its native concepts to these:

### `Token`
```typescript
{
  id: string              // e.g. "color.brand.primary"
  type: "color" | "dimension" | "fontFamily" | "fontWeight" | "other"
  value: string | number
  description?: string
  group?: string          // e.g. "color.brand"
}
```

### `Component`
```typescript
{
  id: string              // e.g. "Button"
  variants: string[]      // e.g. ["Primary", "Secondary", "Ghost"]
  states: string[]        // e.g. ["disabled", "loading"]
  hash: string            // content hash for change detection
}
```

### `TextStyle`
```typescript
{
  id: string              // e.g. "textStyle.bigShortTitle"
  fontFamily: string
  fontWeight: number
  fontSize?: number
  lineHeight?: number
}
```

---

## 8. Sync State Model

For each entity in each source, the librarian tracks:

```typescript
{
  entityId: string
  entityType: "token" | "component" | "textStyle"
  source: string          // e.g. "figma", "github", "storybook"
  lastSeen: ISO8601
  hash: string
  value: unknown          // canonical form
  status: "present" | "missing" | "unknown"
}
```

Sync state is computed by comparing hashes across sources for the same `entityId`. States:

| Status | Meaning |
|--------|---------|
| `in-sync` | All sources have matching hash |
| `drifted` | Sources disagree on value |
| `missing-in` | Entity exists in some sources, absent in others |
| `only-in` | Entity exists in exactly one source |
| `unknown` | Adapter hasn't reported yet |

---

## 9. User Experience — Dashboard

The dashboard is a **standalone web app** (not embedded in Figma). It is source-agnostic — no tool is privileged in the UI.

### Primary View: Sync Matrix
A table where:
- **Rows** = entities (tokens, components, text styles)
- **Columns** = sources (Figma, Storybook, GitHub, Stitch…)
- **Cells** = sync status with last-updated timestamp
- **Actions** = per-cell push/pull buttons; per-row "sync all" button

### Secondary View: Source Health
One card per source showing:
- Last poll timestamp
- How many entities it knows about
- How many are in-sync vs drifted vs missing

### Tertiary View: Activity Log
Chronological list of sync operations, agent activity, and QA results.

### Primary Source Selector
A dropdown/toggle at the top of the dashboard. Selecting a source as "primary" means:
- Its values are shown as the reference column
- Diffs are computed relative to it
- "Sync all" pushes from primary to all others

---

## 10. Agent Roles

### Meta-Orchestrator
- Wakes on schedule (cron) or user action
- Decides which platform agents need to run
- Dispatches them with context (what to fetch, what changed)
- Collects results and passes to Librarian
- Reports summary to dashboard

### Platform Agents (one per source)
- **Figma Agent** — reads/writes Figma Variables, Text Styles, Component Sets via REST API
- **Storybook Agent** — reads story files and manifest; cannot write (read-only source)
- **GitHub Agent** — reads/writes token JSON files via GitHub Contents API; creates PRs
- **Stitch Agent** *(planned)* — TBD adapter
- Each agent declares its capabilities via a manifest
- Each agent is stateless — all state lives in the Librarian

### Librarian Agent
- Single source of truth for sync state
- Receives reports from platform agents
- Computes diffs, detects drift, flags missing entities
- Persists state to `sync-state/` in the repo (git-committed)
- Exposes a read API to the dashboard and QA agent

### QA Agent
- Runs after every sync operation
- Performs **textual verification**: compares canonical values from two sources and reports mismatches
- Performs **visual verification**: uses Playwright to screenshot Storybook stories and Figma frames, then compares them (pixel diff or AI-assisted visual diff)
- Produces a QA report: pass/fail per entity, with evidence (screenshots, diffs)
- Posts results to the activity log

---

## 11. Extensibility Contract

To add a new source:

1. Create `adapters/<source-name>/adapter.ts` implementing `PlatformAdapter`
2. Create `adapters/<source-name>/agent.ts` implementing `PlatformAgent`
3. Register in `adapters/registry.ts`
4. Done — the meta-orchestrator, librarian, and dashboard discover it automatically

No changes to core sync logic required.

---

## 12. Success Criteria (v1)

- [ ] Dashboard shows sync matrix for tokens and components across Figma + Storybook + GitHub
- [ ] User can trigger push/pull per entity or per source from the dashboard
- [ ] Primary source selector changes the reference column in the matrix
- [ ] Librarian state is committed to `sync-state/` after every sync
- [ ] QA agent runs after every sync and produces a text report
- [ ] Adding a mock new adapter takes < 30 minutes following the contract
- [ ] No existing n8n workflows are broken

---

## 13. Out of Scope for v1 Scaffold

The v1 scaffold is **skeletal** — interfaces and stubs only, no business logic. The scaffold defines:
- All directory structure
- All TypeScript interfaces and types
- All adapter/agent contracts (as abstract classes or interfaces)
- Dashboard app with empty views wired to mock data
- Librarian with file I/O stubs

Business logic (actual API calls, real diff computation, Playwright visual diff) is filled in per-adapter in subsequent development sessions.
