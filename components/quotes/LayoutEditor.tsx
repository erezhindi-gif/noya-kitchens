"use client";
// Editing the kitchen plan of a quote: walls, cabinets with their widths, heights and colors,
// with the 3D view and the to-scale drawing right under it. Claude usually fills this in from
// Erez's hand sketch; here he checks and fixes it.
import { useState } from "react";
import dynamic from "next/dynamic";
import {
  BASE_LABEL, COUNTER_COLORS, DEFAULT_HEIGHTS, FRONT_COLORS, UPPER_LABEL, heightsOf, layoutWarnings, wallName,
  type BaseKind, type BaseUnit, type KitchenLayout, type LayoutHeights, type UpperKind, type UpperUnit,
} from "@/lib/quotes/layout";
import KitchenPlan from "./KitchenPlan";

const Kitchen3D = dynamic(() => import("./Kitchen3D"), { ssr: false, loading: () => <div className="nqp-3d" style={{ height: 380 }} /> });

const STARTER: KitchenLayout = {
  walls: [{
    length: 300,
    base: [{ kind: "drawers", w: 60 }, { kind: "sink", w: 80 }, { kind: "dishwasher", w: 60 }, { kind: "cooktop", w: 60 }, { kind: "doors", w: 40 }],
    upper: [{ kind: "doors", w: 80 }, { kind: "doors", w: 80 }, { kind: "hood", w: 60 }, { kind: "doors", w: 80 }],
  }],
};
const SHAPES = [["קיר אחד", 1], ["ר׳ (L)", 2], ["ח׳ (U)", 3]] as const;
const HEIGHT_LABEL: Record<keyof LayoutHeights, string> = {
  base: "גובה משטח", plinth: "סוקל", counter: "עובי משטח", upperFrom: "תחתית עליונים", upper: "גובה עליונים",
  tall: "ארון גבוה", ceiling: "תקרה", depth: "עומק תחתון", upperDepth: "עומק עליון", topDepth: "עומק שורה עליונה",
};
const sumW = (us: { w: number }[]) => us.reduce((a, u) => a + u.w, 0);
const clone = (l: KitchenLayout): KitchenLayout => JSON.parse(JSON.stringify(l));

type Row<K> = { kind: K; w: number; n?: number; d?: number; h?: number; y?: number };
const optNum = (v: string) => (v === "" ? undefined : Number(v));

/** `box` (upper cabinets only): the row's default depth, height and bottom, shown as placeholders;
 *  each cabinet can override them. */
function UnitRows<K extends string>({ units, labels, onChange, addKind, box }: {
  units: Row<K>[]; labels: Record<K, string>; onChange: (u: Row<K>[]) => void; addKind: K; box?: { d: number; h: number; y: number };
}) {
  const set = (i: number, p: Partial<Row<K>>) => onChange(units.map((u, j) => (j === i ? { ...u, ...p } : u)));
  const move = (i: number, d: number) => {
    const a = [...units];
    [a[i], a[i + d]] = [a[i + d], a[i]];
    onChange(a);
  };
  return (
    <div className="nqp-rows">
      {units.length > 0 && <div className="nqp-row nqp-row-h"><span /><span>סוג</span><span>רוחב</span><span>כמות</span><span /></div>}
      {units.map((u, i) => (
        <div key={i} className="nqp-row">
          <span className="num nqp-i">{i + 1}</span>
          <select className="in" value={u.kind} onChange={(e) => set(i, { kind: e.target.value as K })} aria-label="סוג">
            {(Object.keys(labels) as K[]).map((k) => <option key={k} value={k}>{labels[k]}</option>)}
          </select>
          <input className="in num" type="number" inputMode="decimal" aria-label="רוחב בס״מ" value={u.w || ""} onChange={(e) => set(i, { w: Number(e.target.value) || 0 })} />
          <input className="in num" type="number" inputMode="numeric" aria-label="כמות דלתות או מגירות" placeholder="אוטו׳" value={u.n || ""} onChange={(e) => set(i, { n: Number(e.target.value) || undefined })} />
          <span className="nqp-acts">
            <button type="button" className="nq-btn sm ghost" disabled={i === 0} onClick={() => move(i, -1)} aria-label="הזז שמאלה">‹</button>
            <button type="button" className="nq-btn sm ghost" disabled={i === units.length - 1} onClick={() => move(i, 1)} aria-label="הזז ימינה">›</button>
            <button type="button" className="nq-btn sm ghost" onClick={() => onChange(units.filter((_, j) => j !== i))} aria-label="הסר">×</button>
          </span>
          {box && u.kind !== "gap" && u.kind !== "corner" && (
            <span className="nqp-box">
              <label>עומק<input className="in num" type="number" inputMode="decimal" placeholder={String(box.d)} value={u.d ?? ""} onChange={(e) => set(i, { d: optNum(e.target.value) })} /></label>
              <label>גובה<input className="in num" type="number" inputMode="decimal" placeholder={String(box.h)} value={u.h ?? ""} onChange={(e) => set(i, { h: optNum(e.target.value) })} /></label>
              <label>מגובה<input className="in num" type="number" inputMode="decimal" placeholder={String(box.y)} value={u.y ?? ""} onChange={(e) => set(i, { y: optNum(e.target.value) })} /></label>
            </span>
          )}
        </div>
      ))}
      <button type="button" className="nq-btn sm" onClick={() => onChange([...units, { kind: addKind, w: 60 }])}>+ הוסף</button>
    </div>
  );
}

