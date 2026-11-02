"use client";
// "שיווק": what each channel cost and what it brought — visits, clicks, requests, quotes, kitchens and money.
import { useEffect, useMemo, useState } from "react";
import { CHANNELS, CHANNEL_LABEL, PAID, type Channel } from "@/lib/marketing/channels";
import { monthBack, monthName, monthRange, per, report, type Key, type Range, type Row } from "@/lib/marketing/report";
import { fdate, money, qnum, todayIL } from "@/lib/quotes/calc";
import type { AppData, Lead, Marketing, Quote, Spend } from "@/lib/quotes/types";
import PhotoStudio from "./PhotoStudio";
import SiteImages from "./SiteImages";

const KEY_LABEL = (k: Key) => (k === "none" ? "לא סומן מקור" : CHANNEL_LABEL[k]);
const SITE = "https://www.noya-k.co.il";
const n0 = (n: number) => Math.round(n).toLocaleString("he-IL");
const orDash = (v: number | null, f: (n: number) => string = money) => (v === null ? "—" : f(v));

type M = Marketing & { hasPhotoKey?: boolean };
type Section = "report" | "spend" | "photos" | "site";

export default function MarketingView({ data, onTagLead, onTagQuote, flash }: {
  data: AppData; onTagLead: (l: Lead, ch: Channel) => void; onTagQuote: (q: Quote, ch: Channel) => void; flash: (m: string) => void;
}) {
  const [m, setM] = useState<M | null>(null);
  const [err, setErr] = useState(false);
  const [section, setSection] = useState<Section>("report");
  const thisMonth = todayIL().slice(0, 7);
  const [period, setPeriod] = useState<string>(thisMonth); // "2026-11" or "last3"

  const load = () =>
    fetch("/api/admin/marketing", { cache: "no-store" }).then((r) => (r.ok ? r.json() : Promise.reject())).then(setM).catch(() => setErr(true));
  useEffect(() => { load(); }, []);

  const range: Range = period === "last3"
    ? { from: monthRange(monthBack(thisMonth, 2)).from, to: monthRange(thisMonth).to }
    : monthRange(period);
  const r = useMemo(() => (m ? report(data, m, range) : null), [data, m, range.from, range.to]); // eslint-disable-line react-hooks/exhaustive-deps

  if (err) return <div className="nq-empty">לא הצלחתי לטעון את נתוני השיווק. רענן את העמוד.</div>;
  if (!m || !r) return <div className="nq-empty">טוען…</div>;

  const months = Array.from({ length: 12 }, (_, i) => monthBack(thisMonth, i));
  const t = r.total;

  return (
    <>
      <div className="nq-head">
        <div><h1>שיווק</h1><div className="sub">מאיפה מגיעים הלקוחות, כמה זה עולה ומה זה מכניס</div></div>
      </div>
      <div className="nq-chips">
        {([["report", "דוח"], ["spend", "הוצאות פרסום"], ["photos", "תמונות לקטלוג"], ["site", "תמונות האתר"]] as const).map(([k, l]) => (
          <button key={k} className="nq-chip" aria-pressed={section === k} onClick={() => setSection(k)}>{l}</button>
        ))}
      </div>

      {section === "photos" && <PhotoStudio hasKey={!!m.hasPhotoKey} onKeySaved={() => setM({ ...m, hasPhotoKey: true })} flash={flash} />}

      {section === "site" && <SiteImages flash={flash} />}

      {section !== "photos" && section !== "site" && (
        <div className="nq-mk-period">
          <label className="f">תקופה
            <select className="in" value={period} onChange={(e) => setPeriod(e.target.value)}>
              {months.map((mo) => <option key={mo} value={mo}>{monthName(mo)}{mo === thisMonth ? " (החודש)" : ""}</option>)}
              <option value="last3">3 החודשים האחרונים</option>
            </select>
          </label>
        </div>
      )}

      {section === "report" && (
        <div className="nq-stack">
          <Goal won={t.won} goal={m.goal} monthly={period !== "last3"} onGoal={async (g) => {
            const ok = await fetch("/api/admin/marketing", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ goal: g }) }).then((x) => x.ok).catch(() => false);
            if (ok) setM({ ...m, goal: g }); else flash("השמירה נכשלה. נסה שוב");
          }} />

          <div className="nq-kpis nq-mk-kpis">
            <Kpi k="פניות" v={n0(t.leads)} />
            <Kpi k="הצעות שנשלחו" v={n0(t.sent)} />
            <Kpi k="מטבחים שנסגרו" v={n0(t.won)} />
            <Kpi k="הכנסה (לפני מע״מ)" v={money(t.revenue)} />
            <Kpi k="הוצאה על פרסום" v={money(t.spend)} />
            <Kpi k="עלות לפנייה" v={orDash(per(t.spend, t.leads))} />
            <Kpi k="עלות למטבח שנסגר" v={orDash(per(t.spend, t.won))} />
            <Kpi k="כל שקל פרסום החזיר" v={t.spend > 0 ? `₪${(t.revenue / t.spend).toFixed(1)}` : "—"} />
          </div>

          <Funnel t={t} />

          <ChannelTable rows={r.rows} />

          <Trend data={data} m={m} thisMonth={thisMonth} />

          {(r.untaggedLeads.length > 0 || r.untaggedWon.length > 0) && (
            <section className="nq-card">
              <div className="nq-card-h"><h2>מאיפה הם הגיעו?</h2><span className="hint">סימון מקור מדייק את הדוח</span></div>
              <div className="nq-mk-tags">
                {r.untaggedLeads.map((l) => (
                  <TagRow key={l.id} title={l.name || l.phone || "ללא שם"} meta={`פנייה · ${fdate(l.createdAt.slice(0, 10))}`} onPick={(ch) => onTagLead(l, ch)} />
                ))}
                {r.untaggedWon.map((q) => (
                  <TagRow key={q.id} title={q.client.name || qnum(q)} meta={`הצעה שאושרה ${qnum(q)}`} onPick={(ch) => onTagQuote(q, ch)} />
                ))}
              </div>
            </section>
          )}

          <TrackLinks flash={flash} />
        </div>
      )}

      {section === "spend" && (
        <SpendView m={m} range={range} flash={flash}
          onAdd={(s) => setM({ ...m, spends: [...m.spends, s] })}
          onRemove={(id) => setM({ ...m, spends: m.spends.filter((x) => x.id !== id) })} />
      )}
    </>
  );
}

