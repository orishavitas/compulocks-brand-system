// adapters/registry.ts
// Global adapter registry. Adapters self-register at startup.

import type { PlatformAdapter } from "./types";

const adapters: Map<string, PlatformAdapter> = new Map();

export function registerAdapter(adapter: PlatformAdapter): void {
  adapters.set(adapter.name, adapter);
}

export function getAdapter(name: string): PlatformAdapter | undefined {
  return adapters.get(name);
}

export function getAllAdapters(): PlatformAdapter[] {
  return Array.from(adapters.values());
}

export function clearAdapters(): void {
  adapters.clear();
}
