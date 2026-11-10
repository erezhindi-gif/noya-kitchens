// The room as Erez draws it with the mouse ("שרטוט החדר"): walls as a line of points (cm, x right,
// y down on screen), their thickness, windows, doors and points on them, and which walls are the kitchen.
// The kitchen walls become the plan's walls (lengths, openings, points, end walls), so Claude and the
// rest of the system read the room from the plan as before.
import type { KitchenLayout, LayoutWall, Opening, RoomPoint } from "./layout";
import { wallGeometry } from "./layout";

export type Pt = { x: number; y: number };
export type RoomItemKind = "window" | "door" | RoomPoint["kind"];
/** s = from the wall's first drawn point: an opening's start, a point's center */
export type RoomItem = { kind: RoomItemKind; wall: number; s: number; w?: number; y?: number; h?: number };
/** kitchen: the walls Erez chose; empty = every wall, when there are up to 3 */
export type WallUnits = Pick<LayoutWall, "base" | "upper" | "top" | "obstacles">;
/** stash: the cabinets of room walls taken out of the kitchen, kept so they come back when the wall is added again */
export type RoomSketch = { pts: Pt[]; closed?: boolean; thick: number; items: RoomItem[]; kitchen: number[]; stash?: Record<string, WallUnits> };

export const ITEM_LABEL: Record<RoomItemKind, string> = { window: "חלון", door: "דלת", water: "נקודת מים", drain: "ניקוז", power: "חשמל", gas: "גז" };
export const isOpening = (k: RoomItemKind): k is Opening["kind"] => k === "window" || k === "door";
export const ITEM_DEFAULT: Record<RoomItemKind, { w?: number; y: number }> = {
  window: { w: 100, y: 100 }, door: { w: 90, y: 0 }, water: { y: 55 }, drain: { y: 45 }, power: { y: 110 }, gas: { y: 60 },
};

export const emptyRoom = (): RoomSketch => ({ pts: [], thick: 20, items: [], kitchen: [] });
export const wallCount = (r: RoomSketch) => (r.pts.length < 2 ? 0 : r.closed ? r.pts.length : r.pts.length - 1);
/** shorter than this is a side wall (a 65-80 cm return), not a wall a kitchen is built on */
export const SIDE_WALL_MAX = 100;
/** the kitchen walls: the ones chosen, or else every wall but the short side walls, when that leaves up to 3 */
export function kitchenWalls(r: RoomSketch) {
  const n = wallCount(r);
  const chosen = r.kitchen.filter((i, j) => i < n && r.kitchen.indexOf(i) === j);
  if (chosen.length) return chosen;
  const long = Array.from({ length: n }, (_, i) => i).filter((i) => wallInfo(r, i).len >= SIDE_WALL_MAX);
  return long.length <= 3 ? long : [];
}
/** one wall in or out of the kitchen */
export function toggleKitchen(r: RoomSketch, i: number): RoomSketch {
  const k = kitchenWalls(r);
  return { ...r, kitchen: k.includes(i) ? k.filter((x) => x !== i) : [...k, i].sort((a, b) => a - b) };
}
const round = (v: number) => Math.round(v * 10) / 10;

/** 1 when the walls go clockwise on screen (the room is on their right), -1 otherwise */
export function turn(r: RoomSketch) {
  let a = 0;
  const p = r.pts;
  for (let i = 0; i < p.length; i++) {
    const q = p[(i + 1) % p.length];
    a += p[i].x * q.y - q.x * p[i].y;
  }
  return a >= 0 ? 1 : -1;
}

export function wallInfo(r: RoomSketch, i: number) {
  const P = r.pts[i], Q = r.pts[(i + 1) % r.pts.length];
  const len = Math.hypot(Q.x - P.x, Q.y - P.y) || 1;
  const d = { x: (Q.x - P.x) / len, y: (Q.y - P.y) / len };
  const t = turn(r);
  /** toward the inside of the room */
  const n = t > 0 ? { x: -d.y, y: d.x } : { x: d.y, y: -d.x };
  // standing in the room facing the wall, its left end is the drawn start when the walls go clockwise
  const leftIsP = d.x * -n.y + d.y * n.x < 0;
  return { P, Q, len: round(len), d, n, leftIsP };
}

