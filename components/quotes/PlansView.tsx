"use client";
// Kitchen plans ("תכנונים"): a drawing and 3D view made on their own, before there's a quote.
// When a plan is ready, a quote is opened from it; the quote then shows the plan to the client.
import { useState } from "react";
import { fdate, qnum } from "@/lib/quotes/calc";
import { describeLayout } from "@/lib/quotes/layout";
import type { AppData, Plan, Quote } from "@/lib/quotes/types";
import LayoutEditor from "./LayoutEditor";

const claudeLink = (start: string) => `https://claude.ai/new?q=${encodeURIComponent(start)}`;
const quoteOf = (p: Plan, quotes: Quote[]) => quotes.find((q) => q.id === p.quoteId) || quotes.find((q) => q.planId === p.id);

export function PlansView({ data, onOpen, onNew, onQuote, onOpenQuote }: {
  data: AppData; onOpen: (id: string) => void; onNew: () => void; onQuote: (p: Plan) => void; onOpenQuote: (id: string) => void;
}) {
  const plans = [...data.plans].sort((a, b) => (b.updatedAt || b.createdAt).localeCompare(a.updatedAt || a.createdAt));
  return (
    <>
      <div className="nq-head">
        <div><h1>תכנונים</h1><div className="sub">שרטוט בקנה מידה ותלת-ממד. כשהתכנון מוכן, פותחים ממנו הצעת מחיר</div></div>
        <div className="nq-head-acts">
          <a className="nq-btn" href={claudeLink("תכנון מטבח חדש במערכת נויה. הנה הסקיצה עם המידות ושם הלקוח: ")} target="_blank" rel="noopener">✨ תכנון בקלוד</a>
          <button className="nq-btn pri" onClick={onNew}>+ תכנון חדש</button>
        </div>
      </div>
      {!plans.length && (
        <div className="nq-empty">
          עוד אין תכנונים
          <div className="hint" style={{ marginTop: 8 }}>מצלמים את הסקיצה הידנית ושולחים לקלוד, או לוחצים &quot;+ תכנון חדש&quot; וממלאים מידות.</div>
        </div>
      )}
      <div className="nq-leads">
        {plans.map((p) => {
          const q = quoteOf(p, data.quotes);
          const walls = p.layout.walls.length;
          return (
            <article key={p.id} className="nq-card nq-lead">
              <div className="nq-lead-top">
                <div>
                  <b className="nq-lead-name">{p.client.name || "ללא שם"}{p.title ? ` · ${p.title}` : ""}</b>
                  <div className="hint">
                    {walls === 1 ? "קיר אחד" : walls === 2 ? "ר׳" : "ח׳"}{p.layout.island ? " עם אי" : ""} · {p.layout.walls.map((w) => w.length).join(" + ")} ס״מ · {fdate((p.updatedAt || p.createdAt).slice(0, 10))}
                  </div>
                </div>
                <span className={`nq-pill ${q ? "nq-st-sent" : "nq-st-draft"}`}>{q ? `הצעה ${qnum(q)}` : "בלי הצעה"}</span>
              </div>
              <div className="nq-lead-acts">
                <button className="nq-btn sm pri" onClick={() => onOpen(p.id)}>פתח תכנון</button>
                {q
                  ? <button className="nq-btn sm" onClick={() => onOpenQuote(q.id)}>פתח הצעה {qnum(q)}</button>
                  : <button className="nq-btn sm" onClick={() => onQuote(p)}>הצעת מחיר מהתכנון ›</button>}
              </div>
            </article>
          );
        })}
      </div>
    </>
  );
}

