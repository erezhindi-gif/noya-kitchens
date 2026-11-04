// The to-scale drawing of a kitchen: a front view of each wall and a view from above, with
// measurement lines like a carpenter's drawing. Everything is drawn in centimeters (the SVG viewBox
// is in cm), so proportions are exact at any size. No hooks: renders on the server for the PDF too.
import "./plan.css";
import {
  BASE_LABEL, COUNTER_COLORS, FRONT_COLORS, colorOf, cornerPart, counterSpans, endWallLen, heightsOf, islandBox, partsOf, placed, tallOvenParts, upperBox, wallGeometry, wallName,
  type BaseUnit, type KitchenLayout, type LayoutHeights, type UpperRow, type UpperUnit,
} from "@/lib/quotes/layout";

const INK = "#3a3530";
const LINE = "#6d655c";
const DIM = "#8a5a2b";
const STEEL = "#cfd3d6";
const GLASS = "#2c2c2c";
const GAP = 0.5; // gap between fronts, cm

type Ctx = { h: LayoutHeights; top: number; front: string; upper: string; counter: string; handles: boolean; grip: boolean; f: number };

/** Dark fronts (anthracite, black, walnut…) get light writing on them. */
const isDark = (hex: string) => {
  const n = parseInt(hex.slice(1), 16);
  return ((n >> 16) & 255) * 0.299 + ((n >> 8) & 255) * 0.587 + (n & 255) * 0.114 < 120;
};

/** y in the SVG for a height above the floor */
const Y = (c: Ctx, cm: number) => c.top - cm;

/** r: which front this is, for painting it with a touch (see paintFront) */
function Front({ c, x, y0, w, h, fill, handle, r }: { c: Ctx; x: number; y0: number; w: number; h: number; fill: string; handle?: "top" | "bottom" | "side-l" | "side-r" | "mid"; r?: string }) {
  const g = GAP / 2;
  const rx = x + g, ry = Y(c, y0 + h) + g, rw = Math.max(0.5, w - GAP), rh = Math.max(0.5, h - GAP);
  const hl = Math.min(16, rw * 0.45);
  let bar: React.ReactNode = null;
  if (c.grip && handle) {
    // integral handle: a dark grip groove along the front's edge (top for base units, bottom for uppers, the inner side for tall doors)
    const t = 1.4;
    bar = handle === "top" ? <rect x={rx} y={ry} width={rw} height={t} fill="#2f2a26" opacity={0.75} />
      : handle === "bottom" ? <rect x={rx} y={ry + rh - t} width={rw} height={t} fill="#2f2a26" opacity={0.75} />
      : <rect x={handle === "side-r" ? rx + rw - t : rx} y={ry} width={t} height={rh} fill="#2f2a26" opacity={0.75} />;
  } else if (c.handles && handle) {
    if (handle === "top" || handle === "bottom" || handle === "mid") {
      const hy = handle === "top" ? ry + 4 : handle === "bottom" ? ry + rh - 4 : ry + rh / 2;
      bar = <line x1={rx + rw / 2 - hl / 2} x2={rx + rw / 2 + hl / 2} y1={hy} y2={hy} stroke={INK} strokeWidth={1.1} strokeLinecap="round" />;
    } else {
      const hx = handle === "side-l" ? rx + 4 : rx + rw - 4;
      const vl = Math.min(30, rh * 0.4);
      bar = <line x1={hx} x2={hx} y1={ry + rh / 2 - vl / 2} y2={ry + rh / 2 + vl / 2} stroke={INK} strokeWidth={1.1} strokeLinecap="round" />;
    }
  }
  return (
    <g data-front={r}>
      <rect x={rx} y={ry} width={rw} height={rh} fill={fill} stroke={LINE} strokeWidth={0.35} />
      {bar}
    </g>
  );
}

