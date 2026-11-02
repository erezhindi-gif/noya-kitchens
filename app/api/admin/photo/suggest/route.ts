import { NextRequest, NextResponse } from "next/server";
import { SHOT_PRESETS } from "@/lib/marketing/photo-prompt";
import { getSecrets } from "@/lib/quotes/store";

export const runtime = "nodejs";
export const maxDuration = 30;

// A small, cheap vision model looks at the photo and picks the shot types that would suit its re-shoot best.
const MODELS = ["gemini-3-flash", "gemini-2.5-flash", "gemini-2.0-flash"];

export async function POST(req: NextRequest) {
  const { geminiKey } = await getSecrets();
  if (!geminiKey) return NextResponse.json({ error: "no-key" }, { status: 503 });
  const b = (await req.json().catch(() => null)) as { image?: string } | null;
  if (!b?.image || b.image.length > 1_500_000) return NextResponse.json({ error: "bad-request" }, { status: 400 });

  const list = SHOT_PRESETS.map((p) => `- "${p.label}" (${p.kind}): ${p.text}`).join("\n");
  const prompt = [
    "You are a top architectural interior photographer. This is a phone photo of a custom kitchen made by a carpenter.",
    "Pick the shot types from the list below that would give the best professional re-shoot of THIS kitchen, to sell custom kitchens.",
    "Look at the layout (one wall, L, U, island, galley), how much of the room the photo shows, the depth, windows and light, and whether it is a close-up of a detail.",
    "Rules: at most ONE of kind angle, at most ONE of kind light, at most ONE of kind style. Usually 2 or 3 in total.",
    list,
    'Answer only with JSON: {"presets": ["exact label", ...], "why": "one short sentence in Hebrew, for the carpenter, why these fit this photo"}',
  ].join("\n");

  for (const model of MODELS) {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": geminiKey },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ inlineData: { mimeType: "image/jpeg", data: b.image } }, { text: prompt }] }],
        generationConfig: { responseMimeType: "application/json", temperature: 0.2 },
      }),
    }).catch(() => null);
    if (!res || res.status === 404) continue;
    if (!res.ok) return NextResponse.json({ error: res.status === 429 ? "quota" : "failed" }, { status: 502 });
    const j = (await res.json().catch(() => ({}))) as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
    const raw = j.candidates?.[0]?.content?.parts?.map((p) => p.text || "").join("") || "";
    try {
      const out = JSON.parse(raw) as { presets?: string[]; why?: string };
      const labels = new Set(SHOT_PRESETS.map((p) => p.label as string));
      // keep the one-per-kind rule even if the model didn't
      const seen = new Set<string>();
      const presets = (out.presets || []).filter((l) => {
        const p = SHOT_PRESETS.find((x) => x.label === l);
        if (!p || !labels.has(l) || seen.has(p.kind)) return false;
        seen.add(p.kind);
        return true;
      });
      return NextResponse.json({ presets, why: String(out.why || "").slice(0, 200) });
    } catch {
      return NextResponse.json({ error: "failed" }, { status: 502 });
    }
  }
  return NextResponse.json({ error: "failed" }, { status: 502 });
}
