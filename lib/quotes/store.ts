// Server-only storage for the quote system.
// Production: Sanity, in documents whose _id contains a dot ("noyaq.…"). Sanity never serves
// dotted IDs to anonymous requests, so quotes stay private even though the dataset is public.
// Local dev without SANITY_API_TOKEN: a JSON file under .data/ (gitignored).
import { createClient } from "@sanity/client";
import { promises as fs } from "fs";
import path from "path";
import { DEFAULT_SETTINGS, defaultCatalog } from "./defaults";

// Saved settings over the defaults. The earlier default payment wording is replaced by the current one.
const OLD_PAYMENT = "50% בחתימת הזמנה, 50% לפני התקנה.";
const withDefaults = (s?: Partial<Settings> | null): Settings => {
  const out = { ...DEFAULT_SETTINGS, ...(s || {}) };
  if (out.payment?.trim() === OLD_PAYMENT) out.payment = DEFAULT_SETTINGS.payment;
  return out;
};
import type { AppData, CatNode, Pro, Quote, Settings } from "./types";

const token = process.env.SANITY_API_TOKEN;
const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID;

const sanity =
  token && projectId
    ? createClient({
        projectId,
        dataset: process.env.NEXT_PUBLIC_SANITY_DATASET || "production",
        apiVersion: "2024-01-01",
        token,
        useCdn: false,
        perspective: "raw",
      })
    : null;

export const storageMode = sanity ? "sanity" : "local-file";

// Every read bypasses Next.js' fetch cache. Without this, the quote list was served from a cached
// copy: deleted quotes came back and new ones seemed to vanish after a refresh.
const NO_CACHE = { cache: "no-store" as const };
const readDoc = (id: string) =>
  sanity!.fetch<Record<string, unknown> | null>(`*[_id == $id][0]`, { id }, NO_CACHE);

const ID = { settings: "noyaq.settings", catalog: "noyaq.catalog", quote: (id: string) => `noyaq.quote.${id}` };

/* Sanity wants a _key on every object inside an array; strip Sanity's own fields on the way out. */
const withKeys = <T extends { id: string }>(arr: T[]) => arr.map((x) => ({ ...x, _key: x.id }));
function clean<T>(doc: Record<string, unknown>): T {
  const { _id, _type, _rev, _createdAt, _updatedAt, _key, ...rest } = doc;
  void _id; void _type; void _rev; void _createdAt; void _updatedAt; void _key;
  for (const [k, v] of Object.entries(rest)) {
    if (Array.isArray(v)) rest[k] = v.map((x) => (x && typeof x === "object" ? clean(x as Record<string, unknown>) : x));
  }
  return rest as T;
}
const quoteDoc = (q: Quote) => ({
  _id: ID.quote(q.id),
  _type: "nq_quote",
  ...q,
  lines: withKeys(q.lines.map((l) => (l.parts ? { ...l, parts: withKeys(l.parts) } : l))),
  commissions: q.commissions?.map((c, i) => ({ ...c, _key: `c${i}` })),
  pros: q.pros.map((p, i) => ({ ...p, _key: `${p.proId}-${i}` })),
});

/* ---------- local file fallback ---------- */
const FILE = path.join(process.cwd(), ".data", "noya-quotes.json");
type FileData = { settings?: Settings; pros?: Pro[]; cat?: CatNode[]; quotes: Quote[] };
async function readFile(): Promise<FileData> {
  try {
    return JSON.parse(await fs.readFile(FILE, "utf8"));
  } catch {
    return { quotes: [] };
  }
}
async function writeFile(d: FileData) {
  await fs.mkdir(path.dirname(FILE), { recursive: true });
  await fs.writeFile(FILE, JSON.stringify(d, null, 1), "utf8");
}

/* ---------- API ---------- */
export async function getData(): Promise<AppData> {
  if (sanity) {
    const [settingsDoc, catalogDoc, quotes] = await Promise.all([
      readDoc(ID.settings),
      readDoc(ID.catalog),
      sanity.fetch<Record<string, unknown>[]>(`*[_type == "nq_quote" && _id in path("noyaq.quote.*")]`, {}, NO_CACHE),
    ]);
    const s = settingsDoc ? clean<{ settings: Settings; pros: Pro[] }>(settingsDoc) : null;
    return {
      settings: withDefaults(s?.settings),
      pros: s?.pros || [],
      cat: catalogDoc ? clean<{ nodes: CatNode[] }>(catalogDoc).nodes || [] : defaultCatalog(),
      quotes: quotes.map((q) => clean<Quote>(q)),
    };
  }
  const d = await readFile();
  return {
    settings: withDefaults(d.settings),
    pros: d.pros || [],
    cat: d.cat || defaultCatalog(),
    quotes: d.quotes,
  };
}

