import { NextResponse } from "next/server";

export async function GET() {
  // TODO: read latest QA report from sync-state/qa/
  return NextResponse.json({
    runAt: new Date().toISOString(),
    primarySource: null,
    summary: { passed: 0, failed: 0, skipped: 0 },
    results: [],
  });
}
