import type { CatNode, CatOption, Commission, Line, LinePart, Pro, Quote, Settings } from "./types";

export const STATUS_LABEL: Record<Quote["status"], string> = {
  draft: "טיוטה",
  sent: "נשלחה",
  approved: "אושרה",
  rejected: "נדחתה",
};

export const UNIT_LABEL = { m: "מ'", u: "יח'" } as const;

export const uid = (n = 10) =>
  Array.from(crypto.getRandomValues(new Uint8Array(n)), (b) => "abcdefghijkmnpqrstuvwxyz23456789"[b % 32]).join("");

export const todayIL = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jerusalem" }).format(new Date());

export const addDays = (date: string, n: number) => {
  const t = new Date(date + "T12:00:00Z");
  t.setUTCDate(t.getUTCDate() + n);
  return t.toISOString().slice(0, 10);
};

export const fdate = (s?: string) => {
  if (!s) return "";
  const [y, m, d] = s.split("-");
  return `${d}/${m}/${y}`;
};

export const qnum = (q: Pick<Quote, "date" | "seq">) =>
  "NQ" + q.date.slice(2).replace(/-/g, "") + "-" + String(q.seq).padStart(2, "0");

export const money = (n: number) => "₪" + (Math.round(n * 100) / 100).toLocaleString("he-IL");

const priced = (l: Line) => l.type !== "text" && l.type !== "head";
export const lineTotal = (l: Line) =>
  !priced(l)
    ? 0
    : l.parts?.length
      ? l.parts.reduce((s, p) => s + (+p.qty || 0) * (+p.price || 0), 0)
      : l.type === "lump" ? +l.price || 0 : (+l.qty || 0) * (+l.price || 0);

/** Quantity shown to the client: the deepest component's (e.g. number of drawers). */
export const shownQty = (l: Line) => (l.parts?.length ? +l.parts[l.parts.length - 1].qty : +l.qty);

/** The quote's hidden commissions. Older quotes kept them as professionals picked from a list. */
export const commissionsOf = (q: Quote, pros: Pro[]): Commission[] =>
  q.commissions ?? q.pros.map((p) => ({ name: pros.find((x) => x.id === p.proId)?.name || "", pct: p.pct }));

export function calc(q: Quote, settings: Settings, pros: Pro[]) {
  const base = q.lines.reduce((s, l) => s + lineTotal(l), 0);
  // Hidden markup on top of the work cost; the client never sees it.
  const markup = (base * (+q.markup! || 0)) / 100;
  const comList = commissionsOf(q, pros);
  const pct = comList.reduce((s, p) => s + (+p.pct || 0), 0);
  // Commission is a share of what the client pays, so after paying it Erez keeps base + markup.
  const listRaw = pct < 95 ? (base + markup) / (1 - pct / 100) : base + markup;
  // Client discount is shown on the PDF and comes off the price.
  const d = Math.min(Math.max(+q.discount! || 0, 0), 90);
  let price = listRaw * (1 - d / 100);
  const step = +settings.roundTo || 0;
  if (q.round && step > 0) price = Math.ceil(price / step) * step;
  const list = d ? price / (1 - d / 100) : price; // list price consistent with the rounded total
  const coms = comList.map((p) => ({ ...p, amount: (price * (+p.pct || 0)) / 100 }));
  const comTotal = coms.reduce((s, c) => s + c.amount, 0);
  const vat = (price * (+settings.vat || 0)) / 100;
  return { base, markup, pct, discountPct: d, list, discount: list - price, price, coms, comTotal, vat, total: price + vat, net: price - comTotal };
}

/* ---------- catalog tree ---------- */
export const kids = (cat: CatNode[], pid: string) =>
  cat.filter((c) => c.parentId === pid).sort((a, b) => Number(b.folder) - Number(a.folder));

export function ancestors(cat: CatNode[], n: CatNode) {
  const out: CatNode[] = [];
  let p = cat.find((c) => c.id === n.parentId);
  while (p) {
    out.unshift(p);
    const pid = p.parentId;
    p = cat.find((c) => c.id === pid);
  }
  return out;
}

export const label = (n: CatNode) => n.name || n.desc || "פריט ללא תיאור";
export const pathOf = (cat: CatNode[], n: CatNode) => [...ancestors(cat, n), n].map(label).join(" › ");

/** Price can sit at any level; an item without its own price takes the nearest one above it. */
export function priceOf(cat: CatNode[], n: CatNode): { price: number; unit: CatNode["unit"]; from?: CatNode } {
  for (const x of [n, ...ancestors(cat, n).reverse()])
    if (+(x.price || 0) > 0) return { price: +x.price!, unit: x.unit || "u", from: x === n ? undefined : x };
  return { price: 0, unit: n.unit || "u" };
}

/** Price of a picked item: every level on the way adds its own price (front 1,100 + handle 250 = 1,350).
 *  The unit comes from the deepest level that has a price. */