/** distance of an item from the wall's left end, as the plan measures it (openings: their near edge) */
export function fromLeft(r: RoomSketch, it: RoomItem) {
  const w = wallInfo(r, it.wall);
  if (w.leftIsP) return round(it.s);
  return round(isOpening(it.kind) ? w.len - it.s - (it.w || 0) : w.len - it.s);
}
export function sFromLeft(r: RoomSketch, it: RoomItem, a: number) {
  const w = wallInfo(r, it.wall);
  if (w.leftIsP) return a;
  return isOpening(it.kind) ? w.len - a - (it.w || 0) : w.len - a;
}

/** Moves points, keeping items where they are on the walls whose start moved. */
export function movePoints(r: RoomSketch, moves: Map<number, Pt>): RoomSketch {
  const before = Array.from({ length: wallCount(r) }, (_, i) => wallInfo(r, i).d);
  const pts = r.pts.map((p, i) => (moves.has(i) ? { x: round(p.x + moves.get(i)!.x), y: round(p.y + moves.get(i)!.y) } : p));
  const items = r.items.map((it) => {
    const off = moves.get(it.wall);
    if (!off) return it;
    const d = before[it.wall];
    return { ...it, s: round(it.s - (off.x * d.x + off.y * d.y)) };
  });
  return { ...r, pts, items };
}

/** A new length for wall i: everything past its end moves with it, so right angles stay. */
export function setWallLength(r: RoomSketch, i: number, len: number): RoomSketch {
  const w = wallInfo(r, i);
  const delta = len - w.len;
  if (!delta || len <= 0) return r;
  const qi = (i + 1) % r.pts.length;
  const edge = w.Q.x * w.d.x + w.Q.y * w.d.y;
  const moves = new Map<number, Pt>();
  r.pts.forEach((p, j) => {
    if (j === qi || (j !== i && p.x * w.d.x + p.y * w.d.y >= edge - 0.5)) moves.set(j, { x: w.d.x * delta, y: w.d.y * delta });
  });
  return movePoints(r, moves);
}

/**
 * The kitchen walls as plan walls, left to right as you stand in the room
 * (one wall, L = main then right, U = left, main, right). Cabinets already on the plan stay.
 */
