// The kitchen plan of a quote, in centimeters. Both the to-scale drawing and the 3D view are built
// from these numbers alone, so what the client sees keeps the real proportions.
//
// Walls run one after another around the room, each turning at a corner: one wall is a straight
// kitchen, two make an L, three a U. Cabinets on a wall are listed from the wall's left end, as seen
// standing in the kitchen facing that wall. Where cabinets continue around a corner, the wall after
// the corner starts with a "corner" unit: that space belongs to the cabinet of the previous wall.
// Upper cabinets can come in two rows: the usual one, and a top row above it up to the ceiling
// (by default as deep as the base cabinets). Any upper cabinet may set its own depth, height and
// bottom, e.g. a 30 cm deep lift-up under a 60 cm deep top row.
import { bluranOf } from "./bluran";

export type BaseKind = "doors" | "drawers" | "sink" | "cooktop" | "oven" | "dishwasher" | "fridge" | "tall" | "tall_oven" | "corner" | "gap";
export type UpperKind = "doors" | "lift" | "open" | "hood" | "corner" | "gap";

/** n = number of doors, drawers, flaps or shelves (each kind has a sensible default);
 *  color = the unit's own color (e.g. a black fridge): a Bluran shade "bl:CODE", a FRONT_COLORS name or #hex;
 *  fronts = a color per door/drawer of the unit (left to right, top to bottom), empty = the unit's color */
export type BaseUnit = { kind: BaseKind; w: number; n?: number; color?: string; fronts?: string[] };
/** d = depth, h = height, y = bottom above the floor; each falls back to its row's default */
export type UpperUnit = { kind: UpperKind; w: number; n?: number; d?: number; h?: number; y?: number; color?: string; fronts?: string[] };
export type LayoutWall = { length: number; base: BaseUnit[]; upper: UpperUnit[]; /** second row, above the uppers up to the ceiling */ top?: UpperUnit[] };

export type LayoutHeights = {
  /** top of the counter */ base: number;
  plinth: number;
  counter: number;
  /** bottom of the upper cabinets */ upperFrom: number;
  upper: number;
  tall: number;
  ceiling: number;
  depth: number;
  upperDepth: number;
  /** depth of the top row */ topDepth: number;
};

export type KitchenLayout = {
  walls: LayoutWall[];
  /** An island facing the main wall, with cabinets on the side toward it */
  island?: { w: number; d: number; gap: number; base: BaseUnit[] };
  h?: Partial<LayoutHeights>;
  /** handles: "bar" a handle on every front, "integral" a grip groove cut into the front's edge, "none" push-open */
  colors?: { front?: string; upper?: string; counter?: string; handles?: "bar" | "integral" | "none" };
  /** the kitchen's two free ends: "wall" = a wall stands across that end (leftLen/rightLen = how far it runs into the room); missing = open */
  ends?: { left?: "wall"; right?: "wall"; leftLen?: number; rightLen?: number };
};

export const BASE_LABEL: Record<BaseKind, string> = {
  doors: "דלתות", drawers: "מגירות", sink: "כיור", cooktop: "כיריים", oven: "תנור", dishwasher: "מדיח",
  fridge: "מקרר", tall: "ארון גבוה", tall_oven: "ארון גבוה עם תנור", corner: "פינה", gap: "פנוי",
};
export const UPPER_LABEL: Record<UpperKind, string> = {
  doors: "דלתות", lift: "קלפה", open: "מדפים פתוחים", hood: "קולט אדים", corner: "פינה", gap: "פנוי",
};

export const DEFAULT_HEIGHTS: LayoutHeights = {
  base: 90, plinth: 10, counter: 4, upperFrom: 145, upper: 70, tall: 220, ceiling: 260, depth: 60, upperDepth: 35, topDepth: 60,
};

export type UpperRow = "upper" | "top";
/** Where an upper cabinet sits: bottom, height and depth in cm. */
export function upperBox(u: UpperUnit, h: LayoutHeights, row: UpperRow) {
  if (row === "upper") return { y0: u.y ?? h.upperFrom, hh: u.h ?? h.upper, d: u.d ?? h.upperDepth };
  const y0 = u.y ?? h.upperFrom + h.upper;
  return { y0, hh: u.h ?? Math.max(5, h.ceiling - y0), d: u.d ?? h.topDepth };
}
/** The highest point any upper cabinet of a wall reaches */
export const upperTop = (w: LayoutWall, h: LayoutHeights) =>
  Math.max(0, ...w.upper.filter((u) => u.kind !== "gap").map((u) => { const b = upperBox(u, h, "upper"); return b.y0 + b.hh; }),
    ...(w.top || []).filter((u) => u.kind !== "gap").map((u) => { const b = upperBox(u, h, "top"); return b.y0 + b.hh; }));