function Kpi({ k, v }: { k: string; v: string }) {
  return <div className="nq-kpi"><div className="k">{k}</div><div className="v num">{v}</div></div>;
}

function Goal({ won, goal, monthly, onGoal }: { won: number; goal: number; monthly: boolean; onGoal: (g: number) => void }) {
  const [edit, setEdit] = useState(false);
  const [val, setVal] = useState(String(goal));
  const target = monthly ? goal : goal * 3;
  const pct = Math.min(100, Math.round((won / Math.max(1, target)) * 100));
  return (
    <section className="nq-card nq-mk-goal">
      <div className="nq-card-h">
        <h2>יעד: {target} מטבחים {monthly ? "בחודש" : "ב-3 חודשים"}</h2>
        {edit ? (
          <span className="nq-head-acts">
            <input className="in num" style={{ width: 70 }} type="number" min={1} max={50} value={val} onChange={(e) => setVal(e.target.value)} aria-label="יעד מטבחים לחודש" />
            <button className="nq-btn sm pri" onClick={() => { onGoal(+val); setEdit(false); }} disabled={!(+val >= 1 && +val <= 50)}>שמור</button>
            <button className="nq-btn sm" onClick={() => setEdit(false)}>ביטול</button>
          </span>
        ) : <button className="nq-btn sm" onClick={() => { setVal(String(goal)); setEdit(true); }}>שנה יעד</button>}
      </div>
      <div className="nq-mk-bar" role="progressbar" aria-valuenow={won} aria-valuemin={0} aria-valuemax={target} aria-label="התקדמות ליעד">
        <span style={{ width: `${pct}%` }} />
      </div>
      <div className="hint" style={{ marginTop: 6 }}><b className="num">{won}</b> נסגרו מתוך {target} · נספרות הצעות שאושרו בתקופה</div>
    </section>
  );
}

function Funnel({ t }: { t: Row }) {
  const steps = [
    ["ביקורים באתר", t.visits],
    ["לחיצות חיוג / וואטסאפ", t.calls + t.wa],
    ["טפסים מהאתר", t.forms],
    ["פניות", t.leads],
    ["הצעות שנשלחו", t.sent],
    ["מטבחים שנסגרו", t.won],
  ] as const;
  const max = Math.max(1, ...steps.map((s) => s[1]));
  return (
    <section className="nq-card">
      <div className="nq-card-h"><h2>המשפך</h2><span className="hint">מביקור באתר ועד מטבח</span></div>
      <div className="nq-mk-funnel">
        {steps.map(([label, v]) => (
          <div key={label} className="row">
            <span className="l">{label}</span>
            <span className="b"><span style={{ width: `${Math.max(v ? 3 : 0, (v / max) * 100)}%` }} /></span>
            <b className="v num">{n0(v)}</b>
          </div>
        ))}
      </div>
    </section>
  );
}

