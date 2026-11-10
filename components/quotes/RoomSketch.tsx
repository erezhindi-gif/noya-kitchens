"use client";
// Drawing the room with the mouse: walls with their thickness, then windows, doors and points on them.
// Like SketchUp: start a line, type its length and press Enter. The kitchen walls go straight into the plan.
import { useEffect, useMemo, useRef, useState } from "react";
import type { KitchenLayout } from "@/lib/quotes/layout";
import { STARTER_LAYOUT } from "./LayoutEditor";
import {
  ITEM_DEFAULT, ITEM_LABEL, emptyRoom, fromLeft, isOpening, layoutToRoom, movePoints, roomToLayout, sFromLeft, setWallLength, wallCount, wallInfo,
  type Pt, type RoomItem, type RoomItemKind, type RoomSketch,
} from "@/lib/quotes/room";

type Mode = "select" | "walls" | RoomItemKind;
type Sel = { t: "wall"; i: number } | { t: "item"; i: number } | null;
const SNAP = 5;
const snap = (v: number) => Math.round(v / SNAP) * SNAP;
const r1 = (v: number) => Math.round(v * 10) / 10;
const POINT_COLOR: Record<string, string> = { water: "#2f7fd1", drain: "#6b7a8c", power: "#d4a017", gas: "#d0463b" };
const POINT_LETTER: Record<string, string> = { water: "מ", drain: "נ", power: "ח", gas: "ג" };
const MODES: [Mode, string][] = [["select", "בחירה והזזה"], ["walls", "✏️ קירות"], ["window", "+ חלון"], ["door", "+ דלת"], ["water", "+ מים"], ["power", "+ חשמל"], ["gas", "+ גז"], ["drain", "+ ניקוז"]];

/** a new plan still has the sample kitchen; once the room is drawn its cabinets are not kept */
const isStarter = (l: KitchenLayout) => JSON.stringify(l.walls) === JSON.stringify(STARTER_LAYOUT().walls);

