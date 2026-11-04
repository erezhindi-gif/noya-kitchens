"use client";
// Editing the kitchen plan of a quote: walls, cabinets with their widths, heights and colors,
// with the 3D view and the to-scale drawing right under it. Claude usually fills this in from
// Erez's hand sketch; here he checks and fixes it.
import { useRef, useState, type MutableRefObject, type ReactNode } from "react";
import dynamic from "next/dynamic";
import {
  BASE_LABEL, COUNTER_COLORS, DEFAULT_HEIGHTS, PART_LABEL, UPPER_LABEL, columnParts, endWallLen, heightsOf, layoutWarnings, leftGap, paintFront, partsOf, setLeftGap, wallName,
  type BaseKind, type BaseUnit, type ColumnPart, type KitchenLayout, type LayoutHeights, type UpperKind, type UpperUnit,
} from "@/lib/quotes/layout";
import KitchenPlan from "./KitchenPlan";
import { BluranSheet, SwatchButton, swatchStyle } from "./BluranPicker";
import { bluranOf } from "@/lib/quotes/bluran";
import { FRONT_COLORS } from "@/lib/quotes/layout";

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
  tall: "ארון גבוה", ceiling: "תקרה", depth: "עומק תחתון", upperDepth: "עומק עליון", topDepth: "עומק שורה עליונה", floorGap: "ניתוק מהרצפה",
};
const sumW = (us: { w: number }[]) => us.reduce((a, u) => a + u.w, 0);
const clone = (l: KitchenLayout): KitchenLayout => JSON.parse(JSON.stringify(l));

type Row<K> = { kind: K; w: number; n?: number; d?: number; h?: number; y?: number; color?: string; fronts?: string[]; recess?: number; frame?: number; splits?: number[]; parts?: ColumnPart[] };

/** What a cabinet's color can be set for: the whole cabinet, then each of its fronts (doors left to right,
 *  drawers top to bottom). Units without fronts of their own get none; a fridge only its own color. */
function frontScopes(kind: string, w: number, n: number | undefined, upper: boolean, u?: Row<string>): string[] {
  if (kind === "panel") return ["כל החיפוי", ...(u?.splits || []).map((s, i) => `חלק ${i + 1} מלמטה (${s})`)];
  if (kind === "column") return ["כל העמודה", ...columnParts({ kind: "column", w, parts: u?.parts }, DEFAULT_HEIGHTS).flatMap((p) => Array.from({ length: p.count }, (_, k) => `${PART_LABEL[p.kind]} ${p.h}${p.count > 1 ? ` · ${k + 1}` : ""}`))];
  if (["gap", "open", "hood"].includes(kind)) return [];
  if (kind === "fridge" || kind === "corner") return ["כל הארון"];
  const parts = kind === "dishwasher" || kind === "oven" ? 1 : partsOf(kind as never, w, n, upper);
  const stack = ["drawers", "cooktop", "tall", "tall_oven", "lift"].includes(kind);
  const word = kind === "lift" ? "קלפה" : stack && kind !== "tall" ? "מגירה" : "דלת";
  const own = ["כל הארון", ...Array.from({ length: parts }, (_, i) => `${word} ${i + 1}${stack && parts > 1 ? (i === 0 ? " (עליונה)" : i === parts - 1 ? " (תחתונה)" : "") : ""}`)];
  return kind === "tall_oven" ? [...own, "דלת מיקרו", "דלת עליונה"] : own;
}
const optNum = (v: string) => (v === "" ? undefined : Number(v));

/** `box` (upper cabinets only): the row's default depth, height and bottom, shown as placeholders;
 *  each cabinet can override them. */
