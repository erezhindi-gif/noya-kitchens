import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// The version now on the site, so an app left open on the phone knows to reload into it.
export function GET() {
  return NextResponse.json({ build: process.env.VERCEL_GIT_COMMIT_SHA || "dev" }, { headers: { "Cache-Control": "no-store" } });
}
