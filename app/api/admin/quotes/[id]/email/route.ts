import { NextRequest, NextResponse } from "next/server";
import { getData } from "@/lib/quotes/store";
import { MAIL_ERRORS, sendQuoteMail } from "@/lib/quotes/send-quote";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Sends only. The app itself marks the quote as sent and keeps the address, so its own copy stays current.
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const b = await req.json().catch(() => ({}));
  const d = await getData();
  const q = d.quotes.find((x) => x.id === params.id);
  if (!q) return NextResponse.json({ error: "not-found" }, { status: 404 });
  const r = await sendQuoteMail(q, d.settings, { to: String(b.to || ""), subject: b.subject, message: b.message }, req.nextUrl.origin);
  if (!r.ok) return NextResponse.json({ error: r.error, message: MAIL_ERRORS[r.error] }, { status: 400 });
  return NextResponse.json({ ok: true });
}
