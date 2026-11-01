import { NextRequest, NextResponse } from "next/server";
import { putPlan } from "@/lib/quotes/store";
import type { Plan } from "@/lib/quotes/types";

export async function POST(req: NextRequest) {
  const p = (await req.json().catch(() => null)) as Plan | null;
  if (!p || !/^[a-z0-9]{6,32}$/.test(p.id || "") || !p.layout) return NextResponse.json({ error: "bad-request" }, { status: 400 });
  await putPlan(p);
  return NextResponse.json({ ok: true });
}
