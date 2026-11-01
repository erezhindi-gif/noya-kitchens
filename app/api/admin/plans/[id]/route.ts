import { NextRequest, NextResponse } from "next/server";
import { deletePlan, putPlan } from "@/lib/quotes/store";
import type { Plan } from "@/lib/quotes/types";

const validId = (id: string) => /^[a-z0-9]{6,32}$/.test(id);

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const p = (await req.json().catch(() => null)) as Plan | null;
  if (!p || !validId(params.id) || p.id !== params.id || !p.layout) return NextResponse.json({ error: "bad-request" }, { status: 400 });
  await putPlan(p);
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  if (!validId(params.id)) return NextResponse.json({ error: "bad-request" }, { status: 400 });
  await deletePlan(params.id);
  return NextResponse.json({ ok: true });
}
