// Site counters: one number per day, channel and event, kept by month.
import { todayIL } from "../quotes/calc";
import type { Channel, SiteEvent } from "./channels";

export const statKey = (day: number, ch: Channel, e: SiteEvent) => `d${String(day).padStart(2, "0")}_${ch}_${e}`;

/** Today's month ("2026-11") and the key to raise for this event. */
export function statNow(ch: Channel, e: SiteEvent) {
  const t = todayIL();
  return { month: t.slice(0, 7), key: statKey(+t.slice(8, 10), ch, e) };
}

export const BOT_UA = /bot|crawl|spider|slurp|preview|facebookexternalhit|whatsapp|headless|lighthouse|pagespeed|vercel/i;
