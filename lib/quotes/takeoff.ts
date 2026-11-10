// What a plan means for the workshop: numbered cabinets, fronts to order from Bluran, carcass parts to cut,
// hardware to buy, panels and quantities for the quote. Everything is worked out from the same centimeters
// as the drawing. The building rules below are defaults Erez can change in the settings.
import {
  BASE_LABEL, PART_LABEL, UPPER_LABEL, applianceText, baseUnitTop, colorName, columnParts, cornerPart, corniceBoxes, frontsFrom, hasCounter, heightsOf, panelHeights, partsOf, placed, sidesOf, tallOvenParts, tvSize, upperBox, wallName, SIDE_PANEL, FRONT_THICK, fridgeNiche, wallSides, WALL_FILLER,
  type BaseUnit, type KitchenLayout, type LayoutHeights, type UpperUnit,
} from "./layout";

export type ShopRules = {
  /** carcass board thickness */ board: number;
  /** back panel thickness */ back: number;
  /** gap between fronts */ frontGap: number;
  /** a shelf is this much shallower than the cabinet */ shelfSetback: number;
};
export const DEFAULT_RULES: ShopRules = { board: 1.8, back: 0.5, frontGap: 0.3, shelfSetback: 2 };

export type Cabinet = { no: string; wall: string; row: string; kind: string; from: number; bottom: number; w: number; h: number; d: number; fronts: number; note: string };
export type Piece = { of: string; name: string; w: number; h: number; qty: number; color?: string };
export type Hardware = { name: string; qty: number; of: string[] };
export type Takeoff = {
  cabinets: Cabinet[];
  fronts: Piece[];
  carcass: Piece[];
  panels: Piece[];
  hardware: Hardware[];
  appliances: { of: string; text: string }[];
  /** for the quote: running meters by row, square meters of fronts, per the kitchen or wall unit rule */
  meters: { base: number; upper: number; top: number; tall: number; fridge: number; corner: number; frontsArea: number; panelsArea: number; counter: number; plinth: number; cornice: number; splashArea: number };
  points: { wall: string; kind: string; from: number; height: number }[];
};

const r1 = (v: number) => Math.round(v * 10) / 10;
const LETTERS = ["א", "ב", "ג", "ד"];

