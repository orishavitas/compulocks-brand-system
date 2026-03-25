# Compulocks Sync Platform — Architecture Design Document

**Date:** 2026-03-24
**Status:** Draft v1.0
**Author:** Jarvis (Claude Code, /yolo session)

---

## 1. System Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                        DASHBOARD (Web App)                          │
│              Sync Matrix  │  Source Health  │  Activity Log         │
└───────────────────────────┬─────────────────────────────────────────┘
                            │ HTTP / REST
┌───────────────────────────▼─────────────────────────────────────────┐
│                      DASHBOARD API (Next.js)                        │
│          /api/state  /api/sync  /api/sources  /api/log              │
└───────────────────────────┬─────────────────────────────────────────┘
                            │
┌───────────────────────────▼─────────────────────────────────────────┐
│                    META-ORCHESTRATOR                                 │
│   Scheduler → decides which agents to wake → dispatches → collects  │
└──┬──────────┬──────────┬──────────┬─────────────────────────────────┘
   │          │          │          │
   ▼          ▼          ▼          ▼
┌──────┐  ┌──────┐  ┌──────┐  ┌──────┐
│Figma │  │Story │  │GitHub│  │Stitch│  ... (pluggable)
│Agent │  │ book │  │Agent │  │Agent │
│      │  │Agent │  │      │  │(stub)│
└──┬───┘  └──┬───┘  └──┬───┘  └──┬───┘
   │          │          │          │
   └──────────┴──────────┴──────────┘
                    │ reports EntitySnapshot[]
┌───────────────────▼─────────────────────────────────────────────────┐
│                       LIBRARIAN AGENT                               │
│  Receives snapshots → computes SyncState → persists to sync-state/  │
└───────────────────┬─────────────────────────────────────────────────┘
                    │ SyncState (git-committed JSON)
┌───────────────────▼─────────────────────────────────────────────────┐
│                        QA AGENT                                     │
│  Runs after sync → text diff + visual diff → QA Report              │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 2. Core Data Model

### 2.1 Canonical Entity Types

All adapters normalize their native data into these canonical forms:

```typescript
// adapters/types.ts

export type EntityType = "token" | "component" | "textStyle";

export interface Token {
  id: string;             // "color.brand.primary"
  type: "color" | "dimension" | "fontFamily" | "fontWeight" | "other";
  value: string | number;
  description?: string;
  group?: string;
}

export interface Component {
  id: string;             // "Button"
  variants: string[];
  states: string[];
  hash: string;
}

export interface TextStyle {
  id: string;             // "textStyle.bigShortTitle"
  fontFamily: string;
  fontWeight: number;
  fontSize?: number;
  lineHeight?: number;
}

export type CanonicalEntity = Token | Component | TextStyle;
```

### 2.2 Entity Snapshot (what agents report)

```typescript
// adapters/types.ts

export interface EntitySnapshot {
  entityId: string;
  entityType: EntityType;
  source: string;           // adapter name: "figma", "storybook", "github"
  capturedAt: string;       // ISO8601
  hash: string;             // SHA-1 of stable JSON stringification
  value: CanonicalEntity;
  raw?: unknown;            // original platform-native form, for debugging
}
```

### 2.3 Sync State (what the librarian stores)

```typescript
// librarian/types.ts

export type SyncStatus =
  | "in-sync"      // all sources agree
  | "drifted"      // sources disagree
  | "missing-in"   // absent in some sources, present in others
  | "only-in"      // present in exactly one source
  | "unknown";     // no data yet

export interface EntitySyncRecord {
  entityId: string;
  entityType: EntityType;
  status: SyncStatus;
  perSource: {
    [sourceName: string]: {
      status: "present" | "missing" | "unknown";
      hash: string | null;
      value: CanonicalEntity | null;
      lastSeen: string | null;
    };
  };
  lastComputed: string;
}

export interface SyncState {
  version: number;
  computedAt: string;
  primarySource: string | null;
  sources: string[];
  entities: EntitySyncRecord[];
}
```

---

## 3. Adapter Protocol

Every platform adapter implements this interface. The meta-orchestrator calls these methods. No adapter knows about other adapters.

```typescript
// adapters/types.ts

export interface AdapterCapabilities {
  canRead: boolean;
  canWrite: boolean;
  entityTypes: EntityType[];
}

export interface PlatformAdapter {
  readonly name: string;
  readonly capabilities: AdapterCapabilities;

  /**
   * Fetch all entities from this source.
   * Returns EntitySnapshot[] normalized to canonical form.
   */
  fetchAll(): Promise<EntitySnapshot[]>;

  /**
   * Write an entity to this source.
   * Only called if capabilities.canWrite === true.
   */
  write(entity: CanonicalEntity, entityType: EntityType): Promise<void>;

  /**
   * Health check — is this source reachable?
   */
  ping(): Promise<{ ok: boolean; message?: string }>;
}
```

