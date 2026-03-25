// agents/github-agent.ts

import { BaseAgent } from "./base-agent";
import type { AgentRunContext, AgentRunResult, PlatformAgent } from "./types";
import { GitHubAdapter } from "../adapters/github/adapter";

export class GitHubAgent extends BaseAgent implements PlatformAgent {
  readonly name = "github-agent";
  readonly adapterName = "github";

  private adapter = new GitHubAdapter();

  async run(ctx: AgentRunContext): Promise<AgentRunResult> {
    const start = Date.now();
    this.log("info", "GitHubAgent.run() starting", ctx);

    try {
      const snapshots = await this.withRetry("GitHubAdapter.fetchAll", () =>
        this.adapter.fetchAll()
      );
      return {
        source: "github",
        snapshots,
        errors: [],
        durationMs: Date.now() - start,
      };
    } catch (err) {
      this.log("error", "GitHubAgent.run() failed", { error: String(err) });
      return {
        source: "github",
        snapshots: [],
        errors: [{ message: err instanceof Error ? err.message : String(err) }],
        durationMs: Date.now() - start,
      };
    }
  }
}
