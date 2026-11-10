import { NextRequest, NextResponse } from "next/server";
import { planHistory, planRevision } from "@/lib/quotes/store";

// Earlier versions of a plan, from Sanity's history: the list of saves, or the plan as it was at one of them.
// GET ?rev=<transaction id> returns that version; without it, the list (newest first).
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const rev = req.nextUrl.searchParams.get("rev");
  if (rev) {
    const plan = await planRevision(params.id, rev).catch(() => null);
    return plan ? NextResponse.json({ plan }) : NextResponse.json({ error: "not-found" }, { status: 404 });
  }
  const list = await planHistory(params.id).catch(() => []);
  return NextResponse.json({ list });
}
