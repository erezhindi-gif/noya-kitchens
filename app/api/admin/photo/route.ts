import { NextRequest, NextResponse } from "next/server";
import { nearestRatio, photoPrompt, type PhotoOpts } from "@/lib/marketing/photo-prompt";
import { getSecrets } from "@/lib/quotes/store";
import { createClient } from "@sanity/client";

export const runtime = "nodejs";
export const maxDuration = 120;

// Newest first; a model this key can't use is skipped for the next one.
const MODELS = ["gemini-nano-banana-2.1", "gemini-3-pro-image", "gemini-3.1-flash-image", "gemini-2.5-flash-image"];

type Part = { text?: string; inlineData?: { mimeType: string; data: string } };
type GenResponse = { candidates?: { content?: { parts?: Part[] }; finishReason?: string }[]; promptFeedback?: { blockReason?: string }; error?: { status?: string; message?: string } };

export async function POST(req: NextRequest) {
  const { geminiKey } = await getSecrets();
  if (!geminiKey) return NextResponse.json({ error: "no-key" }, { status: 503 });
  const b = (await req.json().catch(() => null)) as { image?: string; w?: number; h?: number; opts?: PhotoOpts; refs?: { data: string; kind: "finished" | "original" | "product"; label?: string }[]; quality?: "pro" } | null;
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

  const body = JSON.stringify({
    contents: [{ role: "user", parts: [{ inlineData: { mimeType: "image/jpeg", data: b.image } }, ...refParts, { text: photoPrompt(b.opts) + consistency }] }],
    generationConfig: { responseModalities: ["IMAGE"], imageConfig: { aspectRatio: nearestRatio(+b.w! || 4, +b.h! || 3), imageSize: "2K" } },
  });

  let last = "failed";
  // "pro": the stronger model first, for precise fixes (costs more per photo)
  const models = b.quality === "pro" ? ["gemini-3-pro-image", ...MODELS.filter((m) => m !== "gemini-3-pro-image")] : MODELS;
  for (const model of models) {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": geminiKey },
      body,
    }).catch(() => null);
    if (!res) continue;
    const j = (await res.json().catch(() => ({}))) as GenResponse;
    const msg = j.error?.message || "";
    if (res.status === 404 || (res.status === 400 && /not supported|not found|imageSize|image_size/i.test(msg))) continue;
    if (res.status === 400 && /API key/i.test(msg)) return NextResponse.json({ error: "bad-key" }, { status: 400 });
    if (res.status === 403) return NextResponse.json({ error: /billing/i.test(msg) ? "billing" : "bad-key" }, { status: 400 });
    if (res.status === 429) { last = /billing|free tier|limit: 0/i.test(msg) ? "billing" : "quota"; continue; }
    if (!res.ok) { console.error("photo", model, res.status, msg); continue; }
    if (j.promptFeedback?.blockReason) return NextResponse.json({ error: "blocked" }, { status: 422 });
    const img = j.candidates?.[0]?.content?.parts?.find((p) => p.inlineData?.data)?.inlineData;
    if (!img) { last = j.candidates?.[0]?.finishReason && j.candidates[0].finishReason !== "STOP" ? "blocked" : "no-image"; continue; }
    const image = await asJpeg(img.data, img.mimeType);
    // Every made photo is kept at once: it was paid for, and a reload or a closed screen must not lose it.
    const kept = await keepDraft(image, b.opts).catch((e) => { console.error("keep draft failed", e); return null; });
    return NextResponse.json({ image, model, kept });
  }
  return NextResponse.json({ error: last }, { status: 502 });
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

/** The model answers with a large PNG; a JPEG keeps the reply under Vercel's 4.5MB limit. */
async function asJpeg(data: string, mime: string) {
  try {
    const sharp = (await import("sharp")).default;
    const out = await sharp(Buffer.from(data, "base64")).jpeg({ quality: 90, mozjpeg: true }).toBuffer();
    return `data:image/jpeg;base64,${out.toString("base64")}`;
  } catch (e) {
    console.error("jpeg convert failed", e);
    return `data:${mime};base64,${data}`;
  }
}
