// One call to Google's image models (Gemini), shared by the site-photos tool and the kitchen-plan render.
// Newest model first; a model this key can't use is skipped for the next one. The PNG that comes back
// is turned into a JPEG so the reply stays under Vercel's 4.5MB limit.

export const IMAGE_MODELS = ["gemini-nano-banana-2.1", "gemini-3-pro-image", "gemini-3.1-flash-image", "gemini-2.5-flash-image"];

type Part = { text?: string; inlineData?: { mimeType: string; data: string } };
type GenResponse = { candidates?: { content?: { parts?: Part[] }; finishReason?: string }[]; promptFeedback?: { blockReason?: string }; error?: { status?: string; message?: string } };

/** detail: what Google said last, for the admin screen when a run fails */
export type ImageResult = { ok: true; image: string; model: string } | { ok: false; error: "bad-key" | "billing" | "quota" | "blocked" | "no-image" | "failed"; detail?: string };

/** parts: images and text for the model; pro: try the stronger model first (precise work, costs more) */
export async function generateImage(key: string, parts: Part[], aspectRatio: string, pro = false): Promise<ImageResult> {
  const body = JSON.stringify({
    contents: [{ role: "user", parts }],
    generationConfig: { responseModalities: ["IMAGE"], imageConfig: { aspectRatio, imageSize: "2K" } },
  });
  let last: Exclude<ImageResult, { ok: true }>["error"] = "failed";
  let detail = "";
  const models = pro ? ["gemini-3-pro-image", ...IMAGE_MODELS.filter((m) => m !== "gemini-3-pro-image")] : IMAGE_MODELS;
  for (const model of models) {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": key },
      body,
    }).catch(() => null);
    if (!res) continue;
    const j = (await res.json().catch(() => ({}))) as GenResponse;
    const msg = j.error?.message || "";
    if (msg) detail = `${model}: ${res.status} ${msg}`.slice(0, 300);
    if (res.status === 404 || (res.status === 400 && /not supported|not found|imageSize|image_size/i.test(msg))) continue;
    if (res.status === 400 && /API key/i.test(msg)) return { ok: false, error: "bad-key" };
    if (res.status === 403) return { ok: false, error: /billing/i.test(msg) ? "billing" : "bad-key" };
    if (res.status === 429) { last = /billing|free tier|limit: 0/i.test(msg) ? "billing" : "quota"; continue; }
    if (!res.ok) { console.error("image model", model, res.status, msg); continue; }
    if (j.promptFeedback?.blockReason) return { ok: false, error: "blocked" };
    const img = j.candidates?.[0]?.content?.parts?.find((p) => p.inlineData?.data)?.inlineData;
    if (!img) { last = j.candidates?.[0]?.finishReason && j.candidates[0].finishReason !== "STOP" ? "blocked" : "no-image"; continue; }
    return { ok: true, image: await asJpeg(img.data, img.mimeType), model };
  }
  return { ok: false, error: last, detail };
}

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
