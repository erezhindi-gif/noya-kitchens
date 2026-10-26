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
  client: { name: string; phone: string };
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
  /** Notes only Erez sees */
  internalNotes?: string;
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
};

export type AppData = { settings: Settings; pros: Pro[]; cat: CatNode[]; quotes: Quote[] };

/** What the public quote page needs — never includes commissions or line prices */
export type PublicQuote = { quote: Quote; settings: Settings };
