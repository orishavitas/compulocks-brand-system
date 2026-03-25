// qa/qa-agent.ts
// QA Agent — runs text and visual verification after a sync operation.

import type { SyncState } from "../librarian/types";
import type { QAAgent, QAReport, QACheck, QAEntityResult } from "./types";
import { textDiff } from "./text-diff";
import { visualDiff } from "./visual-diff";

export class QAAgentImpl implements QAAgent {
  async run(
    state: SyncState,
    options: { entityIds?: string[]; checks?: QACheck[] } = {}
  ): Promise<QAReport> {
    const checks: QACheck[] = options.checks ?? ["text-diff"];
    const entityIds = new Set(options.entityIds);

    const entities = options.entityIds?.length
      ? state.entities.filter((e) => entityIds.has(e.entityId))
      : state.entities;

    const results: QAEntityResult[] = [];
    let passed = 0;
    let failed = 0;
    const skipped = state.entities.length - entities.length;

    const primarySource = state.primarySource ?? state.sources[0];
    const otherSources = state.sources.filter((s) => s !== primarySource);

    for (const entity of entities) {
      const primarySnap = entity.perSource[primarySource];
      if (!primarySnap?.value) continue;

      for (const otherSource of otherSources) {
        const otherSnap = entity.perSource[otherSource];
        if (!otherSnap?.value) continue;

        const checkResults: QAEntityResult["checks"] = [];

        if (checks.includes("text-diff")) {
          const result = textDiff(primarySnap.value, otherSnap.value);
          checkResults.push({ type: "text-diff", ...result });
        }

        if (checks.includes("visual-diff") && entity.entityType === "component") {
          // Visual diff requires screenshot paths — deferred to Session G
          checkResults.push({
            type: "visual-diff",
            passed: false,
            detail: "visual-diff not yet implemented",
          });
        }

        const overallPassed = checkResults.every((c) => c.passed);
        if (overallPassed) passed++; else failed++;

        results.push({
          entityId: entity.entityId,
          entityType: entity.entityType,
          sourceA: primarySource,
          sourceB: otherSource,
          checks: checkResults,
          overallPassed,
        });
      }
    }

    return {
      runAt: new Date().toISOString(),
      primarySource,
      summary: { passed, failed, skipped },
      results,
    };
  }
}
