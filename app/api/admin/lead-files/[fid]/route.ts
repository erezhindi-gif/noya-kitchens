import { NextRequest, NextResponse } from "next/server";
import { deleteLeadFiles, getLead, getLeadFile, putLead } from "@/lib/quotes/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Opens a request's file (behind the admin login, like everything under /api/admin).
export async function GET(_req: NextRequest, { params }: { params: { fid: string } }) {
  const f = await getLeadFile(params.fid);
  if (!f) return NextResponse.json({ error: "not-found" }, { status: 404 });
  return new NextResponse(new Uint8Array(f.data), {
    headers: {
      "Content-Type": f.type || "application/octet-stream",
      "Content-Disposition": `inline; filename*=UTF-8''${encodeURIComponent(f.name)}`,
      "Cache-Control": "private, max-age=86400",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

// Removes a file from its request: /api/admin/lead-files/<file id>?lead=<request id>
export async function DELETE(req: NextRequest, { params }: { params: { fid: string } }) {
  const leadId = req.nextUrl.searchParams.get("lead") || "";
  const lead = /^[a-z0-9]{6,32}$/.test(leadId) ? await getLead(leadId) : null;
  if (!lead) return NextResponse.json({ error: "not-found" }, { status: 404 });
  const next = { ...lead, files: (lead.files || []).filter((f) => f.id !== params.fid) };
  await putLead(next);
  await deleteLeadFiles([params.fid]);
  return NextResponse.json({ ok: true, lead: next });
}
