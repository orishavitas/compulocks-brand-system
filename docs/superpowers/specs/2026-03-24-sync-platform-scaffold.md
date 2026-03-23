# Compulocks Sync Platform — Skeletal Scaffold Plan

**Date:** 2026-03-24
**Status:** Draft v1.0
**Author:** Jarvis (Claude Code, /yolo session)

This document describes the exact files to create in Phase 1 (scaffold). Each file is a stub — correct types and interfaces, no real business logic. Every subsequent development session fills in one adapter, one agent, or one dashboard view.

---

## Phase 1: Scaffold — What Gets Created

### 1. Core Types Package

**`adapters/types.ts`**
- All canonical entity types: `Token`, `Component`, `TextStyle`, `CanonicalEntity`
- `EntitySnapshot`, `EntityType`, `AdapterCapabilities`, `PlatformAdapter` interface
- `SyncStatus` enum

**`adapters/registry.ts`**
- `registerAdapter()`, `getAdapter()`, `getAllAdapters()`
- Empty registry, auto-discovers nothing yet

**`agents/types.ts`**
- `PlatformAgent` interface, `AgentRunContext`, `AgentRunResult`

**`agents/base-agent.ts`**
- Abstract `BaseAgent` class with retry logic stub, logging stub

**`librarian/types.ts`**
- `SyncState`, `EntitySyncRecord`, `LibrarianAgent` interface

**`librarian/diff.ts`**
- `computeStatus()` stub: takes snapshots per source, returns `SyncStatus`
- `hashEntity()` utility: stable JSON stringify → SHA-1

**`qa/types.ts`**
- `QAReport`, `QAEntityResult`, `QAAgent` interface

**`orchestrator/orchestrator.ts`**
- `MetaOrchestrator` class stub: constructor takes agents + librarian + qa, `sync()` returns mock result

---

### 2. Adapter Stubs

**`adapters/figma/types.ts`**
- Raw Figma API response shapes (Variables, Text Styles, Component nodes)

**`adapters/figma/transformer.ts`**
- `figmaVariableToToken()` — stub returning null for now
- `figmaTextStyleToTextStyle()` — stub
- `figmaComponentToComponent()` — stub

**`adapters/figma/adapter.ts`**
```typescript
export class FigmaAdapter implements PlatformAdapter {
  name = "figma";
  capabilities = { canRead: true, canWrite: true, entityTypes: ["token", "component", "textStyle"] };
  async fetchAll(): Promise<EntitySnapshot[]> { return []; }  // TODO
  async write(_entity, _type): Promise<void> {}               // TODO
  async ping(): Promise<{ ok: boolean }> { return { ok: false, message: "not implemented" }; }
}
```

**`adapters/storybook/transformer.ts`**
- `manifestComponentToComponent()` — reads from `component-manifest.json` format

**`adapters/storybook/adapter.ts`**
```typescript
export class StorybookAdapter implements PlatformAdapter {
  name = "storybook";
  capabilities = { canRead: true, canWrite: false, entityTypes: ["component"] };
  async fetchAll(): Promise<EntitySnapshot[]> { return []; }  // TODO: read manifest
  async write(): Promise<void> { throw new Error("Storybook is read-only"); }
  async ping(): Promise<{ ok: boolean }> { return { ok: false, message: "not implemented" }; }
}
```

**`adapters/github/transformer.ts`**
- `dtcgTokenToToken()` — converts DTCG `{ $value, $type, $description }` to `Token`

**`adapters/github/adapter.ts`**
```typescript
export class GitHubAdapter implements PlatformAdapter {
  name = "github";
  capabilities = { canRead: true, canWrite: true, entityTypes: ["token"] };
  async fetchAll(): Promise<EntitySnapshot[]> { return []; }  // TODO: GitHub Contents API
  async write(_entity, _type): Promise<void> {}               // TODO: create PR
  async ping(): Promise<{ ok: boolean }> { return { ok: false, message: "not implemented" }; }
}
```

**`adapters/stitch/adapter.ts`** *(future stub)*
```typescript
export class StitchAdapter implements PlatformAdapter {
  name = "stitch";
  capabilities = { canRead: false, canWrite: false, entityTypes: [] };
  async fetchAll(): Promise<EntitySnapshot[]> { return []; }
  async write(): Promise<void> { throw new Error("not implemented"); }
  async ping(): Promise<{ ok: boolean }> { return { ok: false, message: "not implemented" }; }
}
```

---

### 3. Agent Stubs

**`agents/figma-agent.ts`**
```typescript
export class FigmaAgent extends BaseAgent implements PlatformAgent {
  name = "figma-agent";
  adapterName = "figma";
  async run(ctx: AgentRunContext): Promise<AgentRunResult> {
    // TODO: call FigmaAdapter.fetchAll(), wrap in AgentRunResult
    return { source: "figma", snapshots: [], errors: [], durationMs: 0 };
  }
}
```

**`agents/storybook-agent.ts`** — same pattern
**`agents/github-agent.ts`** — same pattern

---

### 4. Librarian Stub

**`librarian/librarian.ts`**
```typescript
export class Librarian implements LibrarianAgent {
  private statePath = "sync-state/state.json";

  async ingest(snapshots: EntitySnapshot[]): Promise<SyncState> {
    // TODO: compute diffs, write state.json, write snapshots/<source>.json
    const state: SyncState = {
      version: 1,
      computedAt: new Date().toISOString(),
      primarySource: null,
      sources: [...new Set(snapshots.map(s => s.source))],
      entities: [],
    };
    return state;
  }

  async getState(): Promise<SyncState> {
    // TODO: read sync-state/state.json
    return { version: 1, computedAt: "", primarySource: null, sources: [], entities: [] };
  }

  async setPrimarySource(source: string): Promise<void> {
    // TODO: update state.json primarySource field
  }

  async getEntities(type?: EntityType): Promise<EntitySyncRecord[]> {
    const state = await this.getState();
    return type ? state.entities.filter(e => e.entityType === type) : state.entities;
  }
}
```

