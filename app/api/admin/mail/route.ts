import { NextRequest, NextResponse } from "next/server";
import { getOwnerEmail, getSecrets, patchSecrets } from "@/lib/quotes/store";

export const dynamic = "force-dynamic";

// The mail key itself never comes back to the browser — only whether one is saved.
export async function GET() {
  const s = await getSecrets();
  return NextResponse.json({ hasKey: !!s.resendKey, hasAgentKey: !!s.anthropicKey, email: await getOwnerEmail() });
}

export async function PUT(req: NextRequest) {
  const { resendKey, anthropicKey } = await req.json().catch(() => ({}));
  if (anthropicKey !== undefined) {
    const k = String(anthropicKey || "").trim();
    if (k && !/^sk-ant-[A-Za-z0-9_-]{20,}$/.test(k)) return NextResponse.json({ error: "bad-key" }, { status: 400 });
    await patchSecrets({ anthropicKey: k });
    return NextResponse.json({ ok: true });
  }
  const key = String(resendKey || "").trim();
  if (key && !/^re_[A-Za-z0-9_]{10,}$/.test(key)) return NextResponse.json({ error: "bad-key" }, { status: 400 });
  await patchSecrets({ resendKey: key });
  return NextResponse.json({ ok: true });
}
