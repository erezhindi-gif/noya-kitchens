import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPlanForClient } from "@/lib/quotes/store";
import { heightsOf, upperBox, wallName, type KitchenLayout } from "@/lib/quotes/layout";
import { DEFAULT_RULES, takeoff, type Piece } from "@/lib/quotes/takeoff";
import { Elevation, PlanView } from "@/components/quotes/KitchenPlan";
import PrintButton from "@/components/quotes/PrintButton";
import "@/components/quotes/shop.css";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const metadata: Metadata = { title: "דפי ייצור", robots: { index: false, follow: false } };

function Pieces({ rows, color }: { rows: Piece[]; color?: boolean }) {
  return (
    <table className="sh-t">
      <thead><tr><th>ארון</th><th>חלק</th><th className="n">רוחב</th><th className="n">גובה</th><th className="n">כמות</th>{color && <th>גוון</th>}</tr></thead>
      <tbody>{rows.map((p, i) => <tr key={i}><td>{p.of}</td><td>{p.name}</td><td className="n">{p.w}</td><td className="n">{p.h}</td><td className="n">{p.qty}</td>{color && <td>{p.color || "כמו המטבח"}</td>}</tr>)}</tbody>
    </table>
  );
}

/** The wall from the side: how deep and how high each row stands. */
function Section({ l, i }: { l: KitchenLayout; i: number }) {
  const h = heightsOf(l), w = l.walls[i];
  const rows = [
    ...(w.base.some((u) => !["gap", "fridge"].includes(u.kind)) ? [{ y: h.plinth + h.floorGap, hh: Math.max(...w.base.map((u) => (u.kind === "panel" || u.kind === "column" ? (u.splits || u.parts?.map((p) => p.h) || [0]).reduce((a: number, b: number) => a + b, 0) : h.base - h.counter - h.plinth - h.floorGap))), d: h.depth }] : []),
    ...w.upper.filter((u) => !["gap", "corner"].includes(u.kind)).slice(0, 1).map((u) => { const b = upperBox(u, h, "upper"); return { y: b.y0, hh: b.hh, d: b.d }; }),
    ...(w.top || []).filter((u) => !["gap", "corner"].includes(u.kind)).slice(0, 1).map((u) => { const b = upperBox(u, h, "top"); return { y: b.y0, hh: b.hh, d: b.d }; }),
  ];
  const Y = (v: number) => h.ceiling - v;
  return (
    <figure className="sh-sec">
      <figcaption>חתך: {wallName(l, i)}</figcaption>
      <svg viewBox={`-30 -6 ${h.depth + 90} ${h.ceiling + 22}`} role="img" aria-label={`חתך ${wallName(l, i)}`} style={{ direction: "ltr" }}>
        <rect x={-6} y={0} width={6} height={h.ceiling} fill="#5b544d" />
        <line x1={-6} x2={h.depth + 50} y1={h.ceiling} y2={h.ceiling} stroke="#3a3530" strokeWidth={1} />
        <line x1={-6} x2={h.depth + 50} y1={0} y2={0} stroke="#3a3530" strokeWidth={1} />
        {rows.map((r, k) => (
          <g key={k}>
            <rect x={0} y={Y(r.y + r.hh)} width={r.d} height={r.hh} fill="#efe9de" stroke="#3a3530" strokeWidth={0.6} />
            <rect x={r.d} y={Y(r.y + r.hh)} width={2} height={r.hh} fill="#c9bfae" stroke="#3a3530" strokeWidth={0.4} />
            <text x={r.d / 2} y={Y(r.y + r.hh / 2)} fontSize={7} textAnchor="middle" fill="#3a3530">{r.d}</text>
            <text x={-9} y={Y(r.y) + 2} fontSize={7} textAnchor="end" fill="#8a5a2b">{r.y}</text>
            <text x={-9} y={Y(r.y + r.hh) + 6} fontSize={7} textAnchor="end" fill="#8a5a2b">{r.y + r.hh}</text>
          </g>
        ))}
        {l.colors?.counter !== "none" && <rect x={0} y={Y(h.base)} width={h.depth + 2 + (l.counter?.over ?? 2)} height={h.counter} fill="#cfcac0" stroke="#3a3530" strokeWidth={0.5} />}
        <text x={h.depth + 8} y={8} fontSize={7} fill="#8a5a2b">תקרה {h.ceiling}</text>
      </svg>
    </figure>
  );
}

