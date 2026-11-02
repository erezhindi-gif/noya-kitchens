import { NextRequest, NextResponse } from "next/server";
import { nearestRatio, photoPrompt, type PhotoOpts } from "@/lib/marketing/photo-prompt";
import { getSecrets } from "@/lib/quotes/store";

export const runtime = "nodejs";
export const maxDuration = 120;

// Newest first; a model this key can't use is skipped for the next one.
const MODELS = ["gemini-nano-banana-2.1", "gemini-3-pro-image", "gemini-3.1-flash-image", "gemini-2.5-flash-image"];

type Part = { text?: string; inlineData?: { mimeType: string; data: string } };
type GenResponse = { candidates?: { content?: { parts?: Part[] }; finishReason?: string }[]; promptFeedback?: { blockReason?: string }; error?: { status?: string; message?: string } };

export async function POST(req: NextRequest) {
  const { geminiKey } = await getSecrets();
  if (!geminiKey) return NextResponse.json({ error: "no-key" }, { status: 503 });
  const b = (await req.json().catch(() => null)) as { image?: string; w?: number; h?: number; opts?: PhotoOpts; refs?: { data: string; kind: "finished" | "original" }[] } | null;
  if (!b?.image || !b.opts || b.image.length > 4_000_000) return NextResponse.json({ error: "failed" }, { status: 400 });

  // Other photos of the same kitchen: finished shots set the styling, originals show the rest of the room.
  const refs = (b.refs || []).filter((r) => r?.data && r.data.length < 900_000).slice(0, 4);
  const refParts = refs.flatMap((r, i) => [
    { text: `Reference ${i + 1}: ${r.kind === "finished" ? "an already finished professional shot of this same kitchen (copy its accessories, styling, decor and light mood)" : "an original photo of this same kitchen from another angle (for the carpentry and the room only)"}.` },
    { inlineData: { mimeType: "image/jpeg", data: r.data } },
  ]);
  const consistency = refs.length
    ? "\n\nThe FIRST image is the photo to recreate. The reference images show the SAME kitchen. The result must look like part of the same professional photo shoot: same carpentry, same accessories in the same places, same styling, decor, flowers and light mood as the finished shots. Do not invent different accessories."
    : "";

  const body = JSON.stringify({
    contents: [{ role: "user", parts: [{ inlineData: { mimeType: "image/jpeg", data: b.image } }, ...refParts, { text: photoPrompt(b.opts) + consistency }] }],
    generationConfig: { responseModalities: ["IMAGE"], imageConfig: { aspectRatio: nearestRatio(+b.w! || 4, +b.h! || 3), imageSize: "2K" } },
  });

  let last = "failed";
  for (const model of MODELS) {
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
    return NextResponse.json({ image: await asJpeg(img.data, img.mimeType), model });
  }
  return NextResponse.json({ error: last }, { status: 502 });
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
