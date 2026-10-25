import { NextRequest, NextResponse } from "next/server";
import { RESET_LINK_MINUTES, createResetToken, passwordFingerprint } from "@/lib/quotes/auth";
import { getOwnerEmail, getSecrets, patchSecrets } from "@/lib/quotes/store";

// Public: "שכחתי סיסמה". The link always goes to the business owner's address from settings,
// never to an address typed on the page.
export async function POST(req: NextRequest) {
  const s = await getSecrets();
  if (!s.resendKey) return NextResponse.json({ error: "mail-not-configured" }, { status: 503 });
  if (s.lastResetAt && Date.now() - s.lastResetAt < 60_000) return NextResponse.json({ ok: true }); // one mail a minute
  const token = await createResetToken(passwordFingerprint(s));
  if (!token) return NextResponse.json({ error: "server-not-configured" }, { status: 500 });
  const link = `${req.nextUrl.origin}/admin/reset?token=${encodeURIComponent(token)}`;
  const to = await getOwnerEmail();
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${s.resendKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: "NOYA הצעות מחיר <onboarding@resend.dev>",
      to: [to],
      subject: "איפוס סיסמה למערכת הצעות המחיר",
      html: `<div dir="rtl" style="font-family:Arial,sans-serif;font-size:15px;line-height:1.6">
        <p>שלום ארז,</p>
        <p>ביקשת לאפס את הסיסמה למערכת הצעות המחיר של נויה מטבחים.</p>
        <p><a href="${link}" style="background:#a8834f;color:#fff;padding:10px 18px;border-radius:999px;text-decoration:none">לבחירת סיסמה חדשה</a></p>
        <p>הקישור תקף ל-${RESET_LINK_MINUTES} דקות ולשימוש אחד. אם לא ביקשת איפוס, אפשר להתעלם מהמייל.</p>
      </div>`,
    }),
  });
  if (!res.ok) {
    console.error("reset mail failed", res.status, await res.text().catch(() => ""));
    return NextResponse.json({ error: "mail-failed" }, { status: 502 });
  }
  await patchSecrets({ lastResetAt: Date.now() });
  return NextResponse.json({ ok: true });
}
