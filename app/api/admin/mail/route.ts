import { NextRequest, NextResponse } from "next/server";
import { getOwnerEmail, getSecrets, patchSecrets } from "@/lib/quotes/store";
import { gmailTransport } from "@/lib/quotes/send-quote";
import { findPlaceId } from "@/lib/reviews/google";

export const dynamic = "force-dynamic";

// The keys themselves never come back to the browser — only whether one is saved.
export async function GET() {
  const s = await getSecrets();
  return NextResponse.json({ hasKey: !!s.resendKey, hasAgentKey: !!s.anthropicKey, hasGmail: !!s.gmailPass, email: await getOwnerEmail() });
}

export async function PUT(req: NextRequest) {
  const { resendKey, anthropicKey, gmailPass, geminiKey, placesKey } = await req.json().catch(() => ({}));
  if (placesKey !== undefined) {
    const k = String(placesKey || "").trim();
    if (k && !/^[A-Za-z0-9_.-]{30,200}$/.test(k)) return NextResponse.json({ error: "bad-key" }, { status: 400 });
    // Ask Google to find the business with it before saving, so a wrong key shows up now.
    if (k && !(await findPlaceId(k).then(() => true, () => false))) return NextResponse.json({ error: "bad-key" }, { status: 400 });
    await patchSecrets({ placesKey: k });
    return NextResponse.json({ ok: true });
  }
  if (geminiKey !== undefined) {
    const k = String(geminiKey || "").trim();
    if (k && !/^[A-Za-z0-9_.-]{30,200}$/.test(k)) return NextResponse.json({ error: "bad-key" }, { status: 400 });
    // Ask Google whether the key works before saving it (listing models costs nothing).
    if (k) {
      const ok = await fetch("https://generativelanguage.googleapis.com/v1beta/models?pageSize=1", { headers: { "x-goog-api-key": k } }).then((r) => r.ok).catch(() => false);
      if (!ok) return NextResponse.json({ error: "bad-key" }, { status: 400 });
    }
    await patchSecrets({ geminiKey: k });
    return NextResponse.json({ ok: true });
  }
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
