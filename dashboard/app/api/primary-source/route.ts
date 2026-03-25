import { NextResponse } from "next/server";

export async function POST(req: Request) {
  // TODO: const { source } = await req.json(); librarian.setPrimarySource(source);
  const body = await req.json().catch(() => ({}));
  const source = (body as { source?: string }).source;
  if (!source) return NextResponse.json({ error: "source required" }, { status: 400 });
  return NextResponse.json({ ok: true, primarySource: source, message: "not implemented" });
}
