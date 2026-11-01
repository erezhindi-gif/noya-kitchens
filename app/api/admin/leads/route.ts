import { NextRequest, NextResponse } from "next/server";
import { putLead } from "@/lib/quotes/store";
import type { Lead } from "@/lib/quotes/types";

export async function POST(req: NextRequest) {
  const l = (await req.json().catch(() => null)) as Lead | null;
  if (!l || !/^[a-z0-9]{6,32}$/.test(l.id || "")) return NextResponse.json({ error: "bad-request" }, { status: 400 });
  await putLead(l);
  return NextResponse.json({ ok: true });
}