const Hatch = ({ c, x, y0, w, h }: { c: Ctx; x: number; y0: number; w: number; h: number }) => (
  <rect x={x} y={Y(c, y0 + h)} width={w} height={h} fill="url(#nqp-hatch)" stroke={LINE} strokeWidth={0.35} />
);

/** the carpenter's mark for a corner: a big X over its whole width */
const Cross = ({ c, x, y0, w, h }: { c: Ctx; x: number; y0: number; w: number; h: number }) => (
  <path d={`M${x} ${Y(c, y0 + h)}L${x + w} ${Y(c, y0)}M${x} ${Y(c, y0)}L${x + w} ${Y(c, y0 + h)}`} stroke={INK} strokeWidth={0.6} fill="none" />
);

const Label = ({ c, x, y, t, light }: { c: Ctx; x: number; y: number; t: string; light?: boolean }) => (
  <text x={x} y={y} fontSize={c.f * 0.85} textAnchor="middle" fill={light ? "#fff" : INK} direction="rtl" style={{ fontFamily: "inherit" }}>{t}</text>
);

/** doors side by side; the handle sits on the inner edges */
/** doors side by side; fills = a color per door (left to right), else fill */
function Doors({ c, x, y0, w, h, n, fill, fills = [], at, r }: { c: Ctx; x: number; y0: number; w: number; h: number; n: number; fill: string; fills?: (string | undefined)[]; at: "top" | "bottom"; r: string }) {
  const dw = w / n;
  return <>{Array.from({ length: n }, (_, i) => <Front key={i} c={c} x={x + i * dw} y0={y0} w={dw} h={h} fill={fills[i] || fill} handle={at} r={`${r}.${i}`} />)}</>;
}
/** fronts one above the other; fills = a color per front (top to bottom), else fill */
function Stack({ c, x, y0, w, h, n, fill, fills = [], handle = "top", r }: { c: Ctx; x: number; y0: number; w: number; h: number; n: number; fill: string; fills?: (string | undefined)[]; handle?: "top" | "mid" | "bottom"; r: string }) {
  const dh = h / n;
  return <>{Array.from({ length: n }, (_, i) => <Front key={i} c={c} x={x} y0={y0 + h - (i + 1) * dh} w={w} h={dh} fill={fills[i] || fill} handle={handle} r={`${r}.${i}`} />)}</>;
}

/** A unit's own color, and a color per door/drawer, falling back to the kitchen's */
const unitFills = (u: { color?: string; fronts?: string[] }, base: string) => {
  const own = u.color ? colorOf(u.color, FRONT_COLORS, base) : base;
  return { own, parts: (u.fronts || []).map((v) => (v ? colorOf(v, FRONT_COLORS, own) : undefined)) };
};

