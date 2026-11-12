"use client";
// Kitchen plans ("תכנונים"): a drawing and 3D view made on their own, before there's a quote.
// When a plan is ready, a quote is opened from it; the quote then shows the plan to the client.
import { useEffect, useRef, useState } from "react";
import { fdate, planMessage, planSubject, planWaText, qnum, waText } from "@/lib/quotes/calc";
import type { AppData, Lead, Plan, Quote } from "@/lib/quotes/types";
import { DEFAULT_RULES, planQuantities } from "@/lib/quotes/takeoff";
import LayoutEditor from "./LayoutEditor";
import RoomSketch from "./RoomSketch";
import { downloadBlob, sharePdf } from "./pdf";

const claudeLink = (start: string) => `https://claude.ai/new?q=${encodeURIComponent(start)}`;
const sameName = (a: string, b: string) => a.trim().replace(/\s+/g, " ") === b.trim().replace(/\s+/g, " ");
/** the newest request whose name is exactly this client's name */
const leadNamed = (leads: Lead[], name: string) =>
  name.trim() ? [...leads].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).find((l) => l.name && sameName(l.name, name)) : undefined;
const quoteOf = (p: Plan, quotes: Quote[]) => quotes.find((q) => q.id === p.quoteId) || quotes.find((q) => q.planId === p.id);

