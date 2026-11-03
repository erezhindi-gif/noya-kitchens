import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@sanity/client";
import { generateImage } from "@/lib/marketing/gemini-image";
import { getPlan, getSecrets, putPlan } from "@/lib/quotes/store";
import { colorName, COUNTER_COLORS, heightsOf } from "@/lib/quotes/layout";

export const runtime = "nodejs";
export const maxDuration = 120;

const sanity = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID!,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET || "production",
  apiVersion: "2024-01-01",
  token: process.env.SANITY_API_TOKEN,
  useCdn: false,
});

const HANDLES = { bar: "slim metal bar handles", integral: "integral handles: a grip groove milled into the top edge of each base front and the bottom edge of each wall-cabinet front, no handles sticking out", none: "handle-less push-to-open fronts" };

// The 3D view of a plan (a picture the browser takes of it) becomes a photorealistic render of the same kitchen.
// Every render is paid for, so it is kept on the plan at once.
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const { geminiKey } = await getSecrets();
  if (!geminiKey) return NextResponse.json({ error: "no-key" }, { status: 503 });
  const b = (await req.json().catch(() => null)) as { image?: string; notes?: string } | null;
  if (!b?.image || b.image.length > 4_000_000) return NextResponse.json({ error: "bad-request" }, { status: 400 });
  const plan = await getPlan(params.id);
  if (!plan) return NextResponse.json({ error: "not-found" }, { status: 404 });

  const l = plan.layout, c = l.colors || {}, h = heightsOf(l);
  const own = [...l.walls.flatMap((w) => [...w.base, ...w.upper, ...(w.top || [])]), ...(l.island?.base || [])]
    .flatMap((u) => [u.color, ...(u.fronts || [])]).filter(Boolean).map((v) => colorName(v)).filter((v, i, a) => a.indexOf(v) === i);
  const prompt = [
    "Turn this 3D model of a custom kitchen into a photorealistic interior photograph, as if the finished kitchen was photographed by a top architectural photographer.",
    "ABSOLUTE RULE: keep the kitchen exactly as modeled: the same layout, the same cabinets with the same widths, heights and positions, the same division into doors and drawers, the same colors of every front (a front with a different color in the model keeps that color), the same countertop outline, the same appliances in the same places, the same camera angle and framing. Do not add, remove or move any cabinet, door, drawer or appliance.",
    "Make it real: real materials and textures for every surface, real built-in appliances (ovens, induction hob, fridge, sink and faucet, dishwasher) looking like modern premium brands, soft natural daylight with gentle shadows, a finished room (painted walls, a real floor, ceiling), a few minimal tasteful accessories at most.",
    `Materials: fronts ${c.front ? colorName(c.front) : "matte white"}${c.upper ? `, wall cabinets ${colorName(c.upper)}` : ""}${own.length ? `, other fronts as colored in the model (${own.join("; ")})` : ""}; countertop ${COUNTER_COLORS[c.counter || "white_stone"]?.name || c.counter} ${h.counter} cm thick; ${HANDLES[c.handles || "bar"]}. The Bluran front names are real Israeli front materials: render them true to their color and finish (matte, gloss, wood veneer, stone look).`,
    b.notes?.trim() && `Notes from the kitchen maker (Hebrew, follow them): ${b.notes.trim().slice(0, 800)}`,
    "It must look like a real photograph, not a render: real optics, natural light falloff, believable reflections. No text, no watermark.",
  ].filter(Boolean).join("\n");

  const r = await generateImage(geminiKey, [{ inlineData: { mimeType: "image/jpeg", data: b.image.replace(/^data:image\/\w+;base64,/, "") } }, { text: prompt }], "16:9", true);
  if (!r.ok) return NextResponse.json({ error: r.error, detail: r.detail }, { status: r.error === "blocked" ? 422 : 502 });

  const m = r.image.match(/^data:(image\/[a-z]+);base64,(.+)$/)!;
  const asset = await sanity.assets.upload("image", Buffer.from(m[2], "base64"), { filename: `noya-render-${plan.id}-${Date.now()}.jpg`, contentType: m[1] });
  const fresh = (await getPlan(params.id)) || plan;
  fresh.renders = [...(fresh.renders || []), { url: asset.url, at: new Date().toISOString() }].slice(-12);
  fresh.shownRender = asset.url;
  fresh.updatedAt = new Date().toISOString();
  await putPlan(fresh);
  return NextResponse.json({ url: asset.url, renders: fresh.renders, shownRender: fresh.shownRender });
}
