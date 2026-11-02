"use client";
// Catalog photos from site photos: the cabinetry stays exactly as built; the model adds the countertop and
// appliances, clears the mess and relights it like a studio shot. Erez checks the result before posting it.
import { useState } from "react";
import { COUNTERS, APPLIANCES, LIGHTS, type PhotoOpts } from "@/lib/marketing/photo-prompt";
import { useHoldUpdates } from "./SiteImages";

async function toJpeg(file: File, maxSide = 2048): Promise<{ data: string; w: number; h: number; url: string }> {
  const img = await createImageBitmap(file);
  const k = Math.min(1, maxSide / Math.max(img.width, img.height));
  const c = document.createElement("canvas");
  c.width = Math.round(img.width * k);
  c.height = Math.round(img.height * k);
  c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
  const url = c.toDataURL("image/jpeg", 0.88);
  return { data: url.split(",")[1], w: c.width, h: c.height, url };
}

const ERR: Record<string, string> = {
  "no-key": "צריך קודם לשמור מפתח של Gemini.",
  "bad-key": "גוגל לא קיבלה את המפתח. בדוק שהעתקת אותו במלואו.",
  billing: "החשבון בגוגל עוד לא מאפשר יצירת תמונות. צריך להפעיל חיוב (Billing) בפרויקט של המפתח.",
  quota: "עברת את המכסה של גוגל לרגע. נסה שוב בעוד דקה.",
  blocked: "המודל סירב לתמונה הזאת. נסה תמונה אחרת או נסח את ההערה אחרת.",
  "no-image": "המודל לא החזיר תמונה. נסה שוב.",
  failed: "יצירת התמונה נכשלה. נסה שוב.",
};

export default function PhotoStudio({ hasKey, onKeySaved, flash }: { hasKey: boolean; onKeySaved: () => void; flash: (m: string) => void }) {
  const [src, setSrc] = useState<{ data: string; w: number; h: number; url: string } | null>(null);
  const [opts, setOpts] = useState<PhotoOpts>({ counter: "calacatta", appliances: ["sink", "cooktop", "oven", "hood"], light: "studio", clean: true, styling: true, notes: "" });
  const [busy, setBusy] = useState(false);
  const [out, setOut] = useState<string | null>(null);
  const [show, setShow] = useState<"after" | "before">("after");
  const [error, setError] = useState("");

  useHoldUpdates(!!out || busy);
  if (!hasKey) return <KeyCard onSaved={onKeySaved} flash={flash} />;

  const pick = async (f?: File) => {
    if (!f) return;
    setError(""); setOut(null);
    try { setSrc(await toJpeg(f)); } catch { setError("לא הצלחתי לקרוא את התמונה. נסה צילום JPEG או PNG."); }
  };
  const run = async () => {
    if (!src) return;
    setBusy(true); setError(""); setOut(null);
    const r = await fetch("/api/admin/photo", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ image: src.data, w: src.w, h: src.h, opts }),
    }).then(async (x) => ({ ok: x.ok, j: await x.json().catch(() => ({})) })).catch(() => ({ ok: false, j: { error: "failed" } }));
    setBusy(false);
    if (!r.ok || !r.j.image) return setError(ERR[r.j.error] || ERR.failed);
    setOut(r.j.image);
    setShow("after");
  };
  const toggle = (k: string) => setOpts((o) => ({ ...o, appliances: o.appliances.includes(k) ? o.appliances.filter((x) => x !== k) : [...o.appliances, k] }));
  const name = `noya-catalog-${new Date().toISOString().slice(0, 10)}.jpg`;
  const share = async () => {
    if (!out) return;
    try {
      const blob = await (await fetch(out)).blob();
      const file = new File([blob], name, { type: "image/jpeg" });
      if (navigator.canShare?.({ files: [file] })) await navigator.share({ files: [file] });
      else flash("השיתוף לא נתמך כאן. השתמש בהורדה");
    } catch {}
  };

  return (
    <div className="nq-stack">
      <section className="nq-card">
        <div className="nq-card-h"><h2>תמונה מההתקנה</h2><span className="hint">הנגרות נשארת כמו שהיא: רק שיש, מוצרי חשמל, ניקיון ותאורה</span></div>
        <label className="nq-mk-drop">
          {src ? <img src={src.url} alt="התמונה שהועלתה" /> : <span>📷 בחר או צלם תמונה של המטבח</span>}
          <input type="file" accept="image/*" hidden onChange={(e) => { pick(e.target.files?.[0]); e.target.value = ""; }} />
        </label>
      </section>

      <section className="nq-card">
        <div className="nq-card-h"><h2>מה להוסיף</h2></div>
        <div className="nq-fields">
          <label className="f">שיש
            <select className="in" value={opts.counter} onChange={(e) => setOpts({ ...opts, counter: e.target.value })}>
              {Object.entries(COUNTERS).map(([k, v]) => <option key={k} value={k}>{v.he}</option>)}
            </select>
          </label>
          <label className="f">תאורה
            <select className="in" value={opts.light} onChange={(e) => setOpts({ ...opts, light: e.target.value })}>
              {Object.entries(LIGHTS).map(([k, v]) => <option key={k} value={k}>{v.he}</option>)}
            </select>
          </label>
        </div>
        <div className="nq-mk-checks" role="group" aria-label="מוצרי חשמל וכלים">
          {Object.entries(APPLIANCES).map(([k, v]) => (
            <label key={k} className="nq-chip" aria-pressed={opts.appliances.includes(k)}>
              <input type="checkbox" checked={opts.appliances.includes(k)} onChange={() => toggle(k)} /> {v.he}
            </label>
          ))}
        </div>
        <div className="nq-mk-checks">
          <label className="nq-chip" aria-pressed={opts.clean}><input type="checkbox" checked={opts.clean} onChange={(e) => setOpts({ ...opts, clean: e.target.checked })} /> לנקות כלים, אבק וניילונים</label>
          <label className="nq-chip" aria-pressed={opts.styling}><input type="checkbox" checked={opts.styling} onChange={(e) => setOpts({ ...opts, styling: e.target.checked })} /> עיצוב עדין (קערה, צמח)</label>
        </div>
        <label className="f" style={{ marginTop: 10 }}>הערה למודל (לא חובה)
          <input className="in" value={opts.notes} placeholder="למשל: כיור מתחת לחלון, כיריים באי" onChange={(e) => setOpts({ ...opts, notes: e.target.value })} />
        </label>
        <div className="nq-head-acts" style={{ justifyContent: "flex-end", marginTop: 12 }}>
          <button className="nq-btn pri" disabled={!src || busy} onClick={run}>{busy ? "יוצר תמונה… (עד דקה)" : out ? "צור שוב" : "✨ צור תמונת קטלוג"}</button>
        </div>
        {error && <div className="nq-warn-box" role="alert">{error}</div>}
      </section>

      {out && src && (
        <section className="nq-card">
          <div className="nq-card-h">
            <h2>התוצאה</h2>
            <div className="nq-chips" style={{ margin: 0 }}>
              <button className="nq-chip" aria-pressed={show === "after"} onClick={() => setShow("after")}>אחרי</button>
              <button className="nq-chip" aria-pressed={show === "before"} onClick={() => setShow("before")}>לפני</button>
            </div>
          </div>
          <img className="nq-mk-out" src={show === "after" ? out : src.url} alt={show === "after" ? "תמונת קטלוג" : "התמונה המקורית"} />
          <div className="hint" style={{ marginTop: 8 }}>לפני שמפרסמים: לעבור בין לפני ואחרי ולוודא שהארונות, הדלתות והידיות לא השתנו.</div>
          <div className="nq-head-acts" style={{ marginTop: 12 }}>
            <a className="nq-btn pri" href={out} download={name}>⬇ הורדה</a>
            <button className="nq-btn" onClick={share}>שיתוף</button>
          </div>
        </section>
      )}
    </div>
  );
}

