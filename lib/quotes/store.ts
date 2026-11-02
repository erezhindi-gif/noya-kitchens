// Server-only storage for the quote system.
// Production: Sanity, in documents whose _id contains a dot ("noyaq.…"). Sanity never serves
// dotted IDs to anonymous requests, so quotes stay private even though the dataset is public.
// Local dev without SANITY_API_TOKEN: a JSON file under .data/ (gitignored).
import { createClient } from "@sanity/client";
import { promises as fs } from "fs";
import path from "path";
import { DEFAULT_SETTINGS, defaultCatalog } from "./defaults";
import type { AppData, CatNode, Lead, LeadFile, Marketing, MonthStats, Plan, Pro, Quote, Settings, Spend } from "./types";

// Saved settings over the defaults. The earlier default payment wording is replaced by the current one.
const OLD_PAYMENT = "50% בחתימת הזמנה, 50% לפני התקנה.";
const withDefaults = (s?: Partial<Settings> | null): Settings => {
  const out = { ...DEFAULT_SETTINGS, ...(s || {}) };
  if (out.payment?.trim() === OLD_PAYMENT) out.payment = DEFAULT_SETTINGS.payment;
  return out;
};

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

const ID = { settings: "noyaq.settings", catalog: "noyaq.catalog", quote: (id: string) => `noyaq.quote.${id}`, lead: (id: string) => `noyaq.lead.${id}`, file: (id: string) => `noyaq.lfile.${id}`, plan: (id: string) => `noyaq.plan.${id}` };

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
type FileData = { settings?: Settings; pros?: Pro[]; cat?: CatNode[]; quotes: Quote[]; leads?: Lead[]; plans?: Plan[] };
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
    const [settingsDoc, catalogDoc, quotes, leads, plans] = await Promise.all([
      readDoc(ID.settings),
      readDoc(ID.catalog),
      sanity.fetch<Record<string, unknown>[]>(`*[_type == "nq_quote" && _id in path("noyaq.quote.*")]`, {}, NO_CACHE),
      sanity.fetch<Record<string, unknown>[]>(`*[_type == "nq_lead" && _id in path("noyaq.lead.*")]`, {}, NO_CACHE),
      sanity.fetch<Record<string, unknown>[]>(`*[_type == "nq_plan" && _id in path("noyaq.plan.*")]`, {}, NO_CACHE),
    ]);
    const s = settingsDoc ? clean<{ settings: Settings; pros: Pro[] }>(settingsDoc) : null;
    return {
      settings: withDefaults(s?.settings),
      pros: s?.pros || [],
      cat: catalogDoc ? clean<{ nodes: CatNode[] }>(catalogDoc).nodes || [] : defaultCatalog(),
      quotes: quotes.map((q) => clean<Quote>(q)),
      leads: leads.map((l) => clean<Lead>(l)),
      plans: plans.map((p) => clean<Plan>(p)),
    };
  }
  const d = await readFile();
  return {
    settings: withDefaults(d.settings),
    pros: d.pros || [],
    cat: d.cat || defaultCatalog(),
    quotes: d.quotes,
    leads: d.leads || [],
    plans: d.plans || [],
  };
}

/** A quote, the settings, and the plan it was made from (for the client's page and the PDF). */
export async function getQuote(id: string): Promise<{ quote: Quote; settings: Settings; plan: Plan | null } | null> {
  if (!/^[a-z0-9]{6,32}$/.test(id)) return null;
  if (sanity) {
    const [q, s] = await Promise.all([readDoc(ID.quote(id)), readDoc(ID.settings)]);
    if (!q) return null;
    const ss = s ? clean<{ settings: Settings }>(s).settings : undefined;
    const quote = clean<Quote>(q);
    return { quote, settings: withDefaults(ss), plan: await planOf(quote) };
  }
  const d = await readFile();
  const quote = d.quotes.find((q) => q.id === id);
  return quote ? { quote, settings: withDefaults(d.settings), plan: await planOf(quote) } : null;
}

const planOf = (q: Quote) => (q.planId ? getPlan(q.planId).catch(() => null) : Promise.resolve(null));

