import { NextRequest, NextResponse } from "next/server";
import { putSettings } from "@/lib/quotes/store";
import type { Pro, Settings } from "@/lib/quotes/types";

export async function PUT(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as { settings: Settings; pros: Pro[] } | null;
  if (!body?.settings || !Array.isArray(body.pros)) return NextResponse.json({ error: "bad-request" }, { status: 400 });
  try {
    await putSettings(body.settings, body.pros);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("putSettings failed", e);
    return NextResponse.json({ error: "save-failed" }, { status: 500 });
  }
}