export function PlansView({ data, onOpen, onNew, onQuote, onOpenQuote, onDelete }: {
  data: AppData; onOpen: (id: string) => void; onNew: () => void; onQuote: (p: Plan) => void; onOpenQuote: (id: string) => void; onDelete: (id: string) => void;
}) {
  const [confirmDel, setConfirmDel] = useState<string | null>(null);
  const plans = [...data.plans].sort((a, b) => (b.updatedAt || b.createdAt).localeCompare(a.updatedAt || a.createdAt));
  return (
    <>
      <div className="nq-head">
        <div><h1>תכנונים</h1><div className="sub">שרטוט בקנה מידה ותלת-ממד. כשהתכנון מוכן, פותחים ממנו הצעת מחיר</div></div>
        <div className="nq-head-acts">
          <a className="nq-btn" href={claudeLink("תכנון מטבח חדש במערכת נויה. הנה הסקיצה עם המידות ושם הלקוח: ")} target="_blank" rel="noopener">✨ תכנון בקלוד</a>
          <a className="nq-btn" href={claudeLink("תתכנן לי כמה אופציות למטבח במערכת נויה ממידות החדר. קודם תשאל אותי מה שצריך. מה שאני יודע כרגע: ")} target="_blank" rel="noopener">✨ אופציות ממידות חדר</a>
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
                {confirmDel === p.id ? (
                  <span className="nq-confirm">
                    למחוק את התכנון?{q ? ` ההצעה ${qnum(q)} תישאר, בלי השרטוט.` : ""}
                    <button className="nq-btn sm danger" onClick={() => { setConfirmDel(null); onDelete(p.id); }}>כן, למחוק</button>
                    <button className="nq-btn sm" onClick={() => setConfirmDel(null)}>ביטול</button>
                  </span>
                ) : (
                  <button className="nq-btn sm ghost" onClick={() => setConfirmDel(p.id)}>מחיקה</button>
                )}
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
  const [render, setRender] = useState<"idle" | "photo" | "ai">("idle");
  const [renderNote, setRenderNote] = useState("");
  const [renderErr, setRenderErr] = useState("");
  const [matchShown, setMatchShown] = useState(true);
  const shotRef = useRef<(() => string) | null>(null);
  // A picture of the 3D view from the angle on screen: kept as it is (free), or sent to the image model
  // for a photorealistic render (paid, about half a shekel to a shekel). Either way it is kept on the plan.
  // The render chosen for the client can guide the next one, so all the angles look like the same room.
  const capture = async (kind: "photo" | "ai") => {
    const jpeg = shotRef.current?.();
    if (!jpeg) return setRenderErr("התלת-ממד עוד נטען. נסה שוב");
    setRender(kind);
    setRenderErr("");
    await saveNow();
    const res = await fetch(`/api/admin/plans/${p.id}/render`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ image: jpeg, notes: renderNote, raw: kind === "photo", matchShown: matchShown && !!p.shownRender }) }).catch(() => null);
    const j = await res?.json().catch(() => null);
    if (res?.ok && j?.url) upd((x) => { x.renders = j.renders; x.shownRender = j.shownRender; });
    else setRenderErr(j?.error === "billing" ? "נגמרה היתרה בחשבון של גוגל (Gemini). צריך לטעון קרדיט." : "לא הצליח. נסה שוב");
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
          <a className="nq-btn" href={`/admin/shop/${p.id}`} target="_blank" rel="noopener" onClick={() => { saveNow(); }}>📐 דפי ייצור</a>
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
        <RoomSketch key={p.id} room={p.room} layout={p.layout} onChange={(room, layout) => upd((x) => { x.room = room; if (layout) x.layout = layout; })}
          optionsHref={claudeLink(`תתכנן לי כמה אופציות למטבח במערכת נויה מהחדר ששרטטתי בתכנון ${p.id} (${who}). קודם תשאל אותי מה שצריך. `)} />
        <LayoutEditor layout={p.layout}
          claudeHref={claudeLink(`תיקון התכנון של ${who} במערכת נויה (תכנון ${p.id}): `)}
          onChange={(l) => upd((x) => { x.layout = l; })}
          shotRef={shotRef}
          viewTools={
            <div className="nqr-tools">
              <div className="hint">מסובבים לזווית שרוצים ולוחצים רינדור. כל רינדור הוא תמונה בתשלום</div>
              <div className="nq-head-acts">
                <button className="nq-btn pri" disabled={render !== "idle"} onClick={() => capture("ai")}>{render === "ai" ? "מרנדר… (כחצי דקה)" : "✨ רינדור מהזווית הזו (חצי שקל עד שקל)"}</button>
                <button className="nq-btn" disabled={render !== "idle"} onClick={() => capture("photo")}>{render === "photo" ? "שומר…" : "📷 צילום התלת-ממד (חינם)"}</button>
                {renderErr && <span className="hint">{renderErr}</span>}
              </div>
              <label className="f">הערות לרינדור (לא חובה)<input className="in" value={renderNote} placeholder="למשל: אור ערב חם, פרקט אלון בהיר, עציץ ליד החלון" onChange={(e) => setRenderNote(e.target.value)} /></label>
              {!!p.shownRender && (
                <label className="nq-check"><input type="checkbox" checked={matchShown} onChange={(e) => setMatchShown(e.target.checked)} /> להתאים לתמונה שמסומנת ללקוח (אותו אור, חומרים ואביזרים)</label>
              )}
              {!!p.renders?.length && (
                <div className="nqr-grid">
                  {[...p.renders].reverse().map((r) => (
                    <figure key={r.url} className={`nqr-item ${p.shownRender === r.url ? "on" : ""}`}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <a href={r.url} target="_blank" rel="noopener"><img src={`${r.url}?w=900`} alt="תמונה של המטבח" loading="lazy" /></a>
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
            </div>
          } />
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
/** The quote's plan: open it, link one when there is none, and keep the quantities in step with it. */
export function QuotePlanLink({ q, data, onOpen, upd }: { q: Quote; data: AppData; onOpen: (id: string) => void; upd: (fn: (x: Quote) => void) => void }) {
  const plan = q.planId ? data.plans.find((p) => p.id === q.planId) : undefined;
  const [pick, setPick] = useState("");
  if (!plan) {
    // plans of this client first
    const name = q.client.name.trim();
    const plans = [...data.plans].sort((a, b) => Number(sameName(b.client.name, name)) - Number(sameName(a.client.name, name)) || (b.updatedAt || b.createdAt).localeCompare(a.updatedAt || a.createdAt));
    if (!plans.length) return null;
    return (
      <div className="nq-back">
        <span>ההצעה לא מקושרת לתכנון.</span>
        <select className="in" value={pick} onChange={(e) => setPick(e.target.value)} aria-label="תכנון לקישור">
          <option value="">בחר תכנון…</option>
          {plans.map((p) => <option key={p.id} value={p.id}>{(p.client.name || "ללא שם") + (p.title ? " · " + p.title : "")}</option>)}
        </select>
        <button className="nq-btn sm pri" disabled={!pick} onClick={() => upd((x) => { x.planId = pick; })}>קשר לתכנון</button>
      </div>
    );
  }
  const qs = planQuantities(plan.layout, { ...DEFAULT_RULES, ...(data.settings.shopRules || {}) });
  const byKey = new Map(qs.map((x) => [x.key, x]));
  // every quantity in the quote that can follow the plan: a line, or a part of a line
  type Slot = { lineId: string; part: number; desc: string; qty: number; key?: string };
  const slots: Slot[] = q.lines.flatMap((l) =>
    l.type === "head" || l.type === "text" ? [] :
    l.parts?.length ? l.parts.map((p, i) => ({ lineId: l.id, part: i, desc: `${l.desc.split(/[,—]/)[0].trim()} · ${p.name}`, qty: p.qty, key: p.fromPlan })) :
    [{ lineId: l.id, part: -1, desc: l.desc.split(/[,—]/)[0].trim(), qty: l.qty, key: l.fromPlan }]);
  const setSlot = (s: Slot, key: string | undefined, take: boolean) => upd((x) => {
    const l = x.lines.find((y) => y.id === s.lineId);
    if (!l) return;
    const v = key ? byKey.get(key)?.value : undefined;
    if (s.part >= 0 && l.parts?.[s.part]) {
      if (key) l.parts[s.part].fromPlan = key; else delete l.parts[s.part].fromPlan;
      if (take && v !== undefined) l.parts[s.part].qty = v;
    } else {
      if (key) l.fromPlan = key; else delete l.fromPlan;
      if (take && v !== undefined) l.qty = v;
    }
  });
  const linked = slots.filter((s) => s.key && byKey.has(s.key));
  const off = linked.filter((s) => Math.abs(byKey.get(s.key!)!.value - s.qty) > 0.005);
  return (
    <div className="nq-back nq-sync">
      <div className="nq-sync-h">
        <span>נבנתה מהתכנון של <b>{plan.client.name || "הלקוח"}</b> · השרטוט והתלת-ממד מוצגים ללקוח עם ההצעה</span>
        <button className="nq-btn sm pri" onClick={() => onOpen(plan.id)}>פתח תכנון ›</button>
      </div>
      {off.length > 0 && (
        <div className="nq-sync-off">
          <b>התכנון השתנה: {off.length} כמויות בהצעה שונות מהתכנון</b>
          <button className="nq-btn sm pri" onClick={() => off.forEach((s) => setSlot(s, s.key, true))}>עדכן הכול מהתכנון</button>
        </div>
      )}
      <details>
        <summary>כמויות מהתכנון ({linked.length} שורות מסונכרנות)</summary>
        <p className="hint">בחר לכל שורה את הכמות מהתכנון שהיא הולכת אחריה. מעכשיו, כשהתכנון משתנה, ההצעה תראה מה השתנה ותעדכן בלחיצה.</p>
        <div className="nq-sync-rows">
          {slots.map((s) => {
            const pq = s.key ? byKey.get(s.key) : undefined;
            const diff = pq && Math.abs(pq.value - s.qty) > 0.005;
            return (
              <div key={s.lineId + s.part} className="nq-sync-row">
                <span className="d">{s.desc || "שורה"}</span>
                <span className="num">{s.qty}</span>
                <select className="in" value={s.key || ""} aria-label={`כמות מהתכנון ל${s.desc}`} onChange={(e) => setSlot(s, e.target.value || undefined, !!e.target.value)}>
                  <option value="">לא מהתכנון</option>
                  {qs.map((x) => <option key={x.key} value={x.key}>{x.label}: {x.value}</option>)}
                </select>
                {diff && <button className="nq-btn sm" onClick={() => setSlot(s, s.key, true)}>עדכן ל-{pq!.value}</button>}
              </div>
            );
          })}
        </div>
      </details>
    </div>
  );
}
