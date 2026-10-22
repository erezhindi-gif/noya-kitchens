import { NextRequest, NextResponse } from "next/server";
import { deleteQuote, putQuote } from "@/lib/quotes/store";
import type { Quote } from "@/lib/quotes/types";

const validId = (id: string) => /^[a-z0-9]{6,32}$/.test(id);

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const q = (await req.json().catch(() => null)) as Quote | null;
  if (!q || !validId(params.id) || q.id !== params.id || !Array.isArray(q.lines))
    return NextResponse.json({ error: "bad-request" }, { status: 400 });
  try {
    await putQuote(q);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("putQuote failed", e);
    return NextResponse.json({ error: "save-failed" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  if (!validId(params.id)) return NextResponse.json({ error: "bad-request" }, { status: 400 });
  try {
    await deleteQuote(params.id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("deleteQuote failed", e);
    return NextResponse.json({ error: "delete-failed" }, { status: 500 });
  }
}
