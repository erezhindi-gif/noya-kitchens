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
// Not only kitchens: a TV wall or wall unit is a run with no counter (colors.counter "none"), no plinth
// (h.plinth 0), maybe lifted off the floor (h.floorGap), made of panels and columns of free heights.
import { bluranOf } from "./bluran";

export type BaseKind = "doors" | "drawers" | "sink" | "cooktop" | "oven" | "dishwasher" | "fridge" | "tall" | "tall_oven" | "corner" | "gap" | "panel" | "column" | "open";
export type UpperKind = "doors" | "lift" | "open" | "shelf" | "hood" | "corner" | "gap";

/** What every cabinet can also have: inside = what's behind the fronts; side = a finished panel on its exposed side;
 *  glass = glass doors in a frame (a vitrine); cornerType (corner only): a door on the strip instead of the closed corner */
export type UnitExtras = {
  inside?: { shelves?: number; drawers?: number; pull?: "pantry" | "trash" };
  /** missing = automatic: a side with no wall or cabinet beside it gets a 2 cm side panel */
  side?: "left" | "right" | "both" | "none";
  glass?: "clear" | "smoked";
  cornerType?: "carousel" | "pullout" | "door";
  /** fridge: built = behind fronts like the cabinets */ fridgeType?: "standing" | "built";
  /** cooktop */ hob?: "induction" | "gas"; hobW?: number;
  /** sink */ sink?: { mount?: "under" | "top"; bowls?: 1 | 2; color?: "steel" | "black" | "white"; faucet?: "steel" | "black" | "gold" };
  /** hood: flat = a slim box with no chimney */ hoodType?: "chimney" | "flat";
};

/** n = number of doors, drawers, flaps or shelves (each kind has a sensible default);
 *  color = the unit's own color (e.g. a black fridge): a Bluran shade "bl:CODE", a FRONT_COLORS name or #hex;
 *  fronts = a color per door/drawer of the unit (left to right, top to bottom), empty = the unit's color;
 *  y = bottom above the floor, h = height, d = depth: each falls back to the row's;
 *  panel: a front with no cabinet, in the plane of the fronts; splits = its pieces' heights, bottom up (fronts in the same order);
 *  column: parts stacked bottom up in one width; fronts run over all its parts, bottom part first */
export type ColumnPart = { kind: "doors" | "drawers" | "lift" | "panel" | "niche" | "oven" | "microwave" | "coffee"; h: number; n?: number; d?: number; recess?: number; frame?: number; tv?: boolean; tvGap?: number };
export type BaseUnit = UnitExtras & { kind: BaseKind; w: number; n?: number; color?: string; fronts?: string[]; y?: number; h?: number; d?: number; splits?: number[]; parts?: ColumnPart[]; recess?: number; frame?: number };
/** d = depth, h = height, y = bottom above the floor; each falls back to its row's default;
 *  recess, frame (open only): a niche, its back recess cm behind a frame of that thickness in the plane of the fronts;
 *  tv, tvGap (niches): a black screen on the niche's back, tvGap cm from the frame on all four sides */
export type UpperUnit = UnitExtras & { kind: UpperKind; w: number; n?: number; d?: number; h?: number; y?: number; color?: string; fronts?: string[]; recess?: number; frame?: number; tv?: boolean; tvGap?: number };
/** What the room itself has on a wall; a = distance from the wall's left end, cm. */
export type Opening = { kind: "window" | "door"; a: number; w: number; /** bottom above the floor */ y?: number; h?: number };
export type Obstacle = { kind: "column" | "beam"; a: number; w: number; /** how far it comes out of the wall */ d: number; /** beam: its height under the ceiling */ h?: number };
export type RoomPoint = { kind: "water" | "drain" | "power" | "gas"; a: number; y: number };
export type LayoutWall = {
  length: number; base: BaseUnit[]; upper: UpperUnit[]; /** second row, above the uppers up to the ceiling */ top?: UpperUnit[];
  openings?: Opening[]; obstacles?: Obstacle[]; points?: RoomPoint[];
};

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
  /** cabinets lifted off the floor, cm */ floorGap: number;
};

