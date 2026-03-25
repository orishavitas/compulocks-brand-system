// adapters/storybook/adapter.ts
// StorybookAdapter — read-only. Reads component-manifest.json from disk
// or Storybook's index.json from a running Storybook instance.

import { readFileSync, existsSync } from "fs";
import { join } from "path";
import { createHash } from "crypto";
import type { PlatformAdapter, AdapterCapabilities, EntitySnapshot, CanonicalEntity, EntityType } from "../types";
import { manifestComponentToComponent, type ComponentManifest } from "./transformer";

const DEFAULT_MANIFEST_PATH = join(process.cwd(), "component-manifest.json");

export interface StorybookAdapterConfig {
  /** Path to component-manifest.json. Defaults to repo root. */
  manifestPath?: string;
  /** URL of a running Storybook instance for live index.json (future). */
  storybookUrl?: string;
}

export class StorybookAdapter implements PlatformAdapter {
  readonly name = "storybook";

  readonly capabilities: AdapterCapabilities = {
    canRead: true,
    canWrite: false,
    entityTypes: ["component"],
  };

  private manifestPath: string;
  private storybookUrl?: string;

  constructor(config: StorybookAdapterConfig = {}) {
    this.manifestPath = config.manifestPath ?? DEFAULT_MANIFEST_PATH;
    this.storybookUrl = config.storybookUrl;
  }

  async fetchAll(): Promise<EntitySnapshot[]> {
    const manifest = this.readManifest();
    const capturedAt = new Date().toISOString();

    return manifest.components.map((entry) => {
      const component = manifestComponentToComponent(entry);
      // Use the hash from the manifest (already a SHA-1 from export-manifest.mjs)
      // but recompute from the canonical value for cross-source consistency
      const hash = createHash("sha1")
        .update(JSON.stringify(component, Object.keys(component).sort()))
        .digest("hex");

      return {
        entityId: component.id,
        entityType: "component" as const,
        source: "storybook",
        capturedAt,
        hash,
        value: component,
        raw: entry,
      };
    });
  }

  async write(_entity: CanonicalEntity, _entityType: EntityType): Promise<void> {
    throw new Error("StorybookAdapter is read-only — Storybook does not accept writes");
  }

  async ping(): Promise<{ ok: boolean; message?: string }> {
    if (existsSync(this.manifestPath)) {
      try {
        const manifest = this.readManifest();
        return {
          ok: true,
          message: `manifest found — ${manifest.components.length} components (generated ${manifest.generatedAt})`,
        };
      } catch (err) {
        return { ok: false, message: `manifest parse error: ${err instanceof Error ? err.message : String(err)}` };
      }
    }

    if (this.storybookUrl) {
      // TODO: fetch ${storybookUrl}/index.json to confirm Storybook is running
      return { ok: false, message: "live Storybook ping not yet implemented" };
    }

    return { ok: false, message: `manifest not found at ${this.manifestPath}` };
  }

  private readManifest(): ComponentManifest {
    if (!existsSync(this.manifestPath)) {
      throw new Error(`component-manifest.json not found at ${this.manifestPath}`);
    }
    const raw = readFileSync(this.manifestPath, "utf-8");
    return JSON.parse(raw) as ComponentManifest;
  }
}