function UnitRows<K extends string>({ units, labels, onChange, addKind, box }: {
  units: Row<K>[]; labels: Record<K, string>; onChange: (u: Row<K>[]) => void; addKind: K; box?: { d: number; h: number; y: number };
}) {
  const [paint, setPaint] = useState<number | null>(null);
  const set = (i: number, p: Partial<Row<K>>) => onChange(units.map((u, j) => (j === i ? { ...u, ...p } : u)));
  /** scope 0 = the whole cabinet, 1.. = one front */
  const pick = (i: number, v: string | undefined, scope: number) => {
    const u = units[i];
    if (!scope) return set(i, { color: v });
    const fronts = [...(u.fronts || [])];
    fronts[scope - 1] = v || "";
    while (fronts.length && !fronts[fronts.length - 1]) fronts.pop();
    set(i, { fronts: fronts.length ? fronts : undefined });
  };
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
          <input className="in num" type="number" inputMode="numeric" aria-label="כמות דלתות או מגירות" placeholder="אוטו׳" value={u.kind === "open" ? u.n ?? "" : u.n || ""} onChange={(e) => set(i, { n: e.target.value === "" ? undefined : u.kind === "open" ? Number(e.target.value) : Number(e.target.value) || undefined })} />
          <span className="nqp-acts">
            {frontScopes(u.kind, u.w, u.n, !!box, u).length > 0 && (
              <SwatchButton value={u.color || u.fronts?.find(Boolean)} empty={!u.color && !u.fronts?.some(Boolean)} label="צבע הארון והדלתות" onClick={() => setPaint(i)} />
            )}
            <button type="button" className="nq-btn sm ghost" disabled={i === 0} onClick={() => move(i, -1)} aria-label="הזז שמאלה">‹</button>
            <button type="button" className="nq-btn sm ghost" disabled={i === units.length - 1} onClick={() => move(i, 1)} aria-label="הזז ימינה">›</button>
            <button type="button" className="nq-btn sm ghost" onClick={() => onChange(units.filter((_, j) => j !== i))} aria-label="הסר">×</button>
          </span>
          {!box && (u.kind === "panel" || u.kind === "column" || u.y !== undefined || u.h !== undefined || u.d !== undefined) && (
            <span className="nqp-box">
              <label>עומק<input className="in num" type="number" inputMode="decimal" value={u.d ?? ""} onChange={(e) => set(i, { d: optNum(e.target.value) })} /></label>
              {u.kind !== "column" && <label>גובה<input className="in num" type="number" inputMode="decimal" value={u.h ?? ""} onChange={(e) => set(i, { h: optNum(e.target.value) })} /></label>}
              <label>מגובה<input className="in num" type="number" inputMode="decimal" value={u.y ?? ""} onChange={(e) => set(i, { y: optNum(e.target.value) })} /></label>
              {u.kind === "panel" && <label>חלוקה מלמטה<input className="in num" dir="ltr" placeholder="70, 95, 89" defaultValue={(u.splits || []).join(", ")} onBlur={(e) => {
                const splits = e.target.value.split(/[,\s]+/).map(Number).filter((v) => v > 0);
                set(i, { splits: splits.length ? splits : undefined });
              }} /></label>}
            </span>
          )}
          {u.kind === "column" && (
            <span className="nqp-parts">
              {(u.parts || []).map((p, k) => {
                const setPart = (patch: Partial<ColumnPart>) => set(i, { parts: (u.parts || []).map((x, j) => (j === k ? { ...x, ...patch } : x)) });
                return (
                  <span key={k} className="nqp-part">
                    <select className="in" value={p.kind} aria-label="סוג החלק" onChange={(e) => setPart({ kind: e.target.value as ColumnPart["kind"] })}>
                      {(Object.keys(PART_LABEL) as ColumnPart["kind"][]).map((x) => <option key={x} value={x}>{PART_LABEL[x]}</option>)}
                    </select>
                    <label>גובה<input className="in num" type="number" inputMode="decimal" value={p.h || ""} onChange={(e) => setPart({ h: Number(e.target.value) || 0 })} /></label>
                    <label>כמות<input className="in num" type="number" inputMode="numeric" placeholder="אוטו׳" value={p.n ?? ""} onChange={(e) => setPart({ n: optNum(e.target.value) })} /></label>
                    {p.kind === "niche" && <label>עומק פנימי<input className="in num" type="number" inputMode="decimal" placeholder="10" value={p.recess ?? ""} onChange={(e) => setPart({ recess: optNum(e.target.value) })} /></label>}
                    {p.kind === "niche" && <label>מסגרת<input className="in num" type="number" inputMode="decimal" placeholder="2" value={p.frame ?? ""} onChange={(e) => setPart({ frame: optNum(e.target.value) })} /></label>}
                    <button type="button" className="nq-btn sm ghost" aria-label="הסר חלק" onClick={() => set(i, { parts: (u.parts || []).filter((_, j) => j !== k) })}>×</button>
                  </span>
                );
              })}
              <button type="button" className="nq-btn sm" onClick={() => set(i, { parts: [...(u.parts || []), { kind: "doors", h: 70 }] })}>+ חלק למעלה</button>
            </span>
          )}
          {box && u.kind === "open" && (
            <span className="nqp-box">
              <label>עומק פנימי<input className="in num" type="number" inputMode="decimal" value={u.recess ?? ""} onChange={(e) => set(i, { recess: optNum(e.target.value) })} /></label>
              <label>מסגרת<input className="in num" type="number" inputMode="decimal" value={u.frame ?? ""} onChange={(e) => set(i, { frame: optNum(e.target.value) })} /></label>
            </span>
          )}
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
      {paint !== null && units[paint] && (
        <BluranSheet
          title={`צבע: ${labels[units[paint].kind]} ${units[paint].w}`}
          scopes={frontScopes(units[paint].kind, units[paint].w, units[paint].n, !!box, units[paint])}
          value={(scope) => (scope ? units[paint].fronts?.[scope - 1] || undefined : units[paint].color)}
          emptyLabel="כמו כל המטבח"
          onPick={(v, scope) => pick(paint, v, scope)}
          onClose={() => setPaint(null)}
        />
      )}
    </div>
  );
}

