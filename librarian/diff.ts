// librarian/diff.ts
// Hash utility and sync status computation.

import { createHash } from "crypto";
import type { CanonicalEntity, EntitySnapshot } from "../adapters/types";
import type { SyncStatus, EntitySyncRecord } from "./types";

/**
 * Produce a stable SHA-1 hash of a canonical entity.
 * Keys are sorted to ensure identical objects always produce identical hashes.
 */
export function hashEntity(entity: CanonicalEntity): string {
  const stable = JSON.stringify(entity, Object.keys(entity).sort());
  return createHash("sha1").update(stable).digest("hex");
}

/**
 * Compute the SyncStatus for an entity given its snapshots across all sources.
 *
 * Rules:
 * - 0 sources with data       → "unknown"
 * - 1 source only             → "only-in"
 * - All sources agree (hash)  → "in-sync"
 * - Some sources missing it   → "missing-in"
 * - Sources present but hash differs → "drifted"
 */
export function computeStatus(
  snapshots: EntitySnapshot[],
  allSources: string[]
): SyncStatus {
  if (snapshots.length === 0) return "unknown";

  const presentSources = new Set(snapshots.map((s) => s.source));

  if (presentSources.size === 1 && allSources.length > 1) return "only-in";

  const missingInSome = allSources.some((src) => !presentSources.has(src));
  const hashes = new Set(snapshots.map((s) => s.hash));

  if (missingInSome) return "missing-in";
  if (hashes.size > 1) return "drifted";
  return "in-sync";
}

/**
 * Build an EntitySyncRecord from a group of snapshots for the same entityId.
 */
export function buildSyncRecord(
  entityId: string,
  entityType: import("../adapters/types").EntityType,
  snapshots: EntitySnapshot[],
  allSources: string[]
): EntitySyncRecord {
  const perSource: EntitySyncRecord["perSource"] = {};

  for (const source of allSources) {
    const snap = snapshots.find((s) => s.source === source);
    perSource[source] = snap
      ? { status: "present", hash: snap.hash, value: snap.value, lastSeen: snap.capturedAt }
      : { status: "missing", hash: null, value: null, lastSeen: null };
  }

  return {
    entityId,
    entityType,
    status: computeStatus(snapshots, allSources),
    perSource,
    lastComputed: new Date().toISOString(),
  };
}
