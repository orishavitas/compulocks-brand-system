"use client";

import type { SyncState, SyncStatus } from "../../librarian/types";

const STATUS_COLORS: Record<SyncStatus, string> = {
  "in-sync": "var(--color-in-sync)",
  "drifted": "var(--color-drifted)",
  "missing-in": "var(--color-missing)",
  "only-in": "var(--color-only-in)",
  "unknown": "var(--color-unknown)",
};

const STATUS_LABELS: Record<SyncStatus, string> = {
  "in-sync": "In Sync",
  "drifted": "Drifted",
  "missing-in": "Missing",
  "only-in": "Only In",
  "unknown": "Unknown",
};

function StatusBadge({ status }: { status: SyncStatus }) {
  return (
    <span style={{
      display: "inline-block",
      padding: "2px 8px",
      borderRadius: 4,
      fontSize: 11,
      fontWeight: 600,
      background: STATUS_COLORS[status] + "22",
      color: STATUS_COLORS[status],
      border: `1px solid ${STATUS_COLORS[status]}44`,
    }}>
      {STATUS_LABELS[status]}
    </span>
  );
}

function SourceCell({
  status,
  hash,
}: {
  status: "present" | "missing" | "unmatched" | "unknown";
  hash: string | null;
}) {
  if (status === "missing") {
    return <span style={{ color: "var(--color-missing)", fontSize: 12 }}>—</span>;
  }
  return (
    <span style={{ fontFamily: "monospace", fontSize: 11, color: "var(--color-text-muted)" }}>
      {hash ? hash.slice(0, 7) : "—"}
    </span>
  );
}

export function SyncMatrix({ state }: { state: SyncState }) {
  const sources = state.sources;

  if (sources.length === 0 || state.entities.length === 0) {
    return (
      <div style={{
        border: "1px dashed var(--color-border)",
        borderRadius: 8,
        padding: 48,
        textAlign: "center",
        color: "var(--color-text-muted)",
      }}>
        <div style={{ fontSize: 32, marginBottom: 12 }}>◎</div>
        <div style={{ fontWeight: 500, marginBottom: 4 }}>No sync data yet</div>
        <div style={{ fontSize: 12 }}>Run a sync to populate the matrix.</div>
      </div>
    );
  }

  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{
        width: "100%",
        borderCollapse: "collapse",
        fontSize: 13,
      }}>
        <thead>
          <tr style={{ borderBottom: "1px solid var(--color-border)" }}>
            <th style={{ textAlign: "left", padding: "10px 16px", color: "var(--color-text-muted)", fontWeight: 500, width: 200 }}>Entity</th>
            <th style={{ textAlign: "left", padding: "10px 16px", color: "var(--color-text-muted)", fontWeight: 500, width: 80 }}>Type</th>
            <th style={{ textAlign: "left", padding: "10px 16px", color: "var(--color-text-muted)", fontWeight: 500, width: 100 }}>Status</th>
            {sources.map((src) => (
              <th key={src} style={{ textAlign: "center", padding: "10px 16px", color: "var(--color-text-muted)", fontWeight: 500, textTransform: "capitalize" }}>
                {src}
              </th>
            ))}
            <th style={{ textAlign: "right", padding: "10px 16px", color: "var(--color-text-muted)", fontWeight: 500 }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {state.entities.map((entity) => (
            <tr key={entity.entityId} style={{ borderBottom: "1px solid var(--color-border)" }}>
              <td style={{ padding: "10px 16px", fontFamily: "monospace", fontSize: 12 }}>{entity.entityId}</td>
              <td style={{ padding: "10px 16px", color: "var(--color-text-muted)", fontSize: 12 }}>{entity.entityType}</td>
              <td style={{ padding: "10px 16px" }}>
                <StatusBadge status={entity.status} />
              </td>
              {sources.map((src) => {
                const snap = entity.perSource[src];
                return (
                  <td key={src} style={{ padding: "10px 16px", textAlign: "center" }}>
                    {snap ? (
                      <SourceCell status={snap.status} hash={snap.hash} />
                    ) : (
                      <span style={{ color: "var(--color-unknown)", fontSize: 12 }}>—</span>
                    )}
                  </td>
                );
              })}
              <td style={{ padding: "10px 16px", textAlign: "right" }}>
                {entity.status !== "in-sync" && (
                  <span style={{ display: "inline-flex", gap: 6 }}>
                    <button style={{ fontSize: 11, padding: "3px 8px", border: "1px solid var(--color-border)", borderRadius: 4, background: "transparent", color: "var(--color-text-muted)", cursor: "pointer" }}>
                      Pull
                    </button>
                    <button style={{ fontSize: 11, padding: "3px 8px", border: "1px solid var(--color-border)", borderRadius: 4, background: "transparent", color: "var(--color-text-muted)", cursor: "pointer" }}>
                      Push
                    </button>
                  </span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
