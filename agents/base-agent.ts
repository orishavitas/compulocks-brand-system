// agents/base-agent.ts
// Abstract base for all platform agents. Provides retry logic and structured logging.

import type { AgentRunContext, AgentRunResult, PlatformAgent } from "./types";

export abstract class BaseAgent implements PlatformAgent {
  abstract readonly name: string;
  abstract readonly adapterName: string;

  protected maxRetries = 3;
  protected retryDelayMs = 500;

  abstract run(ctx: AgentRunContext): Promise<AgentRunResult>;

  protected log(level: "info" | "warn" | "error", message: string, data?: unknown): void {
    const entry = {
      ts: new Date().toISOString(),
      agent: this.name,
      level,
      message,
      ...(data !== undefined ? { data } : {}),
    };
    if (level === "error") {
      console.error(JSON.stringify(entry));
    } else {
      console.log(JSON.stringify(entry));
    }
  }

  protected async withRetry<T>(
    label: string,
    fn: () => Promise<T>
  ): Promise<T> {
    let lastError: unknown;
    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        return await fn();
      } catch (err) {
        lastError = err;
        this.log("warn", `${label} failed (attempt ${attempt}/${this.maxRetries})`, {
          error: err instanceof Error ? err.message : String(err),
        });
        if (attempt < this.maxRetries) {
          await new Promise((r) => setTimeout(r, this.retryDelayMs * attempt));
        }
      }
    }
    throw lastError;
  }
}