export function takeoff(l: KitchenLayout, rules: ShopRules = DEFAULT_RULES): Takeoff {
  const h = heightsOf(l);
  const out: Takeoff = { cabinets: [], fronts: [], carcass: [], panels: [], hardware: [], appliances: [], points: [], meters: { base: 0, upper: 0, top: 0, tall: 0, fridge: 0, corner: 0, frontsArea: 0, panelsArea: 0, counter: 0, plinth: 0, cornice: 0, splashArea: 0 } };
  const front = l.colors?.front, upperColor = l.colors?.upper || front;

  const hw = (name: string, qty: number, of: string) => {
    if (qty <= 0) return;
    const hit = out.hardware.find((x) => x.name === name);
    if (hit) { hit.qty += qty; if (!hit.of.includes(of)) hit.of.push(of); }
    else out.hardware.push({ name, qty, of: [of] });
  };
  const addFront = (of: string, name: string, w: number, hh: number, qty: number, color?: string) => {
    const fw = r1(w - rules.frontGap), fh = r1(hh - rules.frontGap);
    const col = color ? colorName(color) : "";
    const same = out.fronts.find((x) => x.of === of && x.name === name && x.w === fw && x.h === fh && x.color === col);
    if (same) same.qty += qty; else out.fronts.push({ of, name, w: fw, h: fh, qty, color: col });
    out.meters.frontsArea += (fw * fh * qty) / 10000;
  };
  // Erez's rule: no more than 60 cm between hinges
  const hinges = (hh: number) => Math.max(2, Math.ceil((hh - 10) / 60) + 1);
  /** The box of one cabinet, as Erez builds it: the sides run the full height and hold the top and bottom between them;
   *  the back sits on the outside of the body, so it takes the body's outer size and the rest are shorter by its thickness. */
  const box = (of: string, w: number, hh: number, d: number, shelves = 0) => {
    const t = rules.board, inner = r1(w - 2 * t), deep = r1(d - rules.back);
    out.carcass.push({ of, name: "דופן", w: deep, h: r1(hh), qty: 2 });
    out.carcass.push({ of, name: "תחתית ותקרה", w: inner, h: deep, qty: 2 });
    out.carcass.push({ of, name: "גב", w: r1(w), h: r1(hh), qty: 1 });
    if (shelves) out.carcass.push({ of, name: "מדף", w: inner, h: r1(deep - rules.shelfSetback), qty: shelves });
  };
  const inside = (of: string, u: { inside?: BaseUnit["inside"] }) => {
    hw("מגירה פנימית", u.inside?.drawers || 0, of);
    if (u.inside?.pull === "pantry") hw("מזווה נשלף", 1, of);
    if (u.inside?.pull === "trash") hw("פח נשלף", 1, of);
  };
  const colorAt = (u: { color?: string; fronts?: string[] }, i: number, base?: string) => u.fronts?.[i] || u.color || base;

  /** a finished 2 cm panel on every side nothing covers */
  /** topY: where the panels end; beside a lower unit a panel starts on its counter (leftFrom/rightFrom) */
  const sidePanels = (of: string, sides: { left: boolean; right: boolean; leftFrom?: number; rightFrom?: number }, d: number, hh: number, color?: string, topY?: number) => {
    const froms: (number | undefined)[] = [];
    if (sides.left) froms.push(sides.leftFrom);
    if (sides.right) froms.push(sides.rightFrom);
    for (const from of froms) {
      const ph = r1(from !== undefined && topY !== undefined ? topY - from : hh);
      const same = out.panels.find((x) => x.of === of && x.name.startsWith("דופן גלויה") && x.h === ph);
      if (same) same.qty += 1;
      else out.panels.push({ of, name: `דופן גלויה ${SIDE_PANEL} ס״מ`, w: r1(d + FRONT_THICK), h: ph, qty: 1, color: colorName(color) });
    }
  };
  const doBase = (units: BaseUnit[], letter: string, wall: string, depth: number, at: number | "island") => {
    const f0 = frontsFrom(h), f1 = h.base - h.counter;
    let seq = 0;
    placed(units).forEach((u0, i) => {
      if (u0.kind === "gap") return;
      const no = `${letter}${++seq}`, by = u0.y ?? f0, d = u0.d ?? depth, top = baseUnitTop(u0, h), label = BASE_LABEL[u0.kind];
      // against a wall: a 2 cm filler on that side, and the cabinet is built that much narrower
      const ws = wallSides(l, at, "base", i), wn = (ws.left ? 1 : 0) + (ws.right ? 1 : 0);
      if (wn) out.panels.push({ of: no, name: `הלבשה לקיר ${WALL_FILLER} ס״מ`, w: r1(d + FRONT_THICK), h: r1(top - by + (u0.y === undefined ? h.plinth + h.floorGap : 0)), qty: wn, color: colorName(u0.color || front) });
      const u = wn ? { ...u0, a: u0.a + (ws.left ? WALL_FILLER : 0), w: r1(u0.w - wn * WALL_FILLER) } : u0;
      if (applianceText(u)) out.appliances.push({ of: no, text: applianceText(u) });
      const add = (hh: number, fronts: number, note = "") => out.cabinets.push({ no, wall, row: "תחתון", kind: label, from: u.a, bottom: by, w: u.w, h: r1(hh), d, fronts, note });
      if (u.kind === "corner") {
        const c = cornerPart(units, i, depth);
        if (c.w <= 0.01) return void seq--;
        const fh = f1 - f0;
        add(fh, u.cornerType ? 1 : 0, u.cornerType === "carousel" ? "קרוסלה" : u.cornerType === "pullout" ? "לאמנס" : u.cornerType === "door" ? "דלת" : "פינה סגורה");
        box(no, c.w, fh, depth);
        if (c.filler.w > 0.01) {
          if (u.cornerType) addFront(no, "דלת פינה", c.filler.w, fh, 1, u.color || front);
          else out.panels.push({ of: no, name: "פס חזית", w: r1(c.filler.w), h: r1(fh), qty: 1, color: colorName(u.color || front) });
        }
        if (u.cornerType === "carousel") hw("מנגנון קרוסלה", 1, no);
        if (u.cornerType === "pullout") hw("מנגנון פינה לאמנס", 1, no);
        if (u.cornerType) hw("ציר", hinges(fh), no);
        return;
      }
      if (u.kind === "fridge" && u.fridgeType === "built") {
        add(h.tall, 2, "מקרר אינטגרלי");
        const fz = h.tall * 0.36;
        addFront(no, "חזית מקרר עליונה", u.w, h.tall - fz, 1, u.color || front);
        addFront(no, "חזית מקפיא", u.w, fz, 1, u.color || front);
        return;
      }
      if (u.kind === "fridge") {
        // Erez's standard niche: formica on the neighbors' sides, a 2 cm side panel where the fridge ends the kitchen,
        // a cabinet with a flap above the fridge up to the tall cabinets
        const nn = fridgeNiche(u, h);
        const sides = sidesOf(l, at, "base", i);
        sidePanels(no, sides, d, nn.top, front, nn.top);
        const formica = 2 - (sides.left ? 1 : 0) - (sides.right ? 1 : 0);
        const niche = `נישה למקרר ${nn.inner} רוחב ו-${nn.fh} גובה${formica ? `, פורמייקה על ${formica === 2 ? "שתי הדפנות" : "הדופן"} של הארון שליד` : ""}`;
        if (!nn.over) return add(nn.top, 0, niche);
        out.cabinets.push({ no, wall, row: "תחתון", kind: "ארון מעל מקרר", from: u.a, bottom: nn.over.y0, w: nn.inner, h: r1(nn.over.hh), d, fronts: 1, note: niche });
        box(no, nn.inner, nn.over.hh, d);
        addFront(no, "קלפה מעל מקרר", nn.inner, nn.over.hh, 1, u.fronts?.[0] || front);
        hw("מנגנון קלפה", 1, no);
        return;
      }
      if (u.kind === "panel") {
        panelHeights(u, h).forEach((ph, k) => out.panels.push({ of: no, name: "חיפוי", w: r1(u.w), h: r1(ph), qty: 1, color: colorName(colorAt(u, k, front)) }));
        return add(top - by, 0, `עומק ${d}`);
      }
      if (u.kind === "column") {
        const parts = columnParts(u, h);
        add(top - by, parts.reduce((a, p) => a + p.count, 0), "עמודה");
        sidePanels(no, sidesOf(l, at, "base", i), d, top - by + (u.y === undefined ? h.plinth + h.floorGap : 0), u.color || front, top);
        parts.forEach((p, k) => {
          const pd = p.d ?? d, ofp = `${no}/${k + 1}`;
          if (p.kind === "niche") {
            const t = p.frame ?? 2, recess = p.recess ?? 10;
            out.panels.push({ of: ofp, name: "מסגרת נישה, עליון ותחתון", w: r1(u.w), h: recess, qty: 2, color: colorName(u.color || front) });
            out.panels.push({ of: ofp, name: "מסגרת נישה, צדדים", w: r1(p.h - 2 * t), h: recess, qty: 2, color: colorName(u.color || front) });
            out.panels.push({ of: ofp, name: "גב נישה", w: r1(u.w - 2 * t), h: r1(p.h - 2 * t), qty: 1, color: colorName(u.color || front) });
            if (p.tv) { const s = tvSize(u.w, p.h, t, p.tvGap); out.points.push({ wall, kind: `טלוויזיה ${s.w} על ${s.h}, חשמל ותקשורת בנישה`, from: u.a + u.w / 2, height: p.y0 + p.h / 2 }); }
            return;
          }
          box(ofp, u.w, p.h, pd);
          if (p.kind === "panel") return addFront(ofp, "חזית", u.w, p.h, 1, colorAt(u, p.from, front));
          if (p.kind === "oven" || p.kind === "microwave" || p.kind === "coffee") return void out.appliances.push({ of: ofp, text: `${PART_LABEL[p.kind]} ${u.w}, פתח בגובה ${p.h}` });
          for (let n = 0; n < p.count; n++) {
            if (p.kind === "doors") addFront(ofp, "דלת", u.w / p.count, p.h, 1, colorAt(u, p.from + n, front));
            if (p.kind === "drawers") addFront(ofp, "מגירה", u.w, p.h / p.count, 1, colorAt(u, p.from + n, front));
            if (p.kind === "lift") addFront(ofp, "קלפה", u.w, p.h / p.count, 1, colorAt(u, p.from + n, front));
          }
          if (p.kind === "doors") hw("ציר", p.count * hinges(p.h), ofp);
          if (p.kind === "drawers") hw("מגירה", p.count, ofp);
          if (p.kind === "lift") hw("מנגנון קלפה", p.count, ofp);
        });
        return;
      }
      if (u.kind === "open") {
        add(top - by, 0, "תא פתוח");
        box(no, u.w, u.h ?? f1 - by, d, partsOf("open", u.w, u.n));
        return;
      }
      const tall = u.kind === "tall" || u.kind === "tall_oven";
      const bh = (u.h !== undefined ? by + u.h : tall ? h.tall : f1) - by, n = partsOf(u.kind, u.w, u.n);
      const shelves = u.inside?.shelves || 0;
      inside(no, u);
      box(no, u.w, bh, d, shelves);
      sidePanels(no, sidesOf(l, at, "base", i), d, bh + (u.y === undefined ? h.plinth + h.floorGap : 0), u.color || front, by + bh);
      switch (u.kind) {
        case "doors":
        case "sink": {
          add(bh, n);
          for (let k = 0; k < n; k++) addFront(no, u.glass ? "דלת ויטרינה" : "דלת", u.w / n, bh, 1, colorAt(u, k, front));
          hw("ציר", n * hinges(bh), no);
          if (u.kind === "sink") out.points.push({ wall, kind: "מרכז כיור", from: u.a + u.w / 2, height: h.base });
          break;
        }
        case "drawers":
        case "cooktop": {
          add(bh, n, u.kind === "cooktop" ? "מתחת לכיריים" : "");
          for (let k = 0; k < n; k++) addFront(no, "מגירה", u.w, bh / n, 1, colorAt(u, k, front));
          hw("מגירה", n, no);
          break;
        }
        case "dishwasher":
          add(bh, 1, "מדיח, בלי ארון בפועל");
          out.carcass.splice(out.carcass.length - (shelves ? 4 : 3), shelves ? 4 : 3);
          addFront(no, "חזית מדיח", u.w, bh, 1, colorAt(u, 0, front));
          break;
        case "oven": {
          const dr = Math.min(18, bh * 0.25);
          add(bh, 1, "תנור מתחת למשטח");
          addFront(no, "מגירה", u.w, dr, 1, colorAt(u, 0, front));
          hw("מגירה", 1, no);
          break;
        }
        case "tall": {
          add(bh, n, u.inside?.pull === "pantry" ? "מזווה" : "");
          for (let k = 0; k < n; k++) addFront(no, "דלת", u.w, bh / n, 1, colorAt(u, k, front));
          hw("ציר", n * hinges(bh / n), no);
          break;
        }
        case "tall_oven": {
          const t = tallOvenParts(u, h), dh = (t.d1 - t.d0) / t.drawers;
          add(bh, t.drawers + (t.m1 > t.o1 + 2 ? 1 : 0) + (t.rest ? 1 : 0), "תנור 60 ומיקרו");
          for (let k = 0; k < t.drawers; k++) addFront(no, "מגירה", u.w, dh, 1, colorAt(u, k, front));
          hw("מגירה", t.drawers, no);
          if (t.m1 > t.o1 + 2) { addFront(no, "קלפת מיקרו", u.w, t.m1 - t.o1, 1, colorAt(u, t.drawers, front)); hw("מנגנון קלפה למיקרו", 1, no); }
          if (t.rest) { addFront(no, "דלת עליונה", u.w, h.tall - t.m1, 1, colorAt(u, t.drawers + 1, front)); hw("ציר", hinges(h.tall - t.m1), no); }
          break;
        }
      }
    });
    return seq;
  };

  const doUpper = (units: UpperUnit[], row: "upper" | "top", letter: string, wall: string, start: number, at: number) => {
    let seq = start;
    for (const [idx, u0] of Array.from(placed(units).entries())) {
      if (u0.kind === "hood") out.appliances.push({ of: "עליון", text: applianceText(u0) });
      if (["gap", "corner", "hood"].includes(u0.kind)) continue;
      const no = `${letter}${++seq}`, b = upperBox(u0, h, row), label = UPPER_LABEL[u0.kind], rowName = row === "upper" ? "עליון" : "שורה עליונה";
      // against a wall: a 2 cm filler on that side, and the cabinet is built that much narrower
      const ws = wallSides(l, at, row, idx), wn = (ws.left ? 1 : 0) + (ws.right ? 1 : 0);
      if (wn) out.panels.push({ of: no, name: `הלבשה לקיר ${WALL_FILLER} ס״מ`, w: r1(b.d + FRONT_THICK), h: r1(b.hh), qty: wn, color: colorName(u0.color || upperColor) });
      const u = wn ? { ...u0, a: u0.a + (ws.left ? WALL_FILLER : 0), w: r1(u0.w - wn * WALL_FILLER) } : u0;
      const n = partsOf(u.kind, u.w, u.n, true);
      const add = (fronts: number, note = "") => out.cabinets.push({ no, wall, row: rowName, kind: label, from: u.a, bottom: b.y0, w: u.w, h: b.hh, d: b.d, fronts, note });
      if (u.kind === "shelf") {
        add(0, "מדף צף");
        out.panels.push({ of: no, name: "מדף צף", w: r1(u.w), h: b.d, qty: n, color: colorName(u.color || upperColor) });
        hw("מתלה מדף צף", n * Math.max(2, Math.ceil(u.w / 60)), no);
        continue;
      }
      box(no, u.w, b.hh, b.d, u.kind === "open" ? n : u.inside?.shelves || 0);
      inside(no, u);
      sidePanels(no, sidesOf(l, at, row, idx), b.d, b.hh, u.color || upperColor, b.y0 + b.hh);
      if (u.kind === "open") { add(0, "מדפים פתוחים"); continue; }
      add(n);
      if (u.kind === "doors") {
        for (let k = 0; k < n; k++) addFront(no, u.glass ? "דלת ויטרינה" : "דלת", u.w / n, b.hh, 1, colorAt(u, k, upperColor));
        hw("ציר", n * hinges(b.hh), no);
      } else {
        for (let k = 0; k < n; k++) addFront(no, "קלפה", u.w, b.hh / n, 1, colorAt(u, k, upperColor));
        hw("מנגנון קלפה", n, no);
      }
    }
    return seq;
  };

  const sumW = <U extends { kind: string; w: number }>(us: U[], f: (u: U) => boolean) => us.filter(f).reduce((a, u) => a + u.w, 0) / 100;
  const isTall = (u: BaseUnit) => ["tall", "tall_oven", "column", "panel"].includes(u.kind) || (u.kind !== "fridge" && baseUnitTop(u, h) > h.base + 1);

  l.walls.forEach((w, i) => {
    const name = wallName(l, i), letter = LETTERS[i] || String(i + 1);
    const seq = doBase(w.base, letter, name, h.depth, i);
    const seq2 = doUpper(w.upper, "upper", letter, name, seq, i);
    doUpper(w.top || [], "top", letter, name, seq2, i);
    for (const p of w.points || []) out.points.push({ wall: name, kind: ({ water: "מים", drain: "ניקוז", power: "חשמל", gas: "גז" } as const)[p.kind], from: p.a, height: p.y });
    out.meters.base += sumW(w.base, (u) => !["gap", "fridge"].includes(u.kind) && !isTall(u));
    out.meters.fridge += sumW(w.base, (u) => u.kind === "fridge");
    out.meters.corner += sumW(w.base, (u) => u.kind === "corner");
    out.meters.tall += sumW(w.base, (u) => u.kind !== "gap" && isTall(u));
    out.meters.upper += sumW(w.upper, (u) => u.kind !== "gap" && u.kind !== "corner");
    out.meters.top += sumW(w.top || [], (u) => u.kind !== "gap" && u.kind !== "corner");
    if (h.plinth > 0) out.meters.plinth += sumW(w.base, (u) => u.kind !== "gap" && u.kind !== "fridge" && u.y === undefined);
    for (const b of corniceBoxes(l, w)) {
      out.meters.cornice += b.w / 100;
      out.panels.push({ of: name, name: "קרניז", w: r1(b.w), h: r1(b.h), qty: 1, color: colorName(front) });
    }
    if (hasCounter(l)) {
      const spanned = sumW(w.base, (u) => !["gap", "fridge", "tall", "tall_oven", "panel", "column"].includes(u.kind) && u.y === undefined && u.h === undefined);
      out.meters.counter += spanned;
      if (l.counter?.splash) out.meters.splashArea += (spanned * l.counter.splash) / 100;
    }
  });
  if (l.island) {
    doBase(l.island.base, "אי", "אי", l.island.d - FRONT_THICK, "island");
    out.meters.base += l.island.base.filter((u) => u.kind !== "gap").reduce((a, u) => a + u.w, 0) / 100;
    if (hasCounter(l)) out.meters.counter += l.island.w / 100;
  }
  // lights and handles count too
  const ll = l.lighting;
  if (ll?.underCabinet) hw("פס לד מתחת לעליונים, מטר", Math.ceil(out.meters.upper), "עליונים");
  if (ll?.spots) hw("ספוט תקרה", ll.spots, "תקרה");
  if (ll?.pendants) hw("מנורה תלויה", ll.pendants, "אי");
  if (!l.colors?.handles || l.colors.handles === "bar") {
    const doorsAndDrawers = out.fronts.filter((f) => !["חזית", "חזית מדיח"].includes(f.name)).reduce((a, f) => a + f.qty, 0);
    if (l.handle?.style !== "edge") hw(l.handle?.style === "knob" ? "כפתור" : `ידית ${l.handle?.length || 16}`, doorsAndDrawers, "חזיתות");
  }
  const m = out.meters;
  m.panelsArea = out.panels.filter((p) => p.name === "חיפוי" || p.name.startsWith("דופן גלויה")).reduce((a, p) => a + (p.w * p.h * p.qty) / 10000, 0);
  (Object.keys(m) as (keyof typeof m)[]).forEach((k) => { m[k] = Math.round(m[k] * 100) / 100; });
  return out;
}

