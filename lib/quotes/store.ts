// Server-only storage for the quote system.
// Production: Sanity, in documents whose _id contains a dot ("noyaq.…"). Sanity never serves
// dotted IDs to anonymous requests, so quotes stay private even though the dataset is public.
// Local dev without SANITY_API_TOKEN: a JSON file under .data/ (gitignored).
import { createClient } from "@sanity/client";
import { promises as fs } from "fs";
import path from "path";
import { DEFAULT_SETTINGS, defaultCatalog } from "./defaults";
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
  lines: withKeys(q.lines),
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
      sanity.getDocument(ID.settings),
      sanity.getDocument(ID.catalog),
      sanity.fetch<Record<string, unknown>[]>(`*[_type == "nq_quote" && _id match "noyaq.quote.*"]`),
    ]);
    const s = settingsDoc ? clean<{ settings: Settings; pros: Pro[] }>(settingsDoc) : null;
    return {
      settings: { ...DEFAULT_SETTINGS, ...(s?.settings || {}) },
      pros: s?.pros || [],
      cat: catalogDoc ? clean<{ nodes: CatNode[] }>(catalogDoc).nodes || [] : defaultCatalog(),
      quotes: quotes.map((q) => clean<Quote>(q)),
    };
  }
  const d = await readFile();
  return {
    settings: { ...DEFAULT_SETTINGS, ...(d.settings || {}) },
    pros: d.pros || [],
    cat: d.cat || defaultCatalog(),
    quotes: d.quotes,
  };
}

export async function getQuote(id: string): Promise<{ quote: Quote; settings: Settings } | null> {
  if (!/^[a-z0-9]{6,32}$/.test(id)) return null;
  if (sanity) {
    const [q, s] = await Promise.all([sanity.getDocument(ID.quote(id)), sanity.getDocument(ID.settings)]);
    if (!q) return null;
    const ss = s ? clean<{ settings: Settings }>(s).settings : undefined;
    return { quote: clean<Quote>(q), settings: { ...DEFAULT_SETTINGS, ...(ss || {}) } };
  }
  const d = await readFile();
  const quote = d.quotes.find((q) => q.id === id);
  return quote ? { quote, settings: { ...DEFAULT_SETTINGS, ...(d.settings || {}) } } : null;
}

export async function putQuote(q: Quote) {
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
  if (sanity) return void (await sanity.createOrReplace({ _id: ID.catalog, _type: "nq_catalog", nodes: withKeys(nodes) }));
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

/** Client approval from the public link. Only moves a quote forward; never touches prices. */
export async function approveQuote(id: string, name: string): Promise<Quote | null> {
  const found = await getQuote(id);
  if (!found) return null;
  const q = found.quote;
  if (q.status === "approved") return q;
  const approvedAt = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jerusalem" }).format(new Date());
  if (sanity) {
    await sanity.patch(ID.quote(id)).set({ status: "approved", approvedBy: name, approvedAt }).commit();
  } else {
    const d = await readFile();
    const x = d.quotes.find((y) => y.id === id)!;
    Object.assign(x, { status: "approved", approvedBy: name, approvedAt });
    await writeFile(d);
  }
  return { ...q, status: "approved", approvedBy: name, approvedAt };
}