function BaseShape({ c, u, x, units, index, at }: { c: Ctx; u: BaseUnit; x: number; units: BaseUnit[]; index: number; at: string }) {
  const { h } = c;
  const r = `${at}.base.${index}`;
  const f0 = h.plinth, f1 = h.base - h.counter, fh = f1 - f0;
  const n = partsOf(u.kind, u.w, u.n);
  const { own: fr, parts: pf } = unitFills(u, c.front);
  const plinth = <rect x={x} y={Y(c, h.plinth)} width={u.w} height={h.plinth} fill="#5b544d" />;
  const mid = x + u.w / 2;
  switch (u.kind) {
    case "gap":
      return u.w >= 25 ? <Label c={c} x={mid} y={Y(c, h.base / 2)} t="פנוי" /> : null;
    case "corner": {
      // the corner cabinet: the dead square behind the other run is hatched and crossed, at the height of the
      // fronts; the filler strip shows without a handle
      const p = cornerPart(units, index, h.depth);
      const hatchA = index === 0 && units.length > 1 ? 0 : p.filler.w;
      return (
        <>
          {plinth}
          <Hatch c={c} x={x + hatchA} y0={f0} w={u.w - p.filler.w} h={fh} />
          <Cross c={c} x={x + hatchA} y0={f0} w={u.w - p.filler.w} h={fh} />
          {p.filler.w > 0.01 && <Front c={c} x={x + p.filler.a} y0={f0} w={p.filler.w} h={fh} fill={fr} r={`${r}.-1`} />}
        </>
      );
    }
    case "doors":
    case "sink":
      return <>{plinth}<Doors c={c} x={x} y0={f0} w={u.w} h={fh} n={n} fill={fr} fills={pf} at="top" r={r} />{u.kind === "sink" && <Label c={c} x={mid} y={Y(c, f0 + fh / 2)} t="כיור" light={isDark(fr)} />}</>;
    case "drawers":
    case "cooktop":
      return <>{plinth}<Stack c={c} x={x} y0={f0} w={u.w} h={fh} n={n} fill={fr} fills={pf} r={r} />{u.kind === "cooktop" && <rect x={x + 4} y={Y(c, h.base) - 1.2} width={u.w - 8} height={1.2} fill={GLASS} />}</>;
    case "dishwasher":
      return <>{plinth}<Front c={c} x={x} y0={f0} w={u.w} h={fh} fill={pf[0] || fr} handle="top" r={`${r}.0`} /><Label c={c} x={mid} y={Y(c, f0 + fh / 2)} t="מדיח" light={isDark(pf[0] || fr)} /></>;
    case "oven": {
      const dr = Math.min(18, fh * 0.25);
      return (
        <>
          {plinth}
          <Front c={c} x={x} y0={f0} w={u.w} h={dr} fill={pf[0] || fr} handle="top" r={`${r}.0`} />
          <Front c={c} x={x} y0={f0 + dr} w={u.w} h={fh - dr} fill={GLASS} />
          <line x1={x + 6} x2={x + u.w - 6} y1={Y(c, f1 - 5)} y2={Y(c, f1 - 5)} stroke={STEEL} strokeWidth={1.2} />
          <Label c={c} x={mid} y={Y(c, f0 + dr + (fh - dr) / 2)} t="תנור" light />
        </>
      );
    }
    case "fridge": {
      const freezer = h.tall * 0.36;
      const body = u.color ? colorOf(u.color, FRONT_COLORS, STEEL) : STEEL;
      return (
        <>
          <rect data-front={`${r}.-1`} x={x + 0.3} y={Y(c, h.tall)} width={u.w - 0.6} height={h.tall} fill={body} stroke={LINE} strokeWidth={0.35} />
          <line x1={x + 0.3} x2={x + u.w - 0.3} y1={Y(c, freezer)} y2={Y(c, freezer)} stroke={LINE} strokeWidth={0.5} />
          <line x1={x + 5} x2={x + 5} y1={Y(c, freezer + 45)} y2={Y(c, freezer + 10)} stroke="#8b9094" strokeWidth={1.4} strokeLinecap="round" />
          <line x1={x + 5} x2={x + 5} y1={Y(c, freezer - 10)} y2={Y(c, freezer - 40)} stroke="#8b9094" strokeWidth={1.4} strokeLinecap="round" />
          <Label c={c} x={mid} y={Y(c, h.tall * 0.65)} t="מקרר" light={isDark(body)} />
        </>
      );
    }
    case "tall":
      return <>{plinth}<Stack c={c} x={x} y0={f0} w={u.w} h={h.tall - f0} n={n} fill={fr} fills={pf} handle="mid" r={r} /></>;
    case "tall_oven": {
      const t = tallOvenParts(u, h);
      return (
        <>
          {plinth}
          <Stack c={c} x={x} y0={t.d0} w={u.w} h={t.d1 - t.d0} n={t.drawers} fill={fr} fills={pf.slice(0, t.drawers)} r={r} />
          <Front c={c} x={x} y0={t.d1} w={u.w} h={t.o1 - t.d1} fill={GLASS} />
          <Label c={c} x={mid} y={Y(c, (t.d1 + t.o1) / 2)} t="תנור" light />
          {t.m1 > t.o1 + 2 && <Front c={c} x={x} y0={t.o1} w={u.w} h={t.m1 - t.o1} fill={pf[t.drawers] || fr} handle="bottom" r={`${r}.${t.drawers}`} />}
          {t.m1 > t.o1 + 2 && <Label c={c} x={mid} y={Y(c, (t.o1 + t.m1) / 2)} t="מיקרו" light={isDark(pf[t.drawers] || fr)} />}
          {t.rest && <Front c={c} x={x} y0={t.m1} w={u.w} h={h.tall - t.m1} fill={pf[t.drawers + 1] || fr} handle="bottom" r={`${r}.${t.drawers + 1}`} />}
        </>
      );
    }
  }
}

