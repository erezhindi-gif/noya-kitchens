import { NextResponse } from "next/server";
import { syncLeads, syncProblem } from "@/lib/quotes/lead-sync";
import { getSecrets } from "@/lib/quotes/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// The app asks for new mail requests when it opens, and shows a warning if the import is stuck.
export async function POST() {
  const r = await syncLeads();
  return NextResponse.json({ ...r, problem: syncProblem(await getSecrets()) });
}
