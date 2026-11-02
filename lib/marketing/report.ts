// The marketing report: per channel, what was spent and what it brought (visits, clicks, requests, quotes, kitchens).
// Shared by the admin's "שיווק" screen and the Claude connector, so both tell the same numbers.
import { calc } from "../quotes/calc";
import { leadQuote } from "../quotes/leads";
import type { AppData, Lead, Marketing, Quote } from "../quotes/types";
import { CHANNELS, type Channel } from "./channels";

export type Range = { from: string; to: string }; // Israel dates, YYYY-MM-DD, both included
export type Key = Channel | "none";

export type Row = {
  ch: Key; spend: number; visits: number; calls: number; wa: number; forms: number;
  leads: number; sent: number; won: number; revenue: number;
};

const dayIL = (iso: string) => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jerusalem" }).format(new Date(iso));
const inRange = (d: string | undefined, r: Range) => !!d && d >= r.from && d <= r.to;

export function monthRange(month: string): Range {
  const [y, m] = month.split("-").map(Number);
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return { from: `${month}-01`, to: `${month}-${String(last).padStart(2, "0")}` };
}

/** "2026-11" → "2026-08" for back = 3 */
export function monthBack(month: string, back: number) {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 - back, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

export const MONTH_NAMES = ["ינואר", "פברואר", "מרץ", "אפריל", "מאי", "יוני", "יולי", "אוגוסט", "ספטמבר", "אוקטובר", "נובמבר", "דצמבר"];
export const monthName = (month: string) => `${MONTH_NAMES[+month.slice(5, 7) - 1]} ${month.slice(0, 4)}`;

/** The channel of a quote: the request it answers, else what Erez marked on the quote. */
export function quoteChannels(d: Pick<AppData, "leads" | "quotes">) {
  const byQuote = new Map<string, Lead>();
  for (const l of d.leads) {
    const q = leadQuote(l, d.quotes);
    if (q && !byQuote.has(q.id)) byQuote.set(q.id, l);
  }
  return (q: Quote): { ch: Key; lead?: Lead } => {
    const lead = byQuote.get(q.id);
    return { ch: lead?.channel || q.channel || "none", lead };
  };
}

export function report(d: AppData, m: Marketing, r: Range) {
  const rows = new Map<Key, Row>();
  const row = (ch: Key) => {
    let x = rows.get(ch);
    if (!x) rows.set(ch, (x = { ch, spend: 0, visits: 0, calls: 0, wa: 0, forms: 0, leads: 0, sent: 0, won: 0, revenue: 0 }));
    return x;
  };
  for (const s of m.spends) if (inRange(s.date, r)) row(s.channel).spend += +s.amount || 0;

  for (const [month, counts] of Object.entries(m.stats)) {
    for (const [k, n] of Object.entries(counts)) {
      const [, day, ch, e] = k.match(/^d(\d\d)_([a-z]+)_([a-z]+)$/) || [];
      if (!day || !inRange(`${month}-${day}`, r) || !(CHANNELS as readonly string[]).includes(ch)) continue;
      const x = row(ch as Channel);
      if (e === "visit") x.visits += n;
      else if (e === "call") x.calls += n;
      else if (e === "wa") x.wa += n;
      else if (e === "form") x.forms += n;
    }
  }

  const chOf = quoteChannels(d);
  const untaggedLeads: Lead[] = [];
  for (const l of d.leads) {
    if (l.closed || !inRange(dayIL(l.createdAt), r)) continue;
    const x = row(l.channel || "none");
    x.leads++;
    const q = leadQuote(l, d.quotes);
    if (q && q.status !== "draft") x.sent++;
    if (!l.channel) untaggedLeads.push(l);
  }
  // Quotes that went out without a request behind them count as requests too (a client who just called).
  const untaggedWon: Quote[] = [];
  for (const q of d.quotes) {
    const { ch, lead } = chOf(q);
    if (!lead && q.status !== "draft" && inRange(q.sentAt ? dayIL(q.sentAt) : q.date, r)) {
      const x = row(ch);
      x.leads++;
      x.sent++;
    }
    if (q.status === "approved" && inRange(q.approvedAt, r)) {
      const x = row(ch);
      x.won++;
      x.revenue += calc(q, d.settings, d.pros).price;
      if (ch === "none") untaggedWon.push(q);
    }
  }

  const order: Key[] = [...CHANNELS, "none"];
  const list = order.map((k) => rows.get(k)).filter((x): x is Row => !!x);
  const total = list.reduce<Row>((t, x) => {
    for (const k of ["spend", "visits", "calls", "wa", "forms", "leads", "sent", "won", "revenue"] as const) t[k] += x[k];
    return t;
  }, { ch: "none", spend: 0, visits: 0, calls: 0, wa: 0, forms: 0, leads: 0, sent: 0, won: 0, revenue: 0 });
  return { rows: list, total, untaggedLeads, untaggedWon };
}

/** Cost per item, or null when there's nothing to divide by. */
export const per = (spend: number, n: number) => (n > 0 && spend > 0 ? spend / n : null);
