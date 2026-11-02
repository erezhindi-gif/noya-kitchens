import { NextRequest, NextResponse } from "next/server";
import { getPlanForClient } from "@/lib/quotes/store";
import { MAIL_ERRORS, sendPlanMail } from "@/lib/quotes/send-quote";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// The plan alone (drawings and 3D, no prices) from Erez's Gmail, with the PDF attached.
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const b = await req.json().catch(() => ({}));
  const found = await getPlanForClient(params.id);
  if (!found) return NextResponse.json({ error: "not-found" }, { status: 404 });
  const r = await sendPlanMail(found.plan, found.settings, { to: String(b.to || ""), subject: b.subject, message: b.message }, req.nextUrl.origin);
  if (!r.ok) return NextResponse.json({ error: r.error, message: MAIL_ERRORS[r.error] }, { status: 400 });
  return NextResponse.json({ ok: true });
}
