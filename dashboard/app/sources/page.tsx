import { SourceCard } from "../../components/SourceCard";

interface SourceHealth {
  name: string;
  ok: boolean;
  message?: string;
  entityCount: number;
  lastSeen: string | null;
}

async function getSourceHealth(): Promise<SourceHealth[]> {
  // TODO: fetch from /api/sources which pings all adapters
  return [
    { name: "figma", ok: false, message: "not implemented", entityCount: 0, lastSeen: null },
    { name: "storybook", ok: false, message: "not implemented", entityCount: 0, lastSeen: null },
    { name: "github", ok: false, message: "not implemented", entityCount: 0, lastSeen: null },
  ];
}

export default async function SourcesPage() {
  const sources = await getSourceHealth();

  return (
    <div>
      <h1 style={{ fontSize: 20, fontWeight: 600, marginBottom: 8 }}>Sources</h1>
      <p style={{ color: "var(--color-text-muted)", fontSize: 13, marginBottom: 24 }}>
        Health and status of each connected platform adapter.
      </p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 }}>
        {sources.map((source) => (
          <SourceCard key={source.name} source={source} />
        ))}
      </div>
    </div>
  );
}
