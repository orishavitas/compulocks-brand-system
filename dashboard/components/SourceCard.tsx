"use client";

interface SourceHealth {
  name: string;
  ok: boolean;
  message?: string;
  entityCount: number;
  lastSeen: string | null;
}

const SOURCE_ICONS: Record<string, string> = {
  figma: "◈",
  storybook: "◉",
  github: "◎",
  stitch: "◇",
};

export function SourceCard({ source }: { source: SourceHealth }) {
  const icon = SOURCE_ICONS[source.name] ?? "○";

  return (
    <div style={{
      background: "var(--color-surface)",
      border: `1px solid ${source.ok ? "var(--color-in-sync)" : "var(--color-border)"}22`,
      borderRadius: 8,
      padding: 20,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
        <span style={{ fontSize: 20 }}>{icon}</span>
        <span style={{ fontWeight: 600, textTransform: "capitalize" }}>{source.name}</span>
        <span style={{
          marginLeft: "auto",
          fontSize: 11,
          fontWeight: 600,
          padding: "2px 8px",
          borderRadius: 4,
          background: source.ok ? "var(--color-in-sync)22" : "var(--color-missing)22",
          color: source.ok ? "var(--color-in-sync)" : "var(--color-missing)",
        }}>
          {source.ok ? "Online" : "Offline"}
        </span>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 12, color: "var(--color-text-muted)" }}>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span>Entities</span>
          <span style={{ color: "var(--color-text)" }}>{source.entityCount}</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span>Last seen</span>
          <span style={{ color: "var(--color-text)" }}>{source.lastSeen ?? "never"}</span>
        </div>
        {source.message && (
          <div style={{ marginTop: 4, color: "var(--color-text-muted)", fontStyle: "italic" }}>
            {source.message}
          </div>
        )}
      </div>
    </div>
  );
}
