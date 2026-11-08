// Google reviews on the site, without a widget or its view limits.
// The full list starts from SEED_REVIEWS; once a day the site asks Google (Places API, inside the
// free monthly usage) for the current rating, the number of reviews and the reviews Google returns
// (up to 5), and keeps any it hasn't seen before. The home page reads the merged result.
import { SEED_COUNT, SEED_RATING, SEED_REVIEWS } from "./seed";
import { getReviewsDoc, getSecrets, putReviewsDoc } from "@/lib/quotes/store";

export type GReview = { author: string; rating: number; date: string; text: string };
export type ReviewsDoc = { rating?: number; count?: number; placeId?: string; checkedAt?: string; added?: GReview[]; error?: string };
export type ReviewsView = { rating: number; count: number; reviews: GReview[] };

export const GOOGLE_REVIEWS_URL = "https://www.google.com/maps?cid=18053665565514135117";
const SEARCH = "נויה - מטבחים ונגרות בהתאמה אישית נתניה";

const key = (r: GReview) => `${r.author.trim().toLowerCase()}|${r.text.replace(/\s+/g, "").slice(0, 40)}`;

/** All reviews for the site, newest first; reviews without text are counted but not shown. */
export async function getReviewsView(): Promise<ReviewsView> {
  const doc = await getReviewsDoc().catch(() => null);
  const seen = new Set(SEED_REVIEWS.map(key));
  const added = (doc?.added || []).filter((r) => !seen.has(key(r)));
  const all = [...added, ...SEED_REVIEWS].filter((r) => r.text.trim()).sort((a, b) => b.date.localeCompare(a.date));
  return { rating: doc?.rating || SEED_RATING, count: Math.max(doc?.count || 0, SEED_COUNT), reviews: all };
}

const api = (path: string, k: string, fields: string, init: RequestInit = {}) =>
  fetch(`https://places.googleapis.com/v1/${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", "X-Goog-Api-Key": k, "X-Goog-FieldMask": fields, ...(init.headers || {}) },
    cache: "no-store",
  });

/** Finds the business on Google; used once, then the place id is kept. */
export async function findPlaceId(k: string) {
  const r = await api("places:searchText", k, "places.id,places.displayName", {
    method: "POST",
    body: JSON.stringify({ textQuery: SEARCH, languageCode: "iw" }),
  });
  if (!r.ok) throw new Error(`places search ${r.status}`);
  const j = (await r.json()) as { places?: { id: string }[] };
  const id = j.places?.[0]?.id;
  if (!id) throw new Error("place not found");
  return id;
}

/** The daily check. Returns what changed, or why it couldn't run. */
export async function syncGoogleReviews() {
  const { placesKey } = await getSecrets();
  if (!placesKey) return { ok: false as const, error: "no-key" };
  const doc = (await getReviewsDoc().catch(() => null)) || {};
  try {
    const placeId = doc.placeId || (await findPlaceId(placesKey));
    const r = await api(`places/${placeId}?languageCode=iw`, placesKey, "rating,userRatingCount,reviews");
    if (!r.ok) throw new Error(`place details ${r.status}`);
    const j = (await r.json()) as {
      rating?: number; userRatingCount?: number;
      reviews?: { rating?: number; publishTime?: string; text?: { text?: string }; originalText?: { text?: string }; authorAttribution?: { displayName?: string } }[];
    };
    const known = new Set([...SEED_REVIEWS, ...(doc.added || [])].map(key));
    const fresh: GReview[] = (j.reviews || [])
      .map((x) => ({
        author: x.authorAttribution?.displayName || "",
        rating: x.rating || 5,
        date: (x.publishTime || new Date().toISOString()).slice(0, 10),
        text: (x.originalText?.text || x.text?.text || "").trim(),
      }))
      .filter((x) => x.author && !known.has(key(x)));
    const next: ReviewsDoc = {
      ...doc,
      placeId,
      rating: j.rating || doc.rating,
      count: j.userRatingCount || doc.count,
      added: [...fresh, ...(doc.added || [])],
      checkedAt: new Date().toISOString(),
      error: "",
    };
    await putReviewsDoc(next);
    return { ok: true as const, added: fresh.length, rating: next.rating, count: next.count };
  } catch (e) {
    console.error("google reviews sync failed", e);
    await putReviewsDoc({ ...doc, error: String(e).slice(0, 200), checkedAt: new Date().toISOString() }).catch(() => {});
    return { ok: false as const, error: "google" };
  }
}