/** Named colors Erez and Claude can use; any #hex works too. */
export const FRONT_COLORS: Record<string, { name: string; hex: string }> = {
  white: { name: "לבן", hex: "#f2f1ec" },
  cream: { name: "שמנת", hex: "#e9e0cd" },
  light_grey: { name: "אפור בהיר", hex: "#c8c8c3" },
  grey: { name: "אפור", hex: "#8c8e8d" },
  anthracite: { name: "אנתרציט", hex: "#3c3f41" },
  black: { name: "שחור", hex: "#1e1e1e" },
  oak: { name: "אלון", hex: "#c39a6b" },
  walnut: { name: "אגוז", hex: "#6a4a33" },
  sage: { name: "ירוק מרווה", hex: "#9aa58e" },
  olive: { name: "זית", hex: "#6c7357" },
  navy: { name: "כחול כהה", hex: "#2e3d55" },
};
export const COUNTER_COLORS: Record<string, { name: string; hex: string }> = {
  white_stone: { name: "אבן לבנה", hex: "#f3f2ee" },
  beige_stone: { name: "אבן בז׳", hex: "#e2dccf" },
  grey_stone: { name: "אבן אפורה", hex: "#9b9993" },
  black_stone: { name: "אבן שחורה", hex: "#2a2a2a" },
  wood: { name: "עץ", hex: "#b88a5c" },
};

const HEX = /^#[0-9a-f]{6}$/i;
/** A front color as Erez says it: "בלורן אקריל PURE שנהב ZA02SM", "לבן", or the hex itself */
export const colorName = (v?: string) => {
  const bl = bluranOf(v);
  if (bl) return `בלורן ${bl.group} ${bl.name} ${bl.code}`;
  return FRONT_COLORS[v || "white"]?.name || v || "";
};
export const colorOf = (v: string | undefined, table: Record<string, { hex: string }>, fallback: string) => {
  const s = (v || "").trim();
  if (HEX.test(s)) return s;
  const bl = bluranOf(s);
  if (bl) return bl.hex;
  return table[s]?.hex || fallback;
};

export const heightsOf = (l: KitchenLayout): LayoutHeights => ({ ...DEFAULT_HEIGHTS, ...(l.h || {}) });

/** How many doors / drawers / flaps / shelves a unit shows. */
export function partsOf(kind: BaseKind | UpperKind, w: number, n?: number, upper = false) {
  if (n && n > 0) return Math.min(8, Math.round(n));
  if (kind === "drawers" || kind === "cooktop") return 3;
  if (kind === "tall_oven") return 2;
  if (kind === "lift") return 1;
  if (kind === "open") return 2;
  if (kind === "tall" || kind === "fridge") return 2;
  return w <= (upper ? 50 : 55) ? 1 : 2;
}

const BASE_KINDS = Object.keys(BASE_LABEL) as BaseKind[];
const UPPER_KINDS = Object.keys(UPPER_LABEL) as UpperKind[];
const num = (v: unknown, min: number, max: number, dflt: number) => {
  const n = Number(v);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, Math.round(n * 10) / 10)) : dflt;
};

