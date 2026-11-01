import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getQuote } from "@/lib/quotes/store";
import QuoteDoc from "@/components/quotes/QuoteDoc";
import KitchenPlan from "@/components/quotes/KitchenPlan";
import Kitchen3D from "@/components/quotes/Kitchen3D";


export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const metadata: Metadata = { robots: { index: false, follow: false } };

// Bare quote sheet that the PDF route prints. Same data the client sees — no internal prices.
export default async function PrintQuotePage({ params }: { params: { id: string } }) {
  const found = await getQuote(params.id);
  if (!found) notFound();
  const layout = found.plan?.layout;
  return (
    <>
      <QuoteDoc quote={found.quote} settings={found.settings} pros={[]} print />
      {layout && (
        // the plan starts on its own page: the 3D picture, then the drawings with measurements
        <section className="nqp-print" dir="rtl">
          <h2>תכנון המטבח</h2>
          <Kitchen3D layout={layout} still height={430} />
          <KitchenPlan layout={layout} />
        </section>
      )}
    </>
  );
}