export type KitchenLayout = {
  walls: LayoutWall[];
  /** An island facing the main wall, with cabinets on the side toward it */
  island?: { w: number; d: number; gap: number; base: BaseUnit[] };
  h?: Partial<LayoutHeights>;
  /** handles: "bar" a handle on every front, "integral" a grip groove cut into the front's edge, "none" push-open */
  colors?: { front?: string; upper?: string; counter?: string; handles?: "bar" | "integral" | "none"; /** the plinth: a Bluran shade, "front" = like the fronts; missing = dark */ plinth?: string };
  /** the counter's edge: over = how far it comes past the fronts (default 2); fallLeft/fallRight = it runs down to the floor at the
   *  kitchen's free end; splash = height of the same stone on the wall above it, 0 or missing = none */
  counter?: { over?: number; fallLeft?: boolean; fallRight?: boolean; splash?: number };
  /** handles: bar or knob, its length (bar), and finish steel/black/gold/bronze. Whether there are handles at all is colors.handles */
  handle?: { style?: "bar" | "knob" | "edge"; length?: number; finish?: string };
  /** lighting: underCabinet = LED strip under the uppers, nicheLed = LED in open cells and niches, spots = ceiling spots, pendants = hanging lights over the island */
  lighting?: { underCabinet?: boolean; nicheLed?: boolean; spots?: number; pendants?: number };
  /** a cornice on top of the highest cabinets: h = its height, or up to the ceiling; over = how far it comes past the fronts */
  cornice?: { h?: number; toCeiling?: boolean; over?: number };
  /** the kitchen's two free ends: "wall" = a wall stands across that end (leftLen/rightLen = how far it runs into the room); missing = open */
  ends?: { left?: "wall"; right?: "wall"; leftLen?: number; rightLen?: number };
};

export const BASE_LABEL: Record<BaseKind, string> = {
  doors: "דלתות", drawers: "מגירות", sink: "כיור", cooktop: "כיריים", oven: "תנור", dishwasher: "מדיח",
  fridge: "מקרר", tall: "ארון גבוה", tall_oven: "ארון גבוה עם תנור", corner: "פינה", gap: "פנוי", panel: "חיפוי", column: "עמודה", open: "תא פתוח",
};
export const CORNER_LABEL: Record<NonNullable<UnitExtras["cornerType"]>, string> = { carousel: "קרוסלה", pullout: "לאמנס", door: "דלת רגילה" };
/** the inside of a cabinet in words */
export const insideText = (u: UnitExtras) => [
  u.inside?.shelves ? `${u.inside.shelves} מדפים` : "", u.inside?.drawers ? `${u.inside.drawers} מגירות פנימיות` : "",
  u.inside?.pull === "pantry" ? "מזווה נשלף" : u.inside?.pull === "trash" ? "פח נשלף" : "",
  u.cornerType ? `פינה: ${CORNER_LABEL[u.cornerType]}` : "",
].filter(Boolean).join(", ");
export const OPENING_LABEL: Record<Opening["kind"], string> = { window: "חלון", door: "דלת" };
export const OBSTACLE_LABEL: Record<Obstacle["kind"], string> = { column: "עמוד", beam: "קורה" };
export const POINT_LABEL: Record<RoomPoint["kind"], string> = { water: "מים", drain: "ניקוז", power: "חשמל", gas: "גז" };
/** where an opening stands, with its defaults */
export const openingBox = (o: Opening) => (o.kind === "door" ? { y: o.y ?? 0, h: o.h ?? 210 } : { y: o.y ?? 100, h: o.h ?? 120 });
export const beamHeight = (o: Obstacle) => o.h ?? 30;
export const PART_LABEL: Record<ColumnPart["kind"], string> = { doors: "דלתות", drawers: "מגירות", lift: "קלפה", panel: "חיפוי", niche: "נישה", oven: "תנור", microwave: "מיקרו", coffee: "מכונת קפה" };
/** Standard appliance widths, cm, offered in the editor */
export const SIZE_PRESETS: Partial<Record<BaseKind | UpperKind, number[]>> = {
  fridge: [60, 70, 75, 90, 95, 120], dishwasher: [45, 60], oven: [60, 90], tall_oven: [60], sink: [45, 60, 80, 90, 120], cooktop: [60, 75, 80, 90, 100, 120], hood: [60, 75, 90, 120],
};
export const HANDLE_FINISH: Record<string, { name: string; hex: string; metal: number }> = {
  steel: { name: "נירוסטה", hex: "#8b8f93", metal: 0.6 }, black: { name: "שחור", hex: "#17171a", metal: 0.3 }, gold: { name: "זהב", hex: "#b08d4a", metal: 0.8 }, bronze: { name: "ברונזה", hex: "#6b4a2f", metal: 0.6 },
};
/** what's set for the handles, with defaults */
export const handleOf = (l: KitchenLayout) => ({ style: l.handle?.style || "bar", length: l.handle?.length || 16, ...(HANDLE_FINISH[l.handle?.finish || "steel"] || HANDLE_FINISH.steel) });
/** Standard widths and what each appliance is, in words */
export const applianceText = (u: BaseUnit | UpperUnit) => {
  switch (u.kind) {
    case "fridge": return `מקרר ${u.w} ${u.fridgeType === "built" ? "אינטגרלי" : "עומד"}`;
    case "cooktop": return `כיריים ${u.hob === "gas" ? "גז" : "אינדוקציה"} ${u.hobW || Math.min(u.w - 8, 60)}`;
    case "oven": return `תנור ${u.w} מתחת למשטח`;
    case "tall_oven": return `תנור ${u.w} ומיקרו בארון גבוה`;
    case "dishwasher": return `מדיח ${u.w} אינטגרלי`;
    case "hood": return `קולט ${u.w} ${u.hoodType === "flat" ? "שטוח" : "עם ארובה"}`;
    case "sink": return `כיור ${u.sink?.bowls === 2 ? "כפול" : "בודד"} ${u.sink?.mount === "top" ? "על המשטח" : "מתחת למשטח"}${u.sink?.color && u.sink.color !== "steel" ? (u.sink.color === "black" ? " שחור" : " לבן") : ""}, ברז ${u.sink?.faucet === "black" ? "שחור" : u.sink?.faucet === "gold" ? "זהב" : "נירוסטה"}`;
    default: return "";
  }
};
export const UPPER_LABEL: Record<UpperKind, string> = {
  doors: "דלתות", lift: "קלפה", open: "מדפים פתוחים", shelf: "מדף צף", hood: "קולט אדים", corner: "פינה", gap: "פנוי",
};

