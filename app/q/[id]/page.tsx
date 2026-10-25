import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getQuote } from "@/lib/quotes/store";
import { qnum, shownQty } from "@/lib/quotes/calc";
import QuoteDoc from "@/components/quotes/QuoteDoc";
import ClientQuote from "@/components/quotes/ClientQuote";
import "@/components/quotes/admin.css";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  const found = await getQuote(params.id);
  return {
    title: found ? `הצעת מחיר ${qnum(found.quote)}` : "הצעת מחיר",
    robots: { index: false, follow: false },
  };
}

// The link the client gets on WhatsApp. Commissions and line prices never reach this page:
// QuoteDoc renders only descriptions, hardware quantities and the total.
export default async function ClientQuotePage({ params }: { params: { id: string } }) {
  const found = await getQuote(params.id);
  if (!found) notFound();
  const { quote, settings } = found;
  // Strip internal pricing before anything is serialized to the browser.
  const safe = {
    ...quote,
    pros: [],
    commissions: [],
    markup: 0,
    lines: quote.lines.map((l) => ({ id: l.id, type: l.type, desc: l.desc, qty: 0, showQty: !!shownQty(l), price: 0 })),
  };
  const doc = <QuoteDoc quote={quote} settings={settings} pros={[]} />;
  return <ClientQuote quote={safe} settings={settings} doc={doc} />;
}
