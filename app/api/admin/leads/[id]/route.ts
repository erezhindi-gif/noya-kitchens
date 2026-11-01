import { NextRequest, NextResponse } from "next/server";
import { deleteLead, putLead } from "@/lib/quotes/store";
import type { Lead } from "@/lib/quotes/types";

const validId = (id: string) => /^[a-z0-9]{6,32}$/.test(id);

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const l = (await req.json().catch(() => null)) as Lead | null;
  if (!l || !validId(params.id) || l.id !== params.id) return NextResponse.json({ error: "bad-request" }, { status: 400 });
  await putLead(l);
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  if (!validId(params.id)) return NextResponse.json({ error: "bad-request" }, { status: 400 });
  await deleteLead(params.id);
  return NextResponse.json({ ok: true });
}
