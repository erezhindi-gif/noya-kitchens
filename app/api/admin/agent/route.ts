import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { getData, getSecrets } from "@/lib/quotes/store";
import { draftQuote } from "@/lib/quotes/agent";

export const runtime = "nodejs";
export const maxDuration = 60;

// Erez's dictated description → a draft quote (not saved; the app opens it for review).
export async function POST(req: NextRequest) {
  const { text } = await req.json().catch(() => ({ text: "" }));
  const t = String(text || "").trim().slice(0, 6000);
  if (t.length < 5) return NextResponse.json({ error: "empty" }, { status: 400 });
  const { anthropicKey } = await getSecrets();
  if (!anthropicKey) return NextResponse.json({ error: "no-key" }, { status: 503 });
  try {
    const { cat } = await getData();
    return NextResponse.json(await draftQuote(t, cat, anthropicKey));
  } catch (e) {
    if (e instanceof Anthropic.AuthenticationError) return NextResponse.json({ error: "bad-key" }, { status: 503 });
    if (e instanceof Anthropic.RateLimitError) return NextResponse.json({ error: "busy" }, { status: 429 });
    console.error("agent failed", e);
    return NextResponse.json({ error: "failed" }, { status: 500 });
  }
}
