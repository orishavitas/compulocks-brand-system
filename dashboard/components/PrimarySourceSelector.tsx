"use client";

import { useState } from "react";

export function PrimarySourceSelector({
  sources,
  current,
}: {
  sources: string[];
  current: string | null;
}) {
  const [selected, setSelected] = useState(current ?? "");

  async function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const source = e.target.value;
    setSelected(source);
    // TODO: POST /api/primary-source { source }
    await fetch("/api/primary-source", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ source }),
    });
  }

  if (sources.length === 0) return null;

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <label style={{ fontSize: 12, color: "var(--color-text-muted)" }}>Primary:</label>
      <select
        value={selected}
        onChange={handleChange}
        style={{
          background: "var(--color-surface)",
          border: "1px solid var(--color-border)",
          borderRadius: 6,
          color: "var(--color-text)",
          padding: "6px 10px",
          fontSize: 13,
          cursor: "pointer",
        }}
      >
        <option value="">— none —</option>
        {sources.map((src) => (
          <option key={src} value={src} style={{ textTransform: "capitalize" }}>
            {src}
          </option>
        ))}
      </select>
    </div>
  );
}
