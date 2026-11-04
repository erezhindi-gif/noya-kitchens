"use client";
// The kitchen in 3D, built from the same centimeters as the drawing, so the proportions match.
// The client turns it with a finger. In `still` mode (the PDF) it renders one frame into an image.
// Real materials, reflections and soft contact shadows: while it moves it draws fast, and the moment
// it stops it draws once more in full quality. Erez paints fronts on it with a touch (`paint`).
import { useEffect, useRef, useState, type MutableRefObject } from "react";
import type * as T from "three";
import {
  COUNTER_COLORS, FRONT_COLORS, colorOf, cornerPart, counterSpans, endWallLen, heightsOf, islandBox, mainWallIndex, partsOf, placed, tallOvenParts, upperBox, wallGeometry,
  type BaseUnit, type KitchenLayout, type LayoutHeights, type UpperRow, type UpperUnit,
} from "@/lib/quotes/layout";
import { bluranImg, bluranOf } from "@/lib/quotes/bluran";

type Three = typeof import("three");
type Mats = Record<"front" | "upper" | "carcass" | "upperCarcass" | "counter" | "plinth" | "steel" | "glass" | "handle" | "wall" | "floor" | "shelf" | "sink" | "grip" | "black" | "zone" | "display" | "inox", T.Material>;

const M = 0.01; // cm → m

// Bluran swatches and the drawn materials stay loaded between rebuilds, so painting a door doesn't flash
const swatches = new Map<string, T.Texture>();
const drawn = new Map<string, T.CanvasTexture>();
const seeded = (seed: number) => () => (seed = (seed * 16807) % 2147483647) / 2147483647;

function drawnTexture(three: Three, key: string, paint: (g: CanvasRenderingContext2D, size: number) => void) {
  const hit = drawn.get(key);
  if (hit) return hit;
  const size = 1024;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  paint(canvas.getContext("2d")!, size);
  const t = new three.CanvasTexture(canvas);
  t.colorSpace = three.SRGBColorSpace;
  t.wrapS = t.wrapT = three.RepeatWrapping;
  t.anisotropy = 8;
  drawn.set(key, t);
  return t;
}

/** Oak planks, 20 cm wide on a 2.4 m square of texture */
const oakFloor = (g: CanvasRenderingContext2D, size: number) => {
  const r = seeded(4711), rows = 12, ph = size / rows;
  for (let y = 0; y < rows; y++) {
    let x = -r() * size * 0.5;
    while (x < size) {
      const len = size * (0.45 + r() * 0.35);
      const l = 60 + r() * 9, hue = 30 + r() * 5;
      g.fillStyle = `hsl(${hue} 27% ${l}%)`;
      g.fillRect(x, y * ph, len, ph);
      for (let k = 0; k < 26; k++) {
        const gy = y * ph + r() * ph;
        g.strokeStyle = `hsla(${hue - 4} 45% 32% / ${0.04 + r() * 0.1})`;
        g.lineWidth = 0.6 + r() * 1.2;
        g.beginPath();
        g.moveTo(x, gy);
        g.bezierCurveTo(x + len * 0.3, gy + r() * 6 - 3, x + len * 0.7, gy + r() * 6 - 3, x + len, gy + r() * 4 - 2);
        g.stroke();
      }
      g.fillStyle = "rgba(60,40,22,.45)";
      g.fillRect(x + len - 1, y * ph, 1.5, ph);
      x += len;
    }
    g.fillStyle = "rgba(60,40,22,.45)";
    g.fillRect(0, y * ph, size, 1.5);
  }
};

/** Stone with thin soft veins, on the counter's color */
const stone = (hex: string, dark: boolean) => (g: CanvasRenderingContext2D, size: number) => {
  const r = seeded(hex.length * 977 + parseInt(hex.slice(1), 16) % 9973 + 1);
  g.fillStyle = hex;
  g.fillRect(0, 0, size, size);
  for (let v = 0; v < 9; v++) {
    let x = r() * size, y = r() * size, a = r() * Math.PI * 2;
    g.strokeStyle = dark ? `rgba(235,230,220,${0.1 + r() * 0.25})` : `rgba(95,90,85,${0.07 + r() * 0.18})`;
    g.lineWidth = 0.6 + r() * 2;
    g.beginPath();
    g.moveTo(x, y);
    for (let k = 0; k < 40; k++) {
      a += (r() - 0.5) * 0.7;
      x += Math.cos(a) * 26;
      y += Math.sin(a) * 26;
      g.lineTo(x, y);
    }
    g.stroke();
  }
};

function shade(three: Three, hex: string, k: number) {
  const c = new three.Color(hex);
  return c.multiplyScalar(k);
}

