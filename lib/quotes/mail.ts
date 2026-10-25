// Mail to Erez through Resend, with the key saved in settings (private secrets document).
import { getOwnerEmail, getSecrets } from "./store";

export async function mailOwner(subject: string, html: string): Promise<boolean> {
  const { resendKey } = await getSecrets();
  if (!resendKey) return false;
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: "NOYA הצעות מחיר <onboarding@resend.dev>",
      to: [await getOwnerEmail()],
      subject,
      html: `<div dir="rtl" style="font-family:Arial,sans-serif;font-size:15px;line-height:1.6">${html}</div>`,
    }),
  });
  if (!res.ok) console.error("mail failed", res.status, await res.text().catch(() => ""));
  return res.ok;
}
