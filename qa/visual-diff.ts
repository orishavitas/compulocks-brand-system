// qa/visual-diff.ts
// Visual diff between two screenshots using pixelmatch.
// Phase 1 stub — real implementation in Session G.

export interface VisualDiffResult {
  passed: boolean;
  detail: string;
  diffImagePath?: string;
  pixelDiffPercent?: number;
}

export interface VisualDiffOptions {
  threshold?: number;   // 0–1, default 0.1
  outputDir?: string;   // where to write diff images
}

/**
 * Compare two PNG screenshots and return a pass/fail with pixel diff %.
 *
 * TODO (Session G): implement with pixelmatch + Playwright:
 *   1. Playwright takes screenshots of Storybook stories
 *   2. Figma exports component frames as PNG via REST API
 *   3. pixelmatch diffs the two images
 *   4. Diff image saved to sync-state/qa/diffs/
 *
 * @param screenshotPathA  Path to first PNG (e.g., from Storybook)
 * @param screenshotPathB  Path to second PNG (e.g., from Figma export)
 */
export async function visualDiff(
  _screenshotPathA: string,
  _screenshotPathB: string,
  _options: VisualDiffOptions = {}
): Promise<VisualDiffResult> {
  return {
    passed: false,
    detail: "visual-diff not implemented (Session G)",
  };
}

/**
 * Take a Playwright screenshot of a Storybook story.
 * TODO (Session G): implement
 */
export async function screenshotStory(
  _storybookUrl: string,
  _storyId: string,
  _outputPath: string
): Promise<string> {
  throw new Error("screenshotStory not implemented (Session G)");
}
