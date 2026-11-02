"use client";
// Re-shooting the site's kitchen photos one by one: Erez writes what to change, the model makes a new
// professional shot of the same kitchen, and only a version he approves replaces the photo on the site.
// Photos of the same kitchen are marked as one set, so each new shot keeps the set's accessories and styling.
import { useEffect, useState } from "react";
import { SHOT_PRESETS } from "@/lib/marketing/photo-prompt";

type Item = { id: string; group: string; original: string; current: string; replaced: boolean; set?: string };
type Shot = { url: string; notes: string };
/** One photo in a whole-kitchen re-shoot: its original, the new shot, and whether to put it on the site. */
type Batch = { id: string; before: string; after?: string; err?: string; keep: boolean };

const ERR: Record<string, string> = {
  billing: "נגמר הקרדיט בגוגל. צריך לטעון עוד בעמוד החיוב של Google AI Studio.",
  quota: "גוגל ביקשה לחכות רגע. נסה שוב בעוד דקה.",
  blocked: "המודל סירב לתמונה הזאת. נסה לנסח את ההערה אחרת.",
  "no-image": "המודל לא החזיר תמונה. נסה שוב.",
};

async function toJpeg(src: string, max = 2048, q = 0.9) {
  // The gallery CDN refuses reads from the admin page (CORS), so those go through the site's own image server.
  const url = src.startsWith("https://cdn.sanity.io/") ? `/_next/image?url=${encodeURIComponent(src)}&w=2048&q=95` : src;
  const res = await fetch(url);
  if (!res.ok) throw new Error("read failed");
  const img = await createImageBitmap(await res.blob());
  const k = Math.min(1, max / Math.max(img.width, img.height));
  const c = document.createElement("canvas");
  c.width = Math.round(img.width * k);
  c.height = Math.round(img.height * k);
  c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
  return { data: c.toDataURL("image/jpeg", q).split(",")[1], w: c.width, h: c.height };
}


/** Small preview: Sanity resizes on its CDN; site files go through Next's image optimizer. */
const thumb = (src: string) => (src.startsWith("https://cdn.sanity.io") ? `${src}?w=400&q=70` : `/_next/image?url=${encodeURIComponent(src)}&w=384&q=70`);