function UpperShape({ c, u, x, row, depthTag, r }: { c: Ctx; u: UpperUnit; x: number; row: UpperRow; depthTag: boolean; r: string }) {
  const { y0, hh: uh, d } = upperBox(u, c.h, row);
  const n = partsOf(u.kind, u.w, u.n, true);
  const shape = upperFront(c, u, x, y0, uh, n, r);
  // when depths differ on a wall, each cabinet says how deep it is
  if (!shape || !depthTag || u.kind === "hood" || u.kind === "corner") return shape;
  return (
    <g>
      {shape}
      <text x={x + u.w / 2} y={Y(c, y0 + uh / 2) + c.f * 0.3} fontSize={c.f * 0.7} textAnchor="middle" fill={u.kind === "open" ? INK : isDark(u.color ? colorOf(u.color, FRONT_COLORS, c.upper) : c.upper) ? "#f3efe8" : DIM} direction="rtl">עומק {cm(d)}</text>
    </g>
  );
}

function upperFront(c: Ctx, u: UpperUnit, x: number, y0: number, uh: number, n: number, r: string) {
  const { own: fu, parts: pf } = unitFills(u, c.upper);
  switch (u.kind) {
    case "gap":
      return null;
    case "corner":
      return <><Hatch c={c} x={x} y0={y0} w={u.w} h={uh} /><Cross c={c} x={x} y0={y0} w={u.w} h={uh} /></>;
    case "doors":
      return <Doors c={c} x={x} y0={y0} w={u.w} h={uh} n={n} fill={fu} fills={pf} at="bottom" r={r} />;
    case "lift":
      return <Stack c={c} x={x} y0={y0} w={u.w} h={uh} n={n} fill={fu} fills={pf} handle="bottom" r={r} />;
    case "open":
      return (
        <g>
          <rect x={x + 0.3} y={Y(c, y0 + uh)} width={u.w - 0.6} height={uh} fill="#e9e4da" stroke={LINE} strokeWidth={0.6} />
          {Array.from({ length: n }, (_, i) => {
            const yy = Y(c, y0 + (uh * (i + 1)) / (n + 1));
            return <line key={i} x1={x + 0.3} x2={x + u.w - 0.3} y1={yy} y2={yy} stroke={LINE} strokeWidth={0.8} />;
          })}
        </g>
      );
    case "hood": {
      const cw = Math.min(30, u.w * 0.4);
      const canopy = 14;
      return (
        <g>
          <rect x={x + u.w / 2 - cw / 2} y={Y(c, c.top - 2)} width={cw} height={c.top - 2 - (y0 + canopy)} fill={STEEL} stroke={LINE} strokeWidth={0.35} />
          <polygon points={`${x + 1},${Y(c, y0)} ${x + u.w - 1},${Y(c, y0)} ${x + u.w / 2 + cw / 2 + 2},${Y(c, y0 + canopy)} ${x + u.w / 2 - cw / 2 - 2},${Y(c, y0 + canopy)}`} fill={STEEL} stroke={LINE} strokeWidth={0.35} />
        </g>
      );
    }
  }
}

