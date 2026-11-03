import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@sanity/client";
import { OVERRIDES_ID, STATIC_KITCHENS, type Override } from "@/lib/site-images";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const sanity = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID!,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET || "production",
  apiVersion: "2024-01-01",
  token: process.env.SANITY_API_TOKEN,
  useCdn: false,
});
const NO_CACHE = { cache: "no-store" as const };
const GALLERY = "מטבחים";

/** A gallery photo that was replaced keeps its original asset here, for "restore". */
type Swap = { _key: string; key: string; prevRef: string };
/** Photos of the same kitchen, re-shot as one set so the styling matches. */
type KitchenSet = { _key: string; ids: string[] };
type Doc = { overrides?: (Override & { _key: string })[]; gallery?: Swap[]; sets?: KitchenSet[] };
type Project = { _id: string; images?: { _key: string; ref?: string; url?: string }[] };

const getDoc = () => sanity.fetch<Doc | null>(`*[_id == $id][0]{ overrides, gallery, sets }`, { id: OVERRIDES_ID }, NO_CACHE);
const getProject = () =>
  sanity.fetch<Project | null>(`*[_type == "project" && category == $c][0]{ _id, images[]{ _key, "ref": asset._ref, "url": asset->url } }`, { c: GALLERY }, NO_CACHE);
const keyOf = (s: string) => s.replace(/[^a-zA-Z0-9]/g, "").slice(-40);

/** The same photo also sits in the "מטבחים" gallery: replacing (or restoring) the file does the same there. */
const TWINS: Record<string, string> = {
  "/images/kitchens/kitchen-1.jpg": "image-ab6ce8205498f73d9158b82bdfea44d3a8a1924c-1024x768-jpg",
  "/images/kitchens/kitchen-2.jpg": "image-10d4a853ccf23d27f39c066e49fd8e709c6f56f1-3627x2721-jpg",
  "/images/kitchens/kitchen-3.jpg": "image-74edff92717d969f27a893f732cdaca3376b7022-3627x2721-jpg",
  "/images/kitchens/kitchen-4.jpg": "image-31cf83e10543e8f8c89785174214c8b74f76aad2-3597x2408-jpg",
  "/images/kitchens/kitchen-5.jpg": "image-b001e5ed55de2a0f95a3afadbd2f144c9ab09cf3-3583x2687-jpg",
  "/images/kitchens/kitchen-6.jpg": "image-6862f21d9fcc44a5c66cb0d7bebba3b6a35f1d1f-3648x2736-jpg",
  "/images/kitchens/kitchen-7.jpg": "image-b44576fdf8cb524b274e40ef598bd295a4798ffc-3611x2707-jpg",
  "/images/kitchens/kitchen-8.jpg": "image-8c5e1d78867191177eee211eed533b4e71a2a7e1-2733x3643-jpg",
  "/images/kitchens/kitchen-9.jpg": "image-9accecd9cc4622a43e90d25f577ddb922e62e4bf-3648x2736-jpg",
  "/images/kitchens/kitchen-10.jpg": "image-41e2dc6264ef60007978023f2aadf496c24392db-3641x2731-jpg",
  "/images/kitchens/kitchen-11.jpg": "image-88ae5ec92ee1d1b6ed72716f9618fba45b4acebf-3648x2736-jpg",
  "/images/kitchens/kitchen-12.jpg": "image-70bc5d4f47755fa01dc9504f78d3345ef6e06073-3580x2686-jpg",
  "/images/kitchens/kitchen-13.jpg": "image-0e2f05e86fd2181139caa2faee2a2610bbff7173-3513x2635-jpg",
  "/images/kitchens/kitchen-14.jpg": "image-85af68884913a7c8dfab4c60409bf568aad3895e-3648x2736-jpg",
  "/images/kitchens/kitchen-15.jpg": "image-2ccefdd80cd2600d4dd9ec2b61957db06422b3d2-3607x2705-jpg",
  "/images/kitchens/kitchen-16.jpg": "image-5bf7cca0c421c63148f1e4395608429ce766f687-3485x2615-jpg",
  "/images/kitchens/kitchen-17.jpg": "image-80899080c0ce8a674fecec9da2f7bfca575d136c-3415x2561-jpg",
  "/images/kitchens/kitchen-18.jpg": "image-7d0b60908c046e88d1d654a7052151dc2e1ae85a-3588x2690-jpg",
  "/images/kitchens/kitchen-19.jpg": "image-f10a0552d50ad655f5dfd9896ab12e6367a2339a-3565x2675-jpg",
  "/images/kitchens/kitchen-20.jpg": "image-5415cfe288b212306a73db98cd27733134172b10-3648x2736-jpg",
};

