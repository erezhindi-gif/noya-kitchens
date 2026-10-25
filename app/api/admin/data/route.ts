import { NextResponse } from "next/server";
import { getData, storageMode } from "@/lib/quotes/store";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export async function GET() {
  try {
    return NextResponse.json({ ...(await getData()), storageMode });
  } catch (e) {
    console.error("quotes getData failed", e);
    return NextResponse.json({ error: "load-failed" }, { status: 500 });
  }
}
