// agents/storybook-agent.ts

import { BaseAgent } from "./base-agent";
import type { AgentRunContext, AgentRunResult, PlatformAgent } from "./types";
import { StorybookAdapter } from "../adapters/storybook/adapter";

export class StorybookAgent extends BaseAgent implements PlatformAgent {
  readonly name = "storybook-agent";
  readonly adapterName = "storybook";

  private adapter = new StorybookAdapter();

  async run(ctx: AgentRunContext): Promise<AgentRunResult> {
    const start = Date.now();
    this.log("info", "StorybookAgent.run() starting", ctx);

    try {
      const snapshots = await this.withRetry("StorybookAdapter.fetchAll", () =>
        this.adapter.fetchAll()
      );
      return {
        source: "storybook",
        snapshots,
        errors: [],
        durationMs: Date.now() - start,
      };
    } catch (err) {
      this.log("error", "StorybookAgent.run() failed", { error: String(err) });
      return {
        source: "storybook",
        snapshots: [],
        errors: [{ message: err instanceof Error ? err.message : String(err) }],
        durationMs: Date.now() - start,
      };
    }
  }
}