export const STARTER_LAYOUT = (): KitchenLayout => clone(STARTER);

/** "שנהב ZA02SM" for a Bluran shade, the old color names as they were */
function colorLabel(v: string | undefined, empty: string) {
  if (!v) return empty;
  const bl = bluranOf(v);
  return bl ? `${bl.name} ${bl.code} · ${bl.group}` : FRONT_COLORS[v]?.name || v;
}

/** shotRef and viewTools: the picture from the angle on screen, and what is done with it (only under the 3D view) */
export default function LayoutEditor({ layout, onChange, claudeHref, shotRef, viewTools }: {
  layout: KitchenLayout; onChange: (l: KitchenLayout) => void; claudeHref: string; shotRef?: MutableRefObject<(() => string) | null>; viewTools?: ReactNode;
}) {
  const [tab, setTab] = useState<"3d" | "plan">("3d");
  const [showH, setShowH] = useState(false);
  // The brush: pick a Bluran shade once, then every front touched in the 3D view or the drawing takes it.
  const [brush, setBrush] = useState<{ v?: string } | null>(null);
  const [pickBrush, setPickBrush] = useState(false);
  const latest = useRef(layout);
  latest.current = layout;
  const undo = useRef<KitchenLayout[]>([]);
  const [undoCount, setUndoCount] = useState(0);
  const paintOn = (ref: string) => {
    if (!brush) return;
    const l = clone(latest.current);
    paintFront(l, ref, brush.v);
    if (JSON.stringify(l) === JSON.stringify(latest.current)) return;
    undo.current = [...undo.current.slice(-49), latest.current];
    setUndoCount(undo.current.length);
    latest.current = l;
    onChange(l);
  };
  const undoPaint = () => {
    const prev = undo.current[undo.current.length - 1];
    if (!prev) return;
    undo.current = undo.current.slice(0, -1);
    setUndoCount(undo.current.length);
    latest.current = prev;
    onChange(prev);
  };
  const drawingPaint = (e: React.PointerEvent) => {
    if (!brush || (e.type === "pointerover" && !(e.buttons & 1))) return;
    const ref = (e.target as Element).closest?.("[data-front]")?.getAttribute("data-front");
    if (ref) paintOn(ref);
  };

  const up = (fn: (l: KitchenLayout) => void) => {
    const l = clone(layout);
    fn(l);
    onChange(l);
  };
  const h = heightsOf(layout);
  const warns = layoutWarnings(layout);
  const c = layout.colors || {};
  const [paintAll, setPaintAll] = useState<"front" | "upper" | null>(null);

  return (
    <section className="nq-card">
      <div className="nq-card-h"><h2>שרטוט ותלת-ממד</h2><span className="hint">מידות בס״מ. ארונות מסודרים משמאל לימין, כשעומדים מול הקיר</span></div>

      <div className="nqp-tabs" role="tablist">
        <button type="button" role="tab" aria-selected={tab === "3d"} className="nq-chip" aria-pressed={tab === "3d"} onClick={() => setTab("3d")}>תלת-ממד</button>
        <button type="button" role="tab" aria-selected={tab === "plan"} className="nq-chip" aria-pressed={tab === "plan"} onClick={() => setTab("plan")}>שרטוט עם מידות</button>
      </div>
      {brush ? (
        <div className="nqp-brush" role="status">
          <span className="nqb-dot lg" style={brush.v ? swatchStyle(brush.v) : undefined} />
          <span className="nqp-brush-t"><b>{brush.v ? colorLabel(brush.v, "") : "מחיקת צבע: החזית חוזרת לצבע המטבח"}</b><span className="hint">לחץ על חזית והיא נצבעת. אפשר גם לגרור על כמה חזיתות</span></span>
          <button type="button" className="nq-btn sm" onClick={() => setPickBrush(true)}>צבע אחר</button>
          <button type="button" className="nq-btn sm" onClick={() => setBrush({})}>מחק צבע</button>
          <button type="button" className="nq-btn sm" disabled={!undoCount} onClick={undoPaint}>↶ בטל</button>
          <button type="button" className="nq-btn sm pri" onClick={() => setBrush(null)}>סיום</button>
        </div>
      ) : (
        <button type="button" className="nq-btn sm nqp-brush-on" onClick={() => setPickBrush(true)}>🖌️ צביעת חזיתות</button>
      )}
      {pickBrush && (
        <BluranSheet
          title="בחר צבע, ואז לחץ על החזיתות"
          value={() => brush?.v}
          emptyLabel="עוד לא נבחר צבע"
          onPick={(v) => { if (v) { setBrush({ v }); setPickBrush(false); } }}
          onClose={() => setPickBrush(false)}
        />
      )}
      {tab === "3d"
        ? <><Kitchen3D layout={layout} height={460} shotRef={shotRef} paint={brush ? paintOn : undefined} />{viewTools}</>
        : <div className={brush ? "nqp-paint" : undefined} onPointerDown={drawingPaint} onPointerOver={drawingPaint}><KitchenPlan layout={layout} /></div>}
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
        <label className="f">תיחום הקירות
          <select className="in" value={`${layout.ends?.left ? 1 : 0}${layout.ends?.right ? 1 : 0}`} onChange={(e) => up((l) => {
            const a = e.target.value[0], b = e.target.value[1];
            l.ends = { ...(a === "1" ? { left: "wall" as const, leftLen: l.ends?.leftLen } : {}), ...(b === "1" ? { right: "wall" as const, rightLen: l.ends?.rightLen } : {}) };
          })}>
            <option value="11">בין שני קירות</option>
            <option value="10">קיר משמאל, פתוח מימין</option>
            <option value="01">פתוח משמאל, קיר מימין</option>
            <option value="00">פתוח משני הצדדים</option>
          </select>
        </label>
        {layout.ends?.left && (
          <label className="f">אורך הקיר משמאל<input className="in num" type="number" inputMode="decimal" value={endWallLen(layout, "left")} onChange={(e) => up((l) => { l.ends = { ...l.ends, leftLen: Number(e.target.value) || undefined }; })} /></label>
        )}
        {layout.ends?.right && (
          <label className="f">אורך הקיר מימין<input className="in num" type="number" inputMode="decimal" value={endWallLen(layout, "right")} onChange={(e) => up((l) => { l.ends = { ...l.ends, rightLen: Number(e.target.value) || undefined }; })} /></label>
        )}
        <div className="f">חזיתות (בלורן)
          <button type="button" className="in nqb-field" onClick={() => setPaintAll("front")}><span className="nqb-dot" style={swatchStyle(c.front)} />{colorLabel(c.front, "לבן")}</button>
        </div>
        <div className="f">עליונים (בלורן)
          <button type="button" className="in nqb-field" onClick={() => setPaintAll("upper")}><span className="nqb-dot" style={swatchStyle(c.upper || c.front)} />{c.upper ? colorLabel(c.upper, "") : "כמו החזיתות"}</button>
        </div>
        <label className="f">משטח
          <select className="in" value={c.counter || "white_stone"} onChange={(e) => up((l) => { l.colors = { ...l.colors, counter: e.target.value }; })}>
            {Object.entries(COUNTER_COLORS).map(([k, v]) => <option key={k} value={k}>{v.name}</option>)}
            {c.counter && !COUNTER_COLORS[c.counter] && <option value={c.counter}>{c.counter}</option>}
          </select>
        </label>
        <label className="f">ידיות
          <select className="in" value={c.handles || "bar"} onChange={(e) => up((l) => { const v = e.target.value; l.colors = { ...l.colors, handles: v === "bar" ? undefined : (v as "integral" | "none") }; })}>
            <option value="bar">ידית חיצונית</option>
            <option value="integral">ידית אינטגרלית (חריץ בחזית)</option>
            <option value="none">בלי ידיות (פתיחה בלחיצה)</option>
          </select>
        </label>
      </div>
      {paintAll && (
        <BluranSheet
          title={paintAll === "front" ? "צבע החזיתות של כל המטבח" : "צבע הארונות העליונים"}
          value={() => c[paintAll]}
          emptyLabel={paintAll === "front" ? "לבן רגיל" : "כמו החזיתות"}
          onPick={(v) => up((l) => { l.colors = { ...l.colors, [paintAll]: v }; })}
          onClose={() => setPaintAll(null)}
        />
      )}

      {layout.walls.map((w, i) => (
        <div key={i} className="nqp-wall">
          <div className="nqp-wall-h">
            <b>{wallName(layout, i)}</b>
            <label className="nqp-num">אורך הקיר<input className="in num" type="number" inputMode="decimal" value={w.length || ""} onChange={(e) => up((l) => { l.walls[i].length = Number(e.target.value) || 0; })} /></label>
            {w.base[0]?.kind !== "corner" && (
              <label className="nqp-num">רווח משמאל לארון<input className="in num" type="number" inputMode="decimal" placeholder="0" value={leftGap(w) || ""} onChange={(e) => up((l) => setLeftGap(l.walls[i], Math.max(0, Number(e.target.value) || 0)))} /></label>
            )}
            {w.base[w.base.length - 1]?.kind !== "corner" && (
              <label className="nqp-num">רווח מימין לארון<input className="in num" type="number" inputMode="decimal" placeholder="0" value={Math.max(0, Math.round((w.length - sumW(w.base)) * 10) / 10) || ""} onChange={(e) => up((l) => { l.walls[i].length = sumW(l.walls[i].base) + Math.max(0, Number(e.target.value) || 0); })} /></label>
            )}
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
      </div>
    </section>
  );
}
