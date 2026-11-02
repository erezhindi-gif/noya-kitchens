// Google Ads conversion tag. Both values come from the Ads account (Goals › Conversions):
// NEXT_PUBLIC_GADS_ID is "AW-123…", NEXT_PUBLIC_GADS_LEAD is the label of the "lead" conversion.
// Until they are set, nothing loads and nothing is sent.
export const GADS_ID = process.env.NEXT_PUBLIC_GADS_ID || "";
const LEAD = process.env.NEXT_PUBLIC_GADS_LEAD || "";

type Gtag = (...args: unknown[]) => void;

/** A call, WhatsApp or form from the site counts as a lead for the Ads campaign. */
export function adsLead() {
  const gtag = (window as unknown as { gtag?: Gtag }).gtag;
  if (!GADS_ID || !LEAD || !gtag) return;
  gtag("event", "conversion", { send_to: `${GADS_ID}/${LEAD}` });
}
