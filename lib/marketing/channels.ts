// Where a client came from ("ערוץ"), shared by the site tracker, the server and the admin's marketing screen.
// `Lead.source` is how the request reached Erez (mail, WhatsApp…); the channel is what brought the client.

export const CHANNELS = ["gads", "gmaps", "gseo", "meta", "social", "pro", "referral", "direct", "other"] as const;
export type Channel = (typeof CHANNELS)[number];

export const CHANNEL_LABEL: Record<Channel, string> = {
  gads: "מודעות גוגל",
  gmaps: "פרופיל גוגל (מפות)",
  gseo: "חיפוש בגוגל",
  meta: "מודעות פייסבוק/אינסטגרם",
  social: "אינסטגרם/פייסבוק",
  pro: "אדריכל/מעצב",
  referral: "המלצה (פה לאוזן)",
  direct: "נכנס ישר לאתר",
  other: "אחר",
};

/** Channels that cost money, so the marketing screen asks for their spend. */
export const PAID: Channel[] = ["gads", "meta"];

export const isChannel = (c: unknown): c is Channel => typeof c === "string" && (CHANNELS as readonly string[]).includes(c);

/** Events the site counts per day and channel. */
export const EVENTS = ["visit", "call", "wa", "form"] as const;
export type SiteEvent = (typeof EVENTS)[number];
export const isEvent = (e: unknown): e is SiteEvent => typeof e === "string" && (EVENTS as readonly string[]).includes(e);

const PAID_MEDIUM = /^(cpc|ppc|paid|ads?|paid_social|paidsocial|display|pmax)$/i;

/** The channel of a visit, from the landing address and the referring site.
 *  The Google profile's website link carries ?utm_source=gbp, so it's told apart from plain search. */
export function channelOf(search: string, referrer: string, ownHost: string): Channel {
  const p = new URLSearchParams(search);
  if (p.get("gclid") || p.get("gbraid") || p.get("wbraid")) return "gads";
  const src = (p.get("utm_source") || "").toLowerCase();
  const med = (p.get("utm_medium") || "").toLowerCase();
  if (src) {
    if (/^(gbp|gmb|google_business|googlemaps|maps)$/.test(src)) return "gmaps";
    if (/google/.test(src)) return PAID_MEDIUM.test(med) ? "gads" : "gseo";
    if (/^(fb|facebook|ig|instagram|meta)$/.test(src)) return PAID_MEDIUM.test(med) ? "meta" : "social";
    if (/^(pro|architect|designer)$/.test(src)) return "pro";
    if (/^(referral|friend)$/.test(src)) return "referral";
    return "other";
  }
  let host = "";
  try { host = new URL(referrer).hostname.toLowerCase(); } catch {}
  if (!host || host === ownHost || host.endsWith("." + ownHost.replace(/^www\./, ""))) return "direct";
  if (/^maps\.google\./.test(host)) return "gmaps";
  if (/(^|\.)google\.|bing\.com$|duckduckgo\.com$|yahoo\.com$/.test(host)) return "gseo";
  if (/(^|\.)(facebook|instagram|fb)\.com$|^l\.instagram|^lm\.facebook/.test(host)) return "social";
  return "other";
}
