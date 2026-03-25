// librarian/diff.ts
// Hash utility and sync status computation.

import { createHash } from "crypto";
import type { CanonicalEntity, EntitySnapshot, EntityType } from "../adapters/types";
import type { SyncStatus, EntitySyncRecord } from "./types";
import { getAllAdapters } from "../adapters/registry";

/**
 * Produce a stable SHA-1 hash of a canonical entity.
 * Keys are sorted to ensure identical objects always produce identical hashes.
 */
export function hashEntity(entity: CanonicalEntity): string {
  const stable = JSON.stringify(entity, Object.keys(entity).sort());
  return createHash("sha1").update(stable).digest("hex");
}

/**
 * Return only the sources that declare support for the given entity type.
 * Sources that don't support a type should never cause "missing-in" false alarms.
 *
 * Falls back to allSources if the registry is empty (e.g. in tests).
 */
export function capableSources(entityType: EntityType, allSources: string[]): string[] {
  const adapters = getAllAdapters();
  if (adapters.length === 0) return allSources;

  const capable = new Set(
    adapters
      .filter((a) => a.capabilities.entityTypes.includes(entityType))
      .map((a) => a.name)
  );

  // Intersect with allSources (only sources we've actually seen data from)
  return allSources.filter((s) => capable.has(s));
}

/**
 * Compute the SyncStatus for an entity given its snapshots across capable sources.
 *
 * Rules (applied only against capability-filtered source list):
 * - 0 capable sources with data       → "unknown"
 * - exactly 1 capable source present  → "only-in"
 * - all capable sources agree (hash)  → "in-sync"
 * - some capable sources missing it   → "missing-in"
 * - capable sources present but hash differs → "drifted"
 */
export function computeStatus(
  snapshots: EntitySnapshot[],
  capableSourceList: string[]
): SyncStatus {
  if (snapshots.length === 0) return "unknown";

  const presentSources = new Set(snapshots.map((s) => s.source));
  const capablePresent = capableSourceList.filter((s) => presentSources.has(s));

  if (capablePresent.length === 0) return "unknown";
  if (capablePresent.length === 1 && capableSourceList.length >= 1) {
    // only-in if no other capable sources exist yet, or truly only one has it
    return capableSourceList.length === 1 ? "only-in" : "only-in";
  }

  const missingInSome = capableSourceList.some((src) => !presentSources.has(src));
  const capableSnapshots = snapshots.filter((s) => capableSourceList.includes(s.source));
  const hashes = new Set(capableSnapshots.map((s) => s.hash));

  if (missingInSome) return "missing-in";
  if (hashes.size > 1) return "drifted";
  return "in-sync";
}

/**
 * Build an EntitySyncRecord from a group of snapshots for the same entityId.
 * Uses capability-aware source filtering — sources that don't support this entity type
 * are excluded from the perSource map and don't influence the status computation.
 */
export function buildSyncRecord(
  entityId: string,
  entityType: EntityType,
  snapshots: EntitySnapshot[],
  allSources: string[]
): EntitySyncRecord {
  const capable = capableSources(entityType, allSources);
  const perSource: EntitySyncRecord["perSource"] = {};

  for (const source of capable) {
    const snap = snapshots.find((s) => s.source === source);
    perSource[source] = snap
      ? { status: "present", hash: snap.hash, value: snap.value, lastSeen: snap.capturedAt }
      : { status: "missing", hash: null, value: null, lastSeen: null };
  }

  // Also include non-capable sources as "unmatched" for transparency in the dashboard
  for (const source of allSources) {
    if (!capable.includes(source)) {
      perSource[source] = { status: "unmatched", hash: null, value: null, lastSeen: null };
    }
  }

  return {
    entityId,
    entityType,
    status: computeStatus(snapshots, capable),
    perSource,
    lastComputed: new Date().toISOString(),
  };
}