export function roomToLayout(r: RoomSketch, layout: KitchenLayout): { layout: KitchenLayout; stash: Record<string, WallUnits> } | { error: string } {
  const n = wallCount(r);
  const ks = kitchenWalls(r);
  if (!ks.length) return { error: "לחץ 'קירות המטבח' וסמן את הקירות שהמטבח עומד עליהם (עד 3)" };
  if (ks.length > 3) return { error: "מטבח יכול לעמוד על עד 3 קירות (ישר, ר׳ או ח׳). לחץ 'קירות המטבח' והורד קיר" };
  const info = new Map(ks.map((i) => [i, wallInfo(r, i)]));
  const ends = (i: number) => { const w = info.get(i)!; return w.leftIsP ? { L: w.P, R: w.Q } : { L: w.Q, R: w.P }; };
  const same = (a: Pt, b: Pt) => Math.abs(a.x - b.x) < 1 && Math.abs(a.y - b.y) < 1;
  const first = ks.find((i) => !ks.some((j) => j !== i && same(ends(j).R, ends(i).L)));
  if (first === undefined) return { error: "קירות המטבח צריכים להיות רצופים" };
  const order = [first];
  while (order.length < ks.length) {
    const nx = ks.find((j) => !order.includes(j) && same(ends(j).L, ends(order[order.length - 1]).R));
    if (nx === undefined) return { error: "קירות המטבח צריכים להיות רצופים" };
    order.push(nx);
  }
  for (let k = 1; k < order.length; k++) {
    const a = info.get(order[k - 1])!, b = info.get(order[k])!;
    const bdir = b.leftIsP ? b.d : { x: -b.d.x, y: -b.d.y };
    if (Math.abs(bdir.x - a.n.x) > 0.01 || Math.abs(bdir.y - a.n.y) > 0.01) return { error: "בין קירות המטבח צריכה להיות פינה ישרה שפונה לתוך החדר" };
  }
  // each kitchen wall keeps its own cabinets: found by the room wall it came from, or in the stash, never by position
  // (walls saved before src existed are matched by position, as they were made)
  const anySrc = layout.walls.some((w) => w.src !== undefined);
  const stash: Record<string, WallUnits> = { ...(r.stash || {}) };
  for (const w of layout.walls) if (w.src !== undefined && !order.includes(w.src)) stash[w.src] = { base: w.base, upper: w.upper, ...(w.top ? { top: w.top } : {}), ...(w.obstacles ? { obstacles: w.obstacles } : {}) };
  const walls: LayoutWall[] = order.map((wi, k) => {
    const own = anySrc ? layout.walls.find((w) => w.src === wi) : layout.walls[k];
    const kept = stash[wi];
    if (kept) delete stash[wi];
    const old: LayoutWall = own || (kept ? { length: 0, ...kept } : { length: 0, base: [], upper: [] });
    const its = r.items.filter((it) => it.wall === wi);
    const openings: Opening[] = its.filter((it) => isOpening(it.kind)).map((it) => ({ kind: it.kind as Opening["kind"], a: fromLeft(r, it), w: it.w || 0, ...(it.y !== undefined ? { y: it.y } : {}), ...(it.h !== undefined ? { h: it.h } : {}) }));
    const points: RoomPoint[] = its.filter((it) => !isOpening(it.kind)).map((it) => ({ kind: it.kind as RoomPoint["kind"], a: fromLeft(r, it), y: it.y ?? ITEM_DEFAULT[it.kind].y }));
    const { openings: _o, points: _p, ...rest } = old;
    return { ...rest, length: info.get(wi)!.len, src: wi, ...(openings.length ? { openings } : {}), ...(points.length ? { points } : {}) };
  });
  // a room wall that meets the kitchen at its free end and turns into the room = a wall at that end
  const endWall = (pt: Pt, inward: Pt) => {
    for (let j = 0; j < n; j++) {
      if (ks.includes(j)) continue;
      const w = wallInfo(r, j);
      const far = same(w.P, pt) ? w.Q : same(w.Q, pt) ? w.P : null;
      if (!far) continue;
      const dx = far.x - pt.x, dy = far.y - pt.y, l = Math.hypot(dx, dy);
      if (l && Math.abs(dx / l - inward.x) < 0.01 && Math.abs(dy / l - inward.y) < 0.01) return w.len;
    }
    return 0;
  };
  const fw = info.get(order[0])!, lw = info.get(order[order.length - 1])!;
  const leftLen = endWall(ends(order[0]).L, fw.n);
  const rightLen = endWall(ends(order[order.length - 1]).R, lw.n);
  const out: KitchenLayout = { ...layout, walls, wallThick: r.thick };
  if (leftLen || rightLen) out.ends = { ...(leftLen ? { left: "wall" as const, leftLen } : {}), ...(rightLen ? { right: "wall" as const, rightLen } : {}) };
  else delete out.ends;
  return { layout: out, stash };
}

/** A first drawing from the walls already on the plan, so a plan made before keeps its room. */
export function layoutToRoom(l: KitchenLayout): RoomSketch {
  const g = wallGeometry(l);
  if (!l.walls.length) return emptyRoom();
  const pts = g.map((w) => ({ x: round(w.x), y: round(w.z) }));
  const last = g[g.length - 1];
  pts.push({ x: round(last.x + last.dx * l.walls[l.walls.length - 1].length), y: round(last.z + last.dz * l.walls[l.walls.length - 1].length) });
  const r: RoomSketch = { pts, thick: 20, items: [], kitchen: l.walls.map((_, i) => i) };
  r.items = l.walls.flatMap((w, i) => [
    ...(w.openings || []).map((o) => ({ kind: o.kind, wall: i, s: 0, w: o.w, ...(o.y !== undefined ? { y: o.y } : {}), ...(o.h !== undefined ? { h: o.h } : {}), a: o.a })),
    ...(w.points || []).map((o) => ({ kind: o.kind, wall: i, s: 0, y: o.y, a: o.a })),
  ]).map(({ a, ...it }) => ({ ...it, s: sFromLeft(r, it, a) }));
  return r;
}
