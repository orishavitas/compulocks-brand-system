import { NextResponse } from "next/server";

export async function GET() {
  // TODO: call adapter.ping() for each registered adapter
  return NextResponse.json({
    figma: { ok: false, message: "not implemented", entityCount: 0, lastSeen: null },
    storybook: { ok: false, message: "not implemented", entityCount: 0, lastSeen: null },
    github: { ok: false, message: "not implemented", entityCount: 0, lastSeen: null },
  });
}
