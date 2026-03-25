// adapters/figma/adapter.ts
// FigmaAdapter — reads tokens, text styles, and components from Figma.
//
// Auth reality: The official Figma MCP server (mcp.figma.com) requires browser-based
// OAuth and is not usable in a headless/server-side context. The Figma REST Variables
// API requires an Enterprise seat. This adapter therefore uses a snapshot-file approach:
//
//   sync-state/snapshots/figma.json — written by the Figma Plugin (via n8n webhook)
//   when the user clicks "Push" in the plugin. The adapter reads this file on demand.
//
// This bridges the plugin-push flow with the sync platform's pull-based architecture.
// When Figma adds PAT support to their MCP server, this adapter can be upgraded to
// call the MCP directly without changing any upstream code.

import { readFileSync, existsSync, statSync } from "fs";
import { join } from "path";
import type { PlatformAdapter, AdapterCapabilities, EntitySnapshot, CanonicalEntity, EntityType } from "../types";

const SNAPSHOT_FILE = join(process.cwd(), "sync-state", "snapshots", "figma.json");

export class FigmaAdapter implements PlatformAdapter {
  readonly name = "figma";

  readonly capabilities: AdapterCapabilities = {
    canRead: true,
    canWrite: true,
    entityTypes: ["token", "component", "textStyle"],
  };

  async fetchAll(): Promise<EntitySnapshot[]> {
    if (!existsSync(SNAPSHOT_FILE)) {
      // No data yet — the user has not pushed from the Figma plugin.
      // Return empty so the sync matrix shows "only-in" for other sources
      // rather than erroring. This is the expected state before first plugin push.
      return [];
    }

    try {
      const raw = readFileSync(SNAPSHOT_FILE, "utf-8");
      const snapshots = JSON.parse(raw) as EntitySnapshot[];

      if (!Array.isArray(snapshots)) {
        throw new Error("figma.json is not an array");
      }

      return snapshots;
    } catch (err) {
      throw new Error(
        `FigmaAdapter: failed to read ${SNAPSHOT_FILE}: ${(err as Error).message}`
      );
    }
  }

  async write(_entity: CanonicalEntity, _entityType: EntityType): Promise<void> {
    // TODO (Session H): push token / text style back to Figma Variables via n8n webhook
    throw new Error("FigmaAdapter.write() not implemented — will push via n8n webhook");
  }

  async ping(): Promise<{ ok: boolean; message?: string }> {
    if (!existsSync(SNAPSHOT_FILE)) {
      return {
        ok: false,
        message: "figma.json not found — push from the Figma plugin to populate",
      };
    }

    try {
      const stat = statSync(SNAPSHOT_FILE);
      const raw = readFileSync(SNAPSHOT_FILE, "utf-8");
      const snapshots = JSON.parse(raw) as EntitySnapshot[];
      const count = Array.isArray(snapshots) ? snapshots.length : 0;
      const age = Math.round((Date.now() - stat.mtimeMs) / 1000 / 60);

      return {
        ok: count > 0,
        message: `${count} snapshots, last updated ${age}m ago`,
      };
    } catch (err) {
      return { ok: false, message: (err as Error).message };
    }
  }
}
