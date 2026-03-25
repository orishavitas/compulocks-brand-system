export default async function LogPage() {
  // TODO: fetch from /api/log — reads sync-state/log/*.json
  const entries: { ts: string; type: string; sources: string[]; entityCount: number }[] = [];

  return (
    <div>
      <h1 style={{ fontSize: 20, fontWeight: 600, marginBottom: 8 }}>Activity Log</h1>
      <p style={{ color: "var(--color-text-muted)", fontSize: 13, marginBottom: 24 }}>
        History of sync operations and state changes.
      </p>

      {entries.length === 0 ? (
        <div style={{
          border: "1px dashed var(--color-border)",
          borderRadius: 8,
          padding: 40,
          textAlign: "center",
          color: "var(--color-text-muted)",
        }}>
          No activity yet. Run a sync to see entries here.
        </div>
      ) : (
        <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: 8 }}>
          {entries.map((entry, i) => (
            <li key={i} style={{
              background: "var(--color-surface)",
              border: "1px solid var(--color-border)",
              borderRadius: 6,
              padding: "12px 16px",
              display: "flex",
              gap: 16,
              alignItems: "center",
            }}>
              <span style={{ fontFamily: "monospace", fontSize: 12, color: "var(--color-text-muted)" }}>{entry.ts}</span>
              <span style={{ fontWeight: 500 }}>{entry.type}</span>
              <span style={{ color: "var(--color-text-muted)" }}>{entry.sources.join(", ")}</span>
              <span style={{ marginLeft: "auto", fontSize: 12, color: "var(--color-text-muted)" }}>{entry.entityCount} entities</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
