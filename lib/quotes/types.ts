import type { KitchenLayout } from "./layout";
import type { RoomSketch } from "./room";
import type { Channel } from "../marketing/channels";
export type Unit = "m" | "u";

/** A catalog tree node. Root nodes have parentId "". Folders hold other nodes; leaves are priced items. */
export type CatNode = {
  id: string;
  parentId: string;
  name: string;
  folder: boolean;
  unit?: Unit;
  price?: number;
  /** Text written in the quote for this item */
  desc?: string;
  /** How Erez calls it out loud — used by search (and later by the agent) */
  aliases?: string;
  /** Choices picked when the item is added, e.g. colors. Empty price = the item's price. */
  options?: CatOption[];
  /** Word written before the chosen option, e.g. "צבע" → "…, צבע שמפניה" */
  optLabel?: string;
  /** Folder flag: items under it show their quantity to the client */
  showQty?: boolean;
};

export type CatOption = { id: string; name: string; price?: number | null };

export type LineType = "cat" | "free" | "lump" | "text" | "head";

/** A quote line. Catalog lines keep a snapshot of the item so later catalog edits don't change old quotes. */
export type Line = {
  id: string;
  type: LineType;
  catId?: string;
  path?: string;
  unit?: Unit;
  qty: number;
  price: number;
  desc: string;
  showQty?: boolean;
  /** One priced component per catalog level on the path, each with its own quantity
   *  (fronts 1,100 × 4 m + handle 250 × 3 m). When present, these set the line total. */
  parts?: LinePart[];
};

export type LinePart = { id: string; name: string; unit: Unit; price: number; qty: number; /** show this quantity to the client */ showQty?: boolean };

/** Hidden commission: just a % and an optional note for Erez */
export type Commission = { name: string; pct: number };

export type Status = "draft" | "sent" | "approved" | "rejected";

export type QuotePro = { proId: string; pct: number };

export type Quote = {
  id: string;
  date: string; // YYYY-MM-DD, Israel time
  seq: number; // running number within the day
  status: Status;
  client: { name: string; phone: string; email?: string };
  project: string;
  lines: Line[];
  pros: QuotePro[];
  /** Up to two hidden commissions; replaces `pros` on quotes that have it */
  commissions?: Commission[];
  round: boolean;
  /** Hidden markup % on the work cost */
  markup?: number;
  /** Discount % shown to the client */
  discount?: number;
  /** Which discount field the editor shows */
  discountMode?: "pct" | "amt";
  /** Discount in shekels off the total before VAT, shown to the client */
  discountAmt?: number;
  delivery: string;
  notes: string;
  approvedBy?: string;
  approvedAt?: string;
  /** When the quote was sent, and when to call the client back if there's no answer */
  sentAt?: string;
  followUp?: string;
  /** When Erez last sent the follow-up message */
  followedAt?: string;
  /** The day Erez marked it closed (approved) or not closed (rejected) */
  decidedAt?: string;
  /** Notes only Erez sees */
  internalNotes?: string;
  /** The kitchen plan this quote was made from; its drawing and 3D view show with the quote */
  planId?: string;
  /** When Erez last sent this client a review request */
  reviewAskedAt?: string;
  /** What brought this client, for a quote that has no request (פנייה) behind it */
  channel?: Channel;
  updatedAt?: string;
};

export type Pro = { id: string; name: string; role: string; pct: number };

export type Settings = {
  biz: string;
  owner: string;
  vatId: string;
  address: string;
  phone: string;
  email: string;
  web: string;
  vat: number;
  validity: number;
  payment: string;
  clauses: string;
  roundTo: number;
  /** Commission added to every new quote unless Erez removes it */
  defaultCommissionPct?: number;
  /** Automatic "we got your request" email to a client whose request came in by mail */
  leadAutoReply?: boolean;
  leadReplyText?: string;
  /** Review pages shown to the client with every quote that is sent, so the ratings help them decide */
  reviewsGoogle?: string;
  reviewsMidrag?: string;
  /** Where a client whose kitchen is done writes a review; sent only by Erez, only after the job */
  reviewAskGoogle?: string;
  reviewAskB144?: string;
  /** The WhatsApp message for calling back a client who hasn't answered a quote; edited before each send */
  followUpText?: string;
  /** How Erez builds, for the workshop sheets; missing values use the defaults in takeoff.ts */
  shopRules?: { board?: number; back?: number; frontGap?: number; shelfSetback?: number };
};

export type LeadSource = "email" | "whatsapp" | "phone" | "site" | "other";

/** A client's request for a quote, waiting until Erez builds one. */
export type Lead = {
  id: string;
  createdAt: string; // ISO time the request came in
  source: LeadSource;
  name: string;
  phone: string;
  email: string;
  /** What the client asked for, in their words */
  text: string;
  subject?: string;
  /** Message-ID of the request email, so it is imported once and the auto-reply threads */
  msgId?: string;
  /** The quote built for it; without it, a quote with the same phone or email links on its own */
  quoteId?: string;
  /** Erez marked it as not a real request */
  closed?: boolean;
  autoReplied?: boolean;
  /** Pictures and documents the client sent (mail attachments, or uploaded by Erez) */
  files?: LeadFile[];
  /** What brought the client (Google ad, Google profile, a friend…); empty until known */
  channel?: Channel;
  /** From the site's form: the client's town and when they plan the kitchen */
  city?: string;
  timing?: string;
  /** The page the client first landed on, for requests from the site */
  landing?: string;
};

/** A file kept with a request. The content is stored apart, by id, and opened only through the admin. */
export type LeadFile = { id: string; name: string; type: string; size: number };

/** A kitchen plan (drawing + 3D), made before the quote; a quote can be opened from it. */
export type Plan = {
  id: string;
  createdAt: string;
  updatedAt?: string;
  title: string;
  client: { name: string; phone: string; email?: string };
  layout: KitchenLayout;
  /** the room drawn with the mouse; its kitchen walls fill layout.walls */
  room?: RoomSketch;
  notes?: string;
  /** the quote made from this plan */
  quoteId?: string;
  /** photorealistic renders made from the 3D view, newest last; `shown` is the one the client gets */
  renders?: { url: string; at: string }[];
  shownRender?: string;
};

export type AppData = { settings: Settings; pros: Pro[]; cat: CatNode[]; quotes: Quote[]; leads: Lead[]; plans: Plan[] };

/** Money spent on advertising, entered by Erez (or Claude) as it's paid. */
export type Spend = { id: string; date: string; channel: Channel; amount: number; note?: string };

/** Site counters for one month: key "d07_gads_call" → count. */
export type MonthStats = Record<string, number>;

/** The marketing screen's own data: spend, the monthly goal (kitchens), and site counters by month ("2026-11"). */
export type Marketing = { spends: Spend[]; goal: number; stats: Record<string, MonthStats> };

/** What the public quote page needs — never includes commissions or line prices */
export type PublicQuote = { quote: Quote; settings: Settings };
