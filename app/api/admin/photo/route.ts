import { NextRequest, NextResponse } from "next/server";
import { nearestRatio, photoPrompt, type PhotoOpts } from "@/lib/marketing/photo-prompt";
import { getSecrets } from "@/lib/quotes/store";
import { createClient } from "@sanity/client";
import { generateImage } from "@/lib/marketing/gemini-image";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(req: NextRequest) {
  const raw = (await req.json().catch(() => null)) as { keep?: string } | null;
  // a finished photo touched up by hand in the browser: just keep it with the others
  if (raw?.keep) {
    if (raw.keep.length > 4_000_000) return NextResponse.json({ error: "too-big" }, { status: 400 });
    const kept = await keepDraft(raw.keep, { mode: "retouch", notes: "תיקון ידני" } as unknown as PhotoOpts).catch(() => null);
    return kept ? NextResponse.json({ kept }) : NextResponse.json({ error: "failed" }, { status: 500 });
  }
  const { geminiKey } = await getSecrets();
  if (!geminiKey) return NextResponse.json({ error: "no-key" }, { status: 503 });
  const b = raw as { image?: string; w?: number; h?: number; opts?: PhotoOpts; refs?: { data: string; kind: "finished" | "original" | "product"; label?: string }[]; quality?: "pro" } | null;
  if (!b?.image || !b.opts || b.image.length > 4_000_000) return NextResponse.json({ error: "failed" }, { status: 400 });

  // Finished shots of the same kitchen set the styling. Original photos are not used as references:
  // with them the model kept copying the old photo and changed almost nothing.
  const refs = (b.refs || []).filter((r) => r?.data && r.data.length < 900_000 && (r.kind === "finished" || r.kind === "product" || b.opts?.mode === "edit")).slice(0, 4);
  const refParts = refs.flatMap((r, i) => [
    { text: `Reference ${i + 1}: ${r.kind === "product" ? `a product photo from the kitchen maker: ${String(r.label || "").slice(0, 300)}. Make it look exactly like this, matching the shape, size proportion, finish and details` : b.opts?.mode === "edit" && r.kind === "original" ? "the original photo of this kitchen: use it ONLY for the true colors and carpentry details (for example the exact oak tone of the fronts and the cabinet doors under the counters); do not copy its unfinished state or its camera" : r.kind === "finished" ? "an already finished professional shot of this same kitchen (copy its accessories, styling, decor and light mood)" : "an original photo of this same kitchen from another angle (for the carpentry and the room only)"}.` },
    { inlineData: { mimeType: "image/jpeg", data: r.data } },
  ]);
  const consistency = refs.length && b.opts?.mode !== "edit"
    ? "\n\nThe FIRST image is the photo to recreate; recreate THAT view. The reference images are finished professional shots of the SAME kitchen from this shoot: use them only for the accessories, styling, decor, colors and light mood, so the new shot matches them (they override the accessories list above). Do not copy their camera angle, and do not return the first image unchanged."
    : "";

  const parts = [{ inlineData: { mimeType: "image/jpeg", data: b.image } }, ...refParts, { text: photoPrompt(b.opts) + consistency }];
  // "pro": the stronger model first, for precise fixes (costs more per photo)
  const r = await generateImage(geminiKey, parts, nearestRatio(+b.w! || 4, +b.h! || 3), b.quality === "pro");
  if (!r.ok) return NextResponse.json({ error: r.error }, { status: r.error === "blocked" ? 422 : r.error === "bad-key" || r.error === "billing" ? 400 : 502 });
  // Every made photo is kept at once: it was paid for, and a reload or a closed screen must not lose it.
  const kept = await keepDraft(r.image, b.opts).catch((e) => { console.error("keep draft failed", e); return null; });
  return NextResponse.json({ image: r.image, model: r.model, kept });
}

/** The photos made lately, newest first. */
export async function GET() {
  const doc = await sanity.fetch<{ items?: Draft[] } | null>(`*[_id == $id][0]{ items }`, { id: DRAFTS_ID }, { cache: "no-store" });
  return NextResponse.json({ items: (doc?.items || []).slice().reverse() });
}

const sanity = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID!,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET || "production",
  apiVersion: "2024-01-01",
  token: process.env.SANITY_API_TOKEN,
  useCdn: false,
});
/** Private (dotted id) list of every photo the tool made. */
const DRAFTS_ID = "noyaq.photodrafts";
type Draft = { _key: string; url: string; at: string; mode: string; notes: string };

async function keepDraft(image: string, opts: PhotoOpts) {
  const m = image.match(/^data:(image\/[a-z]+);base64,(.+)$/);
  if (!m) return null;
  const asset = await sanity.assets.upload("image", Buffer.from(m[2], "base64"), { filename: `noya-photo-${Date.now()}.jpg`, contentType: m[1] });
  const d: Draft = { _key: asset._id.replace(/[^a-zA-Z0-9]/g, "").slice(-24), url: asset.url, at: new Date().toISOString(), mode: opts.mode || "catalog", notes: (opts.notes || "").slice(0, 300) };
  await sanity.createIfNotExists({ _id: DRAFTS_ID, _type: "nq_photodrafts" });
  await sanity.patch(DRAFTS_ID).setIfMissing({ items: [] }).append("items", [d]).commit();
  return d.url;
}
