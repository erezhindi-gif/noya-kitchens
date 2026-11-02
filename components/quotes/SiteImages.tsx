"use client";
// Re-shooting the site's kitchen photos one by one: Erez writes what to change, the model makes a new
// professional shot of the same kitchen, and only a version he approves replaces the photo on the site.
import { useEffect, useState } from "react";

type Item = { id: string; group: string; original: string; current: string; replaced: boolean };
type Shot = { url: string; notes: string };

const ERR: Record<string, string> = {
  billing: "נגמר הקרדיט בגוגל. צריך לטעון עוד בעמוד החיוב של Google AI Studio.",
  quota: "גוגל ביקשה לחכות רגע. נסה שוב בעוד דקה.",
  blocked: "המודל סירב לתמונה הזאת. נסה לנסח את ההערה אחרת.",
  "no-image": "המודל לא החזיר תמונה. נסה שוב.",
};

async function toJpeg(src: string) {
  const blob = await (await fetch(src)).blob();
  const img = await createImageBitmap(blob);
  const k = Math.min(1, 2048 / Math.max(img.width, img.height));
  const c = document.createElement("canvas");
  c.width = Math.round(img.width * k);
  c.height = Math.round(img.height * k);
  c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
  return { data: c.toDataURL("image/jpeg", 0.9).split(",")[1], w: c.width, h: c.height };
}

export default function SiteImages({ flash }: { flash: (m: string) => void }) {
  const [items, setItems] = useState<Item[] | null>(null);
  const [open, setOpen] = useState<Item | null>(null);
  const load = () => fetch("/api/admin/site-images", { cache: "no-store" }).then((r) => r.json()).then((j) => setItems(j.items)).catch(() => setItems([]));
  useEffect(() => { load(); }, []);

  if (!items) return <div className="nq-empty">טוען תמונות…</div>;
  if (open) return <Editor item={open} flash={flash} onBack={() => { setOpen(null); load(); }} />;

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
                <button key={it.id} className="nq-si-thumb" onClick={() => setOpen(it)} aria-label={`פתח תמונה${it.replaced ? " (הוחלפה)" : ""}`}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={thumb(it.current)} alt="" loading="lazy" />
                  {it.replaced && <span className="nq-pill nq-st-approved">הוחלפה ✓</span>}
                </button>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}

/** Small preview: Sanity resizes on its CDN; site files go through Next's image optimizer. */
const thumb = (src: string) => (src.startsWith("https://cdn.sanity.io") ? `${src}?w=400&q=70` : `/_next/image?url=${encodeURIComponent(src)}&w=384&q=70`);

function Editor({ item, flash, onBack }: { item: Item; flash: (m: string) => void; onBack: () => void }) {
  const [notes, setNotes] = useState("");
  const [shots, setShots] = useState<Shot[]>([]);
  const [pick, setPick] = useState(-1); // -1 = the original
  const [busy, setBusy] = useState<"" | "make" | "save" | "restore">("");
  const [err, setErr] = useState("");
  const [replaced, setReplaced] = useState(item.replaced);
  const [confirmRestore, setConfirmRestore] = useState(false);

  const make = async () => {
    setBusy("make"); setErr("");
    try {
      // a new version builds on the one on screen, so notes can add things step by step
      const src = await toJpeg(pick >= 0 ? shots[pick].url : item.original);
      const r = await fetch("/api/admin/photo", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: src.data, w: src.w, h: src.h, opts: { mode: "reshoot", counter: "keep", appliances: [], light: "studio", clean: true, styling: true, notes } }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok || !j.image) setErr(ERR[j.error] || "יצירת התמונה נכשלה. נסה שוב.");
      else { setShots((s) => [...s, { url: j.image, notes }]); setPick(shots.length); }
    } catch { setErr("לא הצלחתי לקרוא את התמונה המקורית."); }
    setBusy("");
  };
  const save = async () => {
    const s = shots[pick];
    if (!s) return;
    setBusy("save");
    const ok = await fetch("/api/admin/site-images", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: item.id, image: s.url }) }).then((r) => r.ok).catch(() => false);
    setBusy("");
    if (!ok) return flash("ההחלפה נכשלה. נסה שוב");
    setReplaced(true);
    flash("התמונה הוחלפה באתר ✓ (מופיעה תוך דקה)");
  };
  const restore = async () => {
    setBusy("restore"); setConfirmRestore(false);
    const ok = await fetch(`/api/admin/site-images?id=${encodeURIComponent(item.id)}`, { method: "DELETE" }).then((r) => r.ok).catch(() => false);
    setBusy("");
    if (!ok) return flash("ההחזרה נכשלה. נסה שוב");
    setReplaced(false);
    flash("התמונה המקורית חזרה לאתר");
  };

  const shown = pick >= 0 ? shots[pick]?.url : item.original;
  return (
    <div className="nq-stack">
      <div className="nq-head-acts"><button className="nq-btn sm ghost" onClick={onBack}>→ לכל התמונות</button>{replaced && <span className="nq-pill nq-st-approved">באתר: הגרסה החדשה</span>}</div>
      <section className="nq-card">
        <div className="nq-chips" style={{ marginBottom: 10 }}>
          <button className="nq-chip" aria-pressed={pick === -1} onClick={() => setPick(-1)}>מקור</button>
          {shots.map((s, i) => <button key={i} className="nq-chip" aria-pressed={pick === i} onClick={() => setPick(i)}>גרסה {i + 1}</button>)}
        </div>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="nq-mk-out" src={shown} alt={pick === -1 ? "התמונה המקורית" : `גרסה ${pick + 1}`} />
        {pick >= 0 && shots[pick]?.notes && <div className="hint" style={{ marginTop: 6 }}>הערות לגרסה הזאת: {shots[pick].notes}</div>}
        <div className="hint" style={{ marginTop: 6 }}>לפני שמאשרים: לעבור בין &quot;מקור&quot; לגרסה ולוודא שהארונות, החזיתות והידיות זהים.</div>
      </section>
      <section className="nq-card">
        <label className="f">מה לשנות או להוסיף (לא חובה)
          <textarea className="in" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)}
            placeholder="למשל: לצלם מזווית רחבה יותר מהכניסה, להוסיף אגרטל עם פרחים לבנים על האי, תאורת ערב חמימה" />
        </label>
        {err && <div className="nq-warn-box" role="alert">{err}</div>}
        <div className="nq-head-acts" style={{ marginTop: 12, justifyContent: "flex-end" }}>
          {replaced && (confirmRestore
            ? <><button className="nq-btn danger" disabled={!!busy} onClick={restore}>כן, להחזיר את המקור</button><button className="nq-btn" onClick={() => setConfirmRestore(false)}>ביטול</button></>
            : <button className="nq-btn" disabled={!!busy} onClick={() => setConfirmRestore(true)}>החזר את המקור לאתר</button>)}
          {pick >= 0 && <button className="nq-btn pri" disabled={!!busy} onClick={save}>{busy === "save" ? "מחליף…" : "✓ החלף באתר בגרסה הזאת"}</button>}
          <button className={`nq-btn ${pick >= 0 ? "" : "pri"}`} disabled={!!busy} onClick={make}>{busy === "make" ? "מצלם מחדש… (עד דקה)" : pick >= 0 ? "✨ גרסה חדשה מזו" : "✨ צלם מחדש מהמקור"}</button>
        </div>
      </section>
    </div>
  );
}
