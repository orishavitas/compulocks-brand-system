// adapters/figma/adapter.ts
// FigmaAdapter — reads Variables, Text Styles, and Component nodes via Figma Plugin API / MCP.
// Phase 1 stub: all methods return empty / throw not-implemented.

import type { PlatformAdapter, AdapterCapabilities, EntitySnapshot, CanonicalEntity, EntityType } from "../types";

export class FigmaAdapter implements PlatformAdapter {
  readonly name = "figma";

  readonly capabilities: AdapterCapabilities = {
    canRead: true,
    canWrite: true,
    entityTypes: ["token", "component", "textStyle"],
  };

  async fetchAll(): Promise<EntitySnapshot[]> {
    // TODO (Session D): connect to Figma MCP server (mcp.figma.com) or Plugin API
    // and return normalized EntitySnapshot[]
    return [];
  }

  async write(_entity: CanonicalEntity, _entityType: EntityType): Promise<void> {
    // TODO (Session H): write token / text style back to Figma Variables
    throw new Error("FigmaAdapter.write() not implemented");
  }

  async ping(): Promise<{ ok: boolean; message?: string }> {
    // TODO: attempt a lightweight Figma API call to confirm reachability
    return { ok: false, message: "not implemented" };
  }
}