/** The quantities in words, for Claude when it builds a quote from a plan. */
export function describeTakeoff(l: KitchenLayout, rules?: ShopRules) {
  const t = takeoff(l, rules), m = t.meters;
  const rows = [
    hasCounter(l)
      ? `מטבח, מטר רץ: תחתון ${m.base}${m.corner ? ` (כולל פינות ${m.corner}, כל פינה נספרת בשני הקירות)` : ""}, ארונות גבוהים ${m.tall}, עליון ${m.upper}${m.top ? `, שורה עליונה ${m.top}` : ""}${m.fridge ? `. מקום למקרר ${m.fridge}, לא נספר` : ""}`
      : `ארון קיר או קיר טלוויזיה, מטר רבוע: חזיתות ${m.frontsArea}${m.panelsArea ? `, חיפויים ופאנלים ${m.panelsArea}` : ""}`,
    `שטח חזיתות בפועל: ${m.frontsArea} מ״ר`,
    m.counter ? `משטח: ${m.counter} מטר${m.splashArea ? `, חיפוי קיר ${m.splashArea} מ״ר` : ""}` : "",
    m.plinth ? `סוקל: ${m.plinth} מטר` : "",
    m.cornice ? `קרניז: ${m.cornice} מטר` : "",
    t.panels.length ? `חיפויים ודפנות: ${t.panels.map((p) => `${p.name} ${p.w}×${p.h}${p.qty > 1 ? ` (${p.qty})` : ""}`).join(", ")}` : "",
    t.hardware.length ? `פרזול: ${t.hardware.map((x) => `${x.name} ${x.qty}`).join(", ")}` : "",
  ];
  return rows.filter(Boolean).join("\n");
}
