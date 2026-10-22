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
};

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
  round: boolean;
  delivery: string;
  notes: string;
  approvedBy?: string;
  approvedAt?: string;
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
};

export type AppData = { settings: Settings; pros: Pro[]; cat: CatNode[]; quotes: Quote[] };

/** What the public quote page needs — never includes commissions or line prices */
export type PublicQuote = { quote: Quote; settings: Settings };