export const STARTER_LAYOUT = (): KitchenLayout => clone(STARTER);

export default function LayoutEditor({ layout, onChange, claudeHref, removable = true }: { layout?: KitchenLayout; onChange: (l: KitchenLayout | undefined) => void; claudeHref: string; removable?: boolean }) {
  const [tab, setTab] = useState<"3d" | "plan">("3d");
  const [confirmDel, setConfirmDel] = useState(false);
  const [showH, setShowH] = useState(false);

  if (!layout)
    return (
      <section className="nq-card">
        <div className="nq-card-h"><h2>שרטוט ותלת-ממד</h2><span className="hint">בקנה מידה, לפי המידות. נכנס להצעה של הלקוח ול-PDF</span></div>
        <div className="nq-head-acts">
          <a className="nq-btn" href={claudeHref} target="_blank" rel="noopener">✨ שרטוט בקלוד מהסקיצה</a>
          <button type="button" className="nq-btn pri" onClick={() => onChange(clone(STARTER))}>+ תכנון ידני</button>
        </div>
        <div className="hint" style={{ marginTop: 8 }}>מצלמים את השרטוט הידני ושולחים לקלוד. הוא ממלא את המידות כאן, ושואל אם משהו לא ברור.</div>
      </section>
    );

  const up = (fn: (l: KitchenLayout) => void) => {
    const l = clone(layout);
    fn(l);
    onChange(l);
  };
  const h = heightsOf(layout);
  const warns = layoutWarnings(layout);
  const c = layout.colors || {};

  return (
    <section className="nq-card">
      <div className="nq-card-h"><h2>שרטוט ותלת-ממד</h2><span className="hint">מידות בס״מ. ארונות מסודרים משמאל לימין, כשעומדים מול הקיר</span></div>

      <div className="nqp-tabs" role="tablist">
        <button type="button" role="tab" aria-selected={tab === "3d"} className="nq-chip" aria-pressed={tab === "3d"} onClick={() => setTab("3d")}>תלת-ממד</button>
        <button type="button" role="tab" aria-selected={tab === "plan"} className="nq-chip" aria-pressed={tab === "plan"} onClick={() => setTab("plan")}>שרטוט עם מידות</button>
      </div>
      {tab === "3d" ? <Kitchen3D layout={layout} height={380} /> : <KitchenPlan layout={layout} />}
      {warns.length > 0 && <div className="nq-back nq-warn" role="alert" style={{ marginTop: 10 }}><span>⚠️ {warns.join(" · ")}</span></div>}

      <div className="nq-fields" style={{ marginTop: 14 }}>
        <label className="f">צורת המטבח
          <select className="in" value={layout.walls.length} onChange={(e) => up((l) => {
            const n = Number(e.target.value);
            while (l.walls.length < n) l.walls.push({ length: 250, base: [{ kind: "corner", w: h.depth }], upper: [{ kind: "corner", w: h.upperDepth }] });
            l.walls = l.walls.slice(0, n);
          })}>
            {SHAPES.map(([t, n]) => <option key={n} value={n}>{t}</option>)}
          </select>
        </label>
        <label className="f">חזיתות
          <select className="in" value={c.front || "white"} onChange={(e) => up((l) => { l.colors = { ...l.colors, front: e.target.value }; })}>
            {Object.entries(FRONT_COLORS).map(([k, v]) => <option key={k} value={k}>{v.name}</option>)}
            {c.front && !FRONT_COLORS[c.front] && <option value={c.front}>{c.front}</option>}
          </select>
        </label>
        <label className="f">עליונים
          <select className="in" value={c.upper || ""} onChange={(e) => up((l) => { l.colors = { ...l.colors, upper: e.target.value || undefined }; })}>
            <option value="">כמו החזיתות</option>
            {Object.entries(FRONT_COLORS).map(([k, v]) => <option key={k} value={k}>{v.name}</option>)}
            {c.upper && !FRONT_COLORS[c.upper] && <option value={c.upper}>{c.upper}</option>}
          </select>
        </label>
        <label className="f">משטח
          <select className="in" value={c.counter || "white_stone"} onChange={(e) => up((l) => { l.colors = { ...l.colors, counter: e.target.value }; })}>
            {Object.entries(COUNTER_COLORS).map(([k, v]) => <option key={k} value={k}>{v.name}</option>)}
            {c.counter && !COUNTER_COLORS[c.counter] && <option value={c.counter}>{c.counter}</option>}
          </select>
        </label>
        <label className="f nq-check"><input type="checkbox" checked={c.handles !== "none"} onChange={(e) => up((l) => { l.colors = { ...l.colors, handles: e.target.checked ? undefined : "none" }; })} />ידיות</label>
      </div>

      {layout.walls.map((w, i) => (
        <div key={i} className="nqp-wall">
          <div className="nqp-wall-h">
            <b>{wallName(layout, i)}</b>
            <label className="nqp-num">אורך הקיר<input className="in num" type="number" inputMode="decimal" value={w.length || ""} onChange={(e) => up((l) => { l.walls[i].length = Number(e.target.value) || 0; })} /></label>
          </div>
          <div className="nqp-sub">ארונות תחתונים · <span className={sumW(w.base) > w.length ? "bad" : ""}>{sumW(w.base)} מתוך {w.length}</span></div>
          <UnitRows<BaseKind> units={w.base} labels={BASE_LABEL} addKind="doors" onChange={(us) => up((l) => { l.walls[i].base = us as BaseUnit[]; })} />
          <div className="nqp-sub">ארונות עליונים · <span className={sumW(w.upper) > w.length ? "bad" : ""}>{sumW(w.upper)} מתוך {w.length}</span></div>
          <UnitRows<UpperKind> units={w.upper} labels={UPPER_LABEL} addKind="doors" box={{ d: h.upperDepth, h: h.upper, y: h.upperFrom }}
            onChange={(us) => up((l) => { l.walls[i].upper = us as UpperUnit[]; })} />
          {w.top?.length ? (
            <>
              <div className="nqp-sub">שורה עליונה עד התקרה · <span className={sumW(w.top) > w.length ? "bad" : ""}>{sumW(w.top)} מתוך {w.length}</span>
                {" "}<button type="button" className="nq-btn sm ghost" onClick={() => up((l) => { delete l.walls[i].top; })}>הסר שורה</button></div>
              <UnitRows<UpperKind> units={w.top} labels={UPPER_LABEL} addKind="doors" box={{ d: h.topDepth, h: Math.max(5, h.ceiling - h.upperFrom - h.upper), y: h.upperFrom + h.upper }}
                onChange={(us) => up((l) => { l.walls[i].top = us as UpperUnit[]; })} />
            </>
          ) : (
            <button type="button" className="nq-btn sm" style={{ marginTop: 8 }}
              onClick={() => up((l) => { l.walls[i].top = l.walls[i].upper.map((u) => ({ kind: u.kind === "hood" || u.kind === "gap" ? "gap" as const : u.kind === "corner" ? "corner" as const : "doors" as const, w: u.kind === "corner" ? h.topDepth : u.w })); })}>
              + שורה עליונה עד התקרה
            </button>
          )}
        </div>
      ))}

      <div className="nqp-wall">
        <label className="nq-check"><input type="checkbox" checked={!!layout.island} onChange={(e) => up((l) => { l.island = e.target.checked ? { w: 200, d: 90, gap: 110, base: [{ kind: "drawers", w: 60 }, { kind: "doors", w: 80 }, { kind: "drawers", w: 60 }] } : undefined; })} /> <b>אי</b></label>
        {layout.island && (
          <>
            <div className="nqp-wall-h">
              <label className="nqp-num">אורך<input className="in num" type="number" value={layout.island.w || ""} onChange={(e) => up((l) => { l.island!.w = Number(e.target.value) || 0; })} /></label>
              <label className="nqp-num">עומק<input className="in num" type="number" value={layout.island.d || ""} onChange={(e) => up((l) => { l.island!.d = Number(e.target.value) || 0; })} /></label>
              <label className="nqp-num">מעבר עד הארונות<input className="in num" type="number" value={layout.island.gap || ""} onChange={(e) => up((l) => { l.island!.gap = Number(e.target.value) || 0; })} /></label>
            </div>
            <UnitRows<BaseKind> units={layout.island.base} labels={BASE_LABEL} addKind="doors" onChange={(us) => up((l) => { l.island!.base = us as BaseUnit[]; })} />
          </>
        )}
      </div>

      <button type="button" className="nq-btn sm ghost" onClick={() => setShowH(!showH)}>{showH ? "▾" : "◂"} גבהים ועומקים</button>
      {showH && (
        <div className="nq-fields" style={{ marginTop: 8 }}>
          {(Object.keys(DEFAULT_HEIGHTS) as (keyof LayoutHeights)[]).map((k) => (
            <label key={k} className="f">{HEIGHT_LABEL[k]}
              <input className="in num" type="number" value={h[k]} onChange={(e) => up((l) => { l.h = { ...l.h, [k]: Number(e.target.value) || 0 }; })} />
            </label>
          ))}
        </div>
      )}

      <div className="nq-head-acts" style={{ marginTop: 12 }}>
        <a className="nq-btn sm" href={claudeHref} target="_blank" rel="noopener">✨ תיקון בקלוד</a>
        {!removable ? null : confirmDel ? (
          <><button type="button" className="nq-btn sm danger" onClick={() => { onChange(undefined); setConfirmDel(false); }}>כן, להסיר את התכנון</button>
            <button type="button" className="nq-btn sm" onClick={() => setConfirmDel(false)}>ביטול</button></>
        ) : <button type="button" className="nq-btn sm ghost" onClick={() => setConfirmDel(true)}>הסר תכנון</button>}
      </div>
    </section>
  );
}
