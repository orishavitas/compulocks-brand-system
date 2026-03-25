import { SyncMatrix } from "../components/SyncMatrix";
import { PrimarySourceSelector } from "../components/PrimarySourceSelector";
import type { SyncState } from "../../librarian/types";

async function getSyncState(): Promise<SyncState> {
  // In production: fetch from /api/state
  // For scaffold: return empty state
  return {
    version: 1,
    computedAt: new Date().toISOString(),
    primarySource: null,
    sources: ["figma", "storybook", "github"],
    entities: [],
  };
}

export default async function SyncMatrixPage() {
  const state = await getSyncState();

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 600, marginBottom: 4 }}>Sync Matrix</h1>
          <p style={{ color: "var(--color-text-muted)", fontSize: 13 }}>
            {state.entities.length === 0
              ? "No entities synced yet. Run a sync to populate."
              : `${state.entities.length} entities across ${state.sources.length} sources`}
          </p>
        </div>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <PrimarySourceSelector sources={state.sources} current={state.primarySource} />
          <button
            style={{
              background: "var(--color-accent)",
              color: "#fff",
              border: "none",
              borderRadius: 6,
              padding: "8px 16px",
              fontSize: 13,
              fontWeight: 500,
              cursor: "pointer",
            }}
          >
            Run Sync
          </button>
        </div>
      </div>

      <SyncMatrix state={state} />

      <div style={{ marginTop: 24, fontSize: 12, color: "var(--color-text-muted)" }}>
        Last computed: {state.computedAt}
      </div>
    </div>
  );
}
