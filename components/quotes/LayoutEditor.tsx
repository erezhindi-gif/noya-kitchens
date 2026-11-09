"use client";
// Editing the kitchen plan of a quote: walls, cabinets with their widths, heights and colors,
// with the 3D view and the to-scale drawing right under it. Claude usually fills this in from
// Erez's hand sketch; here he checks and fixes it.
import { useRef, useState, type MutableRefObject, type ReactNode } from "react";
import dynamic from "next/dynamic";
import {
  BASE_LABEL, CORNER_LABEL, COUNTER_COLORS, HANDLE_FINISH, SIZE_PRESETS, applianceText, DEFAULT_HEIGHTS, OBSTACLE_LABEL, OPENING_LABEL, POINT_LABEL, PART_LABEL, hasCounter, UPPER_LABEL, columnParts, endWallLen, heightsOf, layoutWarnings, leftGap, paintFront, partsOf, setLeftGap, wallName,
  type BaseKind, type BaseUnit, type ColumnPart, type UnitExtras, type KitchenLayout, type LayoutWall, type Obstacle, type Opening, type RoomPoint, type LayoutHeights, type UpperKind, type UpperUnit,
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

type Row<K> = UnitExtras & { kind: K; w: number; n?: number; d?: number; h?: number; y?: number; color?: string; fronts?: string[]; recess?: number; frame?: number; tv?: boolean; tvGap?: number; splits?: number[]; parts?: ColumnPart[] };

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
  const [more, setMore] = useState<number | null>(null);
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
            {!["gap", "shelf", "panel", "fridge", "oven", "dishwasher", "hood"].includes(u.kind) && <button type="button" className="nq-btn sm ghost" aria-label="עוד אפשרויות לארון" aria-expanded={more === i} onClick={() => setMore(more === i ? null : i)}>⋯</button>}
            <button type="button" className="nq-btn sm ghost" disabled={i === 0} onClick={() => move(i, -1)} aria-label="הזז שמאלה">‹</button>
            <button type="button" className="nq-btn sm ghost" disabled={i === units.length - 1} onClick={() => move(i, 1)} aria-label="הזז ימינה">›</button>
            <button type="button" className="nq-btn sm ghost" onClick={() => onChange(units.filter((_, j) => j !== i))} aria-label="הסר">×</button>
          </span>
          {!!SIZE_PRESETS[u.kind as BaseKind]?.length && (
            <span className="nqp-box nqp-more">
              {!!SIZE_PRESETS[u.kind as BaseKind]?.length && (
                <label>רוחב רגיל
                  <select className="in" style={{ width: "auto" }} value={SIZE_PRESETS[u.kind as BaseKind]!.includes(u.w) ? u.w : ""} onChange={(e) => e.target.value && set(i, { w: Number(e.target.value) })}>
                    <option value="">אחר</option>
                    {SIZE_PRESETS[u.kind as BaseKind]!.map((v) => <option key={v} value={v}>{v}</option>)}
                  </select>
                </label>
              )}
              {u.kind === "fridge" && (
                <label>סוג
                  <select className="in" style={{ width: "auto" }} value={u.fridgeType || "standing"} onChange={(e) => set(i, { fridgeType: e.target.value === "built" ? "built" : undefined })}>
                    <option value="standing">עומד</option>
                    <option value="built">אינטגרלי מאחורי חזיתות</option>
                  </select>
                </label>
              )}
              {u.kind === "cooktop" && (
                <>
                  <label>כיריים
                    <select className="in" style={{ width: "auto" }} value={u.hob || "induction"} onChange={(e) => set(i, { hob: e.target.value === "gas" ? "gas" : undefined })}>
                      <option value="induction">אינדוקציה</option>
                      <option value="gas">גז</option>
                    </select>
                  </label>
                  <label>רוחב כיריים<input className="in num" type="number" inputMode="decimal" placeholder="60" value={u.hobW ?? ""} onChange={(e) => set(i, { hobW: optNum(e.target.value) })} /></label>
                </>
              )}
              {u.kind === "hood" && (
                <label>קולט
                  <select className="in" style={{ width: "auto" }} value={u.hoodType || "chimney"} onChange={(e) => set(i, { hoodType: e.target.value === "flat" ? "flat" : undefined })}>
                    <option value="chimney">עם ארובה</option>
                    <option value="flat">שטוח</option>
                  </select>
                </label>
              )}
              {u.kind === "sink" && (
                <>
                  <label>התקנה
                    <select className="in" style={{ width: "auto" }} value={u.sink?.mount || "under"} onChange={(e) => set(i, { sink: { ...u.sink, mount: e.target.value === "top" ? "top" : undefined } })}>
                      <option value="under">מתחת למשטח</option>
                      <option value="top">על המשטח</option>
                    </select>
                  </label>
                  <label>קערות
                    <select className="in" style={{ width: "auto" }} value={u.sink?.bowls || 1} onChange={(e) => set(i, { sink: { ...u.sink, bowls: e.target.value === "2" ? 2 : undefined } })}>
                      <option value={1}>בודד</option>
                      <option value={2}>כפול</option>
                    </select>
                  </label>
                  <label>צבע כיור
                    <select className="in" style={{ width: "auto" }} value={u.sink?.color || "steel"} onChange={(e) => set(i, { sink: { ...u.sink, color: e.target.value === "steel" ? undefined : (e.target.value as "black" | "white") } })}>
                      <option value="steel">נירוסטה</option>
                      <option value="black">שחור</option>
                      <option value="white">לבן</option>
                    </select>
                  </label>
                  <label>ברז
                    <select className="in" style={{ width: "auto" }} value={u.sink?.faucet || "steel"} onChange={(e) => set(i, { sink: { ...u.sink, faucet: e.target.value === "steel" ? undefined : (e.target.value as "black" | "gold") } })}>
                      <option value="steel">נירוסטה</option>
                      <option value="black">שחור</option>
                      <option value="gold">זהב</option>
                    </select>
                  </label>
                </>
              )}
            </span>
          )}
          {more === i && (
            <span className="nqp-box nqp-more">
              {u.kind === "corner" ? (
                <label>סוג פינה
                  <select className="in" style={{ width: "auto" }} value={u.cornerType || ""} onChange={(e) => set(i, { cornerType: (e.target.value || undefined) as UnitExtras["cornerType"] })}>
                    <option value="">סגורה עם פס</option>
                    {(Object.keys(CORNER_LABEL) as NonNullable<UnitExtras["cornerType"]>[]).map((k) => <option key={k} value={k}>{CORNER_LABEL[k]}</option>)}
                  </select>
                </label>
              ) : (
                <>
                  <label>מדפים בפנים<input className="in num" type="number" inputMode="numeric" value={u.inside?.shelves ?? ""} onChange={(e) => set(i, { inside: { ...u.inside, shelves: Number(e.target.value) || undefined } })} /></label>
                  <label>מגירות פנימיות<input className="in num" type="number" inputMode="numeric" value={u.inside?.drawers ?? ""} onChange={(e) => set(i, { inside: { ...u.inside, drawers: Number(e.target.value) || undefined } })} /></label>
                  <label>נשלף
                    <select className="in" style={{ width: "auto" }} value={u.inside?.pull || ""} onChange={(e) => set(i, { inside: { ...u.inside, pull: (e.target.value || undefined) as "pantry" | "trash" | undefined } })}>
                      <option value="">בלי</option>
                      <option value="pantry">מזווה</option>
                      <option value="trash">פח</option>
                    </select>
                  </label>
                  <label>דופן גלויה 2 ס״מ
                    <select className="in" style={{ width: "auto" }} value={u.side || ""} onChange={(e) => set(i, { side: (e.target.value || undefined) as UnitExtras["side"] })}>
                      <option value="">אוטומטי: איפה שאין קיר או ארון</option>
                      <option value="none">בלי</option>
                      <option value="left">משמאל</option>
                      <option value="right">מימין</option>
                      <option value="both">משני הצדדים</option>
                    </select>
                  </label>
                  {u.kind === "doors" && (
                    <label>ויטרינה
                      <select className="in" style={{ width: "auto" }} value={u.glass || ""} onChange={(e) => set(i, { glass: (e.target.value || undefined) as UnitExtras["glass"] })}>
                        <option value="">בלי</option>
                        <option value="clear">זכוכית שקופה</option>
                        <option value="smoked">זכוכית מעושנת</option>
                      </select>
                    </label>
                  )}
                </>
              )}
            </span>
          )}
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
                    {p.kind === "niche" && <label><input type="checkbox" checked={!!p.tv} onChange={(e) => setPart({ tv: e.target.checked || undefined })} /> טלוויזיה</label>}
                    {p.kind === "niche" && p.tv && <label>רווח מהמסגרת<input className="in num" type="number" inputMode="decimal" placeholder="4" value={p.tvGap ?? ""} onChange={(e) => setPart({ tvGap: optNum(e.target.value) })} /></label>}
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
              <label><input type="checkbox" checked={!!u.tv} style={{ width: "auto" }} onChange={(e) => set(i, { tv: e.target.checked || undefined })} /> טלוויזיה</label>
              {u.tv && <label>רווח מהמסגרת<input className="in num" type="number" inputMode="decimal" placeholder="4" value={u.tvGap ?? ""} onChange={(e) => set(i, { tvGap: optNum(e.target.value) })} /></label>}
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

/** What the room itself has on a wall: windows, doors, columns, beams and service points. */
function WallRoom({ wall, onChange }: { wall: LayoutWall; onChange: (w: LayoutWall) => void }) {
  const num = (v: string) => Number(v) || 0;
  const field = (label: string, value: number | undefined, set: (v: number | undefined) => void, placeholder?: string) => (
    <label>{label}<input className="in num" type="number" inputMode="decimal" placeholder={placeholder} value={value ?? ""} onChange={(e) => set(e.target.value === "" ? undefined : num(e.target.value))} /></label>
  );
  const openings = wall.openings || [], obstacles = wall.obstacles || [], points = wall.points || [];
  const setO = (i: number, p: Partial<Opening>) => onChange({ ...wall, openings: openings.map((x, j) => (j === i ? { ...x, ...p } : x)) });
  const setB = (i: number, p: Partial<Obstacle>) => onChange({ ...wall, obstacles: obstacles.map((x, j) => (j === i ? { ...x, ...p } : x)) });
  const setP = (i: number, p: Partial<RoomPoint>) => onChange({ ...wall, points: points.map((x, j) => (j === i ? { ...x, ...p } : x)) });
  return (
    <div className="nqp-room">
      {openings.map((o, i) => (
        <span key={"o" + i} className="nqp-part">
          <select className="in" value={o.kind} aria-label="סוג הפתח" onChange={(e) => setO(i, { kind: e.target.value as Opening["kind"] })}>
            {(Object.keys(OPENING_LABEL) as Opening["kind"][]).map((k) => <option key={k} value={k}>{OPENING_LABEL[k]}</option>)}
          </select>
          {field("מהקצה", o.a, (v) => setO(i, { a: v ?? 0 }))}{field("רוחב", o.w, (v) => setO(i, { w: v ?? 0 }))}
          {field("מגובה", o.y, (v) => setO(i, { y: v }), o.kind === "door" ? "0" : "100")}{field("גובה", o.h, (v) => setO(i, { h: v }), o.kind === "door" ? "210" : "120")}
          <button type="button" className="nq-btn sm ghost" aria-label="הסר" onClick={() => onChange({ ...wall, openings: openings.filter((_, j) => j !== i) })}>×</button>
        </span>
      ))}
      {obstacles.map((o, i) => (
        <span key={"b" + i} className="nqp-part">
          <select className="in" value={o.kind} aria-label="עמוד או קורה" onChange={(e) => setB(i, { kind: e.target.value as Obstacle["kind"] })}>
            {(Object.keys(OBSTACLE_LABEL) as Obstacle["kind"][]).map((k) => <option key={k} value={k}>{OBSTACLE_LABEL[k]}</option>)}
          </select>
          {field("מהקצה", o.a, (v) => setB(i, { a: v ?? 0 }))}{field("רוחב", o.w, (v) => setB(i, { w: v ?? 0 }))}{field("בולט", o.d, (v) => setB(i, { d: v ?? 0 }))}
          {o.kind === "beam" && field("גובה", o.h, (v) => setB(i, { h: v }), "30")}
          <button type="button" className="nq-btn sm ghost" aria-label="הסר" onClick={() => onChange({ ...wall, obstacles: obstacles.filter((_, j) => j !== i) })}>×</button>
        </span>
      ))}
      {points.map((o, i) => (
        <span key={"p" + i} className="nqp-part">
          <select className="in" value={o.kind} aria-label="סוג הנקודה" onChange={(e) => setP(i, { kind: e.target.value as RoomPoint["kind"] })}>
            {(Object.keys(POINT_LABEL) as RoomPoint["kind"][]).map((k) => <option key={k} value={k}>נקודת {POINT_LABEL[k]}</option>)}
          </select>
          {field("מהקצה", o.a, (v) => setP(i, { a: v ?? 0 }))}{field("גובה", o.y, (v) => setP(i, { y: v ?? 0 }))}
          <button type="button" className="nq-btn sm ghost" aria-label="הסר" onClick={() => onChange({ ...wall, points: points.filter((_, j) => j !== i) })}>×</button>
        </span>
      ))}
      <span className="nqp-room-add">
        <button type="button" className="nq-btn sm" onClick={() => onChange({ ...wall, openings: [...openings, { kind: "window", a: 0, w: 100 }] })}>+ חלון</button>
        <button type="button" className="nq-btn sm" onClick={() => onChange({ ...wall, openings: [...openings, { kind: "door", a: 0, w: 90 }] })}>+ דלת</button>
        <button type="button" className="nq-btn sm" onClick={() => onChange({ ...wall, obstacles: [...obstacles, { kind: "column", a: 0, w: 30, d: 30 }] })}>+ עמוד</button>
        <button type="button" className="nq-btn sm" onClick={() => onChange({ ...wall, obstacles: [...obstacles, { kind: "beam", a: 0, w: wall.length, d: 30 }] })}>+ קורה</button>
        <button type="button" className="nq-btn sm" onClick={() => onChange({ ...wall, points: [...points, { kind: "water", a: 0, y: 55 }] })}>+ נקודה</button>
      </span>
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
export default function LayoutEditor({ layout, onChange, claudeHref, optionsHref, shotRef, viewTools }: {
  layout: KitchenLayout; onChange: (l: KitchenLayout) => void; claudeHref: string; optionsHref?: string; shotRef?: MutableRefObject<(() => string) | null>; viewTools?: ReactNode;
}) {
  const [tab, setTab] = useState<"3d" | "plan">("3d");
  const [inside, setInside] = useState(false);
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
        ? <><Kitchen3D layout={layout} height={460} shotRef={shotRef} paint={brush ? paintOn : undefined} inside={inside} />
          <button type="button" className="nq-btn sm" style={{ marginTop: 8 }} aria-pressed={inside} onClick={() => setInside(!inside)}>{inside ? "החזר חזיתות" : "🔍 הצג פנים הארונות"}</button>
          {viewTools}</>
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
      <div className="nqp-box nqp-counter">
        <label>קרניז בגובה<input className="in num" type="number" inputMode="decimal" placeholder="בלי" value={layout.cornice?.h ?? ""} onChange={(e) => up((l) => { const h = Number(e.target.value) || undefined; l.cornice = h || l.cornice?.toCeiling ? { ...l.cornice, h } : undefined; })} /></label>
        <label><input type="checkbox" style={{ width: "auto" }} checked={!!layout.cornice?.toCeiling} onChange={(e) => up((l) => { l.cornice = e.target.checked ? { ...l.cornice, toCeiling: true } : l.cornice?.h ? { ...l.cornice, toCeiling: undefined } : undefined; })} /> קרניז עד התקרה</label>
        <label>ידית
          <select className="in" style={{ width: "auto" }} value={layout.handle?.style || "bar"} onChange={(e) => up((l) => { l.handle = { ...l.handle, style: e.target.value === "bar" ? undefined : (e.target.value as "knob" | "edge") }; })}>
            <option value="bar">קשת</option>
            <option value="knob">כפתור</option>
            <option value="edge">פרופיל בקצה</option>
          </select>
        </label>
        <label>אורך ידית<input className="in num" type="number" inputMode="decimal" placeholder="16" value={layout.handle?.length ?? ""} onChange={(e) => up((l) => { l.handle = { ...l.handle, length: Number(e.target.value) || undefined }; })} /></label>
        <label>גמר ידית
          <select className="in" style={{ width: "auto" }} value={layout.handle?.finish || "steel"} onChange={(e) => up((l) => { l.handle = { ...l.handle, finish: e.target.value === "steel" ? undefined : e.target.value }; })}>
            {Object.entries(HANDLE_FINISH).map(([k, v]) => <option key={k} value={k}>{v.name}</option>)}
          </select>
        </label>
        <label><input type="checkbox" style={{ width: "auto" }} checked={!!layout.lighting?.underCabinet} onChange={(e) => up((l) => { l.lighting = { ...l.lighting, underCabinet: e.target.checked || undefined }; })} /> לד מתחת לעליונים</label>
        <label><input type="checkbox" style={{ width: "auto" }} checked={!!layout.lighting?.nicheLed} onChange={(e) => up((l) => { l.lighting = { ...l.lighting, nicheLed: e.target.checked || undefined }; })} /> לד בנישות</label>
        <label>ספוטים<input className="in num" type="number" inputMode="numeric" placeholder="0" value={layout.lighting?.spots ?? ""} onChange={(e) => up((l) => { l.lighting = { ...l.lighting, spots: Number(e.target.value) || undefined }; })} /></label>
        {!!layout.island && <label>תליונים מעל האי<input className="in num" type="number" inputMode="numeric" placeholder="0" value={layout.lighting?.pendants ?? ""} onChange={(e) => up((l) => { l.lighting = { ...l.lighting, pendants: Number(e.target.value) || undefined }; })} /></label>}
        <label>סוקל
          <select className="in" style={{ width: "auto" }} value={c.plinth === "front" ? "front" : ""} onChange={(e) => up((l) => { l.colors = { ...l.colors, plinth: e.target.value || undefined }; })}>
            <option value="">כהה</option>
            <option value="front">כמו החזיתות</option>
          </select>
        </label>
      </div>
      {hasCounter(layout) && (
        <div className="nqp-box nqp-counter">
          <label>בליטת משטח<input className="in num" type="number" inputMode="decimal" placeholder="2" value={layout.counter?.over ?? ""} onChange={(e) => up((l) => { l.counter = { ...l.counter, over: e.target.value === "" ? undefined : Number(e.target.value) || 0 }; })} /></label>
          <label>חיפוי קיר בגובה<input className="in num" type="number" inputMode="decimal" placeholder="בלי" value={layout.counter?.splash ?? ""} onChange={(e) => up((l) => { l.counter = { ...l.counter, splash: Number(e.target.value) || undefined }; })} /></label>
          <label><input type="checkbox" style={{ width: "auto" }} checked={!!layout.counter?.fallLeft} onChange={(e) => up((l) => { l.counter = { ...l.counter, fallLeft: e.target.checked || undefined }; })} /> מפל משמאל</label>
          <label><input type="checkbox" style={{ width: "auto" }} checked={!!layout.counter?.fallRight} onChange={(e) => up((l) => { l.counter = { ...l.counter, fallRight: e.target.checked || undefined }; })} /> מפל מימין</label>
        </div>
      )}
      {paintAll && (
        <BluranSheet
          title={paintAll === "front" ? "צבע החזיתות של כל המטבח" : "צבע הארונות העליונים"}
          value={() => c[paintAll]}
          emptyLabel={paintAll === "front" ? "לבן רגיל" : "כמו החזיתות"}
          onPick={(v) => up((l) => { l.colors = { ...l.colors, [paintAll]: v }; })}
          onClose={() => setPaintAll(null)}
        />
      )}

      <div className="nqp-apps">
        <b>מכשירים:</b> {[...layout.walls.flatMap((w) => [...w.base, ...w.upper]), ...(layout.island?.base || [])].map(applianceText).filter(Boolean).join(" · ") || "עוד אין"}
        <span className="hint">מוסיפים בכל קיר ב&quot;+ הוסף&quot; ובוחרים סוג: מקרר, כיריים, כיור, תנור, מדיח או קולט. הגדרות המכשיר מופיעות מתחת לשורה שלו</span>
      </div>
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
          <WallRoom wall={w} onChange={(next) => up((l) => { l.walls[i] = next; })} />
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
        {optionsHref && <a className="nq-btn sm" href={optionsHref} target="_blank" rel="noopener" title="משרטטים כאן את הקירות, הפתחים ונקודת המים, וקלוד בונה מהם כמה אופציות">✨ אופציות מהחדר הזה</a>}
      </div>
    </section>
  );
}
