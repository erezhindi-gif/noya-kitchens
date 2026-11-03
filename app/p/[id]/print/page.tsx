import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPlanForClient } from "@/lib/quotes/store";
import { fdate } from "@/lib/quotes/calc";
import KitchenPlan from "@/components/quotes/KitchenPlan";
import Kitchen3D from "@/components/quotes/Kitchen3D";
import "@/components/quotes/quote-doc.css";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const metadata: Metadata = { robots: { index: false, follow: false } };

// Bare plan sheet that the plan PDF route prints: the same header as the quote, the client,
// the 3D picture and the drawings with measurements. No prices.
export default async function PrintPlanPage({ params }: { params: { id: string } }) {
  const found = await getPlanForClient(params.id);
  if (!found) notFound();
  const { plan: p, settings: st } = found;
  return (
    <article className="nq-doc" dir="rtl">
      <div className="nq-bsd">בס״ד</div>
      <header className="nq-d-head">
        <div className="nq-d-band">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="nq-d-logo" src="/images/quote-logo.png" alt="NOYA Kitchens by Erez Hindi" />
        </div>
        <h1>תכנון {p.title || "מטבח"}</h1>
        <div className="nq-d-biz">
          <b>{st.biz}</b>
          <span>{st.address} | {st.owner}: <span className="nq-ltr">{st.phone}</span></span>
          <span><span className="nq-ltr">{st.web}</span></span>
        </div>
      </header>
      <hr className="nq-d-rule" />
      <section className="nq-box nq-d-info">
        <div><b>לקוח:</b> {p.client.name}</div>
        <div><b>תאריך:</b> {fdate((p.updatedAt || p.createdAt).slice(0, 10))}</div>
        <div><b>טלפון:</b> <span className="nq-ltr">{p.client.phone}</span></div>
        <div><b>תכנון:</b> {p.title || "מטבח"}</div>
      </section>
      <section className="nqp-print nqp-plan-doc" dir="rtl">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {p.shownRender && <img className="nqp-render" src={`${p.shownRender}?w=1600`} alt="הדמיה של המטבח" />}
        <Kitchen3D layout={p.layout} still height={430} />
        <KitchenPlan layout={p.layout} />
      </section>
    </article>
  );
}
