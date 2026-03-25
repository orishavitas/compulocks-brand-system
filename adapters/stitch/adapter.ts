// adapters/stitch/adapter.ts
// StitchAdapter — future stub for Google Stitch (AI design tool).
// No public API exists yet. Activate when Stitch releases an API.

import type { PlatformAdapter, AdapterCapabilities, EntitySnapshot, CanonicalEntity, EntityType } from "../types";

export class StitchAdapter implements PlatformAdapter {
  readonly name = "stitch";

  readonly capabilities: AdapterCapabilities = {
    canRead: false,
    canWrite: false,
    entityTypes: [],
  };

  async fetchAll(): Promise<EntitySnapshot[]> {
    // No public API available as of 2026-03-24.
    // Watch https://labs.google/stitching for API announcements.
    return [];
  }

  async write(_entity: CanonicalEntity, _entityType: EntityType): Promise<void> {
    throw new Error("StitchAdapter: no public API — not implemented");
  }

  async ping(): Promise<{ ok: boolean; message?: string }> {
    return { ok: false, message: "Google Stitch has no public API yet" };
  }
}
