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
type Doc = { overrides?: (Override & { _key: string })[]; gallery?: Swap[] };
type Project = { _id: string; images?: { _key: string; ref?: string; url?: string }[] };

const getDoc = () => sanity.fetch<Doc | null>(`*[_id == $id][0]{ overrides, gallery }`, { id: OVERRIDES_ID }, NO_CACHE);
const getProject = () =>
  sanity.fetch<Project | null>(`*[_type == "project" && category == $c][0]{ _id, images[]{ _key, "ref": asset._ref, "url": asset->url } }`, { c: GALLERY }, NO_CACHE);
const keyOf = (s: string) => s.replace(/[^a-zA-Z0-9]/g, "").slice(-40);

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
  return NextResponse.json({ items });
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
    return NextResponse.json({ ok: true, url: asset.url });
  }

  if (b.id.startsWith("g:")) {
    const key = b.id.slice(2);
    const [doc, project] = await Promise.all([getDoc(), getProject()]);
    const img = project?.images?.find((i) => i._key === key);
    if (!project || !img?.ref) return NextResponse.json({ error: "not-found" }, { status: 404 });
    await sanity.patch(project._id).set({ [`images[_key=="${key}"].asset`]: { _type: "reference", _ref: asset._id } }).commit();
    if (!doc?.gallery?.some((g) => g.key === key))
      await sanity.patch(OVERRIDES_ID).setIfMissing({ gallery: [] }).append("gallery", [{ _key: keyOf(key), key, prevRef: img.ref }]).commit();
    return NextResponse.json({ ok: true, url: asset.url });
  }
  return NextResponse.json({ error: "bad-request" }, { status: 400 });
}

/** Back to the original photo. */
export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id") || "";
  if (id.startsWith("s:")) {
    await sanity.patch(OVERRIDES_ID).unset([`overrides[_key=="${keyOf(id.slice(2))}"]`]).commit().catch(() => {});
    return NextResponse.json({ ok: true });
  }
  if (id.startsWith("g:")) {
    const key = id.slice(2);
    const [doc, project] = await Promise.all([getDoc(), getProject()]);
    const g = doc?.gallery?.find((x) => x.key === key);
    if (!g || !project) return NextResponse.json({ error: "not-found" }, { status: 404 });
    await sanity.patch(project._id).set({ [`images[_key=="${key}"].asset`]: { _type: "reference", _ref: g.prevRef } }).commit();
    await sanity.patch(OVERRIDES_ID).unset([`gallery[_key=="${g._key}"]`]).commit();
    return NextResponse.json({ ok: true });
  }
  return NextResponse.json({ error: "bad-request" }, { status: 400 });
}