/** Builds the whole kitchen as one group, in meters. */
function buildKitchen(three: Three, l: KitchenLayout) {
  const h = heightsOf(l);
  const front = colorOf(l.colors?.front, FRONT_COLORS, FRONT_COLORS.white.hex);
  const upper = colorOf(l.colors?.upper || l.colors?.front, FRONT_COLORS, front);
  const counter = colorOf(l.colors?.counter, COUNTER_COLORS, COUNTER_COLORS.white_stone.hex);
  const stoneTop = (l.colors?.counter || "white_stone").endsWith("_stone");
  const handles = !l.colors?.handles || l.colors.handles === "bar";
  const grip = l.colors?.handles === "integral";
  const std = (color: T.ColorRepresentation, rough = 0.6, metal = 0, extra: Partial<T.MeshStandardMaterialParameters> = {}) =>
    new three.MeshStandardMaterial({ color, roughness: rough, metalness: metal, ...extra });
  // Bluran shades: the swatch photo laid on the doors (wood, stone, concrete…), or its color; high gloss shines.
  // The PDF waits for every swatch to load before it takes its picture.
  const loading: Promise<unknown>[] = [];
  const cache = new Map<string, T.Material>();
  const matOf = (v: string | undefined, fallback: T.Material) => {
    if (!v) return fallback;
    const hit = cache.get(v);
    if (hit) return hit;
    const bl = bluranOf(v);
    let m: T.Material;
    if (bl && bl.tex) {
      const mat = std("#ffffff", bl.gloss ? 0.18 : 0.6);
      const url = bluranImg(bl);
      const have = swatches.get(url);
      if (have) mat.map = have;
      else loading.push(new Promise((ok) => {
        new three.TextureLoader().load(url, (t) => { t.colorSpace = three.SRGBColorSpace; swatches.set(url, t); mat.map = t; mat.needsUpdate = true; ok(t); }, undefined, () => { mat.color.set(bl.hex); ok(null); });
      }));
      m = mat;
    } else m = std(colorOf(v, FRONT_COLORS, "#f2f1ec"), bl?.gloss || bl?.group === "זכוכית" ? 0.15 : 0.55);
    cache.set(v, m);
    return m;
  };
  const mats: Mats = {
    front: matOf(l.colors?.front, std(front, 0.55)),
    upper: matOf(l.colors?.upper || l.colors?.front, std(upper, 0.55)),
    carcass: std(shade(three, front, 0.55), 0.8),
    upperCarcass: std(shade(three, upper, 0.55), 0.8),
    counter: std(counter, 0.35),
    plinth: std("#4a4642", 0.9),
    steel: std("#d4d7da", 0.35, 0.25),
    glass: std("#0c0c0d", 0.12, 0),
    handle: std("#7d8185", 0.35, 0.4),
    wall: std("#f4f1eb", 0.92, 0, { side: three.FrontSide }),
    floor: std("#ffffff", 0.5, 0, { map: drawnTexture(three, "oak", oakFloor) }),
    shelf: std("#e3ddd2", 0.7),
    sink: std("#b4babe", 0.3, 0.35),
    grip: std("#2b2724", 0.85),
    black: std("#141414", 0.4, 0.2),
    zone: std("#3a3a3c", 0.25, 0.1),
    display: std("#0b1a22", 0.2, 0.1, { emissive: new three.Color("#16384a"), emissiveIntensity: 0.6 }),
    inox: std("#c9ccce", 0.28, 0.75),
  };
  /** a unit's own material, and one per door/drawer (index as in the drawing: left to right, top to bottom) */
  const unitMats = (u: { color?: string; fronts?: string[] }, base: T.Material) => {
    const own = matOf(u.color, base);
    return (i: number) => matOf(u.fronts?.[i] || undefined, own);
  };
  const root = new three.Group();

  const box = (parent: T.Object3D, mat: T.Material, w: number, hh: number, d: number, cx: number, cy: number, cz: number) => {
    const m = new three.Mesh(new three.BoxGeometry(Math.max(0.1, w) * M, Math.max(0.1, hh) * M, Math.max(0.1, d) * M), mat);
    m.position.set(cx * M, cy * M, cz * M);
    m.castShadow = true;
    m.receiveShadow = true;
    parent.add(m);
    return m;
  };

  /** the counter's stone keeps its scale on a piece of any size */
  const counterMat = (w: number, d: number) => {
    if (!stoneTop) return mats.counter;
    const tex = drawnTexture(three, "stone" + counter, stone(counter, l.colors?.counter === "black_stone")).clone();
    tex.repeat.set(w / 240, d / 240);
    tex.needsUpdate = true;
    return std("#ffffff", 0.3, 0, { map: tex });
  };
  /** marks a mesh as part of a front, so a touch can paint it (see paintFront) */
  const tag = (m: T.Mesh, front: string | undefined, panel: T.Mesh = m) => {
    if (front) m.userData = { front, panel };
    return m;
  };
  /** A door or drawer front with its handle; (x0,y0) is its lower-left corner on the run's face at depth z. */
  const frontPanel = (p: T.Object3D, mat: T.Material, x0: number, y0: number, w: number, hh: number, z: number, handle: "top" | "bottom" | "mid" | undefined, ref?: string) => {
    const panel = tag(box(p, mat, w - 0.4, hh - 0.4, 1.8, x0 + w / 2, y0 + hh / 2, z + 0.9), ref);
    if (grip && handle) {
      // integral handle: a grip groove milled into the edge of the front
      if (handle === "mid") tag(box(p, mats.grip, 1.6, hh - 0.4, 0.5, x0 + 1.2, y0 + hh / 2, z + 1.6), ref, panel);
      else tag(box(p, mats.grip, w - 0.4, 1.6, 0.5, x0 + w / 2, handle === "top" ? y0 + hh - 1.2 : y0 + 1.2, z + 1.6), ref, panel);
      return;
    }
    if (!handles || !handle) return;
    const hy = handle === "top" ? y0 + hh - 4 : handle === "bottom" ? y0 + 4 : y0 + hh / 2;
    if (handle === "mid") tag(box(p, mats.handle, 1.2, Math.min(30, hh * 0.3), 1.6, x0 + 5, hy, z + 2.6), ref, panel);
    else tag(box(p, mats.handle, Math.min(16, w * 0.45), 1.2, 1.6, x0 + w / 2, hy, z + 2.6), ref, panel);
  };

  /** A built-in oven: black glass door in a steel frame, a control strip with a display and knobs, a bar handle. */
  const oven = (p: T.Object3D, x: number, y0: number, w: number, hh: number, z: number) => {
    box(p, mats.inox, w - 0.4, hh - 0.4, 1.6, x + w / 2, y0 + hh / 2, z + 0.8);
    const strip = Math.min(9, hh * 0.16), sy = y0 + hh - strip / 2 - 0.6;
    box(p, mats.black, w - 2.4, strip - 1.2, 0.4, x + w / 2, sy, z + 1.8);
    box(p, mats.display, Math.min(10, w * 0.18), strip * 0.45, 0.3, x + w / 2, sy, z + 2.05);
    for (const dx of [-0.32, 0.32]) {
      const knob = new three.Mesh(new three.CylinderGeometry(1.5 * M, 1.5 * M, 1.6 * M, 20), mats.inox);
      knob.rotation.x = Math.PI / 2;
      knob.position.set((x + w / 2 + dx * w) * M, sy * M, (z + 2.4) * M);
      p.add(knob);
    }
    box(p, mats.glass, w - 4, hh - strip - 3.5, 0.5, x + w / 2, y0 + (hh - strip) / 2 + 0.8, z + 1.85);
    box(p, mats.inox, w - 10, 1.4, 1.6, x + w / 2, y0 + hh - strip - 3.2, z + 3.2);
  };
  /** An induction hob flush in the counter: black glass with four cooking zones and a touch strip. */
  const cooktop = (p: T.Object3D, cx: number, y: number, cz: number, w: number) => {
    const d = 51;
    box(p, mats.glass, w, 0.5, d, cx, y + 0.25, cz);
    for (const [ox, oz, r] of [[-0.25, -0.22, 9], [0.25, -0.22, 7.5], [-0.25, 0.2, 7.5], [0.25, 0.2, 9]] as const) {
      const ring = new three.Mesh(new three.RingGeometry((r - 0.5) * M, r * M, 40), mats.zone);
      ring.rotation.x = -Math.PI / 2;
      ring.position.set((cx + ox * w) * M, (y + 0.52) * M, (cz + oz * d) * M);
      p.add(ring);
    }
    box(p, mats.zone, w * 0.5, 0.05, 2.4, cx, y + 0.53, cz + d / 2 - 3);
  };
  /** A modern faucet: a column with a curved spout over the basin. */
  const faucet = (p: T.Object3D, cx: number, y: number, z: number) => {
    const col = new three.Mesh(new three.CylinderGeometry(1.5 * M, 1.8 * M, 28 * M, 20), mats.inox);
    col.position.set(cx * M, (y + 14) * M, z * M);
    col.castShadow = true;
    p.add(col);
    const arc = new three.Mesh(new three.TorusGeometry(9 * M, 1.3 * M, 12, 24, Math.PI), mats.inox);
    arc.rotation.y = Math.PI / 2;
    arc.position.set(cx * M, (y + 28) * M, (z + 9) * M);
    arc.castShadow = true;
    p.add(arc);
    box(p, mats.inox, 1.2, 4, 1.2, cx + 2.2, y + 22, z);
  };

  /** One run of base cabinets along local x, backs at z=0, fronts facing +z. */
  const baseRun = (p: T.Object3D, units: BaseUnit[], depth: number, hs: LayoutHeights, at: string, withCounter = true) => {
    const f0 = hs.plinth, f1 = hs.base - hs.counter, fh = f1 - f0;
    const z = depth - 2;
    const pl = placed(units);
    for (let idx = 0; idx < pl.length; idx++) {
      const u = pl[idx];
      const x = u.a, w = u.w, n = partsOf(u.kind, u.w, u.n);
      const r = (part: number) => `${at}.base.${idx}.${part}`;
      if (u.kind === "gap") continue;
      if (u.kind === "corner") {
        // a closed corner cabinet: only its filler strip shows, without a handle
        const c = cornerPart(units, idx, depth);
        if (c.w > 0.01) {
          box(p, mats.plinth, c.w, f0, depth - 6, x + c.a + c.w / 2, f0 / 2, (depth - 6) / 2);
          box(p, mats.carcass, c.w, f1 - f0, z, x + c.a + c.w / 2, f0 + (f1 - f0) / 2, z / 2);
        }
        if (c.filler.w > 0.01) frontPanel(p, matOf(u.color, mats.front), x + c.filler.a, f0, c.filler.w + 0.4, fh, z, undefined, r(-1));
        continue;
      }
      if (u.kind === "fridge") {
        const body = matOf(u.color, mats.inox);
        // a real fridge: one or two columns (a wide one is two), freezer below, bar handles, a small display
        const cols = w >= 100 ? 2 : 1, cw = (w - 0.6) / cols, fz = hs.tall * 0.36;
        box(p, mats.black, w - 0.6, hs.tall - 1, depth - 4, x + w / 2, (hs.tall - 1) / 2, (depth - 4) / 2);
        for (let k = 0; k < cols; k++) {
          const cx = x + 0.3 + cw * k + cw / 2;
          tag(box(p, body, cw - 0.5, hs.tall - fz - 1.2, 3, cx, fz + (hs.tall - fz) / 2, depth - 1.5), r(-1));
          tag(box(p, body, cw - 0.5, fz - 2, 3, cx, 1 + (fz - 2) / 2, depth - 1.5), r(-1));
          const hx = cols === 2 ? (k === 0 ? cx + cw / 2 - 5 : cx - cw / 2 + 5) : x + 5;
          box(p, mats.inox, 1.6, 45, 2.4, hx, fz + 40, depth + 1);
          box(p, mats.inox, 1.6, 30, 2.4, hx, fz - 22, depth + 1);
          box(p, mats.display, 6, 9, 0.3, cx, fz + (hs.tall - fz) * 0.62, depth + 0.1);
        }
        continue;
      }
      const tall = u.kind === "tall" || u.kind === "tall_oven";
      const top = tall ? hs.tall : f1;
      const fm = unitMats(u, mats.front);
      box(p, mats.plinth, w, f0, depth - 6, x + w / 2, f0 / 2, (depth - 6) / 2);
      box(p, mats.carcass, w - 0.2, top - f0, z, x + w / 2, f0 + (top - f0) / 2, z / 2);
      switch (u.kind) {
        case "doors":
        case "sink":
          for (let i = 0; i < n; i++) frontPanel(p, fm(i), x + (i * w) / n, f0, w / n, fh, z, "top", r(i));
          break;
        case "drawers":
        case "cooktop":
          for (let i = 0; i < n; i++) frontPanel(p, fm(n - 1 - i), x, f0 + (i * fh) / n, w, fh / n, z, "top", r(n - 1 - i));
          break;
        case "dishwasher":
          frontPanel(p, fm(0), x, f0, w, fh, z, "top", r(0));
          break;
        case "oven": {
          const dr = Math.min(18, fh * 0.25);
          frontPanel(p, fm(0), x, f0, w, dr, z, "top", r(0));
          oven(p, x, f0 + dr, w, fh - dr, z);
          break;
        }
        case "tall":
          for (let i = 0; i < n; i++) frontPanel(p, fm(n - 1 - i), x, f0 + (i * (top - f0)) / n, w, (top - f0) / n, z, "mid", r(n - 1 - i));
          break;
        case "tall_oven": {
          const t = tallOvenParts(u, hs);
          const dh = (t.d1 - t.d0) / t.drawers;
          for (let i = 0; i < t.drawers; i++) frontPanel(p, fm(t.drawers - 1 - i), x, t.d0 + i * dh, w, dh, z, "top", r(t.drawers - 1 - i));
          oven(p, x, t.d1, w, t.o1 - t.d1, z);
          if (t.m1 > t.o1 + 2) frontPanel(p, fm(t.drawers), x, t.o1, w, t.m1 - t.o1, z, "bottom", r(t.drawers));
          if (t.rest) frontPanel(p, fm(t.drawers + 1), x, t.m1, w, top - t.m1, z, "bottom", r(t.drawers + 1));
          break;
        }
      }
      if (u.kind === "sink") {
        // an undermount basin (the bowl seen in the counter) and a curved faucet
        const sw = Math.min(w - 14, 55), sd = 40, cz = depth / 2 + 2;
        box(p, mats.sink, sw, 0.3, sd, x + w / 2, hs.base + 0.05, cz);
        box(p, std("#8f969b", 0.3, 0.4), sw - 3, 0.3, sd - 3, x + w / 2, hs.base + 0.12, cz);
        faucet(p, x + w / 2, hs.base, 8);
      }
      if (u.kind === "cooktop") cooktop(p, x + w / 2, hs.base, depth / 2 + 1, Math.min(w - 8, 60));
    }
    if (withCounter) for (const s of counterSpans(units, depth)) box(p, counterMat(s.w, depth + 2), s.w, hs.counter, depth + 2, s.a + s.w / 2, hs.base - hs.counter / 2, (depth + 2) / 2);
  };

  /** a row of upper cabinets; each cabinet may have its own depth, height and bottom */
  const upperRun = (p: T.Object3D, units: UpperUnit[], row: UpperRow, at: string) => {
    const pl = placed(units);
    for (let idx = 0; idx < pl.length; idx++) {
      const u = pl[idx];
      const x = u.a, w = u.w, n = partsOf(u.kind, u.w, u.n, true);
      const r = (part: number) => `${at}.${row}.${idx}.${part}`;
      const { y0, hh: uh, d } = upperBox(u, h, row);
      if (u.kind === "gap" || u.kind === "corner") continue;
      if (u.kind === "hood") {
        box(p, mats.steel, w - 2, 12, 50, x + w / 2, y0 + 6, 25);
        const cw = Math.min(30, w * 0.4);
        box(p, mats.steel, cw, h.ceiling - y0 - 12, 24, x + w / 2, y0 + 12 + (h.ceiling - y0 - 12) / 2, 12);
        continue;
      }
      if (u.kind === "open") {
        box(p, mats.shelf, w, 1.8, d, x + w / 2, y0 + 0.9, d / 2);
        box(p, mats.shelf, w, 1.8, d, x + w / 2, y0 + uh - 0.9, d / 2);
        box(p, mats.shelf, 1.8, uh, d, x + 0.9, y0 + uh / 2, d / 2);
        box(p, mats.shelf, 1.8, uh, d, x + w - 0.9, y0 + uh / 2, d / 2);
        for (let i = 1; i <= n; i++) box(p, mats.shelf, w - 3.6, 1.8, d - 2, x + w / 2, y0 + (uh * i) / (n + 1), d / 2);
        continue;
      }
      box(p, mats.upperCarcass, w - 0.2, uh, d - 2, x + w / 2, y0 + uh / 2, (d - 2) / 2);
      const um = unitMats(u, mats.upper);
      if (u.kind === "doors") for (let i = 0; i < n; i++) frontPanel(p, um(i), x + (i * w) / n, y0, w / n, uh, d - 2, "bottom", r(i));
      else for (let i = 0; i < n; i++) frontPanel(p, um(n - 1 - i), x, y0 + (i * uh) / n, w, uh / n, d - 2, "bottom", r(n - 1 - i));
    }
  };

  const geo = wallGeometry(l);
  geo.forEach((g, i) => {
    const w = l.walls[i];
    const grp = new three.Group();
    grp.position.set(g.x * M, 0, g.z * M);
    grp.rotation.y = Math.atan2(-g.dz, g.dx);
    const wall = new three.Mesh(new three.PlaneGeometry(w.length * M, h.ceiling * M), mats.wall);
    wall.position.set((w.length / 2) * M, (h.ceiling / 2) * M, 0);
    wall.receiveShadow = true;
    grp.add(wall);
    // a wall standing across the kitchen's free end, if there is one
    const cross = (x: number, facing: 1 | -1, len: number) => {
      const side = new three.Mesh(new three.PlaneGeometry(len * M, h.ceiling * M), mats.wall);
      side.position.set(x * M, (h.ceiling / 2) * M, (len / 2) * M);
      side.rotation.y = (facing * Math.PI) / 2;
      side.receiveShadow = true;
      grp.add(side);
    };
    if (i === 0 && l.ends?.left) cross(0, 1, endWallLen(l, "left"));
    if (i === geo.length - 1 && l.ends?.right) cross(w.length, -1, endWallLen(l, "right"));
    baseRun(grp, w.base, h.depth, h, String(i));
    upperRun(grp, w.upper, "upper", String(i));
    upperRun(grp, w.top || [], "top", String(i));
    root.add(grp);
  });

  const isl = islandBox(l);
  if (isl && l.island) {
    const g = geo[mainWallIndex(l)];
    // the island's cabinets face the main wall: its local x runs opposite the wall, local z toward it
    const grp = new three.Group();
    grp.position.set((isl.cx + g.dx * (isl.w / 2) + g.nx * (isl.d / 2)) * M, 0, (isl.cz + g.dz * (isl.w / 2) + g.nz * (isl.d / 2)) * M);
    grp.rotation.y = Math.atan2(g.dz, -g.dx);
    const units = l.island.base.length ? l.island.base : [{ kind: "doors" as const, w: isl.w }];
    baseRun(grp, units, isl.d, h, "island", false);
    // the counter covers the whole island even where there are no cabinets
    box(grp, counterMat(isl.w, isl.d + 2), isl.w, h.counter, isl.d + 2, isl.w / 2, h.base - h.counter / 2, isl.d / 2);
    root.add(grp);
  }

  // an oak floor under everything, and a ceiling (seen only from below, so it never hides the view from above)
  const bb = new three.Box3().setFromObject(root);
  const fw = bb.max.x - bb.min.x + 3, fd = bb.max.z - bb.min.z + 4;
  const fx = (bb.min.x + bb.max.x) / 2, fz = (bb.min.z + bb.max.z) / 2 + 1;
  const floorTex = drawnTexture(three, "oak", oakFloor).clone();
  floorTex.repeat.set(fw / 2.4, fd / 2.4);
  floorTex.needsUpdate = true;
  (mats.floor as T.MeshStandardMaterial).map = floorTex;
  const floor = new three.Mesh(new three.PlaneGeometry(fw, fd), mats.floor);
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(fx, 0, fz);
  floor.receiveShadow = true;
  root.add(floor);
  const ceiling = new three.Mesh(new three.PlaneGeometry(fw, fd), std("#ffffff", 0.9, 0, { emissive: new three.Color("#ffffff"), emissiveIntensity: 0.45 }));
  ceiling.rotation.x = Math.PI / 2;
  ceiling.position.set(fx, h.ceiling * M, fz);
  root.add(ceiling);
  return { root, box: bb, ready: Promise.all(loading) };
}