function ChannelTable({ rows }: { rows: Row[] }) {
  if (!rows.length) return <section className="nq-card"><h2>לפי מקור</h2><div className="hint" style={{ marginTop: 8 }}>עוד אין נתונים בתקופה הזאת.</div></section>;
  const sorted = [...rows].sort((a, b) => b.won - a.won || b.leads - a.leads || b.spend - a.spend);
  return (
    <section className="nq-card">
      <div className="nq-card-h"><h2>לפי מקור</h2><span className="hint">הכנסה לפני מע״מ</span></div>
      <div className="nq-mk-table-wrap">
        <table className="nq-mk-table">
          <thead><tr><th>מקור</th><th>הוצאה</th><th>ביקורים</th><th>חיוג/וואטסאפ</th><th>פניות</th><th>עלות לפנייה</th><th>הצעות</th><th>נסגרו</th><th>הכנסה</th></tr></thead>
          <tbody>
            {sorted.map((x) => (
              <tr key={x.ch}>
                <th scope="row">{KEY_LABEL(x.ch)}</th>
                <td className="num">{x.spend ? money(x.spend) : "—"}</td>
                <td className="num">{n0(x.visits)}</td>
                <td className="num">{n0(x.calls + x.wa)}</td>
                <td className="num">{n0(x.leads)}</td>
                <td className="num">{orDash(per(x.spend, x.leads))}</td>
                <td className="num">{n0(x.sent)}</td>
                <td className="num">{n0(x.won)}</td>
                <td className="num">{x.revenue ? money(x.revenue) : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="nq-mk-cards">
        {sorted.map((x) => (
          <div key={x.ch} className="nq-mk-ch">
            <b>{KEY_LABEL(x.ch)}</b>
            <dl>
              <div><dt>הוצאה</dt><dd className="num">{x.spend ? money(x.spend) : "—"}</dd></div>
              <div><dt>ביקורים</dt><dd className="num">{n0(x.visits)}</dd></div>
              <div><dt>חיוג/וואטסאפ</dt><dd className="num">{n0(x.calls + x.wa)}</dd></div>
              <div><dt>פניות</dt><dd className="num">{n0(x.leads)}</dd></div>
              <div><dt>עלות לפנייה</dt><dd className="num">{orDash(per(x.spend, x.leads))}</dd></div>
              <div><dt>הצעות</dt><dd className="num">{n0(x.sent)}</dd></div>
              <div><dt>נסגרו</dt><dd className="num">{n0(x.won)}</dd></div>
              <div><dt>הכנסה</dt><dd className="num">{x.revenue ? money(x.revenue) : "—"}</dd></div>
            </dl>
          </div>
        ))}
      </div>
    </section>
  );
}

/** The last 6 months: requests and kitchens as bars, spend written under each month. */
function Trend({ data, m, thisMonth }: { data: AppData; m: Marketing; thisMonth: string }) {
  const months = Array.from({ length: 6 }, (_, i) => monthBack(thisMonth, 5 - i));
  const pts = months.map((mo) => ({ mo, t: report(data, m, monthRange(mo)).total }));
  const max = Math.max(1, ...pts.map((p) => p.t.leads));
  const H = 120;
  return (
    <section className="nq-card">
      <div className="nq-card-h">
        <h2>6 חודשים אחרונים</h2>
        <span className="nq-mk-legend"><i className="a" /> פניות <i className="b" /> נסגרו</span>
      </div>
      <div className="nq-mk-trend" role="img" aria-label={pts.map((p) => `${monthName(p.mo)}: ${p.t.leads} פניות, ${p.t.won} נסגרו`).join("; ")}>
        {pts.map(({ mo, t }) => (
          <div key={mo} className="col">
            <div className="bars" style={{ height: H }}>
              <span className="a" style={{ height: `${(t.leads / max) * 100}%` }}><em className="num">{t.leads || ""}</em></span>
              <span className="b" style={{ height: `${(t.won / max) * 100}%` }}><em className="num">{t.won || ""}</em></span>
            </div>
            <div className="mo">{monthName(mo).split(" ")[0]}</div>
            <div className="hint num">{t.spend ? money(t.spend) : "—"}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

function TagRow({ title, meta, onPick }: { title: string; meta: string; onPick: (ch: Channel) => void }) {
  return (
    <div className="nq-mk-tag">
      <div><b>{title}</b><div className="hint">{meta}</div></div>
      <select className="in" defaultValue="" aria-label={`מקור של ${title}`} onChange={(e) => e.target.value && onPick(e.target.value as Channel)}>
        <option value="" disabled>בחר מקור…</option>
        {CHANNELS.filter((c) => c !== "direct").map((c) => <option key={c} value={c}>{CHANNEL_LABEL[c]}</option>)}
      </select>
    </div>
  );
}

/** Links that carry their source, so a visit from them is counted under the right channel. */
function TrackLinks({ flash }: { flash: (m: string) => void }) {
  const links = [
    ["כתובת האתר בפרופיל העסק בגוגל", `${SITE}/?utm_source=gbp`],
    ["קישור בביו של אינסטגרם", `${SITE}/?utm_source=instagram&utm_medium=bio`],
    ["קישור בעמוד הפייסבוק", `${SITE}/?utm_source=facebook&utm_medium=page`],
    ["קישור לשלוח לאדריכלים ומעצבים", `${SITE}/?utm_source=pro`],
    ["סיומת למודעות פייסבוק/אינסטגרם", `utm_source=facebook&utm_medium=paid`],
  ];
  return (
    <section className="nq-card">
      <div className="nq-card-h"><h2>קישורים עם סימון מקור</h2><span className="hint">מודעות גוגל מזוהות לבד</span></div>
      <div className="nq-mk-links">
        {links.map(([l, u]) => (
          <div key={u} className="row">
            <div><div className="hint">{l}</div><code className="ltr">{u}</code></div>
            <button className="nq-btn sm" onClick={() => navigator.clipboard?.writeText(u).then(() => flash("הקישור הועתק"), () => flash("ההעתקה לא הצליחה"))}>העתק</button>
          </div>
        ))}
      </div>
    </section>
  );
}

function SpendView({ m, range, flash, onAdd, onRemove }: {
  m: Marketing; range: Range; flash: (msg: string) => void; onAdd: (s: Spend) => void; onRemove: (id: string) => void;
}) {
  const [f, setF] = useState({ date: todayIL(), channel: "gads" as Channel, amount: "", note: "" });
  const [busy, setBusy] = useState(false);
  const [confirmDel, setConfirmDel] = useState<string | null>(null);
  const shown = m.spends.filter((s) => s.date >= range.from && s.date <= range.to).sort((a, b) => b.date.localeCompare(a.date));
  const sum = shown.reduce((t, s) => t + s.amount, 0);
  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const r = await fetch("/api/admin/marketing", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...f, amount: +f.amount }) })
      .then((x) => (x.ok ? x.json() : null)).catch(() => null);
    setBusy(false);
    if (!r?.spend) return flash("השמירה נכשלה. בדוק את הסכום והתאריך");
    onAdd(r.spend);
    setF({ ...f, amount: "", note: "" });
    flash("ההוצאה נשמרה ✓");
  };
  const remove = async (id: string) => {
    const ok = await fetch(`/api/admin/marketing?id=${id}`, { method: "DELETE" }).then((x) => x.ok).catch(() => false);
    setConfirmDel(null);
    if (ok) onRemove(id); else flash("המחיקה נכשלה. נסה שוב");
  };
  return (
    <div className="nq-stack">
      <form className="nq-card" onSubmit={add}>
        <div className="nq-card-h"><h2>הוצאה חדשה</h2><span className="hint">אפשר גם לכתוב לקלוד: &quot;גוגל השבוע 280 ש״ח&quot;</span></div>
        <div className="nq-mk-spend-f">
          <label className="f">ערוץ
            <select className="in" value={f.channel} onChange={(e) => setF({ ...f, channel: e.target.value as Channel })}>
              {[...PAID, ...CHANNELS.filter((c) => !PAID.includes(c) && c !== "direct")].map((c) => <option key={c} value={c}>{CHANNEL_LABEL[c]}</option>)}
            </select>
          </label>
          <label className="f">סכום (₪)<input className="in num" type="number" inputMode="numeric" min={1} required value={f.amount} onChange={(e) => setF({ ...f, amount: e.target.value })} /></label>
          <label className="f">תאריך<input className="in num" type="date" required value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} /></label>
          <label className="f">הערה<input className="in" value={f.note} placeholder="למשל: קמפיין מטבחים שרון" onChange={(e) => setF({ ...f, note: e.target.value })} /></label>
        </div>
        <div className="nq-head-acts" style={{ justifyContent: "flex-end", marginTop: 12 }}>
          <button className="nq-btn pri" disabled={busy || !(+f.amount > 0)}>{busy ? "שומר…" : "הוסף הוצאה"}</button>
        </div>
      </form>
      <section className="nq-card">
        <div className="nq-card-h"><h2>הוצאות בתקופה</h2><b className="num">{money(sum)}</b></div>
        {!shown.length && <div className="hint">אין הוצאות בתקופה הזאת.</div>}
        <div className="nq-mk-spends">
          {shown.map((s) => (
            <div key={s.id} className="row">
              <div>
                <b>{CHANNEL_LABEL[s.channel]}</b> · <span className="num">{money(s.amount)}</span>
                <div className="hint">{fdate(s.date)}{s.note ? ` · ${s.note}` : ""}</div>
              </div>
              {confirmDel === s.id
                ? <span className="nq-head-acts"><button className="nq-btn sm danger" onClick={() => remove(s.id)}>כן, למחוק</button><button className="nq-btn sm" onClick={() => setConfirmDel(null)}>ביטול</button></span>
                : <button className="nq-btn sm ghost" onClick={() => setConfirmDel(s.id)}>מחק</button>}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
