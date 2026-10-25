import { NextRequest, NextResponse } from "next/server";
import { getOwnerEmail, getSecrets, patchSecrets } from "@/lib/quotes/store";

export const dynamic = "force-dynamic";

// The mail key itself never comes back to the browser — only whether one is saved.
export async function GET() {
  const s = await getSecrets();
  return NextResponse.json({ hasKey: !!s.resendKey, email: await getOwnerEmail() });
}

export async function PUT(req: NextRequest) {
  const { resendKey } = await req.json().catch(() => ({}));
  const key = String(resendKey || "").trim();
  if (key && !/^re_[A-Za-z0-9_]{10,}$/.test(key)) return NextResponse.json({ error: "bad-key" }, { status: 400 });
  await patchSecrets({ resendKey: key });
  return NextResponse.json({ ok: true });
}
