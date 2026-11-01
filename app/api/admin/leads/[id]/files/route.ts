import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { getLead, putLead, putLeadFile } from "@/lib/quotes/store";
import { FILE_TYPE_OK, MAX_UPLOAD } from "@/lib/quotes/leads";

export const runtime = "nodejs";
export const maxDuration = 60;

// Erez attaches a picture or document to a request (a photo or plan the client sent on WhatsApp).
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  if (!/^[a-z0-9]{6,32}$/.test(params.id)) return NextResponse.json({ error: "bad-request" }, { status: 400 });
  const lead = await getLead(params.id);
  if (!lead) return NextResponse.json({ error: "not-found" }, { status: 404 });
  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "bad-request" }, { status: 400 });
  if (!FILE_TYPE_OK(file.type)) return NextResponse.json({ error: "type" }, { status: 400 });
  if (file.size > MAX_UPLOAD) return NextResponse.json({ error: "too-big" }, { status: 413 });
  const f = { id: randomBytes(10).toString("hex"), name: (file.name || "קובץ").slice(0, 120), type: file.type, size: file.size };
  await putLeadFile(f, Buffer.from(await file.arrayBuffer()));
  const next = { ...lead, files: [...(lead.files || []), f] };
  await putLead(next);
  return NextResponse.json({ ok: true, lead: next });
}
