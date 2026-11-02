import { NextRequest, NextResponse } from "next/server";
import { isChannel } from "@/lib/marketing/channels";
import { addSpend, deleteSpend, getMarketing, getSecrets, setGoal } from "@/lib/quotes/store";
import { uid } from "@/lib/quotes/calc";
import type { Spend } from "@/lib/quotes/types";

export const dynamic = "force-dynamic";

export async function GET() {
  const [m, s] = await Promise.all([getMarketing(), getSecrets()]);
  return NextResponse.json({ ...m, hasPhotoKey: !!s.geminiKey });
}

/** A new spend entry. */
export async function POST(req: NextRequest) {
  const b = (await req.json().catch(() => null)) as Partial<Spend> | null;
  const amount = Math.round(+(b?.amount ?? 0));
  if (!b || !isChannel(b.channel) || !/^\d{4}-\d\d-\d\d$/.test(b.date || "") || !(amount > 0 && amount < 1_000_000))
    return NextResponse.json({ error: "bad-request" }, { status: 400 });
  const s: Spend = { id: uid(12), date: b.date!, channel: b.channel, amount, note: String(b.note || "").slice(0, 200) };
  await addSpend(s);
  return NextResponse.json({ ok: true, spend: s });
}

/** The monthly goal (kitchens). */
export async function PUT(req: NextRequest) {
  const goal = Math.round(+((await req.json().catch(() => ({}))) as { goal?: number }).goal!);
  if (!(goal >= 1 && goal <= 50)) return NextResponse.json({ error: "bad-request" }, { status: 400 });
  await setGoal(goal);
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id") || "";
  if (!/^[a-z0-9]{6,32}$/.test(id)) return NextResponse.json({ error: "bad-request" }, { status: 400 });
  await deleteSpend(id);
  return NextResponse.json({ ok: true });
}
