import { NextResponse } from "next/server";

export async function POST(_req: Request) {
  // TODO: import MetaOrchestrator, parse SyncRequest from body, call sync()
  return NextResponse.json({ ok: true, message: "not implemented" });
}
