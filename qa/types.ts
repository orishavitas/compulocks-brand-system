// qa/types.ts
// QA agent types — text and visual verification after sync.

import type { EntityType } from "../adapters/types";
import type { SyncState } from "../librarian/types";

export type QACheck = "text-diff" | "visual-diff";

export interface QAEntityResult {
  entityId: string;
  entityType: EntityType;
  sourceA: string;
  sourceB: string;
  checks: {
    type: QACheck;
    passed: boolean;
    detail: string;
    evidencePaths?: string[];   // paths to screenshots or diff images
  }[];
  overallPassed: boolean;
}

export interface QAReport {
  runAt: string;              // ISO8601
  primarySource: string | null;
  summary: { passed: number; failed: number; skipped: number };
  results: QAEntityResult[];
}

export interface QAAgent {
  /**
   * Run QA checks after a sync operation.
   * Compares entities between sources and reports mismatches.
   */
  run(
    state: SyncState,
    options?: {
      entityIds?: string[];
      checks?: QACheck[];
    }
  ): Promise<QAReport>;
}