async function swapGallery(key: string, assetId: string, doc: Doc | null, project: Project | null) {
  const img = project?.images?.find((i) => i._key === key);
  if (!project || !img?.ref) return false;
  await sanity.patch(project._id).set({ [`images[_key=="${key}"].asset`]: { _type: "reference", _ref: assetId } }).commit();
  if (!doc?.gallery?.some((g) => g.key === key))
    await sanity.patch(OVERRIDES_ID).setIfMissing({ gallery: [] }).append("gallery", [{ _key: keyOf(key), key, prevRef: img.ref }]).commit();
  return true;
}

async function restoreGallery(key: string, doc: Doc | null, project: Project | null) {
  const g = doc?.gallery?.find((x) => x.key === key);
  if (!g || !project) return false;
  await sanity.patch(project._id).set({ [`images[_key=="${key}"].asset`]: { _type: "reference", _ref: g.prevRef } }).commit();
  await sanity.patch(OVERRIDES_ID).unset([`gallery[_key=="${g._key}"]`]).commit();
  return true;
}

/** Every kitchen photo on the site: its original, what the site shows now, and whether it was replaced. */
export async function GET() {
  const [doc, project] = await Promise.all([getDoc(), getProject()]);
  const ov = new Map((doc?.overrides || []).map((o) => [o.path, o.url]));
  const swapped = new Set((doc?.gallery || []).map((g) => g.key));
  const items = [
    ...STATIC_KITCHENS.map((p) => ({ id: `s:${p}`, group: p.includes("hero") ? "תמונות הפתיחה בדף הבית" : "תמונות המטבחים באתר", original: p, current: ov.get(p) || p, replaced: ov.has(p) })),
    ...(project?.images || []).filter((i) => i.url).map((i) => ({
      id: `g:${i._key}`, group: "גלריית המטבחים", original: i.url!, current: i.url!, replaced: swapped.has(i._key),
    })),
  ];
  // a replaced gallery photo's "original" is the asset it had before
  if (doc?.gallery?.length) {
    const prev = await sanity.fetch<{ _id: string; url: string }[]>(`*[_id in $ids]{ _id, url }`, { ids: doc.gallery.map((g) => g.prevRef) }, NO_CACHE);
    const urlOf = new Map(prev.map((p) => [p._id, p.url]));
    for (const g of doc.gallery) {
      const it = items.find((x) => x.id === `g:${g.key}`);
      if (it && urlOf.get(g.prevRef)) it.original = urlOf.get(g.prevRef)!;
    }
  }
  const setOf = new Map<string, string>();
  for (const st of doc?.sets || []) for (const id of st.ids) setOf.set(id, st._key);
  return NextResponse.json({ items: items.map((it) => ({ ...it, set: setOf.get(it.id) })) });
}

