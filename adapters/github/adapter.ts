// adapters/github/adapter.ts
// GitHubAdapter — reads DTCG tokens from tokens/*.json.
// Supports two modes:
//   1. Local disk (default, fast) — reads from the working copy
//   2. Remote GitHub Contents API — reads from any branch/commit via PAT

import { readFileSync, existsSync, readdirSync } from "fs";
import { join } from "path";
import { createHash } from "crypto";
import type { PlatformAdapter, AdapterCapabilities, EntitySnapshot, CanonicalEntity, EntityType } from "../types";
import { dtcgTokenToToken, flattenDTCG } from "./transformer";

export interface GitHubAdapterConfig {
  /** Local path to tokens/ directory. Defaults to cwd/tokens. */
  tokensDir?: string;
  /** If set, reads from GitHub API instead of disk. Requires token. */
  remote?: {
    owner: string;
    repo: string;
    ref?: string;   // branch or commit SHA, defaults to main
    token: string;  // GitHub PAT with repo:read scope
  };
}

export class GitHubAdapter implements PlatformAdapter {
  readonly name = "github";

  readonly capabilities: AdapterCapabilities = {
    canRead: true,
    canWrite: true,
    entityTypes: ["token"],
  };

  private tokensDir: string;
  private remote?: GitHubAdapterConfig["remote"];

  constructor(config: GitHubAdapterConfig = {}) {
    this.tokensDir = config.tokensDir ?? join(process.cwd(), "tokens");
    this.remote = config.remote;
  }

  async fetchAll(): Promise<EntitySnapshot[]> {
    const tokenFiles = this.remote
      ? await this.fetchRemoteTokenFiles()
      : this.readLocalTokenFiles();

    const capturedAt = new Date().toISOString();
    const snapshots: EntitySnapshot[] = [];

    for (const [filename, content] of tokenFiles) {
      const flat = flattenDTCG(content as Record<string, unknown>);
      for (const [id, dtcgToken] of flat) {
        const token = dtcgTokenToToken(id, dtcgToken);
        const hash = createHash("sha1")
          .update(JSON.stringify(token, Object.keys(token).sort()))
          .digest("hex");

        snapshots.push({
          entityId: token.id,
          entityType: "token",
          source: "github",
          capturedAt,
          hash,
          value: token,
          raw: { file: filename, dtcg: dtcgToken },
        });
      }
    }

    return snapshots;
  }

  async write(_entity: CanonicalEntity, _entityType: EntityType): Promise<void> {
    // TODO (Session H): create a PR updating the relevant tokens/*.json file
    throw new Error("GitHubAdapter.write() not implemented — will create a PR");
  }

  async ping(): Promise<{ ok: boolean; message?: string }> {
    if (this.remote) {
      // TODO: lightweight GitHub API call to confirm token validity and repo access
      return { ok: false, message: "remote ping not implemented" };
    }

    if (existsSync(this.tokensDir)) {
      const files = readdirSync(this.tokensDir).filter((f) => f.endsWith(".json"));
      return { ok: true, message: `found ${files.length} token files in ${this.tokensDir}` };
    }

    return { ok: false, message: `tokens/ directory not found at ${this.tokensDir}` };
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  private readLocalTokenFiles(): Map<string, unknown> {
    const result = new Map<string, unknown>();
    if (!existsSync(this.tokensDir)) return result;

    const files = readdirSync(this.tokensDir).filter((f) => f.endsWith(".json"));
    for (const file of files) {
      const raw = readFileSync(join(this.tokensDir, file), "utf-8");
      try {
        result.set(file, JSON.parse(raw));
      } catch {
        // malformed JSON — skip silently
      }
    }
    return result;
  }

  private async fetchRemoteTokenFiles(): Promise<Map<string, unknown>> {
    const { owner, repo, ref = "main", token } = this.remote!;
    const result = new Map<string, unknown>();

    const headers = {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github.v3+json",
    };

    // List contents of tokens/ directory
    const listUrl = `https://api.github.com/repos/${owner}/${repo}/contents/tokens?ref=${ref}`;
    const listRes = await fetch(listUrl, { headers });
    if (!listRes.ok) {
      throw new Error(`GitHub API error listing tokens/: ${listRes.status} ${listRes.statusText}`);
    }

    const entries = (await listRes.json()) as Array<{ name: string; download_url: string }>;
    const jsonFiles = entries.filter((e) => e.name.endsWith(".json"));

    await Promise.all(
      jsonFiles.map(async (entry) => {
        const fileRes = await fetch(entry.download_url, { headers });
        if (!fileRes.ok) return;
        const content = await fileRes.json();
        result.set(entry.name, content);
      })
    );

    return result;
  }
}
