# Executive Technical Brief: Compulocks Sync Platform — Current State

**Date:** 2026-03-25
**Audience:** Senior engineer or technical stakeholder joining the project
**Purpose:** Accurate picture of what exists today, what runs in production, and what is deferred

---

## What Was Built

The Compulocks Sync Platform is a source-agnostic control plane for design system synchronization. It lives in the `compulocks-brand-system` monorepo alongside the existing token system (`tokens/`), component library (`components/`), and Figma plugin (`figma-plugin/`). The platform was designed and fully scaffolded in a single session on 2026-03-24. A first real sync run executed on 2026-03-25 and produced committed state data.

The directory layout:

```
adapters/          # PlatformAdapter implementations (Storybook + GitHub live; Figma + Stitch stubbed)
agents/            # PlatformAgent wrappers: retry logic + structured JSON logging
librarian/         # Diff engine + sync-state persistence (state.json, snapshots, activity log)
orchestrator/      # MetaOrchestrator: parallel agent dispatch + QA trigger
qa/                # QAAgent: text diff live, visual diff stubbed
sync-state/        # Git-committed JSON — state.json + snapshots/ + log/
dashboard/         # Next.js 15 App Router dashboard
```

**TypeScript compilation** is split into two configs with different targets:

- `tsconfig.sync.json` — `module: commonjs`, `@types/node`, targets `adapters/`, `agents/`, `librarian/`, `orchestrator/`, `qa/`. Used for the Node.js runtime (orchestrator, CLI scripts, API routes).
- `dashboard/tsconfig.json` — `moduleResolution: bundler` for Next.js 15. Includes parent-repo TypeScript source via `../{adapters,librarian,agents,orchestrator,qa}/**/*.ts` path globs so the dashboard can import platform types without a build step.

Both must pass `tsc --noEmit` before committing changes to the sync platform.

---

## Architecture In Production

The platform is a five-layer stack. Each layer has a single, narrow responsibility.

**Layer 1 — PlatformAdapter** (`adapters/types.ts`)

The protocol every tool must implement. Four members:

```typescript
interface PlatformAdapter {
  readonly source: string;
  readonly capabilities: { entityTypes: EntityType[] };
  ping(): Promise<boolean>;
  fetchAll(): Promise<EntitySnapshot[]>;
  write(entity: CanonicalEntity): Promise<void>;
}
```

`source` is the stable string identifier used as a key throughout the system. `capabilities.entityTypes` declares what this adapter can observe — this is the input to capability-aware diffing.

**Layer 2 — AdapterRegistry** (`adapters/registry.ts`)

A singleton map from source string to adapter instance. Populated by calling `registerAllAdapters()` at every entry point: the orchestrator constructor, the dashboard API routes, and any CLI script that calls into the librarian. The registry is what allows `diff.ts` to filter sources by capability without knowing the adapter implementations.

**Layer 3 — PlatformAgent** (`agents/base-agent.ts`)

Wraps an adapter with two cross-cutting concerns: `withRetry()` (configurable attempts and backoff) and structured JSON logging to stdout. The agent does not contain business logic. It is a reliability envelope around any adapter.

**Layer 4 — Librarian** (`librarian/librarian.ts`)

Receives `EntitySnapshot[]` arrays from all agents, merges them by `entityId`, runs `buildSyncRecord()` per entity to compute status, and persists three files: `sync-state/state.json` (full current state), `sync-state/snapshots/<source>-<timestamp>.json` (per-source raw snapshot), and an append-only `sync-state/log/activity.jsonl`.

**Layer 5 — MetaOrchestrator** (`orchestrator/orchestrator.ts`)

Dispatches all registered agents in parallel via `Promise.all()`, collects `EntitySnapshot[]` from each, feeds the merged array to the Librarian, and triggers the QA agent on the resulting sync state. Returns a `SyncResult` containing the full librarian output and QA report.

**Key canonical types:**

```typescript
interface EntitySnapshot {
  entityId: string;
  entityType: "token" | "component" | "textStyle";
  source: string;           // "storybook" | "github" | "figma"
  capturedAt: string;       // ISO 8601
  hash: string;             // SHA-1 of stable JSON serialization
  value: CanonicalEntity;
}
```

