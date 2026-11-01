// Requests for a quote ("פניות"): where each one stands. Shared by the app, the server and the Claude connector.
import type { Lead, LeadSource, Quote } from "./types";

export const SOURCE_LABEL: Record<LeadSource, string> = {
  email: "מייל", whatsapp: "וואטסאפ", phone: "טלפון", site: "אתר", other: "אחר",
};

/** A request still waiting for a quote is overdue after this many hours. */
export const LEAD_DUE_HOURS = 48;

/** Phone digits in one form (972…), so 050-1234567 and +972 50 123 4567 match. */
export const phoneKey = (p?: string) => {
  const d = (p || "").replace(/\D/g, "");
  if (!d) return "";
  return d.startsWith("972") ? d : d.startsWith("0") ? "972" + d.slice(1) : d;
};

/** The quote that answers this request: the one it was built from, or a later quote to the same phone or email. */
export function leadQuote(l: Lead, quotes: Quote[]): Quote | undefined {
  if (l.quoteId) {
    const q = quotes.find((x) => x.id === l.quoteId);
    if (q) return q;
  }
  const ph = phoneKey(l.phone);
  const em = (l.email || "").trim().toLowerCase();
  if (!ph && !em) return;
  const day = l.createdAt.slice(0, 10);
  return quotes
    .filter((q) => q.date >= day)
    .filter((q) => (ph && phoneKey(q.client.phone) === ph) || (em && (q.client.email || "").trim().toLowerCase() === em))
    .sort((a, b) => a.date.localeCompare(b.date) || a.seq - b.seq)[0];
}

export type LeadStage = "waiting" | "draft" | "sent" | "approved" | "rejected" | "closed";

export const STAGE_LABEL: Record<LeadStage, string> = {
  waiting: "מחכה להצעה", draft: "הצעה בהכנה", sent: "הצעה נשלחה", approved: "אושרה", rejected: "נדחתה", closed: "לא רלוונטי",
};

export function leadStage(l: Lead, quotes: Quote[], now = Date.now()) {
  const quote = leadQuote(l, quotes);
  const stage: LeadStage = l.closed ? "closed" : quote ? quote.status : "waiting";
  const hours = (now - Date.parse(l.createdAt)) / 36e5;
  return { stage, quote, overdue: stage === "waiting" && hours >= LEAD_DUE_HOURS, hours };
}

export const waitingLeads = (leads: Lead[], quotes: Quote[]) => leads.filter((l) => leadStage(l, quotes).stage === "waiting");

/** "לפני 3 שעות" / "אתמול" / "לפני 4 ימים" */
export function ago(iso: string, now = Date.now()) {
  const h = Math.max(0, (now - Date.parse(iso)) / 36e5);
  if (h < 1) return "לפני פחות משעה";
  if (h < 24) return `לפני ${Math.floor(h)} שעות`.replace("לפני 1 שעות", "לפני שעה");
  const d = Math.floor(h / 24);
  return d === 1 ? "אתמול" : `לפני ${d} ימים`;
}

/** First Israeli phone number in a text, as written. */
export const findPhone = (t: string) => (t.match(/(?:\+?972[-\s]?|0)(?:5\d|[23489]|7\d)[-\s]?\d{3}[-\s]?\d{4}/) || [""])[0].trim();

export const fillReply = (tpl: string, name: string) => tpl.replace(/\{שם\}/g, name || "").replace(/שלום ,/g, "שלום,");

/** Opens this exact mail in Gmail (web or app), by its Message-ID. */
export const gmailLink = (msgId: string) => `https://mail.google.com/mail/u/0/#search/rfc822msgid%3A${encodeURIComponent(msgId)}`;