export function PlanScreen({ plan: p, data, upd, onBack, onQuote, onOpenQuote, onDelete }: {
  plan: Plan; data: AppData; upd: (fn: (p: Plan) => void) => void; onBack: () => void;
  onQuote: (p: Plan) => void; onOpenQuote: (id: string) => void; onDelete: () => void;
}) {
  const [confirmDel, setConfirmDel] = useState(false);
  const q = quoteOf(p, data.quotes);
  const who = p.client.name || "הלקוח";
  return (
    <>
      <div className="nq-head">
        <div>
          <button className="nq-btn sm ghost" style={{ paddingInline: 0 }} onClick={onBack}>→ כל התכנונים</button>
          <h1>תכנון · {who}</h1>
        </div>
        <div className="nq-head-acts">
          {q
            ? <button className="nq-btn pri" onClick={() => onOpenQuote(q.id)}>פתח הצעה {qnum(q)} ›</button>
            : <button className="nq-btn pri" onClick={() => onQuote(p)}>הצעת מחיר מהתכנון ›</button>}
        </div>
      </div>
      <div className="nq-stack">
        <section className="nq-card">
          <div className="nq-fields">
            <label className="f">שם הלקוח<input className="in" value={p.client.name} onChange={(e) => upd((x) => { x.client.name = e.target.value; })} /></label>
            <label className="f">טלפון<input className="in num" type="tel" value={p.client.phone} onChange={(e) => upd((x) => { x.client.phone = e.target.value; })} /></label>
            <label className="f">אימייל<input className="in ltr" type="email" style={{ textAlign: "left" }} value={p.client.email || ""} onChange={(e) => upd((x) => { x.client.email = e.target.value; })} /></label>
            <label className="f">שם התכנון<input className="in" value={p.title} placeholder="מטבח, ארון קיר…" onChange={(e) => upd((x) => { x.title = e.target.value; })} /></label>
            <label className="f full">הערות (רק לך)<textarea className="in" rows={2} value={p.notes || ""} onChange={(e) => upd((x) => { x.notes = e.target.value; })} /></label>
          </div>
        </section>
        <LayoutEditor layout={p.layout} removable={false}
          claudeHref={claudeLink(`תיקון התכנון של ${who} במערכת נויה (תכנון ${p.id}): `)}
          onChange={(l) => l && upd((x) => { x.layout = l; })} />
        <section className="nq-card">
          {confirmDel ? (
            <div className="nq-confirm">
              למחוק את התכנון של {who}?{q ? ` ההצעה ${qnum(q)} תישאר, בלי השרטוט.` : ""}
              <button className="nq-btn sm danger" onClick={onDelete}>כן, למחוק</button>
              <button className="nq-btn sm" onClick={() => setConfirmDel(false)}>ביטול</button>
            </div>
          ) : (
            <button className="nq-btn sm ghost" onClick={() => setConfirmDel(true)}>מחיקת התכנון</button>
          )}
        </section>
      </div>
    </>
  );
}

/** In the quote editor: which plan the quote shows, with a way to open, change or detach it. */
export function QuotePlanCard({ q, data, onOpen, onLink, onUnlink, onNew, onMove }: {
  q: Quote; data: AppData; onOpen: (id: string) => void; onLink: (planId: string) => void; onUnlink: () => void; onNew: () => void; onMove: () => void;
}) {
  const plan = q.planId ? data.plans.find((p) => p.id === q.planId) : undefined;
  const free = data.plans.filter((p) => !p.quoteId || p.quoteId === q.id);
  return (
    <section className="nq-card">
      <div className="nq-card-h"><h2>שרטוט ותלת-ממד</h2><span className="hint">מוצג ללקוח עם ההצעה וב-PDF</span></div>
      {plan ? (
        <>
          <div className="hint" style={{ whiteSpace: "pre-line", marginBottom: 10 }}>{describeLayout(plan.layout).split("\n").slice(0, 4).join("\n")}</div>
          <div className="nq-head-acts">
            <button className="nq-btn sm pri" onClick={() => onOpen(plan.id)}>פתח את התכנון</button>
            <button className="nq-btn sm ghost" onClick={onUnlink}>הסר מההצעה</button>
          </div>
        </>
      ) : q.layout ? (
        <div className="nq-head-acts">
          <span className="hint">בהצעה הזאת יש שרטוט שנשמר לפני שהיו תכנונים.</span>
          <button className="nq-btn sm pri" onClick={onMove}>העבר לתכנונים</button>
        </div>
      ) : (
        <div className="nq-head-acts">
          {free.length > 0 && (
            <select className="in" style={{ width: "auto" }} value="" onChange={(e) => e.target.value && onLink(e.target.value)} aria-label="צירוף תכנון קיים">
              <option value="">צירוף תכנון קיים…</option>
              {free.map((p) => <option key={p.id} value={p.id}>{p.client.name || "ללא שם"}{p.title ? ` · ${p.title}` : ""}</option>)}
            </select>
          )}
          <button className="nq-btn sm" onClick={onNew}>+ תכנון חדש ללקוח</button>
        </div>
      )}
    </section>
  );
}