// The workshop's sheets for a plan. Under /admin: never shown to the client.
export default async function ShopPage({ params }: { params: { id: string } }) {
  const found = await getPlanForClient(params.id);
  if (!found) notFound();
  const { plan: p, settings } = found;
  const l = p.layout;
  const rules = { ...DEFAULT_RULES, ...(settings.shopRules || {}) };
  const t = takeoff(l, rules);
  return (
    <main className="sh" dir="rtl">
      <header className="sh-head">
        <div>
          <h1>דפי ייצור · {p.title || "מטבח"}</h1>
          <div>{p.client.name}{p.client.phone ? ` · ${p.client.phone}` : ""}</div>
          <div className="sh-rules">כללי בנייה בחישוב: לוח {rules.board}, גב {rules.back} על הגוף מבחוץ, רווח חזיתות {rules.frontGap}, מדף קצר ב-{rules.shelfSetback}. הדפנות חובקות את העליון והתחתון. עומק הוא של הגוף, החזית 2 מעליו. דופן גלויה 2 בסוף מטבח, הלבשה 2 במפגש עם קיר (הארון קטן ב-2), בנישת מקרר פורמייקה על דפנות הארונות שליד. משנים בהגדרות. המידות בס״מ.</div>
          <div className="sh-warn">החישוב אוטומטי. לבדוק מול הסטנדרט שלך לפני הזמנה וחיתוך.</div>
        </div>
        <PrintButton />
      </header>

      <section>
        <h2>תמונה כללית</h2>
        <PlanView layout={l} />
      </section>

      <section className="sh-break">
        <h2>חזיתות להזמנה מבלורן</h2>
        <Pieces rows={t.fronts} color />
      </section>

      <section className="sh-break">
        <h2>חיפויים, דפנות ופאנלים</h2>
        {t.panels.length ? <Pieces rows={t.panels} color /> : <p>אין בתכנון הזה.</p>}
      </section>

      <section className="sh-break">
        <h2>גוף הארונות: רשימת חיתוך</h2>
        <Pieces rows={t.carcass} />
      </section>

      <section className="sh-break">
        <h2>פרזול</h2>
        {t.hardware.length ? (
          <table className="sh-t">
            <thead><tr><th>פריט</th><th className="n">כמות</th><th>בארונות</th></tr></thead>
            <tbody>{t.hardware.map((x) => <tr key={x.name}><td>{x.name}</td><td className="n">{x.qty}</td><td>{x.of.join(", ")}</td></tr>)}</tbody>
          </table>
        ) : <p>אין בתכנון הזה.</p>}
        <p className="sh-note">צירים: עד 60 ס״מ בין ציר לציר. דגמי המגירות והקלפות נבחרים בהצעה.</p>
        {t.appliances.length > 0 && (
          <>
            <h2>מכשירים</h2>
            <table className="sh-t">
              <thead><tr><th>ארון</th><th>מכשיר</th></tr></thead>
              <tbody>{t.appliances.map((x, i) => <tr key={i}><td>{x.of}</td><td>{x.text}</td></tr>)}</tbody>
            </table>
          </>
        )}
      </section>

      <section className="sh-break">
        <h2>מיקום הארונות לכל קיר</h2>
        {l.walls.map((w, i) => (
          <div key={i} className="sh-wall">
            <Elevation layout={l} title={wallName(l, i)} length={w.length} base={w.base} upper={w.upper} top={w.top} at={String(i)} wall={w}
              wallL={i === 0 && !!l.ends?.left} wallR={i === l.walls.length - 1 && !!l.ends?.right}
              fallL={i === 0 && !!l.counter?.fallLeft} fallR={i === l.walls.length - 1 && !!l.counter?.fallRight} />
            <table className="sh-t">
              <thead><tr><th>ארון</th><th>שורה</th><th>סוג</th><th className="n">מקצה הקיר</th><th className="n">עד</th><th className="n">מהרצפה</th></tr></thead>
              <tbody>{t.cabinets.filter((c) => c.wall === wallName(l, i)).map((c) => <tr key={c.no}><td>{c.no}</td><td>{c.row}</td><td>{c.kind}</td><td className="n">{c.from}</td><td className="n">{Math.round((c.from + c.w) * 10) / 10}</td><td className="n">{c.bottom}</td></tr>)}</tbody>
            </table>
          </div>
        ))}
      </section>

      <section className="sh-break">
        <h2>נקודות לאינסטלטור ולחשמלאי</h2>
        {t.points.length ? (
          <table className="sh-t">
            <thead><tr><th>קיר</th><th>נקודה</th><th className="n">מקצה הקיר השמאלי</th><th className="n">גובה מהרצפה</th></tr></thead>
            <tbody>{t.points.map((x, i) => <tr key={i}><td>{x.wall}</td><td>{x.kind}</td><td className="n">{x.from}</td><td className="n">{x.height}</td></tr>)}</tbody>
          </table>
        ) : <p>לא סומנו נקודות בתכנון.</p>}
      </section>

      <section className="sh-break">
        <h2>חתכים</h2>
        <div className="sh-secs">{l.walls.map((_, i) => <Section key={i} l={l} i={i} />)}</div>
      </section>

      <section className="sh-break">
        <h2>דף לכל ארון</h2>
        <div className="sh-cards">
          {t.cabinets.map((c) => {
            const belongs = (o: string) => o === c.no || o.startsWith(`${c.no}/`);
            const fronts = t.fronts.filter((x) => belongs(x.of)), parts = t.carcass.filter((x) => belongs(x.of)), panels = t.panels.filter((x) => belongs(x.of));
            return (
              <article key={c.no} className="sh-card">
                <h3>{c.no} · {c.kind}</h3>
                <div>{c.wall} · {c.row} · {c.w} על {c.h}, עומק {c.d}{c.note ? ` · ${c.note}` : ""}</div>
                {fronts.length > 0 && <div><b>חזיתות:</b> {fronts.map((x) => `${x.name} ${x.w}×${x.h}${x.qty > 1 ? ` (${x.qty})` : ""}`).join(", ")}</div>}
                {parts.length > 0 && <div><b>גוף:</b> {parts.map((x) => `${x.name} ${x.w}×${x.h}${x.qty > 1 ? ` (${x.qty})` : ""}`).join(", ")}</div>}
                {panels.length > 0 && <div><b>חיפוי:</b> {panels.map((x) => `${x.name} ${x.w}×${x.h}`).join(", ")}</div>}
              </article>
            );
          })}
        </div>
      </section>
    </main>
  );
}