/** Put an approved photo on the site in place of the original. */
export async function POST(req: NextRequest) {
  const b = (await req.json().catch(() => null)) as { id?: string; image?: string } | null;
  const m = b?.image?.match(/^data:image\/(jpeg|png);base64,(.+)$/);
  if (!b?.id || !m) return NextResponse.json({ error: "bad-request" }, { status: 400 });
  const asset = await sanity.assets.upload("image", Buffer.from(m[2], "base64"), { filename: `noya-reshoot-${Date.now()}.${m[1] === "png" ? "png" : "jpg"}`, contentType: `image/${m[1]}` });
  await sanity.createIfNotExists({ _id: OVERRIDES_ID, _type: "siteImages" });

  if (b.id.startsWith("s:")) {
    const path = b.id.slice(2);
    if (!STATIC_KITCHENS.includes(path)) return NextResponse.json({ error: "bad-request" }, { status: 400 });
    const k = keyOf(path);
    await sanity.patch(OVERRIDES_ID).setIfMissing({ overrides: [] }).unset([`overrides[_key=="${k}"]`]).commit();
    await sanity.patch(OVERRIDES_ID).append("overrides", [{ _key: k, path, ref: asset._id, url: asset.url }]).commit();
    if (TWINS[path]) {
      const [doc, project] = await Promise.all([getDoc(), getProject()]);
      await swapGallery(TWINS[path], asset._id, doc, project);
    }
    return NextResponse.json({ ok: true, url: asset.url });
  }

  if (b.id.startsWith("g:")) {
    const key = b.id.slice(2);
    const [doc, project] = await Promise.all([getDoc(), getProject()]);
    if (!(await swapGallery(key, asset._id, doc, project))) return NextResponse.json({ error: "not-found" }, { status: 404 });
    return NextResponse.json({ ok: true, url: asset.url });
  }
  // a photo of a new kitchen: added first in the "מטבחים" gallery
  if (b.id === "new") {
    const project = await getProject();
    if (!project) return NextResponse.json({ error: "not-found" }, { status: 404 });
    const item = { _type: "image", _key: keyOf(asset._id).slice(-24), asset: { _type: "reference", _ref: asset._id } };
    await sanity.patch(project._id).setIfMissing({ images: [] }).insert("before", "images[0]", [item]).commit();
    return NextResponse.json({ ok: true, url: asset.url, id: `g:${item._key}` });
  }
  return NextResponse.json({ error: "bad-request" }, { status: 400 });
}

/** Back to the original photo. */
export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id") || "";
  if (id.startsWith("s:")) {
    await sanity.patch(OVERRIDES_ID).unset([`overrides[_key=="${keyOf(id.slice(2))}"]`]).commit().catch(() => {});
    const twin = TWINS[id.slice(2)];
    if (twin) {
      const [doc, project] = await Promise.all([getDoc(), getProject()]);
      await restoreGallery(twin, doc, project);
    }
    return NextResponse.json({ ok: true });
  }
  if (id.startsWith("g:")) {
    const key = id.slice(2);
    const [doc, project] = await Promise.all([getDoc(), getProject()]);
    if (!(await restoreGallery(key, doc, project))) return NextResponse.json({ error: "not-found" }, { status: 404 });
    return NextResponse.json({ ok: true });
  }
  return NextResponse.json({ error: "bad-request" }, { status: 400 });
}

/** Marks photos as one kitchen: they leave any set they were in, and form a new set when two or more. */
export async function PATCH(req: NextRequest) {
  const b = (await req.json().catch(() => null)) as { ids?: string[] } | null;
  const ids = Array.from(new Set((b?.ids || []).filter((x) => typeof x === "string" && /^[sg]:/.test(x)))).slice(0, 30);
  if (!ids.length) return NextResponse.json({ error: "bad-request" }, { status: 400 });
  await sanity.createIfNotExists({ _id: OVERRIDES_ID, _type: "siteImages" });
  const doc = await getDoc();
  const sets = (doc?.sets || []).map((st) => ({ ...st, ids: st.ids.filter((x) => !ids.includes(x)) })).filter((st) => st.ids.length > 1);
  if (ids.length > 1) sets.push({ _key: Math.random().toString(36).slice(2, 12), ids });
  await sanity.patch(OVERRIDES_ID).set({ sets }).commit();
  return NextResponse.json({ ok: true });
}

/** Moves gallery photos: `keys` in this order, placed right after the photo `after` (e.g. a new kitchen's other shots after its main one). */
export async function PUT(req: NextRequest) {
  const b = (await req.json().catch(() => null)) as { keys?: string[]; after?: string } | null;
  const project = await getProject();
  const imgs = project?.images || [];
  const keys = (b?.keys || []).filter((k) => imgs.some((i) => i._key === k) && k !== b?.after);
  if (!project || !b?.after || !keys.length || !imgs.some((i) => i._key === b.after)) return NextResponse.json({ error: "bad-request" }, { status: 400 });
  const full = await sanity.fetch<{ images: { _key: string }[] }>(`*[_id == $id][0]{ images }`, { id: project._id }, NO_CACHE);
  const moving = keys.map((k) => full.images.find((i) => i._key === k)!);
  const rest = full.images.filter((i) => !keys.includes(i._key));
  const at = rest.findIndex((i) => i._key === b.after) + 1;
  await sanity.patch(project._id).set({ images: [...rest.slice(0, at), ...moving, ...rest.slice(at)] }).commit();
  return NextResponse.json({ ok: true });
}