export function pathPrice(cat: CatNode[], n: CatNode): { price: number; unit: CatNode["unit"] } {
  let price = 0;
  let unit: CatNode["unit"];
  for (const x of [...ancestors(cat, n), n]) {
    const p = +(x.price || 0);
    if (p > 0) { price += p; unit = x.unit || "u"; }
  }
  return { price, unit: unit || n.unit || "u" };
}

/** Quote text, as in V6: each level's description (or its name when it has none) joined with commas.
 *  The top level only counts when it has a description of its own. */
export function composeDesc(cat: CatNode[], n: CatNode) {
  const parts: string[] = [];
  [...ancestors(cat, n), n].forEach((x, i) => {
    const d = (x.desc || "").trim();
    if (i === 0 && !d) return;
    const v = d || x.name.trim();
    if (v && !parts.includes(v)) parts.push(v);
  });
  return parts.join(", ");
}

/** Quote text when the item has no custom description: its names down the tree. */
export const autoDesc = (cat: CatNode[], n: CatNode) =>
  [...ancestors(cat, n), n].map((x) => x.name.trim()).filter(Boolean).join(", ");

/** One-time tidy on load: earlier versions could leave trailing ", , ," in descriptions. */
export const tidyCat = (cat: CatNode[]) =>
  cat.map((c) => (c.desc && /[,\s]+$/.test(c.desc) ? { ...c, desc: c.desc.replace(/[,\s]+$/, "") } : c));

export const showQtyOf = (cat: CatNode[], n: CatNode) => [n, ...ancestors(cat, n)].some((x) => x.showQty);

export const leafCount = (cat: CatNode[], id: string): number =>
  kids(cat, id).reduce((s, c) => s + (c.folder ? leafCount(cat, c.id) : 1), 0);

export const optPrice = (n: CatNode, o?: CatOption) =>
  o && o.price != null && String(o.price) !== "" ? Number(o.price) : n.price || 0;

export const lineFrom = (cat: CatNode[], n: CatNode, o?: CatOption): Line => {
  const base = composeDesc(cat, n) || pathOf(cat, n);
  const opt = o ? [n.optLabel?.trim(), o.name.trim()].filter(Boolean).join(" ") : "";
  const p = pathPrice(cat, n);
  // Every priced level becomes its own component with its own quantity.
  const parts: LinePart[] = o
    ? []
    : [...ancestors(cat, n), n]
        .filter((x) => +(x.price || 0) > 0)
        .map((x) => ({ id: uid(), name: x.name.trim() || label(x), unit: x.unit || "u", price: +x.price!, qty: 1 }));
  return {
    id: uid(),
    type: "cat",
    catId: n.id,
    path: pathOf(cat, n) + (o ? ` › ${o.name}` : ""),
    unit: o ? n.unit || "u" : p.unit,
    qty: 1,
    price: o ? optPrice(n, o) : p.price,
    desc: opt ? `${base}, ${opt}` : base,
    showQty: showQtyOf(cat, n),
    ...(parts.length ? { parts } : {}),
  };
};

/** Keeps the tree uniform: an item is a "folder" exactly when it has sub-items.
 *  Older catalogs stored colors as `options` on an item; those become sub-items. */
export function normalizeCat(cat: CatNode[]): CatNode[] {
  let out = [...cat];
  for (const n of cat) {
    if (!n.options?.length) continue;
    const base = n.desc || n.name;
    for (const o of n.options)
      out.push({
        id: o.id, parentId: n.id, name: o.name, folder: false, unit: n.unit, price: optPrice(n, o),
        desc: [base, [n.optLabel?.trim(), o.name.trim()].filter(Boolean).join(" ")].filter(Boolean).join(", "),
      });
    out = out.map((x) => (x.id === n.id ? { ...x, options: undefined, optLabel: undefined } : x));
  }
  const parents = new Set(out.map((x) => x.parentId));
  return out.map((x) => (x.folder === parents.has(x.id) ? x : { ...x, folder: parents.has(x.id) }));
}

export function descendantIds(cat: CatNode[], id: string): string[] {
  return kids(cat, id).flatMap((c) => [c.id, ...descendantIds(cat, c.id)]);
}

export function waLink(q: Quote, settings: Settings, total: number, origin: string) {
  let ph = (q.client.phone || "").replace(/\D/g, "");
  if (ph.startsWith("0")) ph = "972" + ph.slice(1);
  const text =
    `שלום ${q.client.name},\n` +
    `מצורפת הצעת מחיר ${qnum(q)} מנויה מטבחים${q.project ? ` עבור ${q.project}` : ""}.\n` +
    `סה"כ ${money(total)} כולל מע"מ.\n` +
    `לצפייה, הורדה ואישור: ${origin}/q/${q.id}\n\n` +
    `${settings.owner}, ${settings.phone}`;
  return `https://wa.me/${ph}?text=${encodeURIComponent(text)}`;
}
