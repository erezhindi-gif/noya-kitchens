import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getQuote } from "@/lib/quotes/store";
import QuoteDoc from "@/components/quotes/QuoteDoc";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const metadata: Metadata = { robots: { index: false, follow: false } };

// Bare quote sheet that the PDF route prints. Same data the client sees — no internal prices.
export default async function PrintQuotePage({ params }: { params: { id: string } }) {
  const found = await getQuote(params.id);
  if (!found) notFound();
  return <QuoteDoc quote={found.quote} settings={found.settings} pros={[]} print />;
}