/* ---------- measurement lines ---------- */
function HDim({ c, x0, x1, y, t }: { c: Ctx; x0: number; x1: number; y: number; t: string }) {
  const k = c.f * 0.35;
  return (
    <g stroke={DIM} strokeWidth={0.35}>
      <line x1={x0} x2={x1} y1={y} y2={y} />
      <line x1={x0 - k} x2={x0 + k} y1={y + k} y2={y - k} />
      <line x1={x1 - k} x2={x1 + k} y1={y + k} y2={y - k} />
      {x1 - x0 > c.f * 1.1 && <text x={(x0 + x1) / 2} y={y - c.f * 0.3} fontSize={c.f * 0.8} textAnchor="middle" fill={DIM} stroke="none">{t}</text>}
    </g>
  );
}
function VDim({ c, x, y0, y1, t }: { c: Ctx; x: number; y0: number; y1: number; t: string }) {
  const k = c.f * 0.35;
  const a = Y(c, y0), b = Y(c, y1);
  return (
    <g stroke={DIM} strokeWidth={0.35}>
      <line x1={x} x2={x} y1={a} y2={b} />
      <line x1={x - k} x2={x + k} y1={a + k} y2={a - k} />
      <line x1={x - k} x2={x + k} y1={b + k} y2={b - k} />
      {Math.abs(y1 - y0) > c.f * 1.1 && (
        <text x={x - c.f * 0.3} y={(a + b) / 2} fontSize={c.f * 0.8} textAnchor="middle" fill={DIM} stroke="none" transform={`rotate(-90 ${x - c.f * 0.3} ${(a + b) / 2})`}>{t}</text>
      )}
    </g>
  );
}
const cm = (v: number) => String(Math.round(v * 10) / 10);

function ctxOf(l: KitchenLayout, length: number): Ctx {
  const h = heightsOf(l);
  const front = colorOf(l.colors?.front, FRONT_COLORS, FRONT_COLORS.white.hex);
  return {
    h,
    top: 0,
    front,
    upper: colorOf(l.colors?.upper || l.colors?.front, FRONT_COLORS, front),
    counter: colorOf(l.colors?.counter, COUNTER_COLORS, COUNTER_COLORS.white_stone.hex),
    handles: !l.colors?.handles || l.colors.handles === "bar",
    grip: l.colors?.handles === "integral",
    f: Math.min(11, Math.max(6, length * 0.024)),
  };
}

