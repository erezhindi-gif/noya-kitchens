import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { getReviewsDoc, getSecrets } from "@/lib/quotes/store";
import { getReviewsView, syncGoogleReviews } from "@/lib/reviews/google";

export const dynamic = "force-dynamic";

// Where the Google reviews on the site stand: connected or not, last check, what the site shows.
export async function GET() {
  const [s, doc, view] = await Promise.all([getSecrets(), getReviewsDoc().catch(() => null), getReviewsView()]);
  return NextResponse.json({
    hasKey: !!s.placesKey,
    checkedAt: doc?.checkedAt || null,
    error: doc?.error || "",
    rating: view.rating,
    count: view.count,
    shown: view.reviews.length,
  });
}

// "Check now": the same as the daily check, and the home page picks it up right away.
export async function POST() {
  const r = await syncGoogleReviews();
  revalidateTag("reviews");
  return NextResponse.json(r, { status: r.ok ? 200 : 400 });
}
