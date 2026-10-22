import { NextRequest, NextResponse } from "next/server";
import { approveQuote } from "@/lib/quotes/store";

// Public: the client approves their own quote from the link they got on WhatsApp.
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const { name } = await req.json().catch(() => ({ name: "" }));
  const clean = String(name || "").trim().slice(0, 80);
  if (clean.length < 2) return NextResponse.json({ error: "name-required" }, { status: 400 });
  try {
    const q = await approveQuote(params.id, clean);
    if (!q) return NextResponse.json({ error: "not-found" }, { status: 404 });
    return NextResponse.json({ ok: true, approvedBy: q.approvedBy, approvedAt: q.approvedAt });
  } catch (e) {
    console.error("approveQuote failed", e);
    return NextResponse.json({ error: "approve-failed" }, { status: 500 });
  }
}
