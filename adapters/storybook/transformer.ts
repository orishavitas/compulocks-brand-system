// adapters/storybook/transformer.ts
// Transforms component-manifest.json entries into canonical Component entities.

import type { Component } from "../types";

/** Shape of the full component-manifest.json file */
export interface ComponentManifest {
  version: string;
  generatedAt: string;
  components: ManifestComponent[];
}

/** Shape of a single entry in component-manifest.json */
export interface ManifestComponent {
  name: string;
  variants: string[];
  states: string[];
  tokens: string[];
  hash: string;
}

export function manifestComponentToComponent(entry: ManifestComponent): Component {
  return {
    id: entry.name,
    variants: entry.variants ?? [],
    states: entry.states ?? [],
    hash: entry.hash ?? "",
  };
}
