import { NextResponse } from "next/server";
import { syncLeads } from "@/lib/quotes/lead-sync";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Called every few minutes by a scheduled GitHub workflow, so a labeled mail becomes a lead (and the
// client gets the auto-reply) without the app being open. Public, but it only imports and answers
// counts; it runs at most once a minute.
export async function GET() {
  const r = await syncLeads().catch((e) => {
    console.error("lead sync failed", e);
    return { ok: false as const, error: "sync-failed" };
  });
  return NextResponse.json("added" in r ? { ok: r.ok, added: r.added } : r);
}
