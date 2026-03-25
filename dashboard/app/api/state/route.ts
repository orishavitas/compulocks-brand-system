import { NextResponse } from "next/server";

export async function GET() {
  // TODO: import Librarian, call getState()
  // import { Librarian } from "../../../../librarian/librarian";
  // const librarian = new Librarian();
  // const state = await librarian.getState();
  // return NextResponse.json(state);

  return NextResponse.json({
    version: 1,
    computedAt: new Date().toISOString(),
    primarySource: null,
    sources: [],
    entities: [],
  });
}
