import { addDays, calc, fdate, money, qnum, sectionTotals, shownQty, tidyLineDesc } from "@/lib/quotes/calc";
import type { Pro, Quote, Settings } from "@/lib/quotes/types";
import "./quote-doc.css";

/** The client-facing A4 quote. Shows one total only — no line prices, no commissions.
 *  `data-pb` marks the blocks the PDF exporter may break pages between. */
export default function QuoteDoc({ quote: q, settings: st, pros = [] }: { quote: Quote; settings: Settings; pros?: Pro[] }) {
  const c = calc(q, st, pros);
  // With two parts or more (מטבח + ארון קיר…), each part gets its own price before VAT.
  const secs = sectionTotals(q, c.list);
  const subtotalAt = new Map(secs.length > 1 ? secs.map((s) => [s.end, s] as const) : []);
  // One box per part, so a part's subtotal can't be read as belonging to the next part.
  type Block = { key: string; title: string; lines: Quote["lines"]; last: number };
  const blocks: Block[] = [];
  q.lines.forEach((l, i) => {
    if (l.type === "head") blocks.push({ key: l.id, title: l.desc, lines: [], last: i });
    else {
      if (!blocks.length) blocks.push({ key: "project", title: q.project, lines: [], last: i });
      const b = blocks[blocks.length - 1];
      b.lines.push(l);
      b.last = i;
    }
  });
  if (!blocks.length) blocks.push({ key: "project", title: q.project, lines: [], last: -1 });
  const validUntil = fdate(addDays(q.date, +st.validity || 30));
  const clauses = (st.clauses || "").split("\n").map((s) => s.trim()).filter(Boolean);

  return (
    <article className="nq-doc" dir="rtl">
      <div className="nq-bsd">בס״ד</div>

      <header className="nq-d-head" data-pb>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <div className="nq-d-band">
          <img className="nq-d-logo" src="/images/quote-logo.png" alt="NOYA Kitchens by Erez Hindi" />
        </div>
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

      {blocks.map((b, bi) => {
        const sub = subtotalAt.get(b.last);
        const isLast = bi === blocks.length - 1;
        return (
          <section key={b.key} className="nq-box nq-d-items">
            <table>
              <thead>
                {b.title && (
                  <tr className="nq-d-proj" data-pb>
                    <th colSpan={2}>{b.title}</th>
                  </tr>
                )}
                {bi === 0 && (
                  <tr className="nq-d-cols" data-pb>
                    <th>תיאור</th>
                    <th className="nq-q">כמות</th>
                  </tr>
                )}
              </thead>
              <tbody>
                {b.lines.map((l) => (
                  <tr key={l.id} data-pb>
                    <td>{tidyLineDesc(l)}</td>
                    <td className="nq-q">{shownQty(l)}</td>
                  </tr>
                ))}
                {sub && (
                  <tr className="nq-d-sub" data-pb>
                    <td colSpan={2}>
                      <div className="nq-d-subrow">
                        <span>סה״כ {sub.title}, לפני מע״מ</span>
                        <span>{money(sub.amount)}</span>
                      </div>
                    </td>
                  </tr>
                )}
                {isLast && q.delivery && (
                  <tr data-pb>
                    <td>{q.delivery}</td>
                    <td className="nq-q" />
                  </tr>
                )}
              </tbody>
            </table>
          </section>
        );
      })}

      <section className="nq-box nq-d-sum" data-pb>
        {c.discount >= 1 && (
          <>
            <div><span>מחיר</span><span>{money(c.list)}</span></div>
            {c.pctOff >= 1 && <div><span>הנחה {c.discountPct}%</span><span>−{money(c.pctOff)}</span></div>}
            {c.discountAmt > 0 && <div><span>הנחה</span><span>−{money(c.discountAmt)}</span></div>}
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