/** Cleans whatever came in (from the app or from Claude) into a valid layout, or null if there's nothing. */
export function normalizeLayout(raw: unknown): KitchenLayout | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const units = <K extends string>(arr: unknown, kinds: K[]) =>
    (Array.isArray(arr) ? arr : [])
      .map((u) => u as Record<string, unknown>)
      .filter((u) => u && kinds.includes(u.kind as K))
      .map((u) => ({
        kind: u.kind as K, w: num(u.w, 5, 400, 60), ...(u.n ? { n: num(u.n, 1, 8, 1) } : {}),
        ...(typeof u.color === "string" && u.color.trim() ? { color: u.color.trim().slice(0, 30) } : {}),
        ...(Array.isArray(u.fronts) && u.fronts.some((f: unknown) => typeof f === "string" && f) ? { fronts: (u.fronts as unknown[]).slice(0, 8).map((f) => (typeof f === "string" ? f.slice(0, 30) : "")) } : {}),
        ...(u.d ? { d: num(u.d, 5, 120, 35) } : {}), ...(u.h ? { h: num(u.h, 5, 300, 70) } : {}),
        ...(u.y !== undefined && u.y !== null && u.y !== "" ? { y: num(u.y, 0, 400, 145) } : {}),
      }))
      .slice(0, 30);
  const walls = (Array.isArray(r.walls) ? r.walls : []).slice(0, 3).map((w) => {
    const x = (w || {}) as Record<string, unknown>;
    const top = units(x.top, UPPER_KINDS);
    return { length: num(x.length, 30, 1500, 300), base: units(x.base, BASE_KINDS), upper: units(x.upper, UPPER_KINDS), ...(top.length ? { top } : {}) };
  });
  if (!walls.length) return null;
  const out: KitchenLayout = { walls };
  const isl = r.island as Record<string, unknown> | undefined;
  if (isl && typeof isl === "object" && Number(isl.w) > 0)
    out.island = { w: num(isl.w, 40, 600, 200), d: num(isl.d, 40, 200, 90), gap: num(isl.gap, 60, 300, 110), base: units(isl.base, BASE_KINDS) };
  if (r.h && typeof r.h === "object") {
    const h: Partial<LayoutHeights> = {};
    for (const k of Object.keys(DEFAULT_HEIGHTS) as (keyof LayoutHeights)[]) {
      const v = (r.h as Record<string, unknown>)[k];
      if (v !== undefined && v !== null && v !== "") h[k] = num(v, 0, 400, DEFAULT_HEIGHTS[k]);
    }
    if (Object.keys(h).length) out.h = h;
  }
  if (r.colors && typeof r.colors === "object") {
    const c = r.colors as Record<string, unknown>;
    const str = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim().slice(0, 30) : undefined);
    out.colors = {
      ...(str(c.front) ? { front: str(c.front) } : {}),
      ...(str(c.upper) ? { upper: str(c.upper) } : {}),
      ...(str(c.counter) ? { counter: str(c.counter) } : {}),
      ...(c.handles === "none" || c.handles === "integral" ? { handles: c.handles } : {}),
    };
  }
  const e = r.ends as Record<string, unknown> | undefined;
  if (e && (e.left === "wall" || e.right === "wall")) out.ends = {
    ...(e.left === "wall" ? { left: "wall" as const, ...(e.leftLen ? { leftLen: num(e.leftLen, 10, 1500, 210) } : {}) } : {}),
    ...(e.right === "wall" ? { right: "wall" as const, ...(e.rightLen ? { rightLen: num(e.rightLen, 10, 1500, 210) } : {}) } : {}),
  };
  return out;
}

/** How far the wall across a free end runs into the room, in cm */
export const endWallLen = (l: KitchenLayout, side: "left" | "right") =>
  (side === "left" ? l.ends?.leftLen : l.ends?.rightLen) || heightsOf(l).depth + 150;

/** Paints one front. ref = "<wall index or island>.<base|upper|top>.<unit>.<part>"; part -1 is the unit's own color. */
export function paintFront(l: KitchenLayout, ref: string, color: string | undefined) {
  const [wall, row, unit, part] = ref.split(".");
  const units = (wall === "island" ? l.island?.base : (l.walls[Number(wall)]?.[row as "base" | "upper" | "top"])) as (BaseUnit | UpperUnit)[] | undefined;
  const u = units?.[Number(unit)];
  if (!u) return;
  const p = Number(part);
  if (p < 0) {
    if (color) u.color = color; else delete u.color;
    return;
  }
  const fronts = [...(u.fronts || [])];
  while (fronts.length < p) fronts.push("");
  fronts[p] = color || "";
  while (fronts.length && !fronts[fronts.length - 1]) fronts.pop();
  if (fronts.length) u.fronts = fronts; else delete u.fronts;
}

/** The space between a wall's left end and its first cabinet: a "gap" at the start of each row, kept in step. */
export const leftGap = (w: LayoutWall) => (w.base[0]?.kind === "gap" ? w.base[0].w : 0);
export function setLeftGap(w: LayoutWall, v: number) {
  const delta = v - leftGap(w);
  const shift = <U extends { kind: string; w: number }>(us: U[]): U[] => {
    if (!us.length) return us;
    if (us[0].kind === "gap") return us[0].w + delta > 0 ? [{ ...us[0], w: us[0].w + delta }, ...us.slice(1)] : us.slice(1);
    return delta > 0 ? [{ kind: "gap", w: delta } as U, ...us] : us;
  };
  w.base = shift(w.base);
  w.upper = shift(w.upper);
  if (w.top) w.top = shift(w.top);
}

