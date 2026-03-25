// adapters/index.ts
// Register all adapters at startup. Import this once at the entry point
// (orchestrator, dashboard API, CLI scripts).

import { registerAdapter } from "./registry";
import { FigmaAdapter } from "./figma/adapter";
import { StorybookAdapter } from "./storybook/adapter";
import { GitHubAdapter } from "./github/adapter";
import { StitchAdapter } from "./stitch/adapter";

export function registerAllAdapters(): void {
  registerAdapter(new StorybookAdapter());
  registerAdapter(new GitHubAdapter());
  registerAdapter(new FigmaAdapter());
  registerAdapter(new StitchAdapter());
}

export { getAllAdapters, getAdapter, registerAdapter } from "./registry";