export async function getQuote(id: string): Promise<{ quote: Quote; settings: Settings } | null> {
  if (!/^[a-z0-9]{6,32}$/.test(id)) return null;
  if (sanity) {
    const [q, s] = await Promise.all([readDoc(ID.quote(id)), readDoc(ID.settings)]);
    if (!q) return null;
    const ss = s ? clean<{ settings: Settings }>(s).settings : undefined;
    return { quote: clean<Quote>(q), settings: withDefaults(ss) };
  }
  const d = await readFile();
  const quote = d.quotes.find((q) => q.id === id);
  return quote ? { quote, settings: withDefaults(d.settings) } : null;
}

export async function putQuote(q: Quote) {
  // A save from a screen that loaded the quote before the client approved it must not wipe the
  // approval. Erez can still change the status himself once his screen shows the approval.
  const existing = (await getQuote(q.id).catch(() => null))?.quote;
  if (existing?.approvedBy && !q.approvedBy) {
    q.status = existing.status;
    q.approvedBy = existing.approvedBy;
    q.approvedAt = existing.approvedAt;
  }
  q.updatedAt = new Date().toISOString();
  if (sanity) return void (await sanity.createOrReplace(quoteDoc(q)));
  const d = await readFile();
  d.quotes = [...d.quotes.filter((x) => x.id !== q.id), q];
  await writeFile(d);
}

export async function deleteQuote(id: string) {
  if (sanity) return void (await sanity.delete(ID.quote(id)));
  const d = await readFile();
  d.quotes = d.quotes.filter((x) => x.id !== id);
  await writeFile(d);
}

export async function putCatalog(nodes: CatNode[]) {
  if (sanity) return void (await sanity.createOrReplace({ _id: ID.catalog, _type: "nq_catalog", nodes: withKeys(nodes.map((n) => (n.options ? { ...n, options: withKeys(n.options) } : n))) }));
  const d = await readFile();
  d.cat = nodes;
  await writeFile(d);
}

export async function putSettings(settings: Settings, pros: Pro[]) {
  if (sanity)
    return void (await sanity.createOrReplace({ _id: ID.settings, _type: "nq_settings", settings, pros: withKeys(pros) }));
  const d = await readFile();
  d.settings = settings;
  d.pros = pros;
  await writeFile(d);
}

/* ---------- secrets: password hash and mail key ----------
   Kept in their own private document so they never travel with settings to the browser. */
export type Secrets = { passHash?: string; passSalt?: string; resendKey?: string; lastResetAt?: number; lastFollowupMail?: string; anthropicKey?: string };
const SECRETS_ID = "noyaq.secrets";

export async function getSecrets(): Promise<Secrets> {
  if (sanity) {
    const doc = await readDoc(SECRETS_ID);
    return doc ? clean<Secrets>(doc) : {};
  }
  const d = (await readFile()) as FileData & { secrets?: Secrets };
  return d.secrets || {};
}

export async function patchSecrets(patch: Secrets) {
  if (sanity) {
    await sanity.createIfNotExists({ _id: SECRETS_ID, _type: "nq_secrets" });
    await sanity.patch(SECRETS_ID).set(patch).commit();
    return;
  }
  const d = (await readFile()) as FileData & { secrets?: Secrets };
  d.secrets = { ...(d.secrets || {}), ...patch };
  await writeFile(d);
}

export async function getOwnerEmail() {
  return (await getData()).settings.email || DEFAULT_SETTINGS.email;
}

/** Client approval from the public link. Only moves a quote forward; never touches prices. */
export async function approveQuote(id: string, name: string): Promise<Quote | null> {
  const found = await getQuote(id);
  if (!found) return null;
  const q = found.quote;
  if (q.status === "approved") return q;
  const approvedAt = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jerusalem" }).format(new Date());
  const updatedAt = new Date().toISOString(); // newer than any copy Erez's browser still holds
  if (sanity) {
    await sanity.patch(ID.quote(id)).set({ status: "approved", approvedBy: name, approvedAt, updatedAt }).commit();
  } else {
    const d = await readFile();
    const x = d.quotes.find((y) => y.id === id)!;
    Object.assign(x, { status: "approved", approvedBy: name, approvedAt, updatedAt });
    await writeFile(d);
  }
  return { ...q, status: "approved", approvedBy: name, approvedAt, updatedAt };
}
