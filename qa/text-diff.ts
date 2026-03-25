// qa/text-diff.ts
// Text-level diff between two canonical entity values.

import type { CanonicalEntity } from "../adapters/types";
import type { QAEntityResult } from "./types";

export interface TextDiffResult {
  passed: boolean;
  detail: string;
}

/**
 * Compare two canonical entities by stable JSON serialization.
 * Returns pass if they are equivalent, fail with a human-readable diff if not.
 */
export function textDiff(a: CanonicalEntity, b: CanonicalEntity): TextDiffResult {
  const jsonA = JSON.stringify(a, Object.keys(a as object).sort(), 2);
  const jsonB = JSON.stringify(b, Object.keys(b as object).sort(), 2);

  if (jsonA === jsonB) {
    return { passed: true, detail: "values are identical" };
  }

  // Simple line-by-line diff for readability in QA reports
  const linesA = jsonA.split("\n");
  const linesB = jsonB.split("\n");
  const diffLines: string[] = [];

  const maxLen = Math.max(linesA.length, linesB.length);
  for (let i = 0; i < maxLen; i++) {
    const lineA = linesA[i] ?? "(missing)";
    const lineB = linesB[i] ?? "(missing)";
    if (lineA !== lineB) {
      diffLines.push(`  - ${lineA}`);
      diffLines.push(`  + ${lineB}`);
    }
  }

  return {
    passed: false,
    detail: diffLines.slice(0, 20).join("\n") + (diffLines.length > 20 ? "\n  ...(truncated)" : ""),
  };
}
