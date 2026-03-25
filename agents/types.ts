// agents/types.ts
// Agent protocol — higher-level wrappers around adapters with retry + reporting.

import type { EntitySnapshot, EntityType } from "../adapters/types";

export interface AgentRunContext {
  requestedEntityTypes?: EntityType[];
  targetEntityIds?: string[];   // if undefined, fetch all
  dryRun?: boolean;
}

export interface AgentRunResult {
  source: string;
  snapshots: EntitySnapshot[];
  errors: Array<{ entityId?: string; message: string }>;
  durationMs: number;
}

export interface PlatformAgent {
  readonly name: string;
  readonly adapterName: string;

  run(ctx: AgentRunContext): Promise<AgentRunResult>;
}