/* ---------- kitchen plans ---------- */
export async function getPlan(id: string): Promise<Plan | null> {
  if (!/^[a-z0-9]{6,32}$/.test(id)) return null;
  if (sanity) {
    const doc = await readDoc(ID.plan(id));
    return doc ? clean<Plan>(doc) : null;
  }
  return (await readFile()).plans?.find((p) => p.id === id) || null;
}

export async function putPlan(p: Plan) {
  p.updatedAt = new Date().toISOString();
  if (sanity) return void (await sanity.createOrReplace({ _id: ID.plan(p.id), _type: "nq_plan", ...p }));
  const d = await readFile();
  d.plans = [...(d.plans || []).filter((x) => x.id !== p.id), p];
  await writeFile(d);
}

export async function deletePlan(id: string) {
  if (sanity) return void (await sanity.delete(ID.plan(id)));
  const d = await readFile();
  d.plans = (d.plans || []).filter((x) => x.id !== id);
  await writeFile(d);
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

/* ---------- leads (requests for a quote) ---------- */
const leadDoc = (l: Lead) => ({ _id: ID.lead(l.id), _type: "nq_lead", ...l, ...(l.files ? { files: withKeys(l.files) } : {}) });

export async function getLead(id: string): Promise<Lead | null> {
  if (sanity) {
    const doc = await readDoc(ID.lead(id));
    return doc ? clean<Lead>(doc) : null;
  }
  return (await readFile()).leads?.find((l) => l.id === id) || null;
}

export async function putLead(l: Lead) {
  if (sanity) return void (await sanity.createOrReplace(leadDoc(l)));
  const d = await readFile();
  d.leads = [...(d.leads || []).filter((x) => x.id !== l.id), l];
  await writeFile(d);
}

/** Saves a new lead only if no lead with this id exists yet. Returns false when it already did,
 *  so two imports running at once can't both send the client an auto-reply. */
export async function insertLead(l: Lead): Promise<boolean> {
  if (sanity) {
    try {
      await sanity.create(leadDoc(l));
      return true;
    } catch {
      return false;
    }
  }
  const d = await readFile();
  if ((d.leads || []).some((x) => x.id === l.id)) return false;
  d.leads = [...(d.leads || []), l];
  await writeFile(d);
  return true;
}

/* Files of a request: the content sits in its own private document (dotted id), as base64. */
const FILES_DIR = path.join(process.cwd(), ".data", "lead-files");
const fileIdOk = (id: string) => /^[a-z0-9]{6,40}$/.test(id);

export async function putLeadFile(f: LeadFile, data: Buffer) {
  if (!fileIdOk(f.id)) throw new Error("bad file id");
  if (sanity) return void (await sanity.createOrReplace({ _id: ID.file(f.id), _type: "nq_lfile", ...f, data: data.toString("base64") }));
  await fs.mkdir(FILES_DIR, { recursive: true });
  await fs.writeFile(path.join(FILES_DIR, f.id + ".json"), JSON.stringify({ ...f, data: data.toString("base64") }));
}

export async function getLeadFile(id: string): Promise<(LeadFile & { data: Buffer }) | null> {
  if (!fileIdOk(id)) return null;
  let doc: Record<string, unknown> | null = null;
  if (sanity) doc = await readDoc(ID.file(id));
  else doc = await fs.readFile(path.join(FILES_DIR, id + ".json"), "utf8").then(JSON.parse).catch(() => null);
  if (!doc) return null;
  const { id: fid, name, type, size, data } = doc as LeadFile & { data: string };
  return { id: fid, name, type, size, data: Buffer.from(data, "base64") };
}

export async function deleteLeadFiles(ids: string[]) {
  for (const id of ids.filter(fileIdOk)) {
    if (sanity) await sanity.delete(ID.file(id)).catch(() => {});
    else await fs.unlink(path.join(FILES_DIR, id + ".json")).catch(() => {});
  }
}

export async function deleteLead(id: string) {
  const lead = await getLead(id);
  if (lead?.files?.length) await deleteLeadFiles(lead.files.map((f) => f.id));
  if (sanity) return void (await sanity.delete(ID.lead(id)));
  const d = await readFile();
  d.leads = (d.leads || []).filter((x) => x.id !== id);
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
export type Secrets = { passHash?: string; passSalt?: string; resendKey?: string; lastResetAt?: number; lastFollowupMail?: string; anthropicKey?: string; geminiKey?: string; gmailPass?: string; lastLeadSync?: number; leadSyncOkAt?: number; leadSyncError?: string; leadCronAt?: number };
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

/* ---------- marketing: ad spend, monthly goal, site counters ----------
   Spend and goal sit in one private document; each month's counters in their own ("noyaq.stats.202611"),
   raised with Sanity's atomic inc so visits at the same moment never overwrite each other. */
const MKT_ID = "noyaq.marketing";
const DEFAULT_GOAL = 4;
type FileMkt = FileData & { spends?: Spend[]; goal?: number; stats?: Record<string, MonthStats> };
const statsId = (month: string) => `noyaq.stats.${month.replace("-", "")}`;

export async function getMarketing(): Promise<Marketing> {
  if (sanity) {
    const [doc, stats] = await Promise.all([
      readDoc(MKT_ID),
      sanity.fetch<Record<string, unknown>[]>(`*[_type == "nq_stats" && _id in path("noyaq.stats.*")]`, {}, NO_CACHE),
    ]);
    const m = doc ? clean<{ spends?: Spend[]; goal?: number }>(doc) : {};
    const byMonth: Record<string, MonthStats> = {};
    for (const s of stats) {
      const id = String(s._id).slice("noyaq.stats.".length);
      const counts: MonthStats = {};
      for (const [k, v] of Object.entries(s)) if (/^d\d\d_/.test(k) && typeof v === "number") counts[k] = v;
      byMonth[`${id.slice(0, 4)}-${id.slice(4)}`] = counts;
    }
    return { spends: m.spends || [], goal: m.goal || DEFAULT_GOAL, stats: byMonth };
  }
  const d = (await readFile()) as FileMkt;
  return { spends: d.spends || [], goal: d.goal || DEFAULT_GOAL, stats: d.stats || {} };
}

export async function countSiteEvent(month: string, key: string) {
  if (!/^\d{4}-\d\d$/.test(month) || !/^d\d\d_[a-z]+_[a-z]+$/.test(key)) return;
  if (sanity) {
    const id = statsId(month);
    await sanity.createIfNotExists({ _id: id, _type: "nq_stats" });
    await sanity.patch(id).setIfMissing({ [key]: 0 }).inc({ [key]: 1 }).commit();
    return;
  }
  const d = (await readFile()) as FileMkt;
  d.stats = d.stats || {};
  const m = (d.stats[month] = d.stats[month] || {});
  m[key] = (m[key] || 0) + 1;
  await writeFile(d);
}

export async function addSpend(s: Spend) {
  if (sanity) {
    await sanity.createIfNotExists({ _id: MKT_ID, _type: "nq_marketing" });
    await sanity.patch(MKT_ID).setIfMissing({ spends: [] }).append("spends", [{ ...s, _key: s.id }]).commit();
    return;
  }
  const d = (await readFile()) as FileMkt;
  d.spends = [...(d.spends || []).filter((x) => x.id !== s.id), s];
  await writeFile(d);
}

export async function deleteSpend(id: string) {
  if (sanity) {
    await sanity.patch(MKT_ID).unset([`spends[_key=="${id.replace(/[^a-z0-9]/g, "")}"]`]).commit().catch(() => {});
    return;
  }
  const d = (await readFile()) as FileMkt;
  d.spends = (d.spends || []).filter((x) => x.id !== id);
  await writeFile(d);
}

export async function setGoal(goal: number) {
  if (sanity) {
    await sanity.createIfNotExists({ _id: MKT_ID, _type: "nq_marketing" });
    await sanity.patch(MKT_ID).set({ goal }).commit();
    return;
  }
  const d = (await readFile()) as FileMkt;
  d.goal = goal;
  await writeFile(d);
}
