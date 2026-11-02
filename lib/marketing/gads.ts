// Google Ads conversion tag. Both values come from the Ads account (Goals › Conversions):
// account 363-747-5662, conversion "שליחת טופס לפרטי לידים". Public ids (they appear in every page anyway);
// NEXT_PUBLIC_GADS_ID / NEXT_PUBLIC_GADS_LEAD can override them.
export const GADS_ID = process.env.NEXT_PUBLIC_GADS_ID || "AW-18552098061";
const LEAD = process.env.NEXT_PUBLIC_GADS_LEAD || "EiD4CJij2LAdEI2aqo5F";

type Gtag = (...args: unknown[]) => void;

/** A call, WhatsApp or form from the site counts as a lead for the Ads campaign. */
export function adsLead() {
  const gtag = (window as unknown as { gtag?: Gtag }).gtag;
  if (!GADS_ID || !LEAD || !gtag) return;
  gtag("event", "conversion", { send_to: `${GADS_ID}/${LEAD}` });
}
