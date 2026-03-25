// librarian/librarian.ts
// Librarian — single source of truth. Ingests snapshots, computes sync state,
// persists to sync-state/ as git-committed JSON.

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs";
import { join } from "path";
import type { EntitySnapshot, EntityType } from "../adapters/types";
import type { SyncState, EntitySyncRecord, LibrarianAgent } from "./types";
import { hashEntity, buildSyncRecord } from "./diff";

const STATE_DIR = join(process.cwd(), "sync-state");
const STATE_FILE = join(STATE_DIR, "state.json");
const SNAPSHOTS_DIR = join(STATE_DIR, "snapshots");
const LOG_DIR = join(STATE_DIR, "log");

function ensureDirs(): void {
  for (const dir of [STATE_DIR, SNAPSHOTS_DIR, LOG_DIR]) {
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  }
}

function readState(): SyncState {
  if (!existsSync(STATE_FILE)) {
    return emptyState();
  }
  try {
    return JSON.parse(readFileSync(STATE_FILE, "utf-8")) as SyncState;
  } catch {
    return emptyState();
  }
}

function emptyState(): SyncState {
  return {
    version: 1,
    computedAt: new Date().toISOString(),
    primarySource: null,
    sources: [],
    entities: [],
  };
}

export class Librarian implements LibrarianAgent {
  async ingest(snapshots: EntitySnapshot[]): Promise<SyncState> {
    ensureDirs();

    // Compute all known sources from this batch + existing state
    const existingState = readState();
    const batchSources = [...new Set(snapshots.map((s) => s.source))];
    const allSources = [...new Set([...existingState.sources, ...batchSources])];

    // Persist per-source snapshots
    for (const source of batchSources) {
      const sourceSnaps = snapshots.filter((s) => s.source === source);
      writeFileSync(
        join(SNAPSHOTS_DIR, `${source}.json`),
        JSON.stringify(sourceSnaps, null, 2)
      );
    }

    // Group snapshots by entityId
    const byEntityId = new Map<string, EntitySnapshot[]>();
    for (const snap of snapshots) {
      if (!byEntityId.has(snap.entityId)) byEntityId.set(snap.entityId, []);
      byEntityId.get(snap.entityId)!.push(snap);
    }

    // Preserve existing entities not in this batch (merge, don't replace)
    const existingByEntityId = new Map(
      existingState.entities.map((e) => [e.entityId, e])
    );

    const entities: EntitySyncRecord[] = [];

    // Update entities that appear in the new batch
    for (const [entityId, snaps] of byEntityId) {
      entities.push(
        buildSyncRecord(entityId, snaps[0].entityType, snaps, allSources)
      );
    }

    // Retain entities from prior state that weren't in this batch
    for (const [entityId, record] of existingByEntityId) {
      if (!byEntityId.has(entityId)) {
        entities.push(record);
      }
    }

    const newState: SyncState = {
      version: existingState.version,
      computedAt: new Date().toISOString(),
      primarySource: existingState.primarySource,
      sources: allSources,
      entities,
    };

    writeFileSync(STATE_FILE, JSON.stringify(newState, null, 2));

    // Append activity log entry
    const logFile = join(LOG_DIR, `${new Date().toISOString().replace(/[:.]/g, "-")}.json`);
    writeFileSync(logFile, JSON.stringify({
      type: "ingest",
      sources: batchSources,
      entityCount: snapshots.length,
      ts: new Date().toISOString(),
    }, null, 2));

    return newState;
  }

  async getState(): Promise<SyncState> {
    return readState();
  }

  async setPrimarySource(source: string): Promise<void> {
    ensureDirs();
    const state = readState();
    state.primarySource = source;
    state.computedAt = new Date().toISOString();
    writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
  }

  async getEntities(type?: EntityType): Promise<EntitySyncRecord[]> {
    const state = readState();
    return type ? state.entities.filter((e) => e.entityType === type) : state.entities;
  }
}