/** shotRef: takes a picture from the angle now on screen. paint: while set, a touch on a front paints it.
 *  trace: the free render, light calculated on this very model in the browser; onTrace reports how far it got (-1 = preparing). */
export default function Kitchen3D({ layout, still = false, height = 420, shotRef, paint, trace = false, onTrace }: {
  layout: KitchenLayout; still?: boolean; height?: number; shotRef?: MutableRefObject<(() => string) | null>; paint?: (ref: string) => void;
  trace?: boolean; onTrace?: (samples: number) => void;
}) {
  const host = useRef<HTMLDivElement>(null);
  const [img, setImg] = useState("");
  const [failed, setFailed] = useState(false);
  const key = JSON.stringify(layout);
  const keyRef = useRef(key);
  keyRef.current = key;
  const paintRef = useRef(paint);
  paintRef.current = paint;
  const swap = useRef<((k: string) => void) | null>(null);
  // turning the render off starts the 3D afresh, which gives all its memory back; the view stays where it was
  const [fresh, setFresh] = useState(0);
  const view = useRef<{ pos: number[]; target: number[] } | null>(null);
  const setTrace = useRef<((on: boolean) => void) | null>(null);
  const traceOn = useRef(trace);
  traceOn.current = trace;
  const onTraceRef = useRef(onTrace);
  onTraceRef.current = onTrace;

  useEffect(() => {
    let disposed = false;
    let cleanup = () => {};
    (async () => {
      const three = await import("three");
      const { OrbitControls } = await import("three/examples/jsm/controls/OrbitControls.js");
      const { RoomEnvironment } = await import("three/examples/jsm/environments/RoomEnvironment.js");
      if (disposed || !host.current) return;
      const el = host.current;
      let renderer: T.WebGLRenderer;
      try {
        renderer = new three.WebGLRenderer({ antialias: true, preserveDrawingBuffer: still });
      } catch {
        setFailed(true);
        return;
      }
      const W = el.clientWidth || 700, H = height;
      const ratio = still ? 2 : Math.min(2, window.devicePixelRatio || 1);
      renderer.setPixelRatio(ratio);
      renderer.setSize(W, H);
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = three.PCFShadowMap;
      renderer.toneMapping = three.NeutralToneMapping; // keeps the Bluran colors true
      renderer.toneMappingExposure = 1;
      el.appendChild(renderer.domElement);

      const scene = new three.Scene();
      scene.background = new three.Color("#f4f1ec");
      const pmrem = new three.PMREMGenerator(renderer);
      const envMap = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
      scene.environment = envMap;
      scene.environmentIntensity = 0.95;
      let builtKey = keyRef.current;
      let kitchen = buildKitchen(three, JSON.parse(builtKey));
      scene.add(kitchen.root);
      const { box } = kitchen;

      const center = new three.Vector3((box.min.x + box.max.x) / 2, 1.0, (box.min.z + box.max.z) / 2);
      const size = Math.max(box.max.x - box.min.x, box.max.z - box.min.z, 2.5);
      scene.add(new three.HemisphereLight(0xffffff, 0xdcd3c4, 0.95));
      const sun = new three.DirectionalLight(0xfff4e6, 1.25);
      sun.position.set(center.x - size * 0.7, 4.2, center.z + size * 1.3); // from the room's open side, on every wall of an L
      sun.target.position.copy(center);
      sun.castShadow = true;
      sun.shadow.mapSize.set(still ? 2048 : 4096, still ? 2048 : 4096);
      sun.shadow.radius = 4;
      const sc = sun.shadow.camera;
      sc.left = -size; sc.right = size; sc.top = size; sc.bottom = -size; sc.near = 0.5; sc.far = 20;
      sun.shadow.bias = -0.0004;
      sun.shadow.normalBias = 0.01;
      scene.add(sun, sun.target);
      const fill = new three.DirectionalLight(0xffffff, 0.45); // the other way, so no wall stays grey
      fill.position.set(center.x + size, 2.5, center.z + size);
      fill.target.position.copy(center);
      scene.add(fill, fill.target);

      const cam = new three.PerspectiveCamera(42, W / H, 0.05, 60);
      // from the room's open side, above eye level; an L is seen from the left so its side wall faces the camera
      const walls = (JSON.parse(builtKey) as KitchenLayout).walls.length;
      const side = walls === 2 ? -0.42 : walls === 1 ? 0.18 : 0;
      cam.position.set(center.x + size * side, 1.6 + size * 0.2, center.z + size * 0.85 + 0.8);
      // a narrow (phone) frame needs the camera further back to fit the whole kitchen
      const back = Math.max(1, (1.25 * H) / W);
      cam.position.sub(center).multiplyScalar(back).add(center);
      cam.lookAt(center);

      if (still) {
        await kitchen.ready; // the Bluran swatches must be on the doors before the picture is taken
        if (disposed) return;
        renderer.render(scene, cam);
        setImg(renderer.domElement.toDataURL("image/jpeg", 0.9));
        renderer.domElement.remove();
        renderer.dispose();
        pmrem.dispose();
        return;
      }

      // Full quality (soft contact shadows between the cabinets) once the view stops; a phone stays with the fast picture.
      let composer: import("three/examples/jsm/postprocessing/EffectComposer.js").EffectComposer | null = null;
      if (!(navigator.maxTouchPoints > 0 && W < 700)) {
        const [{ EffectComposer }, { RenderPass }, { GTAOPass }, { OutputPass }] = await Promise.all([
          import("three/examples/jsm/postprocessing/EffectComposer.js"),
          import("three/examples/jsm/postprocessing/RenderPass.js"),
          import("three/examples/jsm/postprocessing/GTAOPass.js"),
          import("three/examples/jsm/postprocessing/OutputPass.js"),
        ]);
        if (disposed) { renderer.dispose(); return; }
        composer = new EffectComposer(renderer, new three.WebGLRenderTarget(W * ratio, H * ratio, { type: three.HalfFloatType, samples: 4 }));
        composer.setPixelRatio(ratio);
        composer.setSize(W, H);
        composer.addPass(new RenderPass(scene, cam));
        const ao = new GTAOPass(scene, cam, W, H);
        ao.updateGtaoMaterial({ radius: 0.22, distanceExponent: 1.4, thickness: 1, scale: 1.1, samples: 16, distanceFallOff: 1, screenSpaceRadius: false });
        ao.blendIntensity = 0.85;
        composer.addPass(ao);
        composer.addPass(new OutputPass());
      }

      const controls = new OrbitControls(cam, renderer.domElement);
      controls.target.copy(center);
      controls.enableDamping = true;
      controls.maxPolarAngle = Math.PI * 0.49;
      controls.minDistance = 0.4;
      controls.maxDistance = size * 3 + 3;
      if (view.current) {
        cam.position.fromArray(view.current.pos);
        controls.target.fromArray(view.current.target);
      }
      controls.update();

      // what a touch can paint, and the glow on the front under the mouse
      const hl = new three.Mesh(new three.BufferGeometry(), new three.MeshBasicMaterial({ color: "#b5835a", transparent: true, opacity: 0.35, depthTest: false }));
      hl.matrixAutoUpdate = false;
      hl.visible = false;
      hl.renderOrder = 10;
      scene.add(hl);

      let dirty = true, fine = false, movedAt = 0;
      const invalidate = () => { dirty = true; };
      controls.addEventListener("change", invalidate);

      // The free render: a path tracer on the same model, so nothing is invented and every angle is free.
      // Daylight comes in from the sky through the room's open sides, and it gets cleaner the longer the view stays still.
      let tracer: import("three-gpu-pathtracer").WebGLPathTracer | null = null;
      let traceSky: T.Texture | null = null;
      let tracedSamples = -2;
      const MAX_SAMPLES = 500;
      // One sample at a time with a breath in between: the screens share this graphics card with the render,
      // and a queue of unfinished work makes all of them stutter.
      const SAMPLE_GAP = 40;
      const gl = renderer.getContext() as WebGL2RenderingContext;
      let sampleDone: WebGLSync | null = null, sampledAt = 0;
      const loadTrace = () => {
        if (!tracer) return;
        scene.remove(hl);
        tracer.setScene(scene, cam);
        tracedSamples = -2;
      };
      const stopTrace = () => {
        tracer = null;
        view.current = { pos: cam.position.toArray(), target: controls.target.toArray() };
        setFresh((n) => n + 1);
      };
      const startTrace = async () => {
        onTraceRef.current?.(-1);
        const { WebGLPathTracer, GradientEquirectTexture } = await import("three-gpu-pathtracer");
        if (disposed || !traceOn.current || tracer) return;
        const sky = new GradientEquirectTexture();
        sky.topColor.set("#ffffff");
        sky.bottomColor.set("#f1ece4");
        sky.update();
        traceSky = sky;
        scene.environment = sky;
        scene.environmentIntensity = 1.7;
        sun.intensity = 0.5;
        fill.intensity = 0;
        const pt = new WebGLPathTracer(renderer);
        pt.tiles.set(3, 3);
        pt.bounces = 6;
        pt.filterGlossyFactor = 0.5;
        pt.minSamples = 2;
        pt.fadeDuration = 200;
        pt.renderScale = Math.min(1, 1.25 / ratio);
        await kitchen.ready;
        if (disposed || !traceOn.current) return;
        tracer = pt;
        loadTrace();
      };
      setTrace.current = (on) => {
        if (on && !tracer) startTrace().catch(() => { tracer = null; onTraceRef.current?.(-1); });
        else if (!on && (tracer || scene.environment !== envMap)) stopTrace();
      };
      kitchen.ready.then(invalidate);

      const dispose3D = (root: T.Object3D) => root.traverse((o) => {
        const m = o as T.Mesh;
        if (!m.isMesh) return;
        m.geometry.dispose();
        (Array.isArray(m.material) ? m.material : [m.material]).forEach((x) => x.dispose());
      });
      // the layout changed (a door painted, a width typed): only the kitchen is rebuilt, the view stays where it is
      swap.current = (k) => {
        if (k === builtKey) return;
        builtKey = k;
        scene.remove(kitchen.root);
        dispose3D(kitchen.root);
        kitchen = buildKitchen(three, JSON.parse(k));
        scene.add(kitchen.root);
        hl.visible = false;
        kitchen.ready.then(() => { invalidate(); loadTrace(); });
        invalidate();
      };
      swap.current(keyRef.current); // it may have changed while the 3D was loading
      setTrace.current(traceOn.current);

      let raf = 0;
      const loop = () => {
        controls.update();
        const now = performance.now();
        if (tracer) {
          if (dirty) {
            tracer.updateCamera();
            dirty = false;
          }
          const busy = sampleDone && gl.getSyncParameter(sampleDone, gl.SYNC_STATUS) !== gl.SIGNALED;
          if (!busy && tracer.samples < MAX_SAMPLES && now - sampledAt >= SAMPLE_GAP) {
            if (sampleDone) gl.deleteSync(sampleDone);
            tracer.renderSample();
            sampleDone = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
            gl.flush();
            sampledAt = now;
          }
          const n = Math.floor(tracer.samples);
          if (n !== tracedSamples) {
            tracedSamples = n;
            onTraceRef.current?.(n);
          }
        } else if (dirty) {
          renderer.render(scene, cam);
          dirty = false;
          fine = false;
          movedAt = now;
        } else if (!fine && composer && !paintRef.current && now - movedAt > 180) {
          composer.render();
          fine = true;
        }
        raf = requestAnimationFrame(loop);
      };
      loop();

      const ray = new three.Raycaster();
      const ndc = new three.Vector2();
      const frontAt = (e: PointerEvent) => {
        const r = renderer.domElement.getBoundingClientRect();
        ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
        ray.setFromCamera(ndc, cam);
        const hit = ray.intersectObject(kitchen.root, true)[0]?.object;
        return hit?.userData.front ? (hit.userData as { front: string; panel: T.Mesh }) : null;
      };
      let painting = false, lastRef = "", hovered: T.Mesh | null = null;
      const glow = (panel: T.Mesh | null) => {
        if (panel === hovered && hl.visible === !!panel) return;
        hovered = panel;
        hl.visible = !!panel;
        if (panel) {
          panel.updateWorldMatrix(true, false);
          hl.geometry = panel.geometry;
          hl.matrix.copy(panel.matrixWorld);
        }
        invalidate();
      };
      const onDown = (e: PointerEvent) => {
        if (!paintRef.current || e.button !== 0) return;
        const f = frontAt(e);
        if (!f) return; // on the wall or the floor the view turns as usual
        controls.enabled = false;
        painting = true;
        lastRef = f.front;
        paintRef.current(f.front);
      };
      const onMove = (e: PointerEvent) => {
        if (!paintRef.current) {
          if (hl.visible) glow(null);
          el.style.cursor = "";
          return;
        }
        const f = frontAt(e);
        el.style.cursor = f ? "crosshair" : "";
        glow(f ? f.panel : null);
        if (painting && f && f.front !== lastRef) {
          lastRef = f.front;
          paintRef.current(f.front);
        }
      };
      const onUp = () => {
        painting = false;
        controls.enabled = true;
      };
      el.addEventListener("pointerdown", onDown, true); // before the view control sees it
      el.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);

      if (shotRef) shotRef.current = () => {
        if (tracer) {
          // the render as it stands now, at the size of the view
          tracer.renderSample();
          return renderer.domElement.toDataURL("image/jpeg", 0.92);
        }
        const w = el.clientWidth;
        const SW = 1920, SH = 1080;
        hl.visible = false;
        renderer.setPixelRatio(1);
        renderer.setSize(SW, SH, false);
        cam.aspect = SW / SH;
        cam.updateProjectionMatrix();
        if (composer) {
          composer.setPixelRatio(1);
          composer.setSize(SW, SH);
          composer.render();
        } else renderer.render(scene, cam);
        const jpeg = renderer.domElement.toDataURL("image/jpeg", 0.92);
        renderer.setPixelRatio(ratio);
        renderer.setSize(w, H);
        cam.aspect = w / H;
        cam.updateProjectionMatrix();
        if (composer) {
          composer.setPixelRatio(ratio);
          composer.setSize(w, H);
        }
        invalidate();
        return jpeg;
      };

      const ro = new ResizeObserver(() => {
        const w = el.clientWidth;
        if (!w) return;
        renderer.setSize(w, H);
        composer?.setSize(w, H);
        cam.aspect = w / H;
        cam.updateProjectionMatrix();
        invalidate();
      });
      ro.observe(el);
      cleanup = () => {
        cancelAnimationFrame(raf);
        ro.disconnect();
        el.removeEventListener("pointerdown", onDown, true);
        el.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
        swap.current = null;
        setTrace.current = null;
        tracer = null;
        traceSky?.dispose();
        if (shotRef) shotRef.current = null;
        controls.dispose();
        dispose3D(kitchen.root);
        composer?.dispose();
        pmrem.dispose();
        envMap.dispose();
        renderer.forceContextLoss(); // everything on the graphics card goes, also what the render engine holds
        renderer.dispose();
        renderer.domElement.remove();
      };
    })().catch(() => setFailed(true));
    return () => { disposed = true; cleanup(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [still ? key : "", still, height, fresh]);

  useEffect(() => {
    if (!still) swap.current?.(key);
  }, [key, still]);
  useEffect(() => {
    setTrace.current?.(trace);
  }, [trace]);

  if (failed && still) return <div className="nqp-3d still" data-ready="1" />; // the PDF goes out with the drawings only
  if (failed) return <div className="nqp-3d-fail">התצוגה בתלת-ממד לא נתמכת בדפדפן הזה. השרטוט עם המידות מופיע למטה.</div>;
  if (still)
    return (
      <div ref={host} className="nqp-3d still" data-ready={img ? "1" : undefined}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {img && <img src={img} alt="המטבח בתלת-ממד" />}
      </div>
    );
  return <div ref={host} className="nqp-3d" style={{ height }} />;
}
