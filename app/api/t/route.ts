import { NextRequest, NextResponse } from "next/server";
import { isChannel, isEvent } from "@/lib/marketing/channels";
import { BOT_UA, statNow } from "@/lib/marketing/stats";
import { countSiteEvent } from "@/lib/quotes/store";
import { SESSION_COOKIE, verifySession } from "@/lib/quotes/auth";

export const dynamic = "force-dynamic";

// The site's visit and click counter (sent with sendBeacon, so the body comes as text).
export async function POST(req: NextRequest) {
  if (BOT_UA.test(req.headers.get("user-agent") || "")) return new NextResponse(null, { status: 204 });
  // Erez signed in to the admin on this browser: not a client's visit.
  if (await verifySession(req.cookies.get(SESSION_COOKIE)?.value)) return new NextResponse(null, { status: 204 });
  let b: { e?: unknown; ch?: unknown } = {};
  try { b = JSON.parse(await req.text()); } catch {}
  if (!isEvent(b.e) || b.e === "form" || !isChannel(b.ch)) return new NextResponse(null, { status: 204 });
  const { month, key } = statNow(b.ch, b.e);
  await countSiteEvent(month, key).catch((e) => console.error("count failed", e));
  return new NextResponse(null, { status: 204 });
}
