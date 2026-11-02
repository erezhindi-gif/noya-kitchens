"use client";
// Re-shooting the site's kitchen photos one by one: Erez writes what to change, the model makes a new
// professional shot of the same kitchen, and only a version he approves replaces the photo on the site.
// Photos of the same kitchen are marked as one set, so each new shot keeps the set's accessories and styling.
import { useEffect, useState } from "react";

type Item = { id: string; group: string; original: string; current: string; replaced: boolean; set?: string };
type Shot = { url: string; notes: string };

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

/** Ready-made shot types; the text goes to the model as Erez's notes. */
const SHOT_PRESETS = [
  { label: "זווית רחבה", text: "צילום רחב מהצד הנגדי של החדר, שמראה את כל המטבח בפריים אחד" },
  { label: "חזיתי סימטרי", text: "צילום חזיתי ישר מול הקיר המרכזי, סימטרי, קווים אופקיים ואנכיים ישרים לגמרי" },
  { label: "פינתי 45°", text: "צילום אלכסוני מהפינה בזווית של כ-45 מעלות, שמראה עומק ושני קירות" },
  { label: "תקריב פרטים", text: "צילום תקריב של פרט נגרות מרשים (ידיות, חיבור חזיתות, פינה), עומק שדה רדוד ורקע מטושטש" },
  { label: "גובה עיניים", text: "מצלמה בגובה עיניים של אדם עומד, כמו שלקוח רואה את המטבח כשהוא נכנס" },
  { label: "אור בוקר", text: "אור בוקר טבעי ורך שנכנס מהחלון, צללים עדינים" },
  { label: "קרני שמש", text: "קרני שמש חמות ועדינות נכנסות מהחלון ונופלות על הרצפה והשיש" },
  { label: "ערב חמים", text: "תאורת ערב חמימה: פס לד דולק מתחת לארונות העליונים ותאורת תקרה עמומה, בחוץ חשוך" },
  { label: "מגזין עיצוב", text: "סגנון צילום של מגזין עיצוב פנים יוקרתי: קומפוזיציה נקייה, הרבה אוויר, צבעים מדויקים" },
  { label: "בלי אקססוריז", text: "בלי שום אקססוריז או קישוטים, שיש נקי לגמרי כמו ביום המסירה" },
  { label: "צמחייה", text: "להוסיף רק צמח ירוק אחד או ענף באגרטל, בלי שום פריט אחר" },
];

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
  // the ready-made shot types picked, then what Erez wrote
  const fullNotes = [...SHOT_PRESETS.filter((p) => presets.includes(p.label)).map((p) => p.text), notes.trim()].filter(Boolean).join(". ");
  const [shots, setShots] = useState<Shot[]>([]);
  const [pick, setPick] = useState(-1); // -1 = the original
  const [busy, setBusy] = useState<"" | "make" | "save" | "restore" | "set">("");
  const [err, setErr] = useState("");
  const [confirmRestore, setConfirmRestore] = useState(false);
  const [choosing, setChoosing] = useState(false);
  const mates = item.set ? items.filter((x) => x.set === item.set && x.id !== item.id) : [];

  const make = async () => {
    setBusy("make"); setErr("");
    try {
      // a new version builds on the one on screen, so notes can add things step by step
      const src = await toJpeg(pick >= 0 ? shots[pick].url : item.original);
      // the rest of the kitchen: approved new shots first (they carry the styling), then originals
      const ordered = [...mates.filter((m) => m.replaced), ...mates.filter((m) => !m.replaced)].slice(0, 4);
      const refs = await Promise.all(ordered.map(async (m) => ({ data: (await toJpeg(m.current, 1024, 0.8)).data, kind: m.replaced ? "finished" : "original" })));
      const r = await fetch("/api/admin/photo", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: src.data, w: src.w, h: src.h, refs, opts: { mode: "reshoot", counter: "keep", appliances: [], light: "studio", clean: true, styling: true, notes: fullNotes } }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok || !j.image) setErr(ERR[j.error] || "יצירת התמונה נכשלה. נסה שוב.");
      else { setShots((s) => [...s, { url: j.image, notes: fullNotes }]); setPick(shots.length); }
    } catch { setErr("לא הצלחתי לקרוא את התמונה המקורית."); }
    setBusy("");
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

  useHoldUpdates(shots.length > 0 || busy === "make" || busy === "save");
  const shown = pick >= 0 ? shots[pick]?.url : item.original;
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
          <button className="nq-btn sm" disabled={!!busy} onClick={() => setChoosing(!choosing)}>{choosing ? "סגור" : mates.length ? "שנה" : "בחר תמונות"}</button>
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