function KeyCard({ onSaved, flash }: { onSaved: () => void; flash: (m: string) => void }) {
  const [key, setKey] = useState("");
  const [busy, setBusy] = useState(false);
  const save = async () => {
    setBusy(true);
    const r = await fetch("/api/admin/mail", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ geminiKey: key.trim() }) }).catch(() => null);
    setBusy(false);
    if (r?.ok) { flash("המפתח נשמר ✓"); onSaved(); } else flash("גוגל לא קיבלה את המפתח. בדוק שהעתקת אותו במלואו");
  };
  return (
    <section className="nq-card">
      <div className="nq-card-h"><h2>חיבור למודל התמונות של גוגל</h2></div>
      <ol style={{ margin: "0 0 12px", paddingInlineStart: 20, lineHeight: 1.8 }}>
        <li>פותחים את <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener">דף המפתחות של גוגל</a> (עם חשבון הגוגל שלך).</li>
        <li>לוחצים על הכפתור <span className="ltr">Create API key</span>, ומעתיקים את המפתח.</li>
        <li>מדביקים אותו כאן ולוחצים &quot;שמור&quot;.</li>
      </ol>
      <p className="hint" style={{ margin: "0 0 10px" }}>כל תמונה עולה בערך 15-50 אגורות, בחיוב של גוגל.</p>
      <div className="nq-head-acts">
        <input className="in ltr" style={{ flex: 1, minWidth: 220, textAlign: "left" }} value={key} onChange={(e) => setKey(e.target.value)} placeholder="מדביקים כאן את המפתח" aria-label="מפתח Gemini" autoComplete="off" />
        <button className="nq-btn pri" disabled={busy || key.trim().length < 30} onClick={save}>{busy ? "בודק…" : "שמור"}</button>
      </div>
    </section>
  );
}