### 3.1 Adapter Registry

```typescript
// adapters/registry.ts

import { PlatformAdapter } from "./types";

const adapters: Map<string, PlatformAdapter> = new Map();

export function registerAdapter(adapter: PlatformAdapter): void {
  adapters.set(adapter.name, adapter);
}

export function getAdapter(name: string): PlatformAdapter | undefined {
  return adapters.get(name);
}

export function getAllAdapters(): PlatformAdapter[] {
  return Array.from(adapters.values());
}
```

---

## 4. Agent Protocol

Agents are higher-level than adapters. An agent wraps an adapter and adds orchestration logic: retry, error handling, rate limiting, reporting.

```typescript
// agents/types.ts

export interface AgentRunContext {
  requestedEntityTypes?: EntityType[];
  targetEntityIds?: string[];   // if null, fetch all
  dryRun?: boolean;
}

export interface AgentRunResult {
  source: string;
  snapshots: EntitySnapshot[];
  errors: Array<{ entityId?: string; message: string }>;
  durationMs: number;
}

export interface PlatformAgent {
  readonly name: string;
  readonly adapterName: string;

  run(ctx: AgentRunContext): Promise<AgentRunResult>;
}
```

### 4.1 Meta-Orchestrator

```typescript
// orchestrator/orchestrator.ts

export interface OrchestratorConfig {
  agents: PlatformAgent[];
  librarian: LibrarianAgent;
  qa: QAAgent;
}

export interface SyncRequest {
  sources?: string[];           // if null, all sources
  entityIds?: string[];         // if null, all entities
  primarySource?: string;
  direction?: {
    from: string;
    to: string;
  };
  dryRun?: boolean;
}

export interface SyncResult {
  startedAt: string;
  completedAt: string;
  agentResults: AgentRunResult[];
  librarianSyncState: SyncState;
  qaReport: QAReport;
}

export interface MetaOrchestrator {
  sync(req: SyncRequest): Promise<SyncResult>;
  getState(): Promise<SyncState>;
  ping(): Promise<{ [source: string]: { ok: boolean; message?: string } }>;
}
```

---

## 5. Librarian Agent

The librarian is the single source of truth. It stores state on disk in `sync-state/` as git-committed JSON.

```typescript
// librarian/librarian.ts

export interface LibrarianAgent {
  /**
   * Receive fresh snapshots from agents, recompute sync state, persist.
   */
  ingest(snapshots: EntitySnapshot[]): Promise<SyncState>;

  /**
   * Read current sync state without modifying it.
   */
  getState(): Promise<SyncState>;

  /**
   * Set which source is considered primary.
   */
  setPrimarySource(source: string): Promise<void>;

  /**
   * Get all known entity IDs of a given type.
   */
  getEntities(type?: EntityType): Promise<EntitySyncRecord[]>;
}
```

### 5.1 Persistence Layout

```
sync-state/
├── state.json          ← full SyncState, rewritten on every ingest
├── snapshots/
│   ├── figma.json      ← last EntitySnapshot[] from Figma agent
│   ├── storybook.json  ← last EntitySnapshot[] from Storybook agent
│   └── github.json     ← last EntitySnapshot[] from GitHub agent
└── log/
    ├── 2026-03-24T12-00-00Z.json   ← activity log entries
    └── ...
```

All files are committed to git by the pre-push hook (extending the existing pattern).

---

## 6. QA Agent

```typescript
// qa/types.ts

export type QACheck = "text-diff" | "visual-diff";

export interface QAEntityResult {
  entityId: string;
  entityType: EntityType;
  sourceA: string;
  sourceB: string;
  checks: {
    type: QACheck;
    passed: boolean;
    detail: string;
    evidencePaths?: string[];  // paths to screenshots or diff images
  }[];
  overallPassed: boolean;
}

export interface QAReport {
  runAt: string;
  primarySource: string | null;
  summary: { passed: number; failed: number; skipped: number };
  results: QAEntityResult[];
}

export interface QAAgent {
  /**
   * Run QA checks after a sync operation.
   * Compares entities between sources and reports mismatches.
   */
  run(state: SyncState, options?: {
    entityIds?: string[];
    checks?: QACheck[];
  }): Promise<QAReport>;
}
```

### 6.1 Visual Verification Strategy