export const DEFAULT_HEIGHTS: LayoutHeights = {
  base: 90, plinth: 10, counter: 4, upperFrom: 145, upper: 70, tall: 220, ceiling: 260, depth: 60, upperDepth: 35, topDepth: 60, floorGap: 0,
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

/** Erez's widest door; wider than this, an upper cabinet up to this high can take a lift-up */
export const DOOR_MAX = 60;
/** A cabinet's depth is its body. The front comes on top of it. */
export const FRONT_THICK = 2;
/** The finished side panel on a side nothing covers */
export const SIDE_PANEL = 2;
/** Erez's standard: the fridge itself is up to 192 cm high; its niche (95 for a 91 fridge) is closed by a 2 cm
 *  panel on each side and a cabinet above it up to the tall cabinets, so a bigger fridge fits later. */
export const FRIDGE_H = 192;
/** a standing fridge's niche: side panels, the fridge, and the cabinet above it (null when there is no room for one) */
export function fridgeNiche(u: BaseUnit, h: LayoutHeights) {
  const top = baseUnitTop(u, h);
  const inner = Math.max(10, u.w - 2 * SIDE_PANEL);
  const fh = Math.min(FRIDGE_H, top);
  const over = top - fh - 1 >= 15 ? { y0: fh + 1, hh: top - fh - 1 } : null;
  return { top, inner, fh, over };
}

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
  none: { name: "בלי משטח", hex: "#f3f2ee" },
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

export const hasCounter = (l: KitchenLayout) => l.colors?.counter !== "none";
export const heightsOf = (l: KitchenLayout): LayoutHeights => ({ ...DEFAULT_HEIGHTS, ...(l.h || {}), ...(hasCounter(l) ? {} : { counter: 0 }) });
/** the screen in a niche: its opening inside the frame, less the gap on each side */
export const tvSize = (w: number, h: number, frame = 2, gap = 4) => ({ w: Math.max(1, w - 2 * frame - 2 * gap), h: Math.max(1, h - 2 * frame - 2 * gap) });

/** where the fronts start */
export const frontsFrom = (h: LayoutHeights) => h.plinth + h.floorGap;

const total = (a: number[]) => a.reduce((x, y) => x + y, 0);
/** the pieces of a panel, bottom up */
export const panelHeights = (u: BaseUnit, h: LayoutHeights) => (u.splits?.length ? u.splits : [u.h ?? h.tall - frontsFrom(h)]);
/** the parts of a column bottom up: where each sits, and which of the column's fronts are its own */
export function columnParts(u: BaseUnit, h: LayoutHeights) {
  let y = u.y ?? frontsFrom(h), from = 0;
  return (u.parts || []).map((p) => {
    const count = ["niche", "oven", "microwave", "coffee"].includes(p.kind) ? 0 : p.kind === "panel" ? 1 : partsOf(p.kind as "doors" | "drawers" | "lift", u.w, p.n, p.kind === "lift");
    const out = { ...p, y0: y, from, count };
    y += p.h;
    from += count;
    return out;
  });
}
/** how high a base unit reaches */
export function baseUnitTop(u: BaseUnit, h: LayoutHeights) {
  const y0 = u.y ?? frontsFrom(h);
  if (u.kind === "panel") return y0 + total(panelHeights(u, h));
  if (u.kind === "column") return y0 + total((u.parts || []).map((p) => p.h));
  if (u.h !== undefined) return y0 + u.h;
  return ["fridge", "tall", "tall_oven"].includes(u.kind) ? h.tall : h.base;
}

/** How many doors / drawers / flaps / shelves a unit shows. */
export function partsOf(kind: BaseKind | UpperKind, w: number, n?: number, upper = false) {
  if (n === 0 && kind === "open") return 0; // a niche with no shelves
  if (n && n > 0) return Math.min(8, Math.round(n));
  if (kind === "drawers" || kind === "cooktop") return 3;
  if (kind === "tall_oven") return 2;
  if (kind === "lift") return 1;
  if (kind === "open") return 2;
  if (kind === "shelf") return 1;
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
        kind: u.kind as K, w: num(u.w, 5, 400, 60), ...(u.n ? { n: num(u.n, 1, 8, 1) } : u.n === 0 && u.kind === "open" ? { n: 0 } : {}),
        ...(typeof u.color === "string" && u.color.trim() ? { color: u.color.trim().slice(0, 30) } : {}),
        ...(Array.isArray(u.fronts) && u.fronts.some((f: unknown) => typeof f === "string" && f) ? { fronts: (u.fronts as unknown[]).slice(0, 8).map((f) => (typeof f === "string" ? f.slice(0, 30) : "")) } : {}),
        ...(u.d ? { d: num(u.d, 5, 120, 35) } : {}), ...(u.h ? { h: num(u.h, 5, 300, 70) } : {}),
        ...(u.y !== undefined && u.y !== null && u.y !== "" ? { y: num(u.y, 0, 400, 145) } : {}),
        ...(u.recess ? { recess: num(u.recess, 0.5, 120, 10) } : {}), ...(u.frame ? { frame: num(u.frame, 0.5, 30, 2) } : {}),
        ...(u.tv ? { tv: true, ...(u.tvGap !== undefined ? { tvGap: num(u.tvGap, 0, 60, 4) } : {}) } : {}),
        ...(u.side === "left" || u.side === "right" || u.side === "both" || u.side === "none" ? { side: u.side as UnitExtras["side"] } : {}),
        ...(u.glass === "clear" || u.glass === "smoked" ? { glass: u.glass as UnitExtras["glass"] } : {}),
        ...(u.fridgeType === "built" || u.fridgeType === "standing" ? { fridgeType: u.fridgeType as UnitExtras["fridgeType"] } : {}),
        ...(u.hob === "gas" || u.hob === "induction" ? { hob: u.hob as UnitExtras["hob"] } : {}),
        ...(u.hobW ? { hobW: num(u.hobW, 30, 200, 60) } : {}),
        ...(u.hoodType === "flat" || u.hoodType === "chimney" ? { hoodType: u.hoodType as UnitExtras["hoodType"] } : {}),
        ...(u.sink && typeof u.sink === "object" ? { sink: u.sink as UnitExtras["sink"] } : {}),
        ...(u.cornerType === "carousel" || u.cornerType === "pullout" || u.cornerType === "door" ? { cornerType: u.cornerType as UnitExtras["cornerType"] } : {}),
        ...(() => {
          const v = (u.inside || {}) as Record<string, unknown>;
          const inside = { ...(v.shelves ? { shelves: num(v.shelves, 1, 8, 2) } : {}), ...(v.drawers ? { drawers: num(v.drawers, 1, 6, 2) } : {}), ...(v.pull === "pantry" || v.pull === "trash" ? { pull: v.pull as "pantry" | "trash" } : {}) };
          return Object.keys(inside).length ? { inside } : {};
        })(),
        ...(Array.isArray(u.splits) && u.splits.length ? { splits: (u.splits as unknown[]).slice(0, 12).map((v) => num(v, 1, 400, 50)) } : {}),
        ...(Array.isArray(u.parts) && u.parts.length ? { parts: (u.parts as Record<string, unknown>[]).slice(0, 12).filter((p) => p && (Object.keys(PART_LABEL) as string[]).includes(p.kind as string)).map((p) => ({
          kind: p.kind as ColumnPart["kind"], h: num(p.h, 1, 400, 70), ...(p.n ? { n: num(p.n, 1, 8, 1) } : {}), ...(p.d ? { d: num(p.d, 5, 120, 40) } : {}),
          ...(p.recess ? { recess: num(p.recess, 0.5, 120, 10) } : {}), ...(p.frame ? { frame: num(p.frame, 0.5, 30, 2) } : {}),
          ...(p.tv ? { tv: true, ...(p.tvGap !== undefined ? { tvGap: num(p.tvGap, 0, 60, 4) } : {}) } : {}),
        })) } : {}),
      }))
      .slice(0, 30);
  const walls = (Array.isArray(r.walls) ? r.walls : []).slice(0, 3).map((w) => {
    const x = (w || {}) as Record<string, unknown>;
    const top = units(x.top, UPPER_KINDS);
    const list = (v: unknown) => (Array.isArray(v) ? v : []).slice(0, 20).map((o) => o as Record<string, unknown>).filter(Boolean);
    const openings = list(x.openings).filter((o) => o.kind === "window" || o.kind === "door").map((o) => ({
      kind: o.kind as Opening["kind"], a: num(o.a, 0, 1500, 0), w: num(o.w, 5, 800, 90),
      ...(o.y !== undefined && o.y !== null && o.y !== "" ? { y: num(o.y, 0, 400, 100) } : {}), ...(o.h ? { h: num(o.h, 5, 400, 120) } : {}),
    }));
    const obstacles = list(x.obstacles).filter((o) => o.kind === "column" || o.kind === "beam").map((o) => ({
      kind: o.kind as Obstacle["kind"], a: num(o.a, 0, 1500, 0), w: num(o.w, 1, 1500, 30), d: num(o.d, 1, 300, 30), ...(o.h ? { h: num(o.h, 1, 200, 30) } : {}),
    }));
    const points = list(x.points).filter((o) => (Object.keys(POINT_LABEL) as string[]).includes(o.kind as string)).map((o) => ({ kind: o.kind as RoomPoint["kind"], a: num(o.a, 0, 1500, 0), y: num(o.y, 0, 400, 60) }));
    return {
      length: num(x.length, 30, 1500, 300), base: units(x.base, BASE_KINDS), upper: units(x.upper, UPPER_KINDS), ...(top.length ? { top } : {}),
      ...(openings.length ? { openings } : {}), ...(obstacles.length ? { obstacles } : {}), ...(points.length ? { points } : {}),
    };
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
      ...(str(c.plinth) ? { plinth: str(c.plinth) } : {}),
    };
  }
  const hd = r.handle as Record<string, unknown> | undefined;
  if (hd && typeof hd === "object") {
    const handle = { ...(hd.style === "bar" || hd.style === "knob" || hd.style === "edge" ? { style: hd.style as "bar" | "knob" | "edge" } : {}), ...(hd.length ? { length: num(hd.length, 3, 200, 16) } : {}), ...(typeof hd.finish === "string" && HANDLE_FINISH[hd.finish] ? { finish: hd.finish } : {}) };
    if (Object.keys(handle).length) out.handle = handle;
  }
  const lg = r.lighting as Record<string, unknown> | undefined;
  if (lg && typeof lg === "object") {
    const lighting = { ...(lg.underCabinet ? { underCabinet: true } : {}), ...(lg.nicheLed ? { nicheLed: true } : {}), ...(lg.spots ? { spots: num(lg.spots, 1, 40, 6) } : {}), ...(lg.pendants ? { pendants: num(lg.pendants, 1, 8, 3) } : {}) };
    if (Object.keys(lighting).length) out.lighting = lighting;
  }
  const cr = r.cornice as Record<string, unknown> | undefined;
  if (cr && (cr.h || cr.toCeiling)) out.cornice = { ...(cr.h ? { h: num(cr.h, 1, 100, 10) } : {}), ...(cr.toCeiling ? { toCeiling: true } : {}), ...(cr.over ? { over: num(cr.over, 0, 20, 2) } : {}) };
  const ct = r.counter as Record<string, unknown> | undefined;
  if (ct && typeof ct === "object") {
    const counter = {
      ...(ct.over !== undefined && ct.over !== null && ct.over !== "" ? { over: num(ct.over, 0, 60, 2) } : {}),
      ...(ct.fallLeft ? { fallLeft: true } : {}), ...(ct.fallRight ? { fallRight: true } : {}),
      ...(ct.splash ? { splash: num(ct.splash, 1, 150, 55) } : {}),
    };
    if (Object.keys(counter).length) out.counter = counter;
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
    const wide = (x: BaseUnit | UpperUnit) => x.kind === "doors" || x.kind === "sink" ? x.w / partsOf(x.kind, x.w, x.n) > DOOR_MAX + 0.5 : x.kind === "tall" && x.w > DOOR_MAX + 0.5;
    for (const x of [...w.base, ...(w.top || []), ...w.upper]) if (wide(x)) {
      const row = w.upper.includes(x as UpperUnit) ? upperBox(x as UpperUnit, heightsOf(l), "upper") : (w.top || []).includes(x as UpperUnit) ? upperBox(x as UpperUnit, heightsOf(l), "top") : null;
      out.push(`${wallName(l, i)}: דלת רחבה מ-${DOOR_MAX} ס״מ ב${x.kind === "tall" ? "ארון גבוה" : "ארון"} ${x.w}. ${row && row.hh <= DOOR_MAX + 0.5 ? "אפשר קלפה, או לחלק ליותר דלתות" : "צריך לחלק ליותר דלתות"}`);
    }
    for (const row of [w.upper, w.top || []]) for (const x of row) if (x.kind === "lift" && x.w > DOOR_MAX + 0.5 && upperBox(x, heightsOf(l), row === w.upper ? "upper" : "top").hh > DOOR_MAX + 0.5) out.push(`${wallName(l, i)}: קלפה ברוחב ${x.w} יכולה להיות עד גובה ${DOOR_MAX} ס״מ`);
    for (const x of w.base) if (x.kind === "corner" && x.cornerType && x.w - heightsOf(l).depth < 25) out.push(`${wallName(l, i)}: פינה עם דלת צריכה לפחות ${heightsOf(l).depth + 25} ס״מ, כדי שהדלת תיפתח (היום ${x.w})`);
    const hh = heightsOf(l);
    const hits = (a0: number, a1: number, b0: number, b1: number) => a0 < b1 - 0.5 && b0 < a1 - 0.5;
    const cabinets = [
      ...placed(w.base).filter((x) => x.kind !== "gap").map((x) => ({ a: x.a, w: x.w, y0: x.y ?? frontsFrom(hh), y1: baseUnitTop(x, hh) })),
      ...placed(w.upper).filter((x) => x.kind !== "gap" && x.kind !== "corner").map((x) => { const b = upperBox(x, hh, "upper"); return { a: x.a, w: x.w, y0: b.y0, y1: b.y0 + b.hh }; }),
      ...placed(w.top || []).filter((x) => x.kind !== "gap" && x.kind !== "corner").map((x) => { const b = upperBox(x, hh, "top"); return { a: x.a, w: x.w, y0: b.y0, y1: b.y0 + b.hh }; }),
    ];
    for (const o of w.openings || []) {
      const b = openingBox(o);
      if (o.a + o.w > w.length + 0.5) out.push(`${wallName(l, i)}: ה${OPENING_LABEL[o.kind]} יוצא/ת מהקיר`);
      if (cabinets.some((x) => hits(x.a, x.a + x.w, o.a, o.a + o.w) && hits(x.y0, x.y1, b.y, b.y + b.h))) out.push(`${wallName(l, i)}: ארון מסתיר את ה${OPENING_LABEL[o.kind]} ב-${o.a} ס״מ מהקצה`);
    }
    for (const o of w.obstacles || []) {
      if (o.kind === "column" && cabinets.some((x) => hits(x.a, x.a + x.w, o.a, o.a + o.w))) out.push(`${wallName(l, i)}: ארון נכנס בעמוד ב-${o.a} ס״מ מהקצה`);
      if (o.kind === "beam" && cabinets.some((x) => hits(x.a, x.a + x.w, o.a, o.a + o.w) && x.y1 > hh.ceiling - beamHeight(o) + 0.5)) out.push(`${wallName(l, i)}: ארון נכנס בקורה ב-${o.a} ס״מ מהקצה`);
    }
    const reach = Math.max(0, ...w.base.map((x) => baseUnitTop(x, heightsOf(l))));
    if (reach > heightsOf(l).ceiling + 0.5) out.push(`${wallName(l, i)}: הארונות מגיעים ל-${reach} ס״מ, מעל התקרה (${heightsOf(l).ceiling} ס״מ)`);
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
  const u = (x: UnitExtras & { kind: string; w: number; n?: number; d?: number; h?: number; y?: number; color?: string; fronts?: string[]; recess?: number; frame?: number; tv?: boolean; tvGap?: number; splits?: number[]; parts?: ColumnPart[] }, lab: Record<string, string>) =>
    `${lab[x.kind]} ${x.w}${x.n !== undefined ? ` (${x.n})` : ""}${x.d ? ` עומק ${x.d}` : ""}${x.h ? ` גובה ${x.h}` : ""}${x.y !== undefined ? ` מ-${x.y}` : ""}${insideText(x) ? ` [${insideText(x)}]` : ""}${x.glass ? ` ויטרינה ${x.glass === "smoked" ? "מעושנת" : "שקופה"}` : ""}${x.side ? (x.side === "none" ? " בלי דופן גלויה" : ` דופן גלויה ${x.side === "both" ? "משני הצדדים" : x.side === "left" ? "משמאל" : "מימין"}`) : ""}${x.recess ? ` עומק פנימי ${x.recess}` : ""}${x.frame ? ` מסגרת ${x.frame}` : ""}${x.tv && x.h ? ` טלוויזיה ${tvSize(x.w, x.h, x.frame, x.tvGap).w}×${tvSize(x.w, x.h, x.frame, x.tvGap).h}` : x.tv ? " טלוויזיה" : ""}${x.splits?.length ? ` חלוקה מלמטה ${x.splits.join(", ")}` : ""}${x.parts?.length ? ` מלמטה למעלה: ${x.parts.map((p) => `${PART_LABEL[p.kind]} ${p.h}${p.n ? ` (${p.n})` : ""}${p.recess ? ` עומק פנימי ${p.recess}` : ""}${p.frame ? ` מסגרת ${p.frame}` : ""}${p.tv ? ` טלוויזיה ${tvSize(x.w, p.h, p.frame, p.tvGap).w}×${tvSize(x.w, p.h, p.frame, p.tvGap).h}` : ""}`).join(", ")}` : ""}${x.color ? ` [${colorName(x.color)}]` : ""}${x.fronts?.some(Boolean) ? ` [חזיתות: ${x.fronts.map((f, i) => (f ? `${i + 1}=${colorName(f)}` : "")).filter(Boolean).join(", ")}]` : ""}`;
  const roomItems = (w: LayoutWall) => [
    ...(w.openings || []).map((o) => `${OPENING_LABEL[o.kind]} מ-${o.a}, רוחב ${o.w}, מגובה ${openingBox(o).y}, גובה ${openingBox(o).h}`),
    ...(w.obstacles || []).map((o) => `${OBSTACLE_LABEL[o.kind]} מ-${o.a}, רוחב ${o.w}, בולט ${o.d}${o.kind === "beam" ? `, גובה ${beamHeight(o)}` : ""}`),
    ...(w.points || []).map((o) => `נקודת ${POINT_LABEL[o.kind]} מ-${o.a} בגובה ${o.y}`),
  ];
  const lines = l.walls.map((w, i) =>
    `${wallName(l, i)} ${w.length} ס״מ${roomItems(w).length ? `\n  בקיר: ${roomItems(w).join(" | ")}` : ""}\n  תחתון: ${w.base.map((x) => u(x, BASE_LABEL)).join(" | ") || "—"}\n  עליון: ${w.upper.map((x) => u(x, UPPER_LABEL)).join(" | ") || "—"}${w.top?.length ? `
  שורה עליונה: ${w.top.map((x) => u(x, UPPER_LABEL)).join(" | ")}` : ""}`);
  if (l.island) lines.push(`אי ${l.island.w}×${l.island.d}, מרחק ${l.island.gap} מהארונות: ${l.island.base.map((x) => u(x, BASE_LABEL)).join(" | ") || "—"}`);
  lines.push(`גבהים: ${hasCounter(l) ? `משטח ${h.base}` : "בלי משטח"}${h.plinth !== DEFAULT_HEIGHTS.plinth ? `, סוקל ${h.plinth}` : ""}${h.floorGap ? `, ניתוק מהרצפה ${h.floorGap}` : ""}, עומק ${h.depth}, עליונים מ-${h.upperFrom} בגובה ${h.upper} ועומק ${h.upperDepth}, שורה עליונה בעומק ${h.topDepth}, ארון גבוה ${h.tall}, תקרה ${h.ceiling}`);
  for (const s of sinkCenters(l)) lines.push(`מרכז כיור: ${s.wall}, ${s.from} ס״מ מהקצה השמאלי של הקיר`);
  const apps = [...l.walls.flatMap((w) => [...w.base, ...w.upper]), ...(l.island?.base || [])].map(applianceText).filter(Boolean);
  if (apps.length) lines.push(`מכשירים: ${apps.join(", ")}`);
  if (l.handle) lines.push(`ידית: ${l.handle.style === "knob" ? "כפתור" : l.handle.style === "edge" ? "פרופיל בקצה" : `קשת ${l.handle.length || 16}`} ${HANDLE_FINISH[l.handle.finish || "steel"]?.name}`);
  if (l.lighting) lines.push(`תאורה: ${[l.lighting.underCabinet && "פס לד מתחת לעליונים", l.lighting.nicheLed && "לד בנישות", l.lighting.spots && `${l.lighting.spots} ספוטים`, l.lighting.pendants && `${l.lighting.pendants} תליונים`].filter(Boolean).join(", ")}`);
  if (l.cornice) lines.push(`קרניז: ${l.cornice.toCeiling ? "עד התקרה" : `גובה ${l.cornice.h}`}, בליטה ${l.cornice.over ?? 2}`);
  if (l.counter) lines.push(`משטח: בליטה ${l.counter.over ?? 2}${l.counter.fallLeft ? ", מפל משמאל" : ""}${l.counter.fallRight ? ", מפל מימין" : ""}${l.counter.splash ? `, חיפוי קיר בגובה ${l.counter.splash}` : ""}`);
  const c = l.colors || {};
  lines.push(`צבעים: חזיתות ${colorName(c.front)}${c.upper ? `, עליונים ${colorName(c.upper)}` : ""}${hasCounter(l) ? `, משטח ${COUNTER_COLORS[c.counter || "white_stone"]?.name || c.counter}` : ", בלי משטח"}${c.handles === "none" ? ", בלי ידיות" : c.handles === "integral" ? ", ידית אינטגרלית" : ""}`);
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
  const cx = g.x + g.dx * along + g.nx * (h.depth + FRONT_THICK + l.island.gap + l.island.d / 2);
  const cz = g.z + g.dz * along + g.nz * (h.depth + FRONT_THICK + l.island.gap + l.island.d / 2);
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

/** The cornice of a wall: above the highest cabinets at each place along the wall */
export function corniceBoxes(l: KitchenLayout, w: Pick<LayoutWall, "length" | "base" | "upper" | "top">) {
  if (!l.cornice) return [];
  const h = heightsOf(l);
  const boxes = [
    ...placed(w.base).filter((u) => ["tall", "tall_oven", "fridge", "column", "panel"].includes(u.kind) || (u.h !== undefined)).map((u) => ({ a: u.a, w: u.w, top: baseUnitTop(u, h), d: u.d ?? h.depth })),
    ...placed(w.upper).filter((u) => !["gap", "corner", "hood", "shelf"].includes(u.kind)).map((u) => { const b = upperBox(u, h, "upper"); return { a: u.a, w: u.w, top: b.y0 + b.hh, d: b.d }; }),
    ...placed(w.top || []).filter((u) => !["gap", "corner", "hood", "shelf"].includes(u.kind)).map((u) => { const b = upperBox(u, h, "top"); return { a: u.a, w: u.w, top: b.y0 + b.hh, d: b.d }; }),
  ];
  return boxes
    .filter((b) => !boxes.some((o) => o !== b && o.top > b.top + 0.5 && o.a < b.a + b.w - 0.5 && b.a < o.a + o.w - 0.5))
    .map((b) => ({ a: b.a, w: b.w, y: b.top, d: b.d, h: l.cornice!.toCeiling ? Math.max(0, h.ceiling - b.top) : Math.min(l.cornice!.h ?? 10, Math.max(0, h.ceiling - b.top)) }))
    .filter((b) => b.h > 0.01);
}

/** Which sides of a unit get a 2 cm side panel: those with no wall and no cabinet beside them, unless the unit says otherwise. */
export function sidesOf(l: KitchenLayout, at: number | "island", row: "base" | UpperRow, index: number) {
  const none = { left: false, right: false };
  const h = heightsOf(l), wall = at === "island" ? null : l.walls[at];
  const base = at === "island" ? l.island?.base || [] : wall!.base, upper = wall?.upper || [], top = wall?.top || [];
  const u = (row === "base" ? base : row === "upper" ? upper : top)[index] as (BaseUnit & UpperUnit) | undefined;
  if (!u) return none;
  if (u.side === "none") return none;
  if (u.side) return { left: u.side !== "right", right: u.side !== "left" };
  // a standing fridge has its own side panels (fridgeNiche)
  if (["gap", "corner", "hood", "shelf", "panel", "open", "oven"].includes(u.kind as string) || ((u.kind as string) === "fridge" && u.fridgeType !== "built")) return none;
  const range = (x: BaseUnit | UpperUnit, r: "base" | UpperRow) => {
    if (r !== "base") { const b = upperBox(x as UpperUnit, h, r); return { y0: b.y0, y1: b.y0 + b.hh }; }
    const bu = x as BaseUnit;
    return { y0: bu.y ?? frontsFrom(h), y1: baseUnitTop(bu, h) - (["fridge", "tall", "tall_oven", "panel", "column"].includes(bu.kind) || bu.h !== undefined ? 0 : h.counter) };
  };
  const covers = (x: { kind: string; fridgeType?: string }) => !["gap", "hood"].includes(x.kind) && x.kind !== "shelf";
  const all = [
    ...placed(base).filter(covers).map((x) => ({ a: x.a, b: x.a + x.w, ...range(x, "base") })),
    ...placed(upper).filter(covers).map((x) => ({ a: x.a, b: x.a + x.w, ...range(x, "upper") })),
    ...placed(top).filter(covers).map((x) => ({ a: x.a, b: x.a + x.w, ...range(x, "top") })),
  ];
  const me = placed<{ w: number }>(row === "base" ? base : row === "upper" ? upper : top)[index];
  const mine = range(u, row), tall = mine.y1 - mine.y0;
  const covered = (x: number, side: "a" | "b") => all.some((o) => Math.abs(o[side] - x) < 0.6 && Math.min(o.y1, mine.y1) - Math.max(o.y0, mine.y0) > tall * 0.9);
  const a = me.a, b = me.a + me.w;
  const wallAtLeft = at !== "island" && a < 0.6 && (at > 0 || !!l.ends?.left);
  const wallAtRight = at !== "island" && !!wall && b > wall.length - 0.6 && (at < l.walls.length - 1 || !!l.ends?.right);
  return { left: !wallAtLeft && !covered(a, "b"), right: !wallAtRight && !covered(b, "a") };
}

/** Pieces of the counter: runs of units that carry a counter (not tall units or gaps). */
export function counterSpans(us: BaseUnit[], depth = DEFAULT_HEIGHTS.depth) {
  const spans: { a: number; w: number }[] = [];
  placed(us).forEach((u, i) => {
    if (["fridge", "tall", "tall_oven", "gap", "panel", "column"].includes(u.kind) || u.y !== undefined || u.h !== undefined) return;
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
  const d0 = frontsFrom(h), d1 = d0 + drawers * 30, o1 = d1 + 60, m1 = Math.min(h.tall, o1 + 60);
  return { drawers, d0, d1, o1, m1, rest: h.tall - m1 > 2 };
}
