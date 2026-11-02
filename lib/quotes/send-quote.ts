// Sends a quote to a client from Erez's own Gmail (an app password saved in settings), with the PDF attached.
// Going through Gmail means the mail comes from his real address, lands in his "Sent" folder,
// and the client's reply comes straight back to him.
import nodemailer from "nodemailer";
import { planMessage, planSubject, qnum, reviewLines } from "./calc";
import { getSecrets } from "./store";
import type { Plan, Quote, Settings } from "./types";

export type QuoteMail = { to: string; subject?: string; message?: string; inReplyTo?: string };

export const validEmail = (s: string) => /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(s.trim());

export const defaultSubject = (q: Quote) => `הצעת מחיר ${qnum(q)} - נויה מטבחים`;

export function defaultMessage(q: Quote, s: Settings, origin: string) {
  return [
    `שלום ${q.client.name || ""},`.replace(" ,", ","),
    "",
    `מצורפת הצעת מחיר ${qnum(q)}${q.project ? ` עבור ${q.project}` : ""}.`,
    `אפשר גם לצפות בהצעה ולאשר אותה כאן: ${origin}/q/${q.id}`,
    "",
    ...(reviewLines(s).length ? [...reviewLines(s), ""] : []),
    "בברכה,",
    s.owner,
    "נויה מטבחים",
    s.phone,
  ].join("\n");
}

const esc = (t: string) => t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const linkify = (t: string) => t.replace(/https?:\/\/[^\s<]+/g, (u) => `<a href="${u}">${u}</a>`);

export function gmailTransport(user: string, pass: string) {
  return nodemailer.createTransport({ host: "smtp.gmail.com", port: 465, secure: true, auth: { user, pass } });
}

export async function sendQuoteMail(q: Quote, s: Settings, mail: QuoteMail, origin: string) {
  const filename = `הצעת מחיר ${qnum(q)}${q.client.name ? ` - ${q.client.name}` : ""} - נויה מטבחים.pdf`;
  return mailWithPdf(s, mail, `${origin}/api/q/${q.id}/pdf`, filename, defaultSubject(q), defaultMessage(q, s, origin));
}

/** A kitchen plan to the client: the drawings and 3D as a PDF, no prices. */
export async function sendPlanMail(p: Plan, s: Settings, mail: QuoteMail, origin: string) {
  const filename = `תכנון ${p.title || "מטבח"}${p.client.name ? ` - ${p.client.name}` : ""} - נויה מטבחים.pdf`;
  return mailWithPdf(s, mail, `${origin}/api/p/${p.id}/pdf`, filename, planSubject(p), planMessage(p, s));
}

async function mailWithPdf(s: Settings, mail: QuoteMail, pdfUrl: string, name: string, subject: string, message: string) {
  const { gmailPass } = await getSecrets();
  if (!gmailPass) return { ok: false as const, error: "no-gmail" };
  if (!validEmail(mail.to)) return { ok: false as const, error: "bad-email" };

  const res = await fetch(pdfUrl, { cache: "no-store" }).catch(() => null);
  if (!res?.ok) return { ok: false as const, error: "pdf-failed" };
  const pdf = Buffer.from(await res.arrayBuffer());

  const text = mail.message?.trim() || message;
  const filename = name.replace(/[\\/:*?"<>|]/g, "");
  try {
    await gmailTransport(s.email, gmailPass).sendMail({
      from: { name: "נויה מטבחים", address: s.email },
      to: mail.to.trim(),
      subject: mail.subject?.trim() || subject,
      text,
      html: `<div dir="rtl" style="font-family:Arial,sans-serif;font-size:15px;line-height:1.6">${linkify(esc(text)).replace(/\n/g, "<br>")}</div>`,
      attachments: [{ filename, content: pdf, contentType: "application/pdf" }],
      ...(mail.inReplyTo ? { inReplyTo: mail.inReplyTo, references: mail.inReplyTo } : {}),
    });
    return { ok: true as const };
  } catch (e) {
    console.error("mail with pdf failed", e);
    return { ok: false as const, error: /auth|535|534/i.test(String(e)) ? "gmail-auth" : "send-failed" };
  }
}

export const MAIL_ERRORS: Record<string, string> = {
  "no-gmail": "שליחת מיילים עוד לא מחוברת. צריך להדביק סיסמת אפליקציה של Gmail בהגדרות.",
  "bad-email": "כתובת המייל לא תקינה.",
  "pdf-failed": "יצירת ה-PDF נכשלה. נסה שוב.",
  "gmail-auth": "Gmail דחה את הסיסמה. צריך סיסמת אפליקציה חדשה בהגדרות.",
  "send-failed": "השליחה נכשלה. נסה שוב.",
};