```typescript
type SyncStatus =
  | "in-sync"     // all capable sources agree on hash
  | "drifted"     // capable sources present, hashes differ
  | "missing-in"  // present in some capable sources, absent in others
  | "only-in"     // present in exactly one capable source
  | "unknown";    // no capable source has data for this entity
```

**Capability-aware diff** (`librarian/diff.ts`): Before computing `SyncStatus`, `capableSources()` queries the AdapterRegistry to filter the source list to only those adapters that declare support for the entity's type. A token missing from Storybook is not a sync issue — Storybook's `capabilities.entityTypes` does not include `"token"`. Non-capable sources appear in the dashboard as `"unmatched"` for transparency but do not influence status computation.

**Dashboard** (`dashboard/`): Next.js 15 App Router. Three rendered views: Sync Matrix (entity-by-entity status across all sources), Sources (adapter health and capability declarations), Activity Log (append-only log of sync operations). Five API routes, all wired to real Librarian state:

| Route | Purpose |
|---|---|
| `GET /api/state` | Full `sync-state/state.json` |
| `POST /api/sync` | Trigger a live orchestrator run |
| `GET /api/sources` | Registered adapters + capabilities |
| `GET /api/log` | Activity log entries |
| `GET /api/primary-source` | Current primary source setting |

---

## Live Data

The first sync run completed 2026-03-25. State is committed to `sync-state/state.json`.

| Metric | Value |
|---|---|
| Total entities | 37 |
| Components (Storybook) | 5 |
| Tokens (GitHub) | 32 |
| Active sources | `storybook`, `github` |
| Primary source | null (not yet set) |
| Dominant status | `only-in` (all 37 entities) |

Every entity shows `only-in` because each entity currently exists in exactly one capable source. This is the correct and expected behavior. The status `only-in` means: "present in one source, no other capable source has data." It is not an error state — it is the system accurately reporting that Figma has not yet been connected. When the Figma adapter is wired and a sync runs, entities present in both GitHub and Figma will resolve to `in-sync` or `drifted`. Entities present in only one of those sources will show `missing-in`.

The 5 Storybook components (Button, Card, Input, Badge, Tag) and 32 GitHub tokens (DTCG color, typography, and spacing tokens) are all correctly identified, hashed, and recorded.

---

## What's Stubbed (Deferred by Design)

| Component | Status | Notes |
|---|---|---|
| `FigmaAdapter.fetchAll()` | Stub — returns `[]` | Figma MCP server auth in progress (Session F) |
| `StitchAdapter` | Full stub | No public Stitch API available yet |
| QA visual diff | Stub — returns empty diff | Session G: Playwright screenshots + pixelmatch |
| `GitHubAdapter.write()` | Not implemented | Session H: PR creation flow |
| `FigmaAdapter.write()` | Not implemented | Session H: Figma Variables push |
| Dashboard push/pull buttons | UI present, no-op | Become functional in Session H |

The adapter protocol was designed with write operations as a first-class concern from the start. The `write()` signature is defined on `PlatformAdapter`. The stubs preserve the interface contract so write implementations can be dropped in without changing the orchestrator or librarian.

---

## What's Next

**Session F (in progress):** Implement `FigmaAdapter.fetchAll()` via the Figma MCP server (`mcp.figma.com`). The Figma REST Variables API requires an Enterprise plan — the MCP server provides an alternative auth path via OAuth. Research session underway. When complete, this produces the first three-way sync matrix (Storybook + GitHub + Figma) and the first non-`only-in` statuses.

**Session G:** QA visual diff — Playwright captures component screenshots before and after a sync operation, pixelmatch computes per-pixel delta, the QA agent returns a structured `QAReport` with visual diff results. Also: `TokenUsage` relational entity type linking GitHub token values to Storybook component usage (which components reference which tokens).

**Session H:** Write operations. `GitHubAdapter.write()` opens a pull request with token changes. `FigmaAdapter.write()` pushes entity values to Figma Variables. Dashboard push/pull buttons become operational.

**Session I (planned):** Dashboard "Knowledge Base" tab — natural language queries grounded in `sync-state/state.json` data, answering questions like "Is Button in sync?" or "What tokens does the Tag component use?"
