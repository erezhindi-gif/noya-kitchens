import { NextResponse } from "next/server";
import { syncLeads } from "@/lib/quotes/lead-sync";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// The app asks for new mail requests when it opens.
export async function POST() {
  const r = await syncLeads().catch((e) => {
    console.error("lead sync failed", e);
    return { ok: false as const, error: "sync-failed" };
  });
  return NextResponse.json(r);
}