---

### 5. QA Agent Stub

**`qa/qa-agent.ts`**
```typescript
export class QAAgentImpl implements QAAgent {
  async run(state: SyncState, options?: { entityIds?: string[]; checks?: QACheck[] }): Promise<QAReport> {
    // TODO: iterate entities, call text-diff and visual-diff per entity
    return {
      runAt: new Date().toISOString(),
      primarySource: state.primarySource,
      summary: { passed: 0, failed: 0, skipped: state.entities.length },
      results: [],
    };
  }
}
```

**`qa/text-diff.ts`** — stub: compares two `CanonicalEntity` objects, returns pass/fail + detail string
**`qa/visual-diff.ts`** — stub: Playwright + pixelmatch, returns pass/fail + diff image path

---

### 6. Sync State Directory

```
sync-state/
├── .gitkeep
├── state.json              ← initial empty state
└── snapshots/
    └── .gitkeep
```

Initial `state.json`:
```json
{
  "version": 1,
  "computedAt": "2026-03-24T00:00:00.000Z",
  "primarySource": null,
  "sources": [],
  "entities": []
}
```

---

### 7. Dashboard Scaffold (Next.js)

**`dashboard/package.json`** — Next.js 16, React, TypeScript, shadcn/ui, @compulocks/ui

**`dashboard/app/layout.tsx`** — root layout with sidebar nav (Sync Matrix | Sources | Log)

**`dashboard/app/page.tsx`** — Sync Matrix view, fetches `/api/state`, renders placeholder table

**`dashboard/app/sources/page.tsx`** — Source Health view, fetches `/api/sources`, renders placeholder cards

**`dashboard/app/log/page.tsx`** — Activity Log view, fetches `/api/log`, renders placeholder list

**`dashboard/app/api/state/route.ts`**
```typescript
export async function GET() {
  // TODO: import Librarian, call getState()
  return Response.json({ version: 1, computedAt: "", primarySource: null, sources: [], entities: [] });
}
```

**`dashboard/app/api/sync/route.ts`**
```typescript
export async function POST(req: Request) {
  // TODO: import MetaOrchestrator, call sync(body)
  return Response.json({ ok: true, message: "not implemented" });
}
```

**`dashboard/app/api/sources/route.ts`** — stub returning empty health object
**`dashboard/app/api/primary-source/route.ts`** — stub
**`dashboard/app/api/qa/latest/route.ts`** — stub returning empty QA report

**`dashboard/components/SyncMatrix.tsx`** — empty table with correct column structure
**`dashboard/components/SourceCard.tsx`** — source health card stub
**`dashboard/components/PrimarySourceSelector.tsx`** — dropdown stub

---

## Phase 2: First Real Implementation (post-scaffold)

Once the scaffold is in place, development sessions fill in one slice at a time:

| Session | Goal |
|---------|------|
| Session A | Implement `StorybookAdapter.fetchAll()` — reads `component-manifest.json`, returns real `EntitySnapshot[]` |
| Session B | Implement `GitHubAdapter.fetchAll()` — calls GitHub Contents API, returns token snapshots |
| Session C | Implement `Librarian.ingest()` + `diff.ts` — real hash comparison and `SyncState` computation |
| Session D | Implement `FigmaAdapter.fetchAll()` — calls Figma Variables API |
| Session E | Wire dashboard `/api/state` → real Librarian data; render real Sync Matrix |
| Session F | Implement `QAAgent` text diff |
| Session G | Implement `QAAgent` visual diff (Playwright + pixelmatch) |
| Session H | Implement write operations (Figma + GitHub); enable push/pull buttons in dashboard |
| Session I | Google Stitch adapter |

Each session is self-contained. The scaffold ensures they don't step on each other.

---

## Scaffold Build Order

1. `adapters/types.ts` — everything else depends on this
2. `librarian/types.ts` — needed by orchestrator
3. `agents/types.ts` — needed by orchestrator
4. `qa/types.ts` — needed by orchestrator
5. `adapters/registry.ts`
6. `agents/base-agent.ts`
7. All adapter stubs (figma, storybook, github, stitch) — parallel
8. All agent stubs — parallel with adapters
9. `librarian/librarian.ts` + `librarian/diff.ts`
10. `qa/qa-agent.ts` + `qa/text-diff.ts` + `qa/visual-diff.ts`
11. `orchestrator/orchestrator.ts`
12. `sync-state/` initial files
13. `dashboard/` — Next.js scaffold
14. Wire dashboard API routes to stub implementations
15. Commit everything

---

## Acceptance Criteria for Scaffold

- [ ] All TypeScript files compile with no errors (`tsc --noEmit`)
- [ ] `adapters/registry.ts` can be imported and `getAllAdapters()` returns empty array
- [ ] `Librarian.getState()` returns a valid empty `SyncState` object
- [ ] `MetaOrchestrator.sync({})` runs without throwing (returns mock result)
- [ ] `dashboard/` runs with `next dev` and all three routes render (empty but no errors)
- [ ] `sync-state/state.json` exists and is valid JSON
- [ ] `npm run build` (token build) still works — scaffold does not break existing system
