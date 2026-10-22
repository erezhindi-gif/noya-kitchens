import { NextRequest, NextResponse } from "next/server";
import { putCatalog } from "@/lib/quotes/store";
import type { CatNode } from "@/lib/quotes/types";

export async function PUT(req: NextRequest) {
  const nodes = (await req.json().catch(() => null)) as CatNode[] | null;
  if (!Array.isArray(nodes)) return NextResponse.json({ error: "bad-request" }, { status: 400 });
  try {
    await putCatalog(nodes);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("putCatalog failed", e);
    return NextResponse.json({ error: "save-failed" }, { status: 500 });
  }
}
