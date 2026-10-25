import { addDays, calc, fdate, money, qnum, shownQty } from "@/lib/quotes/calc";
import type { Pro, Quote, Settings } from "@/lib/quotes/types";
import "./quote-doc.css";

/** The client-facing A4 quote. Shows one total only — no line prices, no commissions.
 *  `data-pb` marks the blocks the PDF exporter may break pages between. */
export default function QuoteDoc({ quote: q, settings: st, pros = [] }: { quote: Quote; settings: Settings; pros?: Pro[] }) {
  const c = calc(q, st, pros);
  const validUntil = fdate(addDays(q.date, +st.validity || 30));
  const startsWithHead = q.lines[0]?.type === "head";
  const clauses = (st.clauses || "").split("\n").map((s) => s.trim()).filter(Boolean);

  return (
    <article className="nq-doc" dir="rtl">
      <div className="nq-bsd">בס״ד</div>

      <header className="nq-d-head" data-pb>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="nq-d-logo" src="/images/quote-logo.png" alt="NOYA Kitchens by Erez Hindi" />
        <h1>הצעת מחיר</h1>
        <div className="nq-d-biz">
          <b>{st.biz}</b>
          <span>
            {st.address} | {st.owner}: <span className="nq-ltr">{st.phone}</span>
          </span>
          <span>
            <span className="nq-ltr">{st.web}</span> | עוסק מורשה: <span className="nq-ltr">{st.vatId}</span>
          </span>
        </div>
      </header>

      <hr className="nq-d-rule" />

      <section className="nq-box nq-d-info" data-pb>
        <div><b>מס׳ הצעה:</b> <span className="nq-ltr">{qnum(q)}</span></div>
        <div><b>תאריך:</b> {fdate(q.date)}</div>
        <div><b>לקוח:</b> {q.client.name}</div>
        <div><b>טלפון:</b> <span className="nq-ltr">{q.client.phone}</span></div>
      </section>

      <section className="nq-box nq-d-items">
        <table>
          <thead>
            {!startsWithHead && (
              <tr className="nq-d-proj" data-pb>
                <th colSpan={2}>{q.project}</th>
              </tr>
            )}
            <tr className="nq-d-cols" data-pb>
              <th>תיאור</th>
              <th className="nq-q">כמות</th>
            </tr>
          </thead>
          <tbody>
            {q.lines.map((l) =>
              l.type === "head" ? (
                <tr key={l.id} className="nq-d-grp" data-pb>
                  <td colSpan={2}>{l.desc}</td>
                </tr>
              ) : (
                <tr key={l.id} data-pb>
                  <td>{l.desc}</td>
                  <td className="nq-q">{shownQty(l)}</td>
                </tr>
              )
            )}
            {q.delivery && (
              <tr data-pb>
                <td>{q.delivery}</td>
                <td className="nq-q" />
              </tr>
            )}
          </tbody>
        </table>
      </section>

      <section className="nq-box nq-d-sum" data-pb>
        {c.discountPct > 0 && (
          <>
            <div><span>מחיר</span><span>{money(c.list)}</span></div>
            <div><span>הנחה {c.discountPct}%</span><span>−{money(c.discount)}</span></div>
          </>
        )}
        <div className="nq-strong"><span>סה״כ לפני מע״מ</span><span>{money(c.price)}</span></div>
        <div><span>מע״מ {st.vat}%</span><span>{money(c.vat)}</span></div>
        <div><span>סה״כ כולל מע״מ</span><span>{money(c.total)}</span></div>
      </section>

      {q.notes && (
        <section className="nq-d-notes" data-pb>
          <b>הערות:</b> {q.notes}
        </section>
      )}

      <hr className="nq-d-rule" />

      <section className="nq-d-terms">
        <p data-pb><b>תנאי תשלום:</b> {st.payment}</p>
        <p data-pb><b>תוקף ההצעה:</b> {st.validity} יום, עד {validUntil}.</p>
        {clauses.map((t, i) => (
          <p key={i} data-pb>{t}</p>
        ))}
      </section>

      {q.status === "approved" ? (
        <section className="nq-d-stamp" data-pb>
          <div>
            <b>✓ ההצעה אושרה</b>
            <span>אושרה דיגיטלית על ידי {q.approvedBy}</span>
          </div>
          <span>{fdate(q.approvedAt)}</span>
        </section>
      ) : (
        <section className="nq-d-sign" data-pb>
          <div>שם המזמין</div>
          <div>תאריך</div>
          <div>חתימה</div>
        </section>
      )}
    </article>
  );
}
