// agents/figma-agent.ts

import { BaseAgent } from "./base-agent";
import type { AgentRunContext, AgentRunResult, PlatformAgent } from "./types";
import { FigmaAdapter } from "../adapters/figma/adapter";

export class FigmaAgent extends BaseAgent implements PlatformAgent {
  readonly name = "figma-agent";
  readonly adapterName = "figma";

  private adapter = new FigmaAdapter();

  async run(ctx: AgentRunContext): Promise<AgentRunResult> {
    const start = Date.now();
    this.log("info", "FigmaAgent.run() starting", ctx);

    try {
      const snapshots = await this.withRetry("FigmaAdapter.fetchAll", () =>
        this.adapter.fetchAll()
      );
      return {
        source: "figma",
        snapshots,
        errors: [],
        durationMs: Date.now() - start,
      };
    } catch (err) {
      this.log("error", "FigmaAgent.run() failed", { error: String(err) });
      return {
        source: "figma",
        snapshots: [],
        errors: [{ message: err instanceof Error ? err.message : String(err) }],
        durationMs: Date.now() - start,
      };
    }
  }
}