const sum = (us: { w: number }[]) => us.reduce((a, u) => a + u.w, 0);
export const WALL_NAMES = [["קיר"], ["קיר ראשי", "קיר ימני"], ["קיר שמאלי", "קיר ראשי", "קיר ימני"]];
export const wallName = (l: KitchenLayout, i: number) => WALL_NAMES[l.walls.length - 1]?.[i] || `קיר ${i + 1}`;

/** Things that don't add up, in Erez's words. */
export function layoutWarnings(l: KitchenLayout) {
  const out: string[] = [];
  l.walls.forEach((w, i) => {
    const b = sum(w.base), u = sum(w.upper);
    if (b > w.length + 0.5) out.push(`${wallName(l, i)}: הארונות התחתונים (${b} ס״מ) ארוכים מהקיר (${w.length} ס״מ)`);
    if (u > w.length + 0.5) out.push(`${wallName(l, i)}: הארונות העליונים (${u} ס״מ) ארוכים מהקיר (${w.length} ס״מ)`);
    const t = sum(w.top || []);
    if (t > w.length + 0.5) out.push(`${wallName(l, i)}: השורה העליונה (${t} ס״מ) ארוכה מהקיר (${w.length} ס״מ)`);
    if (upperTop(w, heightsOf(l)) > heightsOf(l).ceiling + 0.5) out.push(`${wallName(l, i)}: הארונות העליונים עוברים את התקרה`);
  });
  if (l.island && sum(l.island.base) > l.island.w + 0.5) out.push(`אי: הארונות (${sum(l.island.base)} ס״מ) ארוכים מהאי (${l.island.w} ס״מ)`);
  const h = heightsOf(l);
  if (h.tall > h.ceiling) out.push("הארון הגבוה גבוה מהתקרה");
  return out;
}

/** Where each sink's center falls, from the left end of its wall. */
export function sinkCenters(l: KitchenLayout) {
  return l.walls.flatMap((w, i) => placed(w.base).filter((u) => u.kind === "sink").map((u) => ({ wall: wallName(l, i), from: u.a + u.w / 2 })));
}

/** Plain-text summary for Claude. */
export function describeLayout(l: KitchenLayout) {
  const h = heightsOf(l);
  const u = (x: { kind: string; w: number; n?: number; d?: number; h?: number; y?: number; color?: string; fronts?: string[] }, lab: Record<string, string>) =>
    `${lab[x.kind]} ${x.w}${x.n ? ` (${x.n})` : ""}${x.d ? ` עומק ${x.d}` : ""}${x.h ? ` גובה ${x.h}` : ""}${x.y !== undefined ? ` מ-${x.y}` : ""}${x.color ? ` [${colorName(x.color)}]` : ""}${x.fronts?.some(Boolean) ? ` [חזיתות: ${x.fronts.map((f, i) => (f ? `${i + 1}=${colorName(f)}` : "")).filter(Boolean).join(", ")}]` : ""}`;
  const lines = l.walls.map((w, i) =>
    `${wallName(l, i)} ${w.length} ס״מ\n  תחתון: ${w.base.map((x) => u(x, BASE_LABEL)).join(" | ") || "—"}\n  עליון: ${w.upper.map((x) => u(x, UPPER_LABEL)).join(" | ") || "—"}${w.top?.length ? `
  שורה עליונה: ${w.top.map((x) => u(x, UPPER_LABEL)).join(" | ")}` : ""}`);
  if (l.island) lines.push(`אי ${l.island.w}×${l.island.d}, מרחק ${l.island.gap} מהארונות: ${l.island.base.map((x) => u(x, BASE_LABEL)).join(" | ") || "—"}`);
  lines.push(`גבהים: משטח ${h.base}, עליונים מ-${h.upperFrom} בגובה ${h.upper} ועומק ${h.upperDepth}, שורה עליונה בעומק ${h.topDepth}, ארון גבוה ${h.tall}, תקרה ${h.ceiling}`);
  for (const s of sinkCenters(l)) lines.push(`מרכז כיור: ${s.wall}, ${s.from} ס״מ מהקצה השמאלי של הקיר`);
  const c = l.colors || {};
  lines.push(`צבעים: חזיתות ${colorName(c.front)}${c.upper ? `, עליונים ${colorName(c.upper)}` : ""}, משטח ${COUNTER_COLORS[c.counter || "white_stone"]?.name || c.counter}${c.handles === "none" ? ", בלי ידיות" : c.handles === "integral" ? ", ידית אינטגרלית" : ""}`);
  if (l.ends?.left || l.ends?.right) lines.push(`קיר ניצב בקצה: ${[l.ends.left && `שמאל ${endWallLen(l, "left")}`, l.ends.right && `ימין ${endWallLen(l, "right")}`].filter(Boolean).join(", ")}`);
  return lines.join("\n");
}