/** Front view of one run of cabinets (a wall, or the island). */
export function Elevation({ layout, title, length, base, upper, top = [], island = false, at, wallL = false, wallR = false }: { layout: KitchenLayout; title: string; length: number; base: BaseUnit[]; upper: UpperUnit[]; top?: UpperUnit[]; island?: boolean; at: string; /** a wall stands across this end */ wallL?: boolean; wallR?: boolean }) {
  const c = ctxOf(layout, length);
  const { h } = c;
  const hasUpper = upper.some((u) => u.kind !== "gap");
  const hasTop = top.some((u) => u.kind !== "gap");
  const reach = (us: UpperUnit[], row: UpperRow) => us.filter((u) => u.kind !== "gap").map((u) => { const b = upperBox(u, h, row); return b.y0 + b.hh; });
  const highest = Math.max(0, ...reach(upper, "upper"), ...reach(top, "top"));
  const depthTag = hasTop || upper.some((u) => u.d !== undefined) || top.some((u) => u.d !== undefined);
  const hasTall = base.some((u) => ["fridge", "tall", "tall_oven"].includes(u.kind));
  const hasHood = upper.some((u) => u.kind === "hood");
  const shownTop = island ? h.base + 2 : Math.min(h.ceiling, Math.max(h.base + 30, hasUpper || hasTop ? highest + (hasHood && !hasTop ? 30 : hasTop ? 0 : 10) : 0, hasTall ? h.tall + 10 : 0));
  c.top = shownTop;
  const f = c.f;
  const left = f * (hasTall ? 4.6 : 3.2), right = f * 1.2, topPad = f * (hasTop ? 3 : 1.6), bottom = f * 4.4;
  const vb = `${-left} ${-topPad} ${length + left + right} ${shownTop + topPad + bottom}`;
  const pb = placed(base), pu = placed(upper), pt = placed(top);
  const spans = counterSpans(base, h.depth);
  return (
    <figure className="nqp-fig">
      <figcaption>{title} · {cm(length)} ס״מ</figcaption>
      <svg viewBox={vb} className="nqp-svg" role="img" aria-label={`${title}, חזית בקנה מידה`} style={{ fontFamily: "inherit" }}>
        <defs>
          <pattern id="nqp-hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <rect width="6" height="6" fill="#efebe4" />
            <line x1="0" y1="0" x2="0" y2="6" stroke="#c9c0b4" strokeWidth="1.2" />
          </pattern>
        </defs>
        {!island && <rect x={0} y={0} width={length} height={shownTop} fill="#f8f6f2" />}
        {pu.map((u, i) => <UpperShape key={"u" + i} c={c} u={u} x={u.a} row="upper" depthTag={depthTag} r={`${at}.upper.${i}`} />)}
        {pt.map((u, i) => <UpperShape key={"t" + i} c={c} u={u} x={u.a} row="top" depthTag={depthTag} r={`${at}.top.${i}`} />)}
        {pb.map((u, i) => <BaseShape key={"b" + i} c={c} u={u} x={u.a} units={base} index={i} at={at} />)}
        {spans.map((s, i) => <rect key={"c" + i} x={s.a} y={Y(c, h.base)} width={s.w} height={h.counter} fill={c.counter} stroke={LINE} strokeWidth={0.4} />)}
        <line x1={-left * 0.3} x2={length + right * 0.6} y1={shownTop} y2={shownTop} stroke={INK} strokeWidth={1} />
        <line x1={0} x2={0} y1={0} y2={shownTop} stroke={wallL ? "#5b544d" : "#b9b1a6"} strokeWidth={wallL ? 3 : 0.6} />
        <line x1={length} x2={length} y1={0} y2={shownTop} stroke={wallR ? "#5b544d" : "#b9b1a6"} strokeWidth={wallR ? 3 : 0.6} />

        {/* widths of the base units, then the whole wall */}
        {pb.map((u, i) => <HDim key={"db" + i} c={c} x0={u.a} x1={u.a + u.w} y={shownTop + f * 1.7} t={cm(u.w)} />)}
        <HDim c={c} x0={0} x1={length} y={shownTop + f * 3.6} t={cm(length)} />
        {/* upper widths in the free space between the counter and the uppers; the top row's above it */}
        {hasUpper && pu.map((u, i) => u.kind === "gap" ? null : <HDim key={"du" + i} c={c} x0={u.a} x1={u.a + u.w} y={Y(c, h.upperFrom) + f * (depthTag ? 2.2 : 1.4)} t={cm(u.w)} />)}
        {hasTop && pt.map((u, i) => u.kind === "gap" ? null : <HDim key={"dt" + i} c={c} x0={u.a} x1={u.a + u.w} y={Y(c, shownTop) - f * 1.2} t={cm(u.w)} />)}

        {/* heights */}
        <VDim c={c} x={-f * 1.3} y0={0} y1={h.base} t={cm(h.base)} />
        {hasUpper && <VDim c={c} x={-f * 1.3} y0={h.base} y1={h.upperFrom} t={cm(h.upperFrom - h.base)} />}
        {hasUpper && <VDim c={c} x={-f * 1.3} y0={h.upperFrom} y1={Math.min(shownTop, h.upperFrom + h.upper)} t={cm(h.upper)} />}
        {hasTop && (() => { const b = upperBox({ kind: "doors", w: 1 }, h, "top"); return <VDim c={c} x={-f * 1.3} y0={b.y0} y1={Math.min(shownTop, b.y0 + b.hh)} t={cm(b.hh)} />; })()}
        {hasTall && <VDim c={c} x={-f * 3.2} y0={0} y1={h.tall} t={cm(h.tall)} />}
      </svg>
    </figure>
  );
}

