"use client";
// Kitchen plans ("תכנונים"): a drawing and 3D view made on their own, before there's a quote.
// When a plan is ready, a quote is opened from it; the quote then shows the plan to the client.
import { useEffect, useState } from "react";
import { fdate, planMessage, planSubject, planWaText, qnum, waText } from "@/lib/quotes/calc";
import type { AppData, Lead, Plan, Quote } from "@/lib/quotes/types";
import dynamic from "next/dynamic";
import LayoutEditor from "./LayoutEditor";
import { downloadBlob, sharePdf } from "./pdf";

const Kitchen3D = dynamic(() => import("./Kitchen3D"), { ssr: false });

const claudeLink = (start: string) => `https://claude.ai/new?q=${encodeURIComponent(start)}`;
const sameName = (a: string, b: string) => a.trim().replace(/\s+/g, " ") === b.trim().replace(/\s+/g, " ");
/** the newest request whose name is exactly this client's name */
const leadNamed = (leads: Lead[], name: string) =>
  name.trim() ? [...leads].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).find((l) => l.name && sameName(l.name, name)) : undefined;
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

export function PlanScreen({ plan: p, data, upd, saveNow, onBack, onQuote, onOpenQuote, onDelete }: {
  plan: Plan; data: AppData; upd: (fn: (p: Plan) => void) => void; saveNow: () => Promise<unknown>; onBack: () => void;
  onQuote: (p: Plan) => void; onOpenQuote: (id: string) => void; onDelete: () => void;
}) {
  const [confirmDel, setConfirmDel] = useState(false);
  const [pdfBusy, setPdfBusy] = useState(false);
  const [pdfError, setPdfError] = useState(false);
  const [mailOpen, setMailOpen] = useState(false);
  const [sentNote, setSentNote] = useState("");
  const [render, setRender] = useState<"idle" | "shot" | "busy">("idle");
  const [renderNote, setRenderNote] = useState("");
  const [renderErr, setRenderErr] = useState("");
  // A photorealistic render: the 3D view is drawn once off screen, its picture goes to the image model.
  // Every render is paid for (about half a shekel to a shekel) and kept on the plan.
  const onShot = async (jpeg: string) => {
    setRender("busy");
    setRenderErr("");
    await saveNow();
    const res = await fetch(`/api/admin/plans/${p.id}/render`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ image: jpeg, notes: renderNote }) }).catch(() => null);
    const j = await res?.json().catch(() => null);
    if (res?.ok && j?.url) upd((x) => { x.renders = j.renders; x.shownRender = j.shownRender; });
    else setRenderErr(j?.error === "billing" ? "נגמרה היתרה בחשבון של גוגל (Gemini). צריך לטעון קרדיט." : "הרינדור נכשל. נסה שוב");
    setRender("idle");
  };
  const q = quoteOf(p, data.quotes);
  const who = p.client.name || "הלקוח";
  // the client's request ("פניות") with the same name: its phone and email fill the plan
  const lead = leadNamed(data.leads, p.client.name);
  const fromLead = (x: Plan, l: Lead, all = false) => {
    if (l.phone && (all || !x.client.phone)) x.client.phone = l.phone;
    if (l.email && (all || !x.client.email)) x.client.email = l.email;
  };
  const differs = lead && ((lead.phone && lead.phone !== p.client.phone) || (lead.email && lead.email !== (p.client.email || "")));
  const canShare = typeof navigator !== "undefined" && "canShare" in navigator && /Android|iPhone|iPad/i.test(navigator.userAgent);
  // The plan alone for the client (drawings and 3D, no prices), made on the server like the quote PDF.
  const onPdf = async () => {
    setPdfBusy(true);
    setPdfError(false);
    try {
      await saveNow();
      const res = await fetch(`/api/p/${p.id}/pdf`);
      if (!res.ok) throw new Error("pdf");
      const blob = await res.blob();
      const name = `תכנון ${p.title || "מטבח"}${p.client.name ? ` - ${p.client.name}` : ""} - נויה מטבחים.pdf`.replace(/[\\/:*?"<>|]/g, "");
      if (!(canShare && (await sharePdf(blob, name, `התכנון של ${who} מנויה מטבחים`)))) downloadBlob(blob, name);
    } catch {
      setPdfError(true);
    }
    setPdfBusy(false);
  };
  // WhatsApp from Erez's phone: a message with the link to the plan's PDF
  const onWhatsApp = async () => {
    if (!p.client.phone) return setSentNote("חסר טלפון של הלקוח");
    const w = window.open("about:blank", "_blank");
    await saveNow();
    const href = waText(p.client.phone, planWaText(p, data.settings, window.location.origin));
    if (w) w.location.href = href; else window.location.href = href;
  };
  return (
    <>
      {mailOpen && (
        <PlanMailModal p={p} data={data} saveNow={saveNow} onClose={() => setMailOpen(false)}
          onSent={(to) => { setMailOpen(false); if (!p.client.email) upd((x) => { x.client.email = to; }); setSentNote(`התכנון נשלח במייל ל-${to} ✓`); }} />
      )}
      <div className="nq-head">
        <div>
          <button className="nq-btn sm ghost" style={{ paddingInline: 0 }} onClick={onBack}>→ כל התכנונים</button>
          <h1>תכנון · {who}</h1>
        </div>
        <div className="nq-head-acts">
          <button className="nq-btn" disabled={pdfBusy} onClick={onPdf}>{pdfBusy ? "מכין PDF…" : "📄 PDF ללקוח"}</button>
          <button className="nq-btn" onClick={() => setMailOpen(true)}>שליחה במייל</button>
          <button className="nq-btn wa" onClick={onWhatsApp}>שליחה בוואטסאפ</button>
          {pdfError && <span className="hint">יצירת ה-PDF נכשלה. נסה שוב</span>}
          {sentNote && <span className="hint">{sentNote}</span>}
          {!q && <a className="nq-btn" href={claudeLink(`הצעת מחיר במערכת נויה מהתכנון של ${who} (תכנון ${p.id}), לפי המחירון והקטלוג: `)} target="_blank" rel="noopener">✨ הצעה בקלוד</a>}
          {q
            ? <button className="nq-btn pri" onClick={() => onOpenQuote(q.id)}>פתח הצעה {qnum(q)} ›</button>
            : <button className="nq-btn pri" onClick={() => onQuote(p)}>הצעת מחיר מהתכנון ›</button>}
        </div>
      </div>
      <div className="nq-stack">
        <section className="nq-card">
          <div className="nq-fields">
            <label className="f">שם הלקוח<input className="in" list="nq-lead-names" value={p.client.name} onChange={(e) => {
              const name = e.target.value;
              const l = leadNamed(data.leads, name);
              upd((x) => { x.client.name = name; if (l) fromLead(x, l); });
            }} />
              <datalist id="nq-lead-names">{Array.from(new Set(data.leads.map((l) => l.name.trim()).filter(Boolean))).map((n) => <option key={n} value={n} />)}</datalist>
              {differs && <button type="button" className="nq-btn sm ghost" style={{ paddingInline: 0, justifySelf: "start" }} onClick={() => upd((x) => fromLead(x, lead!, true))}>
                לקחת טלפון ואימייל מהפנייה של {lead!.name} ({lead!.phone || lead!.email})
              </button>}
            </label>
            <label className="f">טלפון<input className="in num" type="tel" value={p.client.phone} onChange={(e) => upd((x) => { x.client.phone = e.target.value; })} /></label>
            <label className="f">אימייל<input className="in ltr" type="email" style={{ textAlign: "left" }} value={p.client.email || ""} onChange={(e) => upd((x) => { x.client.email = e.target.value; })} /></label>
            <label className="f">שם התכנון<input className="in" value={p.title} placeholder="מטבח, ארון קיר…" onChange={(e) => upd((x) => { x.title = e.target.value; })} /></label>
            <label className="f full">הערות (רק לך)<textarea className="in" rows={2} value={p.notes || ""} onChange={(e) => upd((x) => { x.notes = e.target.value; })} /></label>
          </div>
        </section>
        <section className="nq-card">
          <div className="nq-card-h"><h2>רינדור</h2><span className="hint">תמונה ריאליסטית מהתלת-ממד, באותן מידות וצבעים. כל רינדור עולה בערך חצי שקל עד שקל</span></div>
          <label className="f">הערות לרינדור (לא חובה)<input className="in" value={renderNote} placeholder="למשל: אור ערב חם, פרקט אלון בהיר, עציץ ליד החלון" onChange={(e) => setRenderNote(e.target.value)} /></label>
          <div className="nq-head-acts" style={{ marginTop: 8 }}>
            <button className="nq-btn pri" disabled={render !== "idle"} onClick={() => setRender("shot")}>{render === "idle" ? "✨ רינדור חדש" : "מרנדר… (כחצי דקה)"}</button>
            {renderErr && <span className="hint">{renderErr}</span>}
          </div>
          {render === "shot" && (
            <div style={{ position: "fixed", left: -10000, top: 0, width: 1280 }} aria-hidden>
              <Kitchen3D layout={p.layout} still height={720} onShot={onShot} />
            </div>
          )}
          {!!p.renders?.length && (
            <div className="nqr-grid">
              {[...p.renders].reverse().map((r) => (
                <figure key={r.url} className={`nqr-item ${p.shownRender === r.url ? "on" : ""}`}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <a href={r.url} target="_blank" rel="noopener"><img src={`${r.url}?w=900`} alt="רינדור" loading="lazy" /></a>
                  <figcaption>
                    {p.shownRender === r.url
                      ? <b>✓ זה מה שהלקוח מקבל</b>
                      : <button className="nq-btn sm" onClick={() => upd((x) => { x.shownRender = r.url; })}>לשלוח את זה ללקוח</button>}
                    <button className="nq-btn sm ghost" onClick={() => upd((x) => { x.renders = (x.renders || []).filter((y) => y.url !== r.url); if (x.shownRender === r.url) x.shownRender = x.renders.at(-1)?.url; })}>הסר</button>
                  </figcaption>
                </figure>
              ))}
            </div>
          )}
        </section>
        <LayoutEditor layout={p.layout}
          claudeHref={claudeLink(`תיקון התכנון של ${who} במערכת נויה (תכנון ${p.id}): `)}
          onChange={(l) => upd((x) => { x.layout = l; })} />
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

/** The plan to the client from Erez's Gmail, with the PDF attached (as with a quote). */
function PlanMailModal({ p, data, saveNow, onClose, onSent }: {
  p: Plan; data: AppData; saveNow: () => Promise<unknown>; onClose: () => void; onSent: (to: string) => void;
}) {
  const [to, setTo] = useState(p.client.email || "");
  const [subject, setSubject] = useState(planSubject(p));
  const [message, setMessage] = useState(planMessage(p, data.settings));
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && !busy && onClose();
    addEventListener("keydown", onKey);
    return () => removeEventListener("keydown", onKey);
  }, [onClose, busy]);
  const send = async () => {
    setBusy(true);
    setErr("");
    await saveNow();
    const res = await fetch(`/api/admin/plans/${p.id}/email`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ to: to.trim(), subject, message }),
    }).catch(() => null);
    setBusy(false);
    if (res?.ok) return onSent(to.trim());
    const j = await res?.json().catch(() => null);
    setErr(j?.message || "השליחה נכשלה. נסה שוב");
  };
  return (
    <div className="nq-scrim" onClick={(e) => e.target === e.currentTarget && !busy && onClose()}>
      <div className="nq-sheet nq-modal" role="dialog" aria-label="שליחת התכנון במייל">
        <h2>שליחת התכנון במייל</h2>
        <div className="hint">נשלח מה-Gmail שלך (<span className="ltr">{data.settings.email}</span>) עם קובץ ה-PDF של התכנון מצורף, בלי מחירים.</div>
        <label className="f">אל<input className="in ltr" type="email" style={{ textAlign: "left" }} value={to} onChange={(e) => setTo(e.target.value)} autoFocus placeholder="client@example.com" /></label>
        <label className="f">נושא<input className="in" value={subject} onChange={(e) => setSubject(e.target.value)} /></label>
        <label className="f">הודעה<textarea className="in" rows={8} value={message} onChange={(e) => setMessage(e.target.value)} /></label>
        {err && <div className="nq-err" role="alert">{err}</div>}
        <div className="nq-head-acts" style={{ justifyContent: "flex-end" }}>
          <button className="nq-btn" disabled={busy} onClick={onClose}>ביטול</button>
          <button className="nq-btn pri" disabled={busy || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to.trim())} onClick={send}>{busy ? "שולח…" : "שלח עם PDF"}</button>
        </div>
      </div>
    </div>
  );
}

/** In the quote editor: the plan this quote was made from. Plans are made and edited only under "תכנונים". */
export function QuotePlanLink({ q, data, onOpen }: { q: Quote; data: AppData; onOpen: (id: string) => void }) {
  const plan = q.planId ? data.plans.find((p) => p.id === q.planId) : undefined;
  if (!plan) return null;
  return (
    <div className="nq-back">
      <span>נבנתה מהתכנון של <b>{plan.client.name || "הלקוח"}</b> · השרטוט והתלת-ממד מוצגים ללקוח עם ההצעה</span>
      <button className="nq-btn sm pri" onClick={() => onOpen(plan.id)}>פתח תכנון ›</button>
    </div>
  );
}
