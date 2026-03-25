// orchestrator/orchestrator.ts
// MetaOrchestrator — coordinates all platform agents, the Librarian, and the QA Agent.

import type { PlatformAgent, AgentRunResult } from "../agents/types";
import type { LibrarianAgent } from "../librarian/types";
import type { QAAgent } from "../qa/types";
import type { SyncState } from "../librarian/types";
import type { QAReport } from "../qa/types";

export interface OrchestratorConfig {
  agents: PlatformAgent[];
  librarian: LibrarianAgent;
  qa: QAAgent;
}

export interface SyncRequest {
  sources?: string[];       // if undefined, all registered sources
  entityIds?: string[];     // if undefined, all entities
  primarySource?: string;
  direction?: { from: string; to: string };
  dryRun?: boolean;
}

export interface SyncResult {
  startedAt: string;
  completedAt: string;
  agentResults: AgentRunResult[];
  librarianSyncState: SyncState;
  qaReport: QAReport;
}

export class MetaOrchestrator {
  private agents: PlatformAgent[];
  private librarian: LibrarianAgent;
  private qa: QAAgent;

  constructor(config: OrchestratorConfig) {
    this.agents = config.agents;
    this.librarian = config.librarian;
    this.qa = config.qa;
  }

  async sync(req: SyncRequest = {}): Promise<SyncResult> {
    const startedAt = new Date().toISOString();

    // 1. Determine which agents to run
    const targetAgents = req.sources
      ? this.agents.filter((a) => req.sources!.includes(a.adapterName))
      : this.agents;

    // 2. Set primary source before ingesting (affects diff computation)
    if (req.primarySource) {
      await this.librarian.setPrimarySource(req.primarySource);
    }

    // 3. Run all agents in parallel
    const agentResults = await Promise.all(
      targetAgents.map((agent) =>
        agent.run({
          targetEntityIds: req.entityIds,
          dryRun: req.dryRun,
        })
      )
    );

    // 4. Collect all snapshots and ingest into Librarian
    const allSnapshots = agentResults.flatMap((r) => r.snapshots);
    const librarianSyncState = req.dryRun
      ? await this.librarian.getState()
      : await this.librarian.ingest(allSnapshots);

    // 5. Run QA on the resulting state
    const qaReport = await this.qa.run(librarianSyncState, {
      entityIds: req.entityIds,
    });

    return {
      startedAt,
      completedAt: new Date().toISOString(),
      agentResults,
      librarianSyncState,
      qaReport,
    };
  }

  async getState(): Promise<SyncState> {
    return this.librarian.getState();
  }

  async ping(): Promise<{ [source: string]: { ok: boolean; message?: string } }> {
    // TODO: ping all adapters in parallel
    return {};
  }
}
