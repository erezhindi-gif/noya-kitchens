import { NextRequest, NextResponse } from "next/server";
import { CHANNEL_LABEL, isChannel } from "@/lib/marketing/channels";
import { BOT_UA, statNow } from "@/lib/marketing/stats";
import { uid } from "@/lib/quotes/calc";
import { phoneKey } from "@/lib/quotes/leads";
import { mailOwner } from "@/lib/quotes/mail";
import { countSiteEvent, insertLead } from "@/lib/quotes/store";
import type { Lead } from "@/lib/quotes/types";

export const dynamic = "force-dynamic";

const SITE = process.env.SITE_URL || "https://www.noya-k.co.il";
const str = (v: unknown, max: number) => String(v ?? "").replace(/\s+/g, " ").trim().slice(0, max);
const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

// The contact form on the site: the request goes straight into "פניות", with what brought the client.
export async function POST(req: NextRequest) {
  const b = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!b) return NextResponse.json({ error: "bad-request" }, { status: 400 });
  // Bots fill the hidden field or send the form the moment the page opens; they get a quiet "ok".
  if (str(b.website, 200) || +(b.ms as number) < 2500 || BOT_UA.test(req.headers.get("user-agent") || "")) return NextResponse.json({ ok: true });
  const phone = str(b.phone, 30);
  const digits = phoneKey(phone);
  if (!/^972\d{8,9}$/.test(digits)) return NextResponse.json({ error: "phone" }, { status: 400 });
  const name = str(b.name, 80);
  const city = str(b.city, 60);
  const timing = str(b.timing, 60);
  const msg = String(b.text ?? "").trim().slice(0, 2000);
  const channel = isChannel(b.ch) ? b.ch : "direct";
  const lead: Lead = {
    id: uid(12), createdAt: new Date().toISOString(), source: "site", channel,
    name, phone, email: str(b.email, 120), city, timing, landing: str(b.landing, 300),
    text: [msg, city && `עיר: ${city}`, timing && `מתי: ${timing}`].filter(Boolean).join("\n"),
  };
  await insertLead(lead);
  const { month, key } = statNow(channel, "form");
  await countSiteEvent(month, key).catch(() => {});
  await mailOwner(
    `פנייה חדשה מהאתר: ${name || phone}`,
    `<b>${esc(name || "ללא שם")}</b> · <a href="tel:${esc(phone)}">${esc(phone)}</a><br>` +
      (city ? `עיר: ${esc(city)}<br>` : "") + (timing ? `מתי: ${esc(timing)}<br>` : "") +
      `הגיע מ: ${CHANNEL_LABEL[channel]}<br>` + (msg ? `<p style="white-space:pre-wrap">${esc(msg)}</p>` : "") +
      `<p><a href="${SITE}/admin?view=leads">לפניות במערכת</a> · <a href="https://wa.me/${digits}">וואטסאפ ללקוח</a></p>`
  ).catch(() => false);
  return NextResponse.json({ ok: true });
}