export default function RoomSketch({ room: saved, layout, onChange, optionsHref }: {
  room?: RoomSketch; layout: KitchenLayout; onChange: (room: RoomSketch, layout: KitchenLayout | null) => void; optionsHref: string;
}) {
  // a new plan (still the sample walls) starts on an empty sheet; an older plan shows the walls it has
  const fresh = !saved && isStarter(layout);
  const [room, setRoom] = useState<RoomSketch>(() => saved || (fresh ? emptyRoom() : layoutToRoom(layout)));
  const [mode, setMode] = useState<Mode>(() => ((saved || !fresh) && (saved?.pts.length ?? 1) ? "select" : "walls"));
  const [sel, setSel] = useState<Sel>(null);
  const [cursor, setCursor] = useState<Pt | null>(null);
  const [vcb, setVcb] = useState("");
  const [history, setHistory] = useState<RoomSketch[]>([]);
  const [askClear, setAskClear] = useState(false);
  const svgRef = useRef<SVGSVGElement>(null);
  const drag = useRef<{ kind: "item" | "wall"; i: number; start: Pt; base: RoomSketch; moved: boolean } | null>(null);
  const layoutRef = useRef(layout);
  layoutRef.current = layout;
  const base = () => (isStarter(layoutRef.current) ? { ...layoutRef.current, walls: [] } : layoutRef.current);

  const n = wallCount(room);
  const drawing = mode === "walls" && !room.closed && room.pts.length > 0;
  const status = useMemo(() => {
    if (!n) return "";
    const res = roomToLayout(room, base());
    return "error" in res ? res.error : "הקירות בתכנון מעודכנים מהשרטוט ✓";
  }, [room, n]); // eslint-disable-line react-hooks/exhaustive-deps
  const ready = !!n && status.endsWith("✓");

  const commit = (next: RoomSketch) => {
    setHistory((h) => [...h.slice(-40), room]);
    setRoom(next);
    const res = roomToLayout(next, base());
    onChange(next, "layout" in res ? res.layout : null);
  };
  const undo = () => {
    const prev = history[history.length - 1];
    if (!prev) return;
    setHistory((h) => h.slice(0, -1));
    setRoom(prev);
    setSel(null);
    const res = roomToLayout(prev, base());
    onChange(prev, "layout" in res ? res.layout : null);
  };

  const world = (e: { clientX: number; clientY: number }): Pt => {
    const svg = svgRef.current!;
    const m = svg.getScreenCTM();
    if (!m) return { x: 0, y: 0 };
    const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(m.inverse());
    return { x: p.x, y: p.y };
  };
  const last = room.pts[room.pts.length - 1];
  /** where the next corner goes: on the grid, straight across or straight down from the last one */
  const ortho = (p: Pt): Pt => {
    if (!last) return { x: snap(p.x), y: snap(p.y) };
    return Math.abs(p.x - last.x) >= Math.abs(p.y - last.y) ? { x: snap(p.x), y: last.y } : { x: last.x, y: snap(p.y) };
  };
  const nearFirst = (p: Pt) => room.pts.length >= 3 && Math.hypot(p.x - room.pts[0].x, p.y - room.pts[0].y) < 25;

  const addCorner = (p: Pt) => {
    if (room.closed) return;
    if (nearFirst(p)) {
      const first = room.pts[0];
      if (last && last.x !== first.x && last.y !== first.y) return; // the closing wall must be straight
      commit({ ...room, closed: true });
      setMode("select");
      setCursor(null);
      return;
    }
    if (last && last.x === p.x && last.y === p.y) return;
    commit({ ...room, pts: [...room.pts, p] });
  };

  /** the wall under the mouse: on it, or in its thickness behind it */
  const wallAt = (p: Pt) => {
    let best = -1, bestD = Infinity;
    for (let i = 0; i < n; i++) {
      const w = wallInfo(room, i);
      const along = (p.x - w.P.x) * w.d.x + (p.y - w.P.y) * w.d.y;
      const inward = (p.x - w.P.x) * w.n.x + (p.y - w.P.y) * w.n.y;
      if (along < -10 || along > w.len + 10 || inward < -room.thick - 15 || inward > 25) continue;
      const dd = Math.abs(inward + room.thick / 2);
      if (dd < bestD) { bestD = dd; best = i; }
    }
    return best;
  };
  const itemAt = (p: Pt) =>
    room.items.findIndex((it) => {
      const w = wallInfo(room, it.wall);
      const along = (p.x - w.P.x) * w.d.x + (p.y - w.P.y) * w.d.y;
      const inward = (p.x - w.P.x) * w.n.x + (p.y - w.P.y) * w.n.y;
      if (isOpening(it.kind)) return along >= it.s - 5 && along <= it.s + (it.w || 0) + 5 && inward > -room.thick - 10 && inward < 20;
      return Math.abs(along - it.s) < 15 && inward > -10 && inward < 30;
    });

  const onDown = (e: React.PointerEvent) => {
    const p = world(e);
    if (mode === "walls") return addCorner(ortho(p));
    if (mode !== "select") {
      const wi = wallAt(p);
      if (wi < 0) return;
      const w = wallInfo(room, wi);
      const along = (p.x - w.P.x) * w.d.x + (p.y - w.P.y) * w.d.y;
      const def = ITEM_DEFAULT[mode];
      const it: RoomItem = isOpening(mode)
        ? { kind: mode, wall: wi, s: Math.max(0, Math.min(w.len - (def.w || 0), snap(along - (def.w || 0) / 2))), w: def.w }
        : { kind: mode, wall: wi, s: Math.max(0, Math.min(w.len, snap(along))), y: def.y };
      commit({ ...room, items: [...room.items, it] });
      setSel({ t: "item", i: room.items.length });
      setMode("select");
      return;
    }
    const ii = itemAt(p);
    if (ii >= 0) {
      setSel({ t: "item", i: ii });
      drag.current = { kind: "item", i: ii, start: p, base: room, moved: false };
    } else {
      const wi = wallAt(p);
      setSel(wi >= 0 ? { t: "wall", i: wi } : null);
      if (wi >= 0) drag.current = { kind: "wall", i: wi, start: p, base: room, moved: false };
    }
    (e.target as Element).setPointerCapture?.(e.pointerId);
  };
  const onMove = (e: React.PointerEvent) => {
    const p = world(e);
    if (mode === "walls") return setCursor(ortho(p));
    const g = drag.current;
    if (!g) return;
    const base = g.base;
    if (g.kind === "item") {
      const it = base.items[g.i];
      const w = wallInfo(base, it.wall);
      const delta = snap((p.x - g.start.x) * w.d.x + (p.y - g.start.y) * w.d.y);
      if (!delta && !g.moved) return;
      g.moved = true;
      const max = isOpening(it.kind) ? w.len - (it.w || 0) : w.len;
      setRoom({ ...base, items: base.items.map((x, j) => (j === g.i ? { ...x, s: Math.max(0, Math.min(max, it.s + delta)) } : x)) });
    } else {
      const w = wallInfo(base, g.i);
      const off = snap((p.x - g.start.x) * w.n.x + (p.y - g.start.y) * w.n.y);
      if (!off && !g.moved) return;
      g.moved = true;
      const v = { x: w.n.x * off, y: w.n.y * off };
      setRoom(movePoints(base, new Map([[g.i, v], [(g.i + 1) % base.pts.length, v]])));
    }
  };
  const onUp = () => {
    const g = drag.current;
    drag.current = null;
    if (g?.moved) {
      setHistory((h) => [...h.slice(-40), g.base]);
      const res = roomToLayout(room, base());
      onChange(room, "layout" in res ? res.layout : null);
    }
  };

  /** Enter in the length box: the line being drawn gets that length, or the chosen wall does */
  const applyLength = () => {
    // in cm, or in meters like SketchUp: anything under 10 is meters (0.65 = 65 cm)
    const raw = Number(vcb.replace(",", "."));
    const v = raw > 0 && raw < 10 ? Math.round(raw * 1000) / 10 : raw;
    setVcb("");
    if (!(v > 0)) return;
    if (drawing && last) {
      const c = cursor || last;
      let dx = Math.sign(c.x - last.x), dy = Math.sign(c.y - last.y);
      if (!dx && !dy) {
        const prev = room.pts[room.pts.length - 2];
        if (!prev) { dx = 1; } else { const px = Math.sign(last.x - prev.x), py = Math.sign(last.y - prev.y); dx = -py; dy = px; }
      }
      addCorner({ x: r1(last.x + dx * v), y: r1(last.y + dy * v) });
    } else if (sel?.t === "wall") commit(setWallLength(room, sel.i, v));
    else if (n) commit(setWallLength(room, n - 1, v));
  };

  // typing a number anywhere (not in a field) goes to the length box, like SketchUp
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT" || t.isContentEditable)) return;
      if (!svgRef.current || !svgRef.current.isConnected) return;
      if (/^[0-9.,]$/.test(e.key) && (drawing || sel?.t === "wall")) { setVcb((s) => s + e.key); e.preventDefault(); }
      else if (e.key === "Backspace" && vcb) { setVcb((s) => s.slice(0, -1)); e.preventDefault(); }
      else if (e.key === "Enter" && vcb) { applyLength(); e.preventDefault(); }
      else if (e.key === "Escape") { setVcb(""); if (mode !== "select") { setMode("select"); setCursor(null); } }
      else if ((e.key === "Delete" || e.key === "Backspace") && sel?.t === "item") { commit({ ...room, items: room.items.filter((_, j) => j !== sel.i) }); setSel(null); e.preventDefault(); }
      else if (e.key.toLowerCase() === "z" && (e.ctrlKey || e.metaKey)) { undo(); e.preventDefault(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  // what is shown: a steady sheet (9 by 6 m to start) that only grows when the walls reach its edge,
  // so the drawing doesn't jump under the mouse; it fits the room again when the sheet is opened
  const fit = (ps: Pt[], prev?: { x: number; y: number; w: number; h: number }) => {
    if (!ps.length) return prev || { x: -150, y: -150, w: 900, h: 600 };
    const xs = ps.map((p) => p.x), ys = ps.map((p) => p.y);
    const pad = 150 + room.thick;
    let x0 = Math.min(...xs) - pad, x1 = Math.max(...xs) + pad, y0 = Math.min(...ys) - pad, y1 = Math.max(...ys) + pad;
    if (prev) { x0 = Math.min(x0, prev.x); y0 = Math.min(y0, prev.y); x1 = Math.max(x1, prev.x + prev.w); y1 = Math.max(y1, prev.y + prev.h); }
    const w = Math.max(900, x1 - x0, ((y1 - y0) * 3) / 2), h = Math.max(600, y1 - y0, ((x1 - x0) * 2) / 3);
    return { x: x0 - (w - (x1 - x0)) / 2, y: y0 - (h - (y1 - y0)) / 2, w, h };
  };
  const [vb, setVb] = useState(() => fit(room.pts));
  useEffect(() => {
    if (!room.pts.length) return setVb(fit([]));
    const inside = room.pts.every((p) => p.x > vb.x + 40 && p.x < vb.x + vb.w - 40 && p.y > vb.y + 40 && p.y < vb.y + vb.h - 40);
    if (!inside) setVb(fit(room.pts, vb));
  }, [room.pts]); // eslint-disable-line react-hooks/exhaustive-deps
  const fs = Math.max(13, vb.w / 55);

  const t = room.thick;
  const walls = Array.from({ length: n }, (_, i) => {
    const w = wallInfo(room, i);
    const hasPrev = room.closed || i > 0, hasNext = room.closed || i < n - 1;
    const a = { x: w.P.x - (hasPrev ? w.d.x * t : 0), y: w.P.y - (hasPrev ? w.d.y * t : 0) };
    const b = { x: w.Q.x + (hasNext ? w.d.x * t : 0), y: w.Q.y + (hasNext ? w.d.y * t : 0) };
    const o = { x: -w.n.x * t, y: -w.n.y * t };
    return { i, w, poly: [a, b, { x: b.x + o.x, y: b.y + o.y }, { x: a.x + o.x, y: a.y + o.y }] };
  });
  const at = (w: ReturnType<typeof wallInfo>, s: number, inward = 0) => ({ x: w.P.x + w.d.x * s + w.n.x * inward, y: w.P.y + w.d.y * s + w.n.y * inward });
  const selItem = sel?.t === "item" ? room.items[sel.i] : null;
  const selWall = sel?.t === "wall" && sel.i < n ? wallInfo(room, sel.i) : null;
  const setItem = (p: Partial<RoomItem>) => sel?.t === "item" && commit({ ...room, items: room.items.map((x, j) => (j === sel.i ? { ...x, ...p } : x)) });
  const num = (v: string) => (v === "" ? undefined : Number(v));

  return (
    <section className="nq-card nqs">
      <div className="nq-card-h">
        <h2>שרטוט החדר</h2>
        {ready
          ? <a className="nq-btn pri" href={optionsHref} target="_blank" rel="noopener" title="קלוד קורא את הקירות שסימנת כמטבח, החלונות, הדלתות ונקודת המים, ובונה כמה אופציות">✨ אופציות מהחדר הזה</a>
          : <button type="button" className="nq-btn" disabled title={n ? status : "קודם משרטטים את הקירות"}>✨ אופציות מהחדר הזה</button>}
      </div>
      <p className="hint" style={{ margin: "0 0 8px" }}>
        {mode === "walls"
          ? room.closed ? "החדר סגור. כדי לשנות, בוחרים קיר וגוררים אותו או מקלידים אורך." : room.pts.length ? "מושכים לכיוון הקיר הבא ולוחצים, או מקלידים אורך ו-Enter. לחיצה על הנקודה הראשונה סוגרת את החדר. Esc מסיים." : "לחץ במקום שבו מתחיל הקיר הראשון."
          : mode === "select" ? "לחיצה על קיר בוחרת אותו: אפשר לגרור אותו או להקליד אורך ו-Enter. לחיצה על חלון, דלת או נקודה בוחרת אותם, וגרירה מזיזה לאורך הקיר."
          : `לחץ על הקיר במקום של ה${ITEM_LABEL[mode]}.`}
      </p>
      <div className="nq-chips nqs-modes">
        {MODES.map(([k, label]) => (
          <button key={k} type="button" className="nq-chip" aria-pressed={mode === k} disabled={k !== "select" && k !== "walls" && !n} onClick={() => { setMode(k); setCursor(null); setVcb(""); }}>{label}</button>
        ))}
      </div>
      <div className="nqs-canvas" dir="ltr">
        <svg ref={svgRef} viewBox={`${vb.x} ${vb.y} ${vb.w} ${vb.h}`} preserveAspectRatio="xMidYMid meet"
          style={{ cursor: mode === "select" ? "default" : "crosshair", touchAction: "none" }}
          onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp}>
          <defs>
            <pattern id="nqs-grid" width="50" height="50" patternUnits="userSpaceOnUse"><path d="M50 0H0V50" fill="none" stroke="#ece6dc" strokeWidth="1" /></pattern>
          </defs>
          <rect x={vb.x} y={vb.y} width={vb.w} height={vb.h} fill="url(#nqs-grid)" />
          {walls.map(({ i, poly }) => {
            const k = room.kitchen.includes(i), s = sel?.t === "wall" && sel.i === i;
            return <polygon key={i} points={poly.map((p) => `${p.x},${p.y}`).join(" ")} fill={s ? (k ? "#b8925a" : "#a99f90") : k ? "#d9bd8c" : "#cfc8bc"} stroke={s ? "#5c4526" : "#7d7466"} strokeWidth={s ? 3 : 1} />;
          })}
          {room.items.map((it, j) => {
            const w = wallInfo(room, it.wall);
            const s = sel?.t === "item" && sel.i === j;
            if (isOpening(it.kind)) {
              const a = at(w, it.s), b = at(w, it.s + (it.w || 0));
              const a2 = at(w, it.s, -t), b2 = at(w, it.s + (it.w || 0), -t);
              const gap = <polygon points={[a, b, b2, a2].map((p) => `${p.x},${p.y}`).join(" ")} fill="#fff" stroke={s ? "#8a6a3c" : "#7d7466"} strokeWidth={s ? 3 : 1} />;
              if (it.kind === "window") {
                const m1 = at(w, it.s, -t / 3), m2 = at(w, it.s + (it.w || 0), -t / 3), m3 = at(w, it.s, (-2 * t) / 3), m4 = at(w, it.s + (it.w || 0), (-2 * t) / 3);
                return <g key={j}>{gap}<line x1={m1.x} y1={m1.y} x2={m2.x} y2={m2.y} stroke="#4a90c2" strokeWidth="2" /><line x1={m3.x} y1={m3.y} x2={m4.x} y2={m4.y} stroke="#4a90c2" strokeWidth="2" /></g>;
              }
              const leaf = at(w, it.s, it.w || 0);
              const sweep = w.d.x * w.n.y - w.d.y * w.n.x > 0 ? 1 : 0;
              return <g key={j}>{gap}<line x1={a.x} y1={a.y} x2={leaf.x} y2={leaf.y} stroke="#7d7466" strokeWidth="2" /><path d={`M${leaf.x},${leaf.y} A${it.w},${it.w} 0 0 ${sweep} ${b.x},${b.y}`} fill="none" stroke="#7d7466" strokeDasharray="6 5" /></g>;
            }
            const c = at(w, it.s, 14);
            return (
              <g key={j}>
                <circle cx={c.x} cy={c.y} r={11} fill={POINT_COLOR[it.kind]} stroke={s ? "#2c2c2c" : "#fff"} strokeWidth={s ? 3 : 2} />
                <text x={c.x} y={c.y + 5} fontSize="14" textAnchor="middle" fill="#fff" fontWeight="700">{POINT_LETTER[it.kind]}</text>
              </g>
            );
          })}
          {walls.map(({ i, w }) => {
            const m = at(w, w.len / 2, -t - fs * 1.1);
            return <text key={"l" + i} x={m.x} y={m.y + fs / 3} fontSize={fs} textAnchor="middle" fill="#2c2c2c" fontWeight="600" style={{ pointerEvents: "none" }}>{w.len}</text>;
          })}
          {selItem && (() => {
            const w = wallInfo(room, selItem.wall);
            const a = fromLeft(room, selItem);
            const s0 = w.leftIsP ? 0 : w.len, s1 = w.leftIsP ? selItem.s : isOpening(selItem.kind) ? selItem.s + (selItem.w || 0) : selItem.s;
            const p0 = at(w, s0, 40), p1 = at(w, s1, 40), mid = at(w, (s0 + s1) / 2, 40 + fs);
            return <g style={{ pointerEvents: "none" }}><line x1={p0.x} y1={p0.y} x2={p1.x} y2={p1.y} stroke="#8a6a3c" strokeWidth="2" /><text x={mid.x} y={mid.y} fontSize={fs * 0.9} textAnchor="middle" fill="#8a6a3c" fontWeight="700">{a}</text></g>;
          })()}
          {room.pts.map((p, i) => <circle key={"v" + i} cx={p.x} cy={p.y} r={i === 0 && drawing ? 9 : 5} fill={i === 0 && drawing ? "#a8834f" : "#2c2c2c"} style={{ pointerEvents: "none" }} />)}
          {drawing && cursor && last && (cursor.x !== last.x || cursor.y !== last.y) && (
            <g style={{ pointerEvents: "none" }}>
              <line x1={last.x} y1={last.y} x2={cursor.x} y2={cursor.y} stroke="#a8834f" strokeWidth="3" strokeDasharray="10 6" />
              <text x={(last.x + cursor.x) / 2} y={(last.y + cursor.y) / 2 - fs * 0.6} fontSize={fs} textAnchor="middle" fill="#8a6a3c" fontWeight="700">{r1(Math.abs(cursor.x - last.x) + Math.abs(cursor.y - last.y))}</text>
            </g>
          )}
        </svg>
      </div>
      <div className="nqs-bar">
        <label className="nqs-vcb">אורך
          <input className="in num" inputMode="decimal" value={vcb} placeholder={drawing ? "הקלד ו-Enter" : selWall ? String(selWall.len) : ""}
            onChange={(e) => setVcb(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); applyLength(); } }} />
          <span className="hint">ס״מ, או מטרים (0.65)</span>
        </label>
        <label className="nqs-vcb">עובי קיר
          <input className="in num" type="number" inputMode="decimal" value={room.thick} onChange={(e) => commit({ ...room, thick: Math.max(5, Math.min(60, Number(e.target.value) || 20)) })} />
        </label>
        <button type="button" className="nq-btn sm" disabled={!history.length} onClick={undo}>↶ בטל</button>
        {askClear
          ? <span className="nq-confirm">למחוק את כל השרטוט? <button type="button" className="nq-btn sm danger" onClick={() => { commit(emptyRoom()); setAskClear(false); setSel(null); setMode("walls"); }}>כן, למחוק</button><button type="button" className="nq-btn sm" onClick={() => setAskClear(false)}>ביטול</button></span>
          : <button type="button" className="nq-btn sm ghost" disabled={!room.pts.length} onClick={() => setAskClear(true)}>התחל מחדש</button>}
      </div>
      {selWall && sel?.t === "wall" && (
        <div className="nqs-panel">
          <b>קיר {selWall.len} ס״מ</b>
          <label className="nq-check"><input type="checkbox" checked={room.kitchen.includes(sel.i)} onChange={(e) => commit({ ...room, kitchen: e.target.checked ? [...room.kitchen, sel.i] : room.kitchen.filter((k) => k !== sel.i) })} /> קיר מטבח</label>
          <span className="hint">להקליד אורך ו-Enter משנה את הקיר. גרירה מזיזה אותו.</span>
        </div>
      )}
      {selItem && sel?.t === "item" && (
        <div className="nqs-panel">
          <select className="in" value={selItem.kind} aria-label="סוג" onChange={(e) => {
            const k = e.target.value as RoomItemKind;
            setItem({ kind: k, ...(isOpening(k) ? { w: selItem.w || ITEM_DEFAULT[k].w, y: undefined } : { w: undefined, y: ITEM_DEFAULT[k].y }) });
          }}>
            {(Object.keys(ITEM_LABEL) as RoomItemKind[]).map((k) => <option key={k} value={k}>{ITEM_LABEL[k]}</option>)}
          </select>
          <label>{isOpening(selItem.kind) ? "מהקצה השמאלי" : "מרכז מהקצה השמאלי"}
            <input className="in num" type="number" inputMode="decimal" value={fromLeft(room, selItem)} onChange={(e) => setItem({ s: sFromLeft(room, selItem, Number(e.target.value) || 0) })} />
          </label>
          {isOpening(selItem.kind) && <label>רוחב<input className="in num" type="number" inputMode="decimal" value={selItem.w ?? ""} onChange={(e) => {
            const nw = Number(e.target.value) || 0;
            const a = fromLeft(room, selItem);
            setItem({ w: nw, s: sFromLeft(room, { ...selItem, w: nw }, a) });
          }} /></label>}
          <label>{isOpening(selItem.kind) ? "מגובה" : "גובה"}<input className="in num" type="number" inputMode="decimal" placeholder={String(ITEM_DEFAULT[selItem.kind].y)} value={selItem.y ?? ""} onChange={(e) => setItem({ y: num(e.target.value) })} /></label>
          {isOpening(selItem.kind) && <label>גובה<input className="in num" type="number" inputMode="decimal" placeholder={selItem.kind === "door" ? "210" : "120"} value={selItem.h ?? ""} onChange={(e) => setItem({ h: num(e.target.value) })} /></label>}
          <button type="button" className="nq-btn sm ghost" onClick={() => { commit({ ...room, items: room.items.filter((_, j) => j !== sel.i) }); setSel(null); }}>הסר</button>
          <span className="hint">המרחק נמדד מהקצה השמאלי של הקיר כשעומדים מולו בתוך החדר</span>
        </div>
      )}
      {!!n && <p className={`nqs-status ${ready ? "ok" : "warn"}`}>{ready ? status : `שלב אחרון: ${status}`}</p>}
    </section>
  );
}