/** The kitchen from above: walls, cabinet runs, sink and cooktop, island, wall lengths. */
export function PlanView({ layout: l }: { layout: KitchenLayout }) {
  const geo = wallGeometry(l);
  const h = heightsOf(l);
  const isl = islandBox(l);
  const pts: [number, number][] = [];
  geo.forEach((g, i) => {
    const L = l.walls[i].length;
    pts.push([g.x, g.z], [g.x + g.dx * L, g.z + g.dz * L], [g.x + g.nx * h.depth, g.z + g.nz * h.depth]);
  });
  if (isl) pts.push([isl.cx - isl.w / 2, isl.cz - isl.d / 2], [isl.cx + isl.w / 2, isl.cz + isl.d / 2]);
  const xs = pts.map((p) => p[0]), zs = pts.map((p) => p[1]);
  const minX = Math.min(...xs), maxX = Math.max(...xs), minZ = Math.min(...zs), maxZ = Math.max(...zs);
  const span = Math.max(maxX - minX, maxZ - minZ);
  const f = Math.min(13, Math.max(7, span * 0.026));
  const pad = f * 7;
  const front = colorOf(l.colors?.front, FRONT_COLORS, FRONT_COLORS.white.hex);
  const counter = colorOf(l.colors?.counter, COUNTER_COLORS, COUNTER_COLORS.white_stone.hex);
  const P = (g: (typeof geo)[number], a: number, d: number) => [g.x + g.dx * a + g.nx * d, g.z + g.dz * a + g.nz * d] as const;
  const poly = (ps: (readonly [number, number])[]) => ps.map((p) => p.join(",")).join(" ");

  return (
    <figure className="nqp-fig">
      <figcaption>מבט מלמעלה</figcaption>
      <svg viewBox={`${minX - pad} ${minZ - pad} ${maxX - minX + pad * 2} ${maxZ - minZ + pad * 2}`} className="nqp-svg nqp-plan" role="img" aria-label="תוכנית המטבח מלמעלה בקנה מידה">
        {geo.map((g, i) => {
          const w = l.walls[i];
          return (
            <g key={i}>
              <polygon points={poly([P(g, 0, 0), P(g, w.length, 0), P(g, w.length, -8), P(g, 0, -8)])} fill="#5b544d" />
              {i === 0 && l.ends?.left && <polygon points={poly([P(g, -8, -8), P(g, 0, -8), P(g, 0, endWallLen(l, "left")), P(g, -8, endWallLen(l, "left"))])} fill="#5b544d" />}
              {i === geo.length - 1 && l.ends?.right && <polygon points={poly([P(g, w.length, -8), P(g, w.length + 8, -8), P(g, w.length + 8, endWallLen(l, "right")), P(g, w.length, endWallLen(l, "right"))])} fill="#5b544d" />}
              {placed(w.base).map((u, k) => {
                if (u.kind === "gap") return null;
                if (u.kind === "corner") {
                  const p = cornerPart(w.base, k, h.depth);
                  if (p.w <= 0.01) return null;
                  return <polygon key={k} points={poly([P(g, u.a + p.a, 0), P(g, u.a + p.a + p.w, 0), P(g, u.a + p.a + p.w, h.depth), P(g, u.a + p.a, h.depth)])} fill={counter} stroke={LINE} strokeWidth={0.6} />;
                }
                const tall = ["fridge", "tall", "tall_oven"].includes(u.kind);
                const fill = u.kind === "fridge" ? (u.color ? colorOf(u.color, FRONT_COLORS, STEEL) : STEEL) : tall ? (u.color ? colorOf(u.color, FRONT_COLORS, front) : front) : counter;
                const c = P(g, u.a + u.w / 2, h.depth / 2);
                return (
                  <g key={k}>
                    <polygon points={poly([P(g, u.a, 0), P(g, u.a + u.w, 0), P(g, u.a + u.w, h.depth), P(g, u.a, h.depth)])} fill={fill} stroke={LINE} strokeWidth={0.6} />
                    {u.kind === "sink" && <rect x={c[0] - Math.min(u.w - 14, 50) / 2} y={c[1] - 20} width={Math.min(u.w - 14, 50)} height={40} rx={5} fill="#b8bdc1" stroke={LINE} strokeWidth={0.5} transform={g.dz ? `rotate(90 ${c[0]} ${c[1]})` : undefined} />}
                    {u.kind === "cooktop" && [[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([sx, sz], j) => (
                      <circle key={j} cx={c[0] + sx * Math.min(14, u.w / 4.5)} cy={c[1] + sz * 12} r={7} fill="none" stroke={GLASS} strokeWidth={1.4} />
                    ))}
                    {tall && <text x={c[0]} y={c[1] + f * 0.3} fontSize={f * 0.75} textAnchor="middle" fill={INK} direction="rtl">{BASE_LABEL[u.kind]}</text>}
                  </g>
                );
              })}
              {/* upper cabinets as dashed outlines at their own depth (the top row with longer dashes) */}
              {([["upper", w.upper, "4 3"], ["top", w.top || [], "10 4"]] as const).map(([row, us, dash]) =>
                placed(us as UpperUnit[]).map((u, k) => {
                  if (u.kind === "gap" || u.kind === "corner") return null;
                  const d = upperBox(u, h, row).d;
                  return <polygon key={row + k} points={poly([P(g, u.a, 0), P(g, u.a + u.w, 0), P(g, u.a + u.w, d), P(g, u.a, d)])} fill="none" stroke={DIM} strokeWidth={0.7} strokeDasharray={dash} />;
                }))}
              {(() => {
                const a = P(g, 0, -8 - f * 1.8), b = P(g, w.length, -8 - f * 1.8);
                const m = P(g, w.length / 2, -8 - f * (g.dz ? 5.6 : 2.3));
                
                return (
                  <g stroke={DIM} strokeWidth={0.6}>
                    <line x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} />
                    <text x={m[0]} y={m[1]} fontSize={f * 0.85} textAnchor="middle" fill={DIM} stroke="none" direction="rtl">
                      {wallName(l, i)} {cm(w.length)}
                    </text>
                  </g>
                );
              })()}
            </g>
          );
        })}
        {isl && l.island && (
          <g>
            <rect x={isl.cx - isl.w / 2} y={isl.cz - isl.d / 2} width={isl.w} height={isl.d} fill={counter} stroke={LINE} strokeWidth={0.8} />
            <text x={isl.cx} y={isl.cz + f * 0.3} fontSize={f * 0.85} textAnchor="middle" fill={INK} direction="rtl">אי {cm(isl.w)}×{cm(isl.d)}</text>
          </g>
        )}
      </svg>
    </figure>
  );
}

/** All the drawings of a kitchen: the plan and one front view per wall (and the island). */
export default function KitchenPlan({ layout }: { layout: KitchenLayout }) {
  return (
    <div className="nqp">
      <PlanView layout={layout} />
      {layout.walls.map((w, i) => (
        <Elevation key={i} layout={layout} title={wallName(layout, i)} length={w.length} base={w.base} upper={w.upper} top={w.top} at={String(i)}
          wallL={i === 0 && !!layout.ends?.left} wallR={i === layout.walls.length - 1 && !!layout.ends?.right} />
      ))}
      {layout.island && <Elevation layout={layout} title="אי (הצד הפונה לארונות)" length={layout.island.w} base={layout.island.base} upper={[]} island at="island" />}
      <div className="nqp-note">כל המידות בס״מ. השרטוט בקנה מידה.</div>
    </div>
  );
}
