import { NextResponse } from "next/server";
import { Librarian } from "../../../../librarian/librarian";

export async function GET() {
  const librarian = new Librarian();
  const state = await librarian.getState();
  return NextResponse.json(state);
}
