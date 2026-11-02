// Site photos that Erez can replace with a professionally re-shot version (admin › שיווק › תמונות האתר).
// Files under /public can't change at runtime, so a replacement is uploaded to Sanity and the site swaps the
// address through a small public document ("siteImages"); the original file stays as it is, for "restore".
import { client } from "./sanity";

/** The home page's opening slides. */
export const HERO = ["/images/hero-0.jpg", "/images/hero-1.jpg", "/images/hero-2.jpg", "/images/hero-3.jpg"];

/** Kitchen photos shipped with the site (hero slides and the kitchen set). */
export const STATIC_KITCHENS = [
  ...HERO,
  ...Array.from({ length: 20 }, (_, i) => `/images/kitchens/kitchen-${i + 1}.jpg`),
];

export const OVERRIDES_ID = "siteImages";
export type Override = { path: string; ref: string; url: string };

/** path → replacement address, for every replaced site file. Refreshed every minute. */
export async function getImageOverrides(): Promise<Record<string, string>> {
  try {
    const doc = await client.fetch<{ overrides?: Override[] } | null>(
      `*[_id == $id][0]{ overrides }`, { id: OVERRIDES_ID }, { next: { revalidate: 60 } }
    );
    return Object.fromEntries((doc?.overrides || []).map((o) => [o.path, o.url]));
  } catch {
    return {};
  }
}

export const swap = (ov: Record<string, string>) => (src: string) => ov[src] || src;