export default function SiteImages({ flash }: { flash: (m: string) => void }) {
  const [items, setItems] = useState<Item[] | null>(null);
  const [openId, setOpenIdState] = useState<string | null>(null);
  const setOpenId = (id: string | null) => { setOpenIdState(id); try { if (id) sessionStorage.setItem("nq-si-open", id); else sessionStorage.removeItem("nq-si-open"); } catch {} };
  const load = () => fetch("/api/admin/site-images", { cache: "no-store" }).then((r) => r.json()).then((j: { items: Item[] }) => {
    setItems(j.items);
    // after a reload, back to the photo that was open
    let last = "";
    try { last = sessionStorage.getItem("nq-si-open") || ""; } catch {}
    if (last && j.items.some((x) => x.id === last)) setOpenIdState(last);
  }).catch(() => setItems([]));
  useEffect(() => { load(); }, []);

  if (!items) return <div className="nq-empty">טוען תמונות…</div>;
  const open = openId ? items.find((x) => x.id === openId) : undefined;
  if (open) {
    const i = items.indexOf(open);
    const next = items[i + 1];
    return (
      <Editor key={open.id} item={open} items={items} flash={flash} reload={load}
        onSaved={(url) => setItems(items.map((x) => (x.id === open.id ? { ...x, current: url, replaced: true } : x)))}
        onRestored={() => setItems(items.map((x) => (x.id === open.id ? { ...x, current: x.original, replaced: false } : x)))}
        onBack={() => { setOpenId(null); load(); }}
        onNext={next ? () => { setOpenId(next.id); window.scrollTo(0, 0); } : undefined} />
    );
  }

  const groups = Array.from(new Set(items.map((i) => i.group)));
  return (
    <div className="nq-stack">
      <div className="hint">בוחרים תמונה, כותבים מה לשנות, ומאשרים רק את מה שאהבת. אפשר תמיד להחזיר את המקור. החלפה מופיעה באתר תוך דקה.</div>
      {groups.map((g) => {
        const list = items.filter((i) => i.group === g);
        return (
          <section key={g} className="nq-card">
            <div className="nq-card-h"><h2>{g}</h2><span className="hint num">{list.filter((i) => i.replaced).length} מתוך {list.length} הוחלפו</span></div>
            <div className="nq-si-grid">
              {list.map((it) => (
                <button key={it.id} className="nq-si-thumb" onClick={() => setOpenId(it.id)} aria-label={`פתח תמונה${it.replaced ? " (הוחלפה)" : ""}`}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={thumb(it.current)} alt="" loading="lazy" />
                  {it.replaced && <span className="nq-pill nq-st-approved">הוחלפה ✓</span>}
                  {it.set && <span className="nq-si-set" title="מסומנת כחלק ממטבח">🔗</span>}
                </button>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}

function Editor({ item, items, flash, reload, onSaved, onRestored, onBack, onNext }: {
  item: Item; items: Item[]; flash: (m: string) => void; reload: () => void;
  onSaved: (url: string) => void; onRestored: () => void; onBack: () => void; onNext?: () => void;
}) {
  const [notes, setNotes] = useState("");
  const [presets, setPresets] = useState<string[]>([]);
  const [tip, setTip] = useState<string>("");
  // When the photo opens, a small model suggests the shot types that suit it; they come ticked, Erez can change them.
  useEffect(() => {
    const key = `nq-si-tip-${item.id}`;
    let cached: { presets: string[]; why: string } | null = null;
    try { cached = JSON.parse(sessionStorage.getItem(key) || "null"); } catch {}
    const apply = (t: { presets: string[]; why: string }) => { setPresets((p) => (p.length ? p : t.presets)); setTip(t.why); };
    if (cached) return apply(cached);
    let live = true;
    setTip("…");
    toJpeg(item.original, 1024, 0.8)
      .then((src) => fetch("/api/admin/photo/suggest", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ image: src.data }) }))
      .then((r) => (r.ok ? r.json() : null))
      .then((t) => {
        if (!live) return;
        if (!t?.presets) return setTip("");
        try { sessionStorage.setItem(key, JSON.stringify(t)); } catch {}
        apply(t);
      })
      .catch(() => live && setTip(""));
    return () => { live = false; };
  }, [item.id, item.original]);
  // the ready-made shot types picked, then what Erez wrote
  const fullNotes = [...SHOT_PRESETS.filter((p) => presets.includes(p.label)).map((p) => p.text), notes.trim()].filter(Boolean).join(". ");
  const [shots, setShots] = useState<Shot[]>([]);
  const [pick, setPick] = useState(-1); // -1 = the original
  const [busy, setBusy] = useState<"" | "make" | "save" | "restore" | "set">("");
  const [err, setErr] = useState("");
  const [confirmRestore, setConfirmRestore] = useState(false);
  const [choosing, setChoosing] = useState(false);
  const mates = item.set ? items.filter((x) => x.set === item.set && x.id !== item.id) : [];
  // the whole kitchen gets the same "random" styling
  const seed = item.set || item.id;
  const [batch, setBatch] = useState<Batch[] | null>(null);
  const [batchRun, setBatchRun] = useState<"" | "make" | "save">("");

  /** One new shot of `source`, with the given reference photos of the same kitchen. */
  const shoot = async (source: string, refList: { url: string; kind: "finished" | "original" }[]) => {
    const src = await toJpeg(source);
    const refs = await Promise.all(refList.slice(0, 4).map(async (x) => ({ data: (await toJpeg(x.url, 1024, 0.8)).data, kind: x.kind })));
    const r = await fetch("/api/admin/photo", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ image: src.data, w: src.w, h: src.h, refs, opts: { mode: source.startsWith("data:") ? "edit" : "reshoot", seed, counter: "keep", appliances: [], light: "studio", clean: true, styling: true, notes: fullNotes } }),
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok || !j.image) throw new Error(ERR[j.error] || "יצירת התמונה נכשלה. נסה שוב.");
    return j.image as string;
  };
  /** Only already re-shot photos of the kitchen go along: originals as references made the model copy the old photo. */
  const mateRefs = () => mates.filter((m) => m.replaced).map((m) => ({ url: m.current, kind: "finished" as const }));

  const make = async () => {
    setBusy("make"); setErr("");
    try {
      // a new version builds on the one on screen, so notes can add things step by step
      const url = await shoot(pick >= 0 ? shots[pick].url : item.original, mateRefs());
      setShots((s) => [...s, { url, notes: fullNotes }]);
      setPick(shots.length);
    } catch (e) { setErr(e instanceof Error && e.message !== "read failed" ? e.message : "לא הצלחתי לקרוא את התמונה המקורית."); }
    setBusy("");
  };

  /** Every photo of the kitchen, one after another; the first new shot sets the style for the rest. */
  const makeAll = async () => {
    const list = [item, ...mates];
    const rows: Batch[] = list.map((x) => ({ id: x.id, before: x.original, keep: true }));
    setBatch(rows); setBatchRun("make"); setErr("");
    const done: string[] = [];
    for (let i = 0; i < list.length; i++) {
      // the first photo is shot freely; then the first and latest new shots lead the style, with photos already approved
      const fresh = [done[0], done[done.length - 1]].filter((u, k, a) => u && a.indexOf(u) === k).map((u) => ({ url: u!, kind: "finished" as const }));
      try {
        const url = await shoot(list[i].original, [...fresh, ...list.filter((x) => x.id !== list[i].id && x.replaced).map((x) => ({ url: x.current, kind: "finished" as const }))]);
        done.push(url);
        rows[i] = { ...rows[i], after: url };
      } catch (e) {
        rows[i] = { ...rows[i], keep: false, err: e instanceof Error ? e.message : "נכשל" };
        if (rows[i].err === ERR.billing) { setBatch([...rows]); break; }
      }
      setBatch([...rows]);
    }
    setBatchRun("");
  };
  const saveBatch = async () => {
    if (!batch) return;
    setBatchRun("save");
    let ok = 0;
    for (const row of batch.filter((r) => r.keep && r.after)) {
      const r = await fetch("/api/admin/site-images", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: row.id, image: row.after }) })
        .then((x) => x.ok).catch(() => false);
      if (r) ok++;
    }
    setBatchRun("");
    setBatch(null);
    reload();
    flash(`${ok} תמונות הוחלפו באתר ✓ (מופיעות תוך דקה)`);
  };
  const save = async () => {
    const s = shots[pick];
    if (!s) return;
    setBusy("save");
    const r = await fetch("/api/admin/site-images", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: item.id, image: s.url }) })
      .then((x) => (x.ok ? x.json() : null)).catch(() => null);
    setBusy("");
    if (!r?.url) return flash("ההחלפה נכשלה. נסה שוב");
    onSaved(r.url);
    flash("התמונה הוחלפה באתר ✓ (מופיעה תוך דקה)");
  };
  const restore = async () => {
    setBusy("restore"); setConfirmRestore(false);
    const ok = await fetch(`/api/admin/site-images?id=${encodeURIComponent(item.id)}`, { method: "DELETE" }).then((r) => r.ok).catch(() => false);
    setBusy("");
    if (!ok) return flash("ההחזרה נכשלה. נסה שוב");
    onRestored();
    flash("התמונה המקורית חזרה לאתר");
  };
  const saveSet = async (ids: string[]) => {
    setBusy("set");
    const ok = await fetch("/api/admin/site-images", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ids: [item.id, ...ids] }) }).then((r) => r.ok).catch(() => false);
    setBusy("");
    setChoosing(false);
    if (!ok) return flash("השמירה נכשלה. נסה שוב");
    reload();
    flash(ids.length ? "נשמר: התמונות מסומנות כאותו מטבח ✓" : "התמונה כבר לא מסומנת עם תמונות אחרות");
  };

  useHoldUpdates(shots.length > 0 || busy === "make" || busy === "save" || !!batch);
  const shown = pick >= 0 ? shots[pick]?.url : item.original;
  if (batch) {
    const made = batch.filter((r) => r.after).length;
    const keep = batch.filter((r) => r.keep && r.after).length;
    return (
      <div className="nq-stack">
        <section className="nq-card">
          <div className="nq-card-h">
            <h2>כל המטבח: לפני ואחרי</h2>
            <span className="hint num">{batchRun === "make" ? `מצלם ${Math.min(made + 1, batch.length)} מתוך ${batch.length}… (כחצי דקה לתמונה)` : `${made} מתוך ${batch.length} מוכנות`}</span>
          </div>
          <div className="hint" style={{ marginBottom: 10 }}>מסמנים את מה שמחליפים באתר. מה שלא מסומן נשאר כמו שהוא.</div>
          <div className="nq-si-batch">
            {batch.map((r, i) => (
              <div key={r.id} className="row">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={thumb(r.before)} alt="לפני" />
                {r.after
                  // eslint-disable-next-line @next/next/no-img-element
                  ? <a href={r.after} target="_blank" rel="noopener"><img src={r.after} alt="אחרי" /></a>
                  : <div className="wait">{r.err || (batchRun === "make" ? "ממתין…" : "—")}</div>}
                <label className="nq-chip" aria-pressed={r.keep && !!r.after}>
                  <input type="checkbox" disabled={!r.after || !!batchRun} checked={r.keep && !!r.after}
                    onChange={(e) => setBatch(batch.map((x, k) => (k === i ? { ...x, keep: e.target.checked } : x)))} /> להחליף
                </label>
              </div>
            ))}
          </div>
          <div className="nq-head-acts" style={{ marginTop: 12, justifyContent: "flex-end" }}>
            <button className="nq-btn" disabled={!!batchRun} onClick={() => setBatch(null)}>סגור בלי להחליף</button>
            <button className="nq-btn pri" disabled={!!batchRun || !keep} onClick={saveBatch}>{batchRun === "save" ? "מחליף…" : `✓ החלף באתר ${keep} תמונות`}</button>
          </div>
        </section>
      </div>
    );
  }
  return (
    <div className="nq-stack">
      <div className="nq-head-acts" style={{ justifyContent: "space-between", alignItems: "center" }}>
        <span className="nq-head-acts" style={{ alignItems: "center" }}><button className="nq-btn sm ghost" onClick={onBack}>→ לכל התמונות</button>{item.replaced && <span className="nq-pill nq-st-approved">באתר: הגרסה החדשה</span>}</span>
        {onNext && <button className="nq-btn sm" disabled={!!busy} onClick={onNext}>התמונה הבאה ‹</button>}
      </div>
      <section className="nq-card">
        <div className="nq-chips" style={{ marginBottom: 10 }}>
          <button className="nq-chip" aria-pressed={pick === -1} onClick={() => setPick(-1)}>מקור</button>
          {item.replaced && <a className="nq-chip" href={item.current} target="_blank" rel="noopener">מה שבאתר עכשיו ↗</a>}
          {shots.map((s, i) => <button key={i} className="nq-chip" aria-pressed={pick === i} onClick={() => setPick(i)}>גרסה {i + 1}</button>)}
        </div>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="nq-mk-out" src={shown} alt={pick === -1 ? "התמונה המקורית" : `גרסה ${pick + 1}`} />
        {pick >= 0 && shots[pick]?.notes && <div className="hint" style={{ marginTop: 6 }}>הערות לגרסה הזאת: {shots[pick].notes}</div>}
        <div className="hint" style={{ marginTop: 6 }}>לפני שמאשרים: לעבור בין &quot;מקור&quot; לגרסה ולוודא שהארונות, החזיתות והידיות זהים.</div>
      </section>

      <section className="nq-card">
        <div className="nq-card-h">
          <h2>תמונות נוספות של אותו מטבח</h2>
          <span className="nq-head-acts">
            {mates.length > 0 && !choosing && <button className="nq-btn sm pri" disabled={!!busy} onClick={makeAll}>📸 צלם מחדש את כל המטבח ({mates.length + 1})</button>}
            <button className="nq-btn sm" disabled={!!busy} onClick={() => setChoosing(!choosing)}>{choosing ? "סגור" : mates.length ? "שנה" : "בחר תמונות"}</button>
          </span>
        </div>
        {!choosing && (mates.length
          ? <>
              <div className="nq-si-mates">
                {mates.map((m) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img key={m.id} src={thumb(m.current)} alt="" title={m.replaced ? "כבר צולמה מחדש" : "מקור"} className={m.replaced ? "done" : ""} />
                ))}
              </div>
              <div className="hint" style={{ marginTop: 6 }}>כל צילום חדש מקבל גם את התמונות האלה, ושומר על אותם אקססוריז, עיצוב ותאורה כמו בתמונות שכבר אושרו (מסומנות במסגרת ירוקה).</div>
            </>
          : <div className="hint">אם יש עוד תמונות של המטבח הזה, סמן אותן פעם אחת. כך כל התמונות של המטבח ייראו כמו צילום אחד, עם אותם אקססוריז.</div>)}
        {choosing && <MatePicker item={item} items={items} initial={mates.map((m) => m.id)} busy={busy === "set"} onSave={saveSet} />}
      </section>

      <section className="nq-card">
        <div className="f" style={{ marginBottom: 10 }}>סוג הצילום (אפשר לבחור כמה)
          <div className="nq-chips" style={{ margin: "4px 0 0" }}>
            {SHOT_PRESETS.map((p) => (
              <button key={p.label} type="button" className="nq-chip" title={p.text} aria-pressed={presets.includes(p.label)}
                onClick={() => setPresets((x) => (x.includes(p.label) ? x.filter((y) => y !== p.label) : [...x, p.label]))}>{p.label}</button>
            ))}
          </div>
          {tip && <div className="nq-si-tip" role="status">💡 {tip === "…" ? "בודק איזה צילום הכי מתאים לתמונה…" : <>המלצה: {tip}</>}</div>}
          <div className="hint" style={{ marginTop: 4 }}>בכל צילום נשמרים תמיד קווים ישרים, גובה מצלמה נכון וקומפוזיציה מקצועית.</div>
        </div>
        <label className="f">מה עוד לשנות או להוסיף (לא חובה)
          <textarea className="in" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)}
            placeholder="למשל: לצלם מזווית רחבה יותר מהכניסה, להוסיף אגרטל עם פרחים לבנים על האי, תאורת ערב חמימה" />
        </label>
        {err && <div className="nq-warn-box" role="alert">{err}</div>}
        <div className="nq-head-acts" style={{ marginTop: 12, justifyContent: "flex-end" }}>
          {item.replaced && (confirmRestore
            ? <><button className="nq-btn danger" disabled={!!busy} onClick={restore}>כן, להחזיר את המקור</button><button className="nq-btn" onClick={() => setConfirmRestore(false)}>ביטול</button></>
            : <button className="nq-btn" disabled={!!busy} onClick={() => setConfirmRestore(true)}>החזר את המקור לאתר</button>)}
          {pick >= 0 && <button className="nq-btn pri" disabled={!!busy} onClick={save}>{busy === "save" ? "מחליף…" : "✓ החלף באתר בגרסה הזאת"}</button>}
          <button className={`nq-btn ${pick >= 0 ? "" : "pri"}`} disabled={!!busy} onClick={make}>{busy === "make" ? "מצלם מחדש… (עד דקה)" : pick >= 0 ? "✨ גרסה חדשה מזו" : "✨ צלם מחדש מהמקור"}</button>
        </div>
      </section>
    </div>
  );
}

