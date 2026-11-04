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

const endText = (end?: string) => end === "wall"
  ? "a side wall stands across it exactly as modeled; add nothing between it and the cabinets."
  : "open: the wall behind the cabinets stops exactly where it stops in the model, there is NO side wall and no extra wall there, and beyond it the space opens into the rest of the home.";
const HANDLES = { bar: "slim metal bar handles", integral: "integral handles: a grip groove milled into the top edge of each base front and the bottom edge of each wall-cabinet front, no handles sticking out", none: "handle-less push-to-open fronts" };

// A picture of the 3D view from the angle Erez chose (taken in the browser). raw: it is kept as it is, for free.
// Otherwise it becomes a photorealistic render of the same kitchen; that is paid for, so it is kept on the plan at once.
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const b = (await req.json().catch(() => null)) as { image?: string; notes?: string; raw?: boolean; matchShown?: boolean } | null;
  if (!b?.image || b.image.length > 4_000_000) return NextResponse.json({ error: "bad-request" }, { status: 400 });
  const plan = await getPlan(params.id);
  if (!plan) return NextResponse.json({ error: "not-found" }, { status: 404 });
  if (b.raw) return keep(plan.id, b.image, false);
  const { geminiKey } = await getSecrets();
  if (!geminiKey) return NextResponse.json({ error: "no-key" }, { status: 503 });

  const l = plan.layout, c = l.colors || {}, h = heightsOf(l);
  const own = [...l.walls.flatMap((w) => [...w.base, ...w.upper, ...(w.top || [])]), ...(l.island?.base || [])]
    .flatMap((u) => [u.color, ...(u.fronts || [])]).filter(Boolean).map((v) => colorName(v)).filter((v, i, a) => a.indexOf(v) === i);
  const prompt = [
    "Turn this 3D model of custom cabinetry (a kitchen or a wall unit) into a photorealistic interior photograph, as if the finished kitchen was photographed by a top architectural photographer.",
    "ABSOLUTE RULE: keep the kitchen exactly as modeled: the same layout, the same cabinets with the same widths, heights and positions, the same division into doors and drawers, the same colors of every front (a front with a different color in the model keeps that color), the same countertop outline, the same appliances in the same places, the same camera angle and framing. Do not add, remove or move any cabinet, door, drawer or appliance. Spaces between cabinets and walls stay exactly as modeled: never add extra wall, floor or empty space beside a cabinet, and never close a space that is modeled.",
    `The left end of the kitchen: ${endText(l.ends?.left)} The right end of the kitchen: ${endText(l.ends?.right)}`,
    "Make it real: real materials and textures for every surface, real built-in appliances (ovens, induction hob, fridge, sink and faucet, dishwasher) looking like modern premium brands, soft natural daylight with gentle shadows, a finished room (painted walls, a real floor, ceiling), a few minimal tasteful accessories at most.",
    `Materials: fronts ${c.front ? colorName(c.front) : "matte white"}${c.upper ? `, wall cabinets ${colorName(c.upper)}` : ""}${own.length ? `, other fronts as colored in the model (${own.join("; ")})` : ""}; ${c.counter === "none" ? "no countertop at all" : `countertop ${COUNTER_COLORS[c.counter || "white_stone"]?.name || c.counter} ${h.counter} cm thick`}; ${HANDLES[c.handles || "bar"]}. The Bluran front names are real Israeli front materials: render them true to their color and finish (matte, gloss, wood veneer, stone look).`,
    b.notes?.trim() && `Notes from the kitchen maker (Hebrew, follow them): ${b.notes.trim().slice(0, 800)}`,
    "It must look like a real photograph, not a render: real optics, natural light falloff, believable reflections. No text, no watermark, no brand names or logos on any appliance or anywhere else.",
  ].filter(Boolean).join("\n");

  // the render chosen for the client guides this one, so every angle looks like the same room
  const sample = b.matchShown && plan.shownRender
    ? await fetch(`${plan.shownRender}?w=1280&fm=jpg`).then(async (x) => (x.ok ? Buffer.from(await x.arrayBuffer()).toString("base64") : null)).catch(() => null)
    : null;
  const r = await generateImage(geminiKey, [
    { inlineData: { mimeType: "image/jpeg", data: b.image.replace(/^data:image\/\w+;base64,/, "") } },
    ...(sample ? [{ inlineData: { mimeType: "image/jpeg", data: sample } }] : []),
    { text: sample ? `${prompt}\nThe first image is the 3D model: the layout, the camera angle and every wall and cabinet come ONLY from it. The second image is a photograph of this same finished kitchen from another angle: match its light, its wall and floor finishes, its materials and its accessories, but never copy walls or spaces from it that the model doesn't have.` : prompt },
  ], "16:9", true);
  if (!r.ok) return NextResponse.json({ error: r.error, detail: r.detail }, { status: r.error === "blocked" ? 422 : 502 });

  return keep(plan.id, r.image, true);
}

/** Saves the picture and adds it to the plan. show: it becomes what the client gets; a free snapshot only when nothing was chosen yet. */
async function keep(id: string, image: string, show: boolean) {
  const m = image.match(/^data:(image\/[a-z]+);base64,(.+)$/);
  if (!m) return NextResponse.json({ error: "bad-request" }, { status: 400 });
  const asset = await sanity.assets.upload("image", Buffer.from(m[2], "base64"), { filename: `noya-render-${id}-${Date.now()}.jpg`, contentType: m[1] });
  const fresh = await getPlan(id);
  if (!fresh) return NextResponse.json({ error: "not-found" }, { status: 404 });
  fresh.renders = [...(fresh.renders || []), { url: asset.url, at: new Date().toISOString() }].slice(-12);
  if (show || !fresh.shownRender) fresh.shownRender = asset.url;
  fresh.updatedAt = new Date().toISOString();
  await putPlan(fresh);
  return NextResponse.json({ url: asset.url, renders: fresh.renders, shownRender: fresh.shownRender });
}
