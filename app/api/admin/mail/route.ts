import { NextRequest, NextResponse } from "next/server";
import { getOwnerEmail, getSecrets, patchSecrets } from "@/lib/quotes/store";
import { gmailTransport } from "@/lib/quotes/send-quote";

export const dynamic = "force-dynamic";

// The keys themselves never come back to the browser — only whether one is saved.
export async function GET() {
  const s = await getSecrets();
  return NextResponse.json({ hasKey: !!s.resendKey, hasAgentKey: !!s.anthropicKey, hasGmail: !!s.gmailPass, email: await getOwnerEmail() });
}

export async function PUT(req: NextRequest) {
  const { resendKey, anthropicKey, gmailPass } = await req.json().catch(() => ({}));
  if (gmailPass !== undefined) {
    const p = String(gmailPass || "").replace(/\s/g, "");
    if (p && !/^[a-z]{16}$/i.test(p)) return NextResponse.json({ error: "bad-key" }, { status: 400 });
    // Check with Gmail before saving, so a wrong password shows up now and not on the first send.
    if (p) {
      const ok = await gmailTransport(await getOwnerEmail(), p).verify().catch(() => false);
      if (!ok) return NextResponse.json({ error: "gmail-auth" }, { status: 400 });
    }
    await patchSecrets({ gmailPass: p });
    return NextResponse.json({ ok: true });
  }
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