/* ---------- geometry: where each wall sits in the room (plan, cm; x right, z toward the room's front) ---------- */
export type WallGeo = { x: number; z: number; dx: number; dz: number; /** room side of the wall */ nx: number; nz: number };

export function wallGeometry(l: KitchenLayout): WallGeo[] {
  const n = l.walls.length;
  // straight and L start on the main wall going right; U starts at the front of the left wall going back
  let dx = n === 3 ? 0 : 1, dz = n === 3 ? -1 : 0;
  let x = 0, z = n === 3 ? l.walls[0].length : 0;
  return l.walls.map((w) => {
    const g = { x, z, dx, dz, nx: -dz, nz: dx };
    x += dx * w.length;
    z += dz * w.length;
    [dx, dz] = [-dz, dx]; // the next wall turns into the room
    return g;
  });
}

/** The wall the island faces (the back wall of an L or U). */
export const mainWallIndex = (l: KitchenLayout) => (l.walls.length === 3 ? 1 : 0);

/** Island placement in plan: centered on the main wall's run, `gap` cm in front of the base cabinets. */
export function islandBox(l: KitchenLayout) {
  if (!l.island) return null;
  const g = wallGeometry(l)[mainWallIndex(l)];
  const w = l.walls[mainWallIndex(l)];
  const h = heightsOf(l);
  const along = w.length / 2;
  const cx = g.x + g.dx * along + g.nx * (h.depth + l.island.gap + l.island.d / 2);
  const cz = g.z + g.dz * along + g.nz * (h.depth + l.island.gap + l.island.d / 2);
  return { cx, cz, w: l.island.w, d: l.island.d };
}

/** Units of a run with their start offset along the wall. */
export const placed = <U extends { w: number }>(us: U[]) => {
  let a = 0;
  return us.map((u) => {
    const p = { ...u, a };
    a += u.w;
    return p;
  });
};

/**
 * The corner cabinet where two runs meet. It is a closed cabinet under the counter; from the front
 * only a filler strip shows (w minus the cabinet depth, e.g. 67 − 60 = 7), never with a handle.
 * At the start of a run the corner square itself belongs to the previous wall, so only the strip
 * part is built there; at the end of a run (the wall before the corner) the whole cabinet is.
 */
export function cornerPart(units: BaseUnit[], index: number, depth: number) {
  const u = units[index];
  const strip = Math.max(0, u.w - depth);
  if (index === 0 && units.length > 1) return { a: depth, w: strip, filler: { a: depth, w: strip } };
  return { a: 0, w: u.w, filler: { a: 0, w: strip } };
}

/** Pieces of the counter: runs of units that carry a counter (not tall units or gaps). */
export function counterSpans(us: BaseUnit[], depth = DEFAULT_HEIGHTS.depth) {
  const spans: { a: number; w: number }[] = [];
  placed(us).forEach((u, i) => {
    if (["fridge", "tall", "tall_oven", "gap"].includes(u.kind)) return;
    let a = u.a, w = u.w;
    if (u.kind === "corner") {
      const c = cornerPart(us, i, depth);
      a = u.a + c.a;
      w = c.w;
      if (w <= 0.01) return;
    }
    const last = spans[spans.length - 1];
    if (last && Math.abs(last.a + last.w - a) < 0.01) last.w += w;
    else spans.push({ a, w });
  });
  return spans;
}

/** Fronts of the tall oven unit, bottom up: drawers (30 each), the oven (60), a lift-up door for
 *  the microwave (60, handle at its bottom), and whatever is left up to the top as one more door. */
export function tallOvenParts(u: BaseUnit, h: LayoutHeights) {
  const drawers = partsOf("tall_oven", u.w, u.n);
  const d1 = h.plinth + drawers * 30, o1 = d1 + 60, m1 = Math.min(h.tall, o1 + 60);
  return { drawers, d0: h.plinth, d1, o1, m1, rest: h.tall - m1 > 2 };
}