/** Pick the other photos of this kitchen (from all the site's kitchen photos). */
function MatePicker({ item, items, initial, busy, onSave }: { item: Item; items: Item[]; initial: string[]; busy: boolean; onSave: (ids: string[]) => void }) {
  const [sel, setSel] = useState<string[]>(initial);
  const others = items.filter((x) => x.id !== item.id);
  const toggle = (id: string) => setSel((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  return (
    <div>
      <div className="hint" style={{ marginBottom: 8 }}>לחץ על כל התמונות שמראות את אותו מטבח, ואז &quot;שמור&quot;. נבחרו <b className="num">{sel.length}</b>.</div>
      <div className="nq-si-grid nq-si-pick">
        {others.map((x) => (
          <button key={x.id} className="nq-si-thumb" aria-pressed={sel.includes(x.id)} onClick={() => toggle(x.id)}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={thumb(x.current)} alt="" loading="lazy" />
            {sel.includes(x.id) && <span className="nq-si-check">✓</span>}
          </button>
        ))}
      </div>
      <div className="nq-head-acts" style={{ marginTop: 10, justifyContent: "flex-end" }}>
        <button className="nq-btn pri" disabled={busy} onClick={() => onSave(sel)}>{busy ? "שומר…" : "שמור"}</button>
      </div>
    </div>
  );
}

/** While true, the admin does not reload itself into a new site version (see AdminApp). */
export function useHoldUpdates(on: boolean) {
  useEffect(() => {
    if (!on) return;
    const w = window as { nqHold?: number };
    w.nqHold = (w.nqHold || 0) + 1;
    return () => { w.nqHold = Math.max(0, (w.nqHold || 1) - 1); };
  }, [on]);
}