For components:
1. **Storybook** → Playwright screenshots each story at canonical viewport
2. **Figma** → Figma REST API exports each component frame as PNG
3. QA agent pixel-diffs the two PNGs using `pixelmatch` or similar
4. Writes diff image to `sync-state/qa/diffs/<entityId>-<date>.png`
5. Reports pass/fail with pixel difference percentage

For tokens:
- Visual diff not applicable
- Text diff only: compare canonical value object

---

## 7. Dashboard API

The dashboard is a Next.js app (App Router). It exposes these API routes:

```
GET  /api/state                    → SyncState (from librarian)
GET  /api/sources                  → Source health (ping all adapters)
POST /api/sync                     → Trigger sync (body: SyncRequest)
POST /api/sync/entity/:id          → Sync single entity
GET  /api/log                      → Activity log entries
POST /api/primary-source           → Set primary source
GET  /api/qa/latest                → Latest QA report
```

All responses are JSON. The dashboard frontend fetches from these endpoints.

---

## 8. Directory Structure (Full)

```
compulocks-brand-system/
├── adapters/
│   ├── types.ts                   ← PlatformAdapter, EntitySnapshot, CanonicalEntity
│   ├── registry.ts                ← registerAdapter, getAdapter, getAllAdapters
│   ├── figma/
│   │   ├── adapter.ts             ← FigmaAdapter implements PlatformAdapter
│   │   ├── transformer.ts         ← Figma API types → CanonicalEntity
│   │   └── types.ts               ← Figma-specific types
│   ├── storybook/
│   │   ├── adapter.ts             ← StorybookAdapter (read-only)
│   │   └── transformer.ts         ← Story manifest → CanonicalEntity
│   ├── github/
│   │   ├── adapter.ts             ← GitHubAdapter
│   │   └── transformer.ts         ← DTCG tokens → CanonicalEntity
│   └── stitch/                    ← (stub, for future)
│       └── adapter.ts
│
├── agents/
│   ├── types.ts                   ← PlatformAgent, AgentRunContext, AgentRunResult
│   ├── figma-agent.ts
│   ├── storybook-agent.ts
│   ├── github-agent.ts
│   └── base-agent.ts              ← shared retry/error logic
│
├── orchestrator/
│   ├── orchestrator.ts            ← MetaOrchestrator impl
│   └── scheduler.ts               ← cron / polling trigger
│
├── librarian/
│   ├── types.ts                   ← SyncState, EntitySyncRecord
│   ├── librarian.ts               ← LibrarianAgent impl
│   └── diff.ts                    ← hash comparison, status computation
│
├── qa/
│   ├── types.ts                   ← QAReport, QAAgent
│   ├── qa-agent.ts
│   ├── text-diff.ts
│   └── visual-diff.ts             ← Playwright + pixelmatch
│
├── sync-state/                    ← git-committed, managed by librarian
│   ├── state.json
│   ├── snapshots/
│   └── log/
│
├── dashboard/                     ← Next.js App Router web app
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx               ← Sync Matrix view
│   │   ├── sources/page.tsx       ← Source Health view
│   │   ├── log/page.tsx           ← Activity Log view
│   │   └── api/
│   │       ├── state/route.ts
│   │       ├── sources/route.ts
│   │       ├── sync/route.ts
│   │       ├── primary-source/route.ts
│   │       └── qa/latest/route.ts
│   ├── components/
│   │   ├── SyncMatrix.tsx
│   │   ├── SourceCard.tsx
│   │   ├── ActivityLog.tsx
│   │   └── PrimarySourceSelector.tsx
│   └── package.json
│
├── lib/                           ← existing shared utilities
│   ├── dtcg-to-figma.mjs
│   └── figma-to-dtcg.mjs
│
├── tokens/                        ← existing token source
├── components/                    ← existing React components + stories
├── figma-plugin/                  ← existing Figma plugin
└── n8n/                           ← existing n8n workflows
```

---

## 9. Technology Choices

| Concern | Choice | Rationale |
|---------|--------|-----------|
| Dashboard framework | Next.js 16 App Router | Already in use in ecosystem; SSR for state |
| UI components | Storybook component library (`@compulocks/ui`) | Eat own cooking |
| Sync state storage | JSON files in `sync-state/` | Git-native, portable, no infra |
| Hash algorithm | SHA-1 (already used in manifest pipeline) | Consistency with existing code |
| Visual diff | Playwright + `pixelmatch` | Playwright already referenced in ecosystem |
| Language | TypeScript throughout | Type safety on all interfaces |
| Agent runtime | Node.js scripts | Lightweight, no framework needed |
| Scheduling | Vercel Cron (for dashboard) or system cron | Depends on where dashboard is hosted |

