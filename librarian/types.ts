// librarian/types.ts
// Sync state types — what the Librarian stores and the dashboard reads.

import type { CanonicalEntity, EntityType } from "../adapters/types";

export type SyncStatus =
  | "in-sync"     // all sources agree on this entity's value
  | "drifted"     // sources disagree — values differ
  | "missing-in"  // absent in some sources, present in others
  | "only-in"     // present in exactly one source
  | "unknown";    // no data collected yet

export interface EntitySyncRecord {
  entityId: string;
  entityType: EntityType;
  status: SyncStatus;
  /** null/unmatched entries are explicitly represented — one key per known source */
  perSource: {
    [sourceName: string]: {
      status: "present" | "missing" | "unmatched" | "unknown";
      hash: string | null;
      value: CanonicalEntity | null;
      lastSeen: string | null;   // ISO8601, null if never seen
    };
  };
  lastComputed: string;   // ISO8601
}

export interface SyncState {
  version: number;
  computedAt: string;       // ISO8601
  primarySource: string | null;
  sources: string[];        // all known adapter names
  entities: EntitySyncRecord[];
}

export interface LibrarianAgent {
  /** Receive fresh snapshots from agents, recompute sync state, persist to disk. */
  ingest(snapshots: import("../adapters/types").EntitySnapshot[]): Promise<SyncState>;

  /** Read the current sync state without modifying it. */
  getState(): Promise<SyncState>;

  /** Declare which source is authoritative for the current session. */
  setPrimarySource(source: string): Promise<void>;

  /** Get all entity records, optionally filtered by type. */
  getEntities(type?: EntityType): Promise<EntitySyncRecord[]>;
}