---

## 10. Extensibility: Adding Google Stitch

When Stitch is ready:

1. Create `adapters/stitch/adapter.ts`:
   ```typescript
   export class StitchAdapter implements PlatformAdapter {
     name = "stitch";
     capabilities = { canRead: true, canWrite: true, entityTypes: ["token", "component"] };
     async fetchAll(): Promise<EntitySnapshot[]> { /* Stitch API calls */ }
     async write(entity, type): Promise<void> { /* Stitch API calls */ }
     async ping(): Promise<{ ok: boolean }> { /* health check */ }
   }
   ```

2. Create `agents/stitch-agent.ts`:
   ```typescript
   export class StitchAgent extends BaseAgent implements PlatformAgent { ... }
   ```

3. Add one line to `adapters/registry.ts`:
   ```typescript
   registerAdapter(new StitchAdapter());
   ```

4. The dashboard automatically shows a new "Stitch" column. Done.

---

## 11. Security Model

- All adapter credentials (Figma API key, GitHub token, n8n webhook URL) live in environment variables
- The dashboard API validates requests before triggering sync
- `sync-state/` contains no secrets — only hashes and canonical values
- The QA agent's screenshot output contains no credentials

---

## 12. Migration from Current System

The current Figma plugin + n8n workflows continue to work unchanged. The sync platform is **additive**:

1. The existing Figma plugin push/pull remains for quick manual syncs
2. The platform's Figma adapter reuses the same Figma REST API, same token
3. The existing manifest pipeline feeds the Storybook adapter (no changes needed)
4. The existing n8n Code→Figma workflow can be retired once the Figma agent is stable
5. The `sync-state/` directory is new — add it to `.gitignore` exclusion or leave it committed (recommended: commit it)

---

## 13. Open Questions

| Question | Impact | Priority |
|----------|--------|----------|
| Where is the dashboard hosted? (Vercel, local, Figma plugin embed?) | Determines API auth model | P0 |
| Does visual diff need human approval before write-back? | QA agent design | P1 |
| Should the librarian emit webhooks on state change? | Real-time dashboard updates | P2 |
| How do we handle Figma component nodes that have no Storybook equivalent? | Missing-in logic | P1 |
| Should sync-state/ be gitignored or committed? | Team workflow | P0 |

---

## 14. Decisions from First Real Sync (2026-03-24)

First sync produced 37 entities (5 components from Storybook, 32 tokens from GitHub). All 37 showed `only-in` status — correct behaviour, but revealed three architectural decisions that must be made before adding the Figma adapter.

### 14.1 Capability-Aware Cross-Referencing

**Decision:** The Librarian must consult each adapter's `capabilities.entityTypes` before computing `missing-in` vs `only-in` status.

- If a source doesn't declare support for an entity type, the entity should never be marked `missing-in` for that source
- Example: Storybook `canRead: ["component"]` — tokens should show as `only-in` (correct), not `missing-in` (false alarm)
- Implementation: `buildSyncRecord()` in `diff.ts` should filter `allSources` per entity type before computing status

**Why Figma solves this:** Figma is the only source that supports both `token` AND `component`. Once the Figma adapter is wired, genuine cross-source comparisons become possible for the first time.

### 14.2 Single-Source Entities Are Not Errors

**Decision:** `only-in` status for tokens (GitHub-only) and components (Storybook-only) is expected and valid until Figma is connected. The dashboard should display these neutrally — no red warning, no action required.

- `only-in` = "this entity type is not tracked in other sources yet" (informational)
- `drifted` = "same entity is present in 2+ sources with different values" (actionable)
- `missing-in` = "entity is expected in a source that supports its type but it's absent" (actionable)

### 14.3 Token↔Component Linking (New Entity Type Required)

**Problem:** No mechanism exists to connect a GitHub token (e.g., `color.brand.primary`) to a Storybook component that uses it (e.g., `Button`).

**Planned solution:** Add a `TokenUsage` relational entity type:
```typescript
export interface TokenUsage {
  tokenId: string;        // "color.brand.primary"
  componentId: string;    // "Button"
  usageContext: string;   // "background", "border", "text"
  source: string;         // which adapter discovered this relationship
}
```

**How to populate it:**
1. **Short term:** `figma-design-system-extractor` MCP tool (extracts rendered HTML + styles from Storybook)
2. **Medium term:** Figma MCP `get_design_context` — maps tokens applied within Figma component nodes
3. **Long term:** Storybook Connect (Chromatic) — links Storybook stories to Figma designs directly

This is a Phase 6+ addition — does not block the Figma adapter implementation.
