"use client";
// The kitchen in 3D, built from the same centimeters as the drawing, so the proportions match.
// The client turns it with a finger. In `still` mode (the PDF) it renders one frame into an image.
// It draws only when something changed and never swaps to another quality when it stops, so nothing jumps
// and the graphics card stays free for the other windows. Erez paints fronts on it with a touch (`paint`).
import { useEffect, useRef, useState, type MutableRefObject } from "react";
import type * as T from "three";
import {
  COUNTER_COLORS, FRONT_COLORS, FRONT_THICK, SIDE_PANEL, FRIDGE_BLACK, fridgeNiche, beamHeight, sidesOf, colorOf, corniceBoxes, handleOf, columnParts, openingBox, cornerPart, counterSpans, counterSpansOver, wallFillers, WALL_FILLER, endWallLen, frontsFrom, hasCounter, heightsOf, islandBox, islandEnds, islandExtras, islandSeat, panelHeights, tvSize, mainWallIndex, partsOf, placed, tallOvenParts, tallDoors, shelfYs, onCounter, tallHandleRight, upperBox, wallGeometry,
  type BaseUnit, type KitchenLayout, type LayoutHeights, type UpperRow, type UpperUnit,
} from "@/lib/quotes/layout";
import { bluranImg, bluranOf } from "@/lib/quotes/bluran";
import { polymerDecor, polymerOf } from "@/lib/quotes/polymer";

type Three = typeof import("three");
type Mats = Record<"front" | "upper" | "carcass" | "upperCarcass" | "counter" | "plinth" | "steel" | "glass" | "handle" | "wall" | "floor" | "shelf" | "sink" | "grip" | "black" | "zone" | "display" | "inox" | "groove" | "stool", T.Material>;

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
function buildKitchen(three: Three, l: KitchenLayout, showInside = false) {
  const h = heightsOf(l);
  const front = colorOf(l.colors?.front, FRONT_COLORS, FRONT_COLORS.white.hex);
  const upper = colorOf(l.colors?.upper || l.colors?.front, FRONT_COLORS, front);
  const counter = colorOf(l.colors?.counter, COUNTER_COLORS, COUNTER_COLORS.white_stone.hex);
  const stoneTop = (l.colors?.counter || "white_stone").endsWith("_stone");
  const handles = !l.colors?.handles || l.colors.handles === "bar";
  const grip = l.colors?.handles === "integral";
  const hl = handleOf(l);
  // the door model (Bluran polymer): a raised frame around the panel, board grooves, or glass
  const model = polymerOf(l.colors?.model);
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
    plinth: l.colors?.plinth ? (l.colors.plinth === "front" ? std(front, 0.55) : std(colorOf(l.colors.plinth, FRONT_COLORS, "#4a4642"), 0.6)) : std("#4a4642", 0.9),
    steel: std("#d4d7da", 0.35, 0.25),
    glass: std("#0c0c0d", 0.12, 0),
    handle: std(hl.hex, 0.35, hl.metal),
    wall: std("#f4f1eb", 0.92, 0, { side: three.FrontSide }),
    floor: std("#ffffff", 0.5, 0, { map: drawnTexture(three, "oak", oakFloor) }),
    shelf: std("#e3ddd2", 0.7),
    sink: std("#b4babe", 0.3, 0.35),
    // the integral handle's groove: black, aluminum, or the cabinet's own color (set per front below)
    grip: l.colors?.grip === "alu" ? std("#b9bcbf", 0.35, 0.7) : std("#2b2724", 0.85),
    groove: std("#000000", 0.9, 0, { transparent: true, opacity: 0.22 }),
    stool: std("#2f2a26", 0.55),
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
  const led = std("#fff4d6", 0.4, 0, { emissive: new three.Color("#ffe6ae"), emissiveIntensity: 2.2 });

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
  const frontPanel = (p: T.Object3D, mat: T.Material, x0: number, y0: number, w: number, hh: number, z: number, side: "top" | "bottom" | "mid" | "mid-r" | undefined, ref?: string, glass?: string) => {
    if (showInside) return; // the view with the fronts off, to see what's in the cabinets
    // "mid-r": a tall door's handle on its right edge (away from a wall on the left)
    const handle = side === "mid-r" ? "mid" : side;
    const ex = (off: number) => (side === "mid-r" ? x0 + w - off : x0 + off);
    if (glass) {
      // a vitrine: glass in a frame
      const t = 2.2;
      tag(box(p, mat, w - 0.4, t, 1.8, x0 + w / 2, y0 + hh - t / 2 - 0.2, z + 0.9), ref);
      tag(box(p, mat, w - 0.4, t, 1.8, x0 + w / 2, y0 + t / 2 + 0.2, z + 0.9), ref);
      tag(box(p, mat, t, hh - 0.4, 1.8, x0 + t / 2 + 0.2, y0 + hh / 2, z + 0.9), ref);
      tag(box(p, mat, t, hh - 0.4, 1.8, x0 + w - t / 2 - 0.2, y0 + hh / 2, z + 0.9), ref);
      const pane = new three.Mesh(new three.BoxGeometry((w - t * 2) * M, (hh - t * 2) * M, 0.6 * M), std(glass === "smoked" ? "#3d4347" : "#dfeef7", 0.08, 0, { transparent: true, opacity: glass === "smoked" ? 0.65 : 0.3 }));
      pane.position.set((x0 + w / 2) * M, (y0 + hh / 2) * M, (z + 0.9) * M);
      p.add(pane);
      if (handles && handle) box(p, mats.handle, Math.min(16, w * 0.45), 1.2, 1.6, x0 + w / 2, handle === "top" ? y0 + hh - 4 : y0 + 4, z + 2.6);
      return;
    }
    const panel = tag(box(p, mat, w - 0.4, hh - 0.4, 1.8, x0 + w / 2, y0 + hh / 2, z + 0.9), ref);
    const dec = polymerDecor(model, w, hh);
    if (dec) {
      const fz = z + 1.8;
      if (dec.inner) {
        const { x: ix, y: iy, w: iw, h: ih } = dec.inner;
        // the frame stands 0.6 proud of the panel
        tag(box(p, mat, w - 0.4, iy, 0.6, x0 + w / 2, y0 + iy / 2, fz + 0.3), ref, panel);
        tag(box(p, mat, w - 0.4, hh - iy - ih, 0.6, x0 + w / 2, y0 + iy + ih + (hh - iy - ih) / 2, fz + 0.3), ref, panel);
        tag(box(p, mat, ix, ih, 0.6, x0 + ix / 2, y0 + iy + ih / 2, fz + 0.3), ref, panel);
        tag(box(p, mat, w - ix - iw, ih, 0.6, x0 + ix + iw + (w - ix - iw) / 2, y0 + iy + ih / 2, fz + 0.3), ref, panel);
        // a thin shadow line where the frame steps down to the panel, so the design reads in any light
        const sl = 0.45, sz = fz + 0.62;
        box(p, mats.groove, iw + sl * 2, sl, 0.05, x0 + ix + iw / 2, y0 + iy - sl / 2, sz);
        box(p, mats.groove, iw + sl * 2, sl, 0.05, x0 + ix + iw / 2, y0 + iy + ih + sl / 2, sz);
        box(p, mats.groove, sl, ih, 0.05, x0 + ix - sl / 2, y0 + iy + ih / 2, sz);
        box(p, mats.groove, sl, ih, 0.05, x0 + ix + iw + sl / 2, y0 + iy + ih / 2, sz);
        if (dec.glass) {
          const pane = new three.Mesh(new three.BoxGeometry(iw * M, ih * M, 0.4 * M), std("#dfeef7", 0.08, 0, { transparent: true, opacity: 0.35 }));
          pane.position.set((x0 + ix + iw / 2) * M, (y0 + iy + ih / 2) * M, (fz + 0.1) * M);
          p.add(pane);
        }
      }
      const gy = dec.inner ? dec.inner.y : 0.4, gh = dec.inner ? dec.inner.h : hh - 0.8;
      for (const lx of dec.lines) box(p, mats.groove, 0.35, gh, 0.2, x0 + lx, y0 + gy + gh / 2, fz + 0.05);
    }
    if (grip && handle) {
      // integral handle: a grip groove milled into the edge of the front
      const gm = l.colors?.grip === "front" ? mat : mats.grip;
      if (handle === "mid") tag(box(p, gm, 1.6, hh - 0.4, 0.5, ex(1.2), y0 + hh / 2, z + 1.6), ref, panel);
      else tag(box(p, gm, w - 0.4, 1.6, 0.5, x0 + w / 2, handle === "top" ? y0 + hh - 1.2 : y0 + 1.2, z + 1.6), ref, panel);
      return;
    }
    if (!handles || !handle) return;
    const hy = handle === "top" ? y0 + hh - 4 : handle === "bottom" ? y0 + 4 : y0 + hh / 2;
    if (hl.style === "knob") {
      const knob = new three.Mesh(new three.CylinderGeometry(1.2 * M, 1.2 * M, 2.4 * M, 18), mats.handle);
      knob.rotation.x = Math.PI / 2;
      knob.position.set((handle === "mid" ? ex(5) : x0 + w / 2) * M, hy * M, (z + 2.8) * M);
      p.add(knob);
    } else if (hl.style === "edge") {
      if (handle === "mid") tag(box(p, mats.handle, 1, hh - 0.4, 1.2, ex(0.8), y0 + hh / 2, z + 2.2), ref, panel);
      else tag(box(p, mats.handle, w - 0.4, 1, 1.2, x0 + w / 2, handle === "top" ? y0 + hh - 0.7 : y0 + 0.7, z + 2.2), ref, panel);
    } else if (handle === "mid") tag(box(p, mats.handle, 1.2, Math.min(Math.max(hl.length, 30), hh * 0.5), 1.6, ex(5), hy, z + 2.6), ref, panel);
    else tag(box(p, mats.handle, Math.min(hl.length, w * 0.9), 1.2, 1.6, x0 + w / 2, hy, z + 2.6), ref, panel);
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
  /** An induction hob flush in the counter: black glass with four cooking zones and a touch strip; gas: grates and burners. */
  const cooktop = (p: T.Object3D, cx: number, y: number, cz: number, w: number, gas = false) => {
    const d = 51;
    box(p, mats.glass, w, 0.5, d, cx, y + 0.25, cz);
    if (gas) {
      const nx = w >= 80 ? 3 : 2;
      for (let i = 0; i < nx; i++) for (const oz of [-0.22, 0.22]) {
        const ox = (i + 0.5) / nx - 0.5;
        const burner = new three.Mesh(new three.CylinderGeometry(3.5 * M, 4 * M, 2 * M, 20), mats.black);
        burner.position.set((cx + ox * w) * M, (y + 1.5) * M, (cz + oz * d) * M);
        p.add(burner);
        box(p, mats.black, Math.min(w / nx - 3, 22), 0.8, 1, cx + ox * w, y + 3, cz + oz * d);
        box(p, mats.black, 1, 0.8, 20, cx + ox * w, y + 3, cz + oz * d);
      }
      return;
    }
    for (const [ox, oz, r] of [[-0.25, -0.22, 9], [0.25, -0.22, 7.5], [-0.25, 0.2, 7.5], [0.25, 0.2, 9]] as const) {
      const ring = new three.Mesh(new three.RingGeometry((r - 0.5) * M, r * M, 40), mats.zone);
      ring.rotation.x = -Math.PI / 2;
      ring.position.set((cx + ox * w) * M, (y + 0.52) * M, (cz + oz * d) * M);
      p.add(ring);
    }
    box(p, mats.zone, w * 0.5, 0.05, 2.4, cx, y + 0.53, cz + d / 2 - 3);
  };
  /** A modern faucet: a column with a curved spout over the basin. */
  const faucet = (p: T.Object3D, cx: number, y: number, z: number, finish?: string) => {
    const metal = finish === "black" ? std("#17171a", 0.35, 0.3) : finish === "gold" ? std("#b08d4a", 0.3, 0.8) : mats.inox;
    const col = new three.Mesh(new three.CylinderGeometry(1.5 * M, 1.8 * M, 28 * M, 20), metal);
    col.position.set(cx * M, (y + 14) * M, z * M);
    col.castShadow = true;
    p.add(col);
    const arc = new three.Mesh(new three.TorusGeometry(9 * M, 1.3 * M, 12, 24, Math.PI), metal);
    arc.rotation.y = Math.PI / 2;
    arc.position.set(cx * M, (y + 28) * M, (z + 9) * M);
    arc.castShadow = true;
    p.add(arc);
    box(p, metal, 1.2, 4, 1.2, cx + 2.2, y + 22, z);
  };

  /** The body of a cabinet: solid, or with the fronts off an open box showing what's inside. */
  const body = (p: T.Object3D, mat: T.Material, x: number, y0: number, w: number, hh: number, z: number, u?: { inside?: { shelves?: number; drawers?: number; pull?: string }; kind?: string; cornerType?: string }, stack?: number) => {
    if (!showInside && !(u as { glass?: string } | undefined)?.glass) return box(p, mat, w - 0.2, hh, z, x + w / 2, y0 + hh / 2, z / 2);
    const t = 1.8, cz = z / 2, cx = x + w / 2, cy = y0 + hh / 2;
    box(p, mat, w - 0.2, hh, 0.8, cx, cy, 0.4);
    box(p, mat, t, hh, z, x + t / 2, cy, cz);
    box(p, mat, t, hh, z, x + w - t / 2, cy, cz);
    box(p, mat, w - 0.2, t, z, cx, y0 + t / 2, cz);
    box(p, mat, w - 0.2, t, z, cx, y0 + hh - t / 2, cz);
    const inner = w - t * 2 - 0.4;
    const metal = mats.inox, wood = mats.shelf;
    let room = hh, from = y0;
    if (u?.inside?.drawers || stack) {
      // inner drawers from the bottom: each an open tray
      const n = u?.inside?.drawers || stack || 0, dh = u?.inside?.drawers ? Math.min(16, (hh * 0.6) / n) : (hh - t * 2) / n;
      for (let i = 0; i < n; i++) {
        const y = y0 + t + i * dh + 0.5;
        box(p, metal, inner, 0.6, z - 6, cx, y, cz + 1);
        box(p, wood, inner, dh * 0.6, 1, cx, y + dh * 0.3, z - 2.5);
        box(p, metal, 1, dh * 0.5, z - 6, x + t + 0.9, y + dh * 0.25, cz + 1);
        box(p, metal, 1, dh * 0.5, z - 6, x + w - t - 0.9, y + dh * 0.25, cz + 1);
      }
      room -= n * dh + t;
      from += n * dh + t;
    }
    if (u?.inside?.pull === "trash") {
      const bw = inner / 2 - 1.5, bh = Math.min(hh - 12, 40);
      for (const k of [-1, 1]) box(p, mats.black, bw, bh, z - 14, cx + (k * (bw + 1.5)) / 2, y0 + t + bh / 2 + 2, cz + 2);
    }
    if (u?.inside?.pull === "pantry") {
      const shelves = Math.max(3, Math.floor(hh / 35));
      for (let i = 0; i < shelves; i++) {
        const y = y0 + t + 5 + (i * (hh - 12)) / shelves;
        box(p, metal, inner * 0.92, 0.5, z - 6, cx, y, cz + 1);
        box(p, metal, inner * 0.92, 7, 0.4, cx, y + 3.5, z - 3);
        box(p, metal, 0.4, 7, z - 6, x + t + inner * 0.05, y + 3.5, cz + 1);
        box(p, metal, 0.4, 7, z - 6, x + w - t - inner * 0.05, y + 3.5, cz + 1);
      }
    }
    if (u?.inside?.shelves) for (let i = 1; i <= u.inside.shelves; i++) box(p, wood, inner, 1.8, z - 3, cx, from + (room * i) / (u.inside.shelves + 1), cz);
    if (u?.cornerType === "carousel") for (const k of [0.3, 0.7]) {
      const disc = new three.Mesh(new three.CylinderGeometry(Math.min(inner, z) * 0.42 * M, Math.min(inner, z) * 0.42 * M, 1.2 * M, 28), metal);
      disc.position.set(cx * M, (y0 + hh * k) * M, cz * M);
      p.add(disc);
    }
    if (u?.cornerType === "pullout") for (const k of [0.3, 0.7]) box(p, metal, inner * 0.9, 1, z - 5, cx, y0 + hh * k, cz);
    return undefined;
  };
  /** A finished panel on the exposed side of a cabinet. */
  const sidePanels = (p: T.Object3D, mat: T.Material, sides: { left: boolean; right: boolean; leftFrom?: number; rightFrom?: number; leftTo?: number; rightTo?: number }, x: number, w: number, y0: number, hh: number, z: number) => {
    const deep = z + FRONT_THICK;
    // beside a lower unit the panel sits on the counter; under an upper cabinet beside it, it stops
    const one = (from: number | undefined, to: number | undefined, cx: number) => {
      const yb = Math.max(y0, from ?? y0), top = Math.min(y0 + hh, to ?? y0 + hh);
      if (top - yb > 0.5) box(p, mat, SIDE_PANEL, top - yb, deep, cx, yb + (top - yb) / 2, deep / 2);
    };
    if (sides.left) one(sides.leftFrom, sides.leftTo, x - SIDE_PANEL / 2);
    if (sides.right) one(sides.rightFrom, sides.rightTo, x + w + SIDE_PANEL / 2);
  };
  /** A niche: a frame in the plane of the fronts, its back `recess` behind it. */
  const niche = (p: T.Object3D, mat: T.Material, x: number, y0: number, w: number, hh: number, front: number, recess: number, frame: number, shelves: number, ref?: string, tv?: boolean, tvGap?: number) => {
    const back = Math.max(0.1, front - recess);
    if (tv) {
      // a thin screen against the back of the niche
      const s = tvSize(w, hh, frame, tvGap);
      box(p, mats.black, s.w, s.h, 2.5, x + w / 2, y0 + hh / 2, back + 1.25);
      box(p, mats.glass, s.w - 1, s.h - 1, 0.2, x + w / 2, y0 + hh / 2, back + 2.6);
    }
    tag(box(p, mat, w, hh, back, x + w / 2, y0 + hh / 2, back / 2), ref);
    const mid = front - recess / 2;
    tag(box(p, mat, frame, hh, recess, x + frame / 2, y0 + hh / 2, mid), ref);
    tag(box(p, mat, frame, hh, recess, x + w - frame / 2, y0 + hh / 2, mid), ref);
    tag(box(p, mat, w - frame * 2, frame, recess, x + w / 2, y0 + frame / 2, mid), ref);
    tag(box(p, mat, w - frame * 2, frame, recess, x + w / 2, y0 + hh - frame / 2, mid), ref);
    for (let i = 1; i <= shelves; i++) tag(box(p, mat, w - frame * 2, 1.8, recess, x + w / 2, y0 + (hh * i) / (shelves + 1), mid), ref);
    if (l.lighting?.nicheLed) box(p, led, w - frame * 2 - 2, 0.6, 1.5, x + w / 2, y0 + hh - frame - 0.3, front - 3);
  };

  /** One run of base cabinets along local x, backs at z=0, fronts facing +z. */
  const baseRun = (p: T.Object3D, units: BaseUnit[], depth: number, hs: LayoutHeights, at: string, withCounter = true, fall?: { left?: boolean; right?: boolean }) => {
    const f0 = frontsFrom(hs), f1 = hs.base - hs.counter, fh = f1 - f0;
    const z = depth; // the body; its front comes on top of it
    const atNum = at === "island" ? ("island" as const) : Number(at);
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
          if (hs.plinth > 0) box(p, mats.plinth, c.w, hs.plinth, depth - 6, x + c.a + c.w / 2, hs.plinth / 2, (depth - 6) / 2);
          body(p, mats.carcass, x + c.a, f0, c.w, f1 - f0, z, u);
        }
        if (c.filler.w > 0.01) frontPanel(p, matOf(u.color, mats.front), x + c.filler.a, f0, c.filler.w + 0.4, fh, z, u.cornerType ? "top" : undefined, r(-1));
        continue;
      }
      if (u.kind === "fridge") {
        const built = u.fridgeType === "built";
        const skin = built ? matOf(u.color, mats.front) : matOf(u.color || FRIDGE_BLACK, mats.inox);
        const fd = depth + FRONT_THICK;
        // a standing fridge stands in a niche (formica on the neighbors' sides) with a cabinet above it up to the
        // tall cabinets; where it ends the kitchen, a 2 cm side panel closes it
        const nn = fridgeNiche(u, hs);
        const fx = x, fw = built ? w : nn.inner, fh = built ? hs.tall : nn.fh;
        if (!built) {
          sidePanels(p, mats.front, sidesOf(l, atNum, "base", idx), x, w, 0, nn.top, depth);
          if (nn.over) {
            body(p, mats.carcass, fx, nn.over.y0, fw, nn.over.hh, depth);
            frontPanel(p, matOf(u.fronts?.[0], mats.front), fx, nn.over.y0, fw, nn.over.hh, depth, "bottom", r(0));
          }
        }
        // a real fridge: one or two columns (a wide one is two), freezer below, bar handles, a small display
        const cols = fw >= 100 ? 2 : 1, cw = (fw - 0.6) / cols, fz = fh * 0.36;
        box(p, mats.black, fw - 0.6, fh - 1, fd - 4, fx + fw / 2, (fh - 1) / 2, (fd - 4) / 2);
        for (let k = 0; k < cols; k++) {
          const cx = fx + 0.3 + cw * k + cw / 2;
          tag(box(p, skin, cw - 0.5, fh - fz - 1.2, 3, cx, fz + (fh - fz) / 2, fd - 1.5), r(-1));
          tag(box(p, skin, cw - 0.5, fz - 2, 3, cx, 1 + (fz - 2) / 2, fd - 1.5), r(-1));
          const hx = cols === 2 ? (k === 0 ? cx + cw / 2 - 5 : cx - cw / 2 + 5) : fx + 5;
          if (built) { if (handles) { box(p, mats.handle, 1.4, 30, 1.8, hx, fz + 30, fd + 0.8); box(p, mats.handle, 1.4, 22, 1.8, hx, fz - 16, fd + 0.8); } continue; }
          box(p, mats.inox, 1.6, 45, 2.4, hx, fz + 40, fd + 1);
          box(p, mats.inox, 1.6, 30, 2.4, hx, fz - 22, fd + 1);
          box(p, mats.display, 6, 9, 0.3, cx, fz + (fh - fz) * 0.62, fd + 0.1);
        }
        continue;
      }
      const tall = u.kind === "tall" || u.kind === "tall_oven";
      const fm = unitMats(u, mats.front);
      const by = u.y ?? f0, dd = u.d ?? depth, zz = dd;
      if (u.y === undefined && hs.plinth > 0) box(p, mats.plinth, w, hs.plinth, dd - 6, x + w / 2, hs.plinth / 2, (dd - 6) / 2);
      if (u.kind === "open") {
        niche(p, matOf(u.color, mats.front), x, by, w, (u.h ?? f1 - by), dd + 1.8, u.recess ?? dd + 1, u.frame ?? 2, n, r(-1));
        continue;
      }
      if (u.kind === "panel") {
        // a front with no cabinet of its own, in the plane of the fronts, closed behind so its side looks whole
        let yy = by;
        panelHeights(u, hs).forEach((ph, i) => {
          box(p, mats.carcass, w - 0.2, ph, zz, x + w / 2, yy + ph / 2, zz / 2);
          frontPanel(p, fm(i), x, yy, w, ph, zz, undefined, r(i));
          yy += ph;
        });
        continue;
      }
      if (u.kind === "column") {
        sidePanels(p, matOf(u.color, mats.front), sidesOf(l, atNum, "base", idx), x, w, u.y === undefined ? 0 : by, (columnParts(u, hs).reduce((a, c) => a + c.h, 0)) + (u.y === undefined ? by : 0), dd);
        for (const c of columnParts(u, hs)) {
          const pz = c.d ?? dd;
          const at = c.y0 + c.h > 120 ? "bottom" : "top";
          if (c.kind === "oven" || c.kind === "microwave" || c.kind === "coffee") {
            box(p, mats.carcass, w - 0.2, c.h, pz, x + w / 2, c.y0 + c.h / 2, pz / 2);
            oven(p, x, c.y0, w, c.h, pz);
            continue;
          }
          if (c.kind === "niche") {
            niche(p, matOf(u.color, mats.front), x, c.y0, w, c.h, pz + 1.8, c.recess ?? 10, c.frame ?? 2, c.n ?? 0, r(-1), c.tv, c.tvGap);
            continue;
          }
          box(p, mats.carcass, w - 0.2, c.h, pz, x + w / 2, c.y0 + c.h / 2, pz / 2);
          if (c.kind === "panel") frontPanel(p, fm(c.from), x, c.y0, w, c.h, pz, undefined, r(c.from));
          else if (c.kind === "doors") for (let k = 0; k < c.count; k++) frontPanel(p, fm(c.from + k), x + (k * w) / c.count, c.y0, w / c.count, c.h, pz, at, r(c.from + k));
          else for (let k = 0; k < c.count; k++) frontPanel(p, fm(c.from + k), x, c.y0 + c.h - ((k + 1) * c.h) / c.count, w, c.h / c.count, pz, at, r(c.from + k));
        }
        continue;
      }
      const top = u.h !== undefined ? by + u.h : tall ? hs.tall : f1;
      const bh = top - by;
      const stacked = u.kind === "drawers" || u.kind === "cooktop" ? n : u.kind === "tall_oven" ? tallOvenParts(u, hs).drawers : undefined;
      body(p, mats.carcass, x, by, w, bh, zz, u, stacked);
      sidePanels(p, matOf(u.color, mats.front), sidesOf(l, atNum, "base", idx), x, w, u.y === undefined ? 0 : by, bh + (u.y === undefined ? by : 0), zz);
      switch (u.kind) {
        case "doors":
        case "sink":
          for (let i = 0; i < n; i++) frontPanel(p, fm(i), x + (i * w) / n, by, w / n, bh, zz, "top", r(i), u.glass);
          break;
        case "drawers":
        case "cooktop":
          for (let i = 0; i < n; i++) frontPanel(p, fm(n - 1 - i), x, by + (i * bh) / n, w, bh / n, zz, "top", r(n - 1 - i));
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
        case "tall": {
          // doors up to the fridge line and above it
          const ds = tallDoors(u, hs);
          let yy = by;
          // above the fridge line the grip is at the door's bottom, in one line with the cabinet over the fridge
          // the handle is never on the wall side
          const midSide = tallHandleRight(l, atNum, idx) ? "mid-r" : "mid";
          ds.forEach((dh, i) => { frontPanel(p, fm(ds.length - 1 - i), x, yy, w, dh, zz, ds.length === 2 && i === 1 ? "bottom" : midSide, r(ds.length - 1 - i)); yy += dh; });
          break;
        }
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
        const sw = Math.min(w - 14, 90), sd = 40, cz = depth / 2 + 2;
        const tone = u.sink?.color === "black" ? "#1c1c1e" : u.sink?.color === "white" ? "#f1efea" : "#8f969b";
        if (u.sink?.mount === "top") box(p, std(tone === "#8f969b" ? "#b4babe" : tone, 0.3, tone === "#8f969b" ? 0.35 : 0), sw + 2, 0.5, sd + 2, x + w / 2, hs.base + 0.1, cz);
        else box(p, mats.sink, sw, 0.3, sd, x + w / 2, hs.base + 0.05, cz);
        const bowls = u.sink?.bowls === 2 ? 2 : 1, bw = (sw - 3 - (bowls - 1) * 3) / bowls;
        for (let k = 0; k < bowls; k++) box(p, std(tone, 0.3, tone === "#8f969b" ? 0.4 : 0.05), bw, 0.3, sd - 3, x + w / 2 - sw / 2 + 1.5 + bw / 2 + k * (bw + 3), hs.base + 0.2, cz);
        faucet(p, x + w / 2, hs.base, 8, u.sink?.faucet);
      }
      if (u.kind === "cooktop") cooktop(p, x + w / 2, hs.base, depth / 2 + 1, Math.min(u.hobW || 60, w - 2), u.hob === "gas");
    }
    if (withCounter && hasCounter(l)) {
      const over = (l.counter?.over ?? 2) + FRONT_THICK, spans = counterSpansOver(l, atNum, units, depth);
      spans.forEach((s, k) => {
        box(p, counterMat(s.w, depth + over), s.w, hs.counter, depth + over, s.a + s.w / 2, hs.base - hs.counter / 2, (depth + over) / 2);
        if (l.counter?.splash) box(p, counterMat(s.w, l.counter.splash), s.w, l.counter.splash, 1, s.a + s.w / 2, hs.base + l.counter.splash / 2, 0.5);
        if (fall?.left && k === 0) box(p, counterMat(depth + over, hs.base), hs.counter, hs.base, depth + over, s.a - hs.counter / 2, hs.base / 2, (depth + over) / 2);
        if (fall?.right && k === spans.length - 1) box(p, counterMat(depth + over, hs.base), hs.counter, hs.base, depth + over, s.a + s.w + hs.counter / 2, hs.base / 2, (depth + over) / 2);
      });
    }
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
        if (u.hoodType === "flat") continue;
        const cw = Math.min(30, w * 0.4);
        box(p, mats.steel, cw, h.ceiling - y0 - 12, 24, x + w / 2, y0 + 12 + (h.ceiling - y0 - 12) / 2, 12);
        continue;
      }
      if (u.kind === "shelf") {
        const t = u.frame ?? 4;
        for (let i = 0; i < n; i++) tag(box(p, matOf(u.color, mats.upper), w, t, d, x + w / 2, y0 + (uh * i) / n + t / 2, d / 2), r(-1));
        continue;
      }
      if (u.kind === "open" && (u.recess || u.frame)) {
        niche(p, matOf(u.color, mats.upper), x, y0, w, uh, d + 1.8, u.recess ?? d, u.frame ?? 2, n, r(-1), u.tv, u.tvGap);
        continue;
      }
      if (u.kind === "open") {
        // standing on the counter it has no bottom of its own: the counter is its floor
        const om = matOf(u.color, mats.shelf), counter = onCounter(y0, h);
        if (!counter) box(p, om, w, 1.8, d, x + w / 2, y0 + 0.9, d / 2);
        box(p, om, w, 1.8, d, x + w / 2, y0 + uh - 0.9, d / 2);
        box(p, om, 1.8, uh, d, x + 0.9, y0 + uh / 2, d / 2);
        box(p, om, 1.8, uh, d, x + w - 0.9, y0 + uh / 2, d / 2);
        box(p, om, w - 3.6, uh, 0.8, x + w / 2, y0 + uh / 2, 0.4);
        for (const sy of shelfYs(uh, n, counter)) box(p, om, w - 3.6, 1.8, d - 2, x + w / 2, y0 + sy, d / 2);
        continue;
      }
      body(p, mats.upperCarcass, x, y0, w, uh, d, u);
      sidePanels(p, matOf(u.color, mats.upper), sidesOf(l, Number(at), row, idx), x, w, y0, uh, d);
      const um = unitMats(u, mats.upper);
      if (u.kind === "doors") for (let i = 0; i < n; i++) frontPanel(p, um(i), x + (i * w) / n, y0, w / n, uh, d, "bottom", r(i), u.glass);
      else for (let i = 0; i < n; i++) frontPanel(p, um(n - 1 - i), x, y0 + (i * uh) / n, w, uh / n, d, "bottom", r(n - 1 - i));
    }
  };

  const geo = wallGeometry(l);
  geo.forEach((g, i) => {
    const w = l.walls[i];
    const grp = new three.Group();
    grp.position.set(g.x * M, 0, g.z * M);
    grp.rotation.y = Math.atan2(-g.dz, g.dx);
    // the wall, with real holes for its windows and doors
    const outline = new three.Shape();
    outline.moveTo(0, 0);
    outline.lineTo(w.length * M, 0);
    outline.lineTo(w.length * M, h.ceiling * M);
    outline.lineTo(0, h.ceiling * M);
    outline.closePath();
    for (const o of w.openings || []) {
      const b = openingBox(o), y1 = Math.min(h.ceiling, b.y + b.h);
      const hole = new three.Path();
      hole.moveTo(o.a * M, b.y * M);
      hole.lineTo((o.a + o.w) * M, b.y * M);
      hole.lineTo((o.a + o.w) * M, y1 * M);
      hole.lineTo(o.a * M, y1 * M);
      hole.closePath();
      outline.holes.push(hole);
    }
    const wall = new three.Mesh(new three.ShapeGeometry(outline), mats.wall);
    wall.receiveShadow = true;
    grp.add(wall);
    for (const o of w.openings || []) {
      const b = openingBox(o), hh = Math.min(h.ceiling - b.y, b.h), cx = o.a + o.w / 2, cy = b.y + hh / 2;
      // frame all around, sticking out a little into the room
      box(grp, mats.shelf, o.w + 6, 3, 4, cx, b.y + hh + 1.5, -0.5);
      box(grp, mats.shelf, 3, hh + 3, 4, o.a - 1.5, cy, -0.5);
      box(grp, mats.shelf, 3, hh + 3, 4, o.a + o.w + 1.5, cy, -0.5);
      if (o.kind === "window") {
        box(grp, mats.shelf, o.w + 6, 3, 8, cx, b.y - 1.5, 1.5);
        box(grp, mats.shelf, 3, hh, 2, cx, cy, -4);
        const pane = new three.Mesh(new three.PlaneGeometry(o.w * M, hh * M), std("#dfeef7", 0.08, 0, { transparent: true, opacity: 0.55 }));
        pane.position.set(cx * M, cy * M, -4 * M);
        grp.add(pane);
      } else {
        box(grp, std("#ece8df", 0.6), o.w - 1, hh - 0.5, 3, cx, cy, -6);
        box(grp, mats.handle, 12, 1.6, 2, o.a + o.w - 9, b.y + 100, -3.5);
      }
    }
    for (const o of w.obstacles || []) {
      if (o.kind === "column") box(grp, mats.wall, o.w, h.ceiling, o.d, o.a + o.w / 2, h.ceiling / 2, o.d / 2);
      else box(grp, mats.wall, o.w, beamHeight(o), o.d, o.a + o.w / 2, h.ceiling - beamHeight(o) / 2, o.d / 2);
    }
    // where a wall ends in the room, its thickness shows: a face as wide as the wall is thick
    const T = l.wallThick ?? 20;
    const cap = (x: number, z: number, rotY: number) => {
      const face = new three.Mesh(new three.PlaneGeometry(T * M, h.ceiling * M), mats.wall);
      face.position.set(x * M, (h.ceiling / 2) * M, z * M);
      face.rotation.y = rotY;
      face.receiveShadow = true;
      grp.add(face);
    };
    // a wall standing across the kitchen's free end, if there is one, with its end face
    const cross = (x: number, facing: 1 | -1, len: number) => {
      const side = new three.Mesh(new three.PlaneGeometry(len * M, h.ceiling * M), mats.wall);
      side.position.set(x * M, (h.ceiling / 2) * M, (len / 2) * M);
      side.rotation.y = (facing * Math.PI) / 2;
      side.receiveShadow = true;
      grp.add(side);
      cap(x - (facing * T) / 2, len, 0);
    };
    if (i === 0) { if (l.ends?.left) cross(0, 1, endWallLen(l, "left")); else cap(0, -T / 2, -Math.PI / 2); }
    if (i === geo.length - 1) { if (l.ends?.right) cross(w.length, -1, endWallLen(l, "right")); else cap(w.length, -T / 2, Math.PI / 2); }
    baseRun(grp, w.base, h.depth, h, String(i), true, { left: i === 0 && l.counter?.fallLeft, right: i === geo.length - 1 && l.counter?.fallRight });
    // the 2 cm filler where a cabinet meets a wall, in front of the cabinet's edge (the cabinet is built narrower)
    for (const f of wallFillers(l, i)) {
      const deep = f.d + FRONT_THICK + 0.3;
      box(grp, matOf(f.color, f.upper ? mats.upper : mats.front), WALL_FILLER, f.y1 - f.y0, deep, f.x + WALL_FILLER / 2, f.y0 + (f.y1 - f.y0) / 2, deep / 2);
    }
    upperRun(grp, w.upper, "upper", String(i));
    upperRun(grp, w.top || [], "top", String(i));
    if (l.lighting?.underCabinet) for (const u of placed(w.upper)) {
      if (["gap", "corner", "hood", "shelf"].includes(u.kind)) continue;
      const b = upperBox(u, h, "upper");
      box(grp, led, u.w - 2, 0.6, 1.5, u.a + u.w / 2, b.y0 - 0.3, b.d - 6);
    }
    for (const b of corniceBoxes(l, w)) box(grp, mats.front, b.w, b.h, b.d + FRONT_THICK + (l.cornice?.over ?? 2), b.a + b.w / 2, b.y + b.h / 2, (b.d + FRONT_THICK + (l.cornice?.over ?? 2)) / 2);
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
    if (!islandExtras(l)) {
      baseRun(grp, units, isl.d - FRONT_THICK, h, "island", false);
      // the counter covers the whole island even where there are no cabinets
      if (hasCounter(l)) box(grp, counterMat(isl.w, isl.d + 2), isl.w, h.counter, isl.d + 2, isl.w / 2, h.base - h.counter / 2, isl.d / 2);
    } else {
      // local z: 0 = the back (seating side), d = the fronts facing the main wall
      const seat = islandSeat(l), d = isl.d, ends = islandEnds(l);
      const cab = new three.Group();
      cab.position.z = seat * M;
      grp.add(cab);
      baseRun(cab, units, d - seat - FRONT_THICK, h, "island", false);
      const back = matOf(l.island.backColor, mats.front), under = h.base - h.counter;
      // back cladding over the whole back of the cabinets, under the overhang
      box(grp, back, isl.w, under, SIDE_PANEL, isl.w / 2, under / 2, seat - SIDE_PANEL / 2);
      // exposed ends: a panel the full depth of the island, floor to counter
      if (ends.start) box(grp, back, SIDE_PANEL, under, d, -SIDE_PANEL / 2, under / 2, d / 2);
      if (ends.end) box(grp, back, SIDE_PANEL, under, d, isl.w + SIDE_PANEL / 2, under / 2, d / 2);
      // the counter: d deep over the cabinets and the seating, 2 cm over the fronts, and over the end panels
      if (hasCounter(l)) {
        const x0 = ends.start ? -SIDE_PANEL : 0, x1 = isl.w + (ends.end ? SIDE_PANEL : 0);
        box(grp, counterMat(x1 - x0, d + 2), x1 - x0, h.counter, d + 2, (x0 + x1) / 2, h.base - h.counter / 2, (d + 2) / 2);
      }
      // bar stools on the seating side, spread along the island
      const n = l.island.stools || 0, sh = Math.max(45, h.base - 25);
      for (let k = 0; k < n; k++) {
        const sx = (isl.w * (k + 0.5)) / n, sz = -12;
        const seatM = new three.Mesh(new three.CylinderGeometry(19 * M, 17 * M, 5 * M, 24), mats.stool);
        seatM.position.set(sx * M, (sh - 2.5) * M, sz * M);
        grp.add(seatM);
        const leg = new three.Mesh(new three.CylinderGeometry(2.4 * M, 2.4 * M, (sh - 5) * M, 12), mats.steel);
        leg.position.set(sx * M, ((sh - 5) / 2) * M, sz * M);
        grp.add(leg);
        const foot = new three.Mesh(new three.CylinderGeometry(19 * M, 20 * M, 1.6 * M, 24), mats.steel);
        foot.position.set(sx * M, 0.8 * M, sz * M);
        grp.add(foot);
        const ring = new three.Mesh(new three.TorusGeometry(15 * M, 0.9 * M, 8, 28), mats.steel);
        ring.rotation.x = Math.PI / 2;
        ring.position.set(sx * M, 25 * M, sz * M);
        grp.add(ring);
      }
    }
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
  // ceiling spots in rows over the kitchen, pendants over the island
  const spots = l.lighting?.spots || 0;
  if (spots) {
    const cols = Math.ceil(Math.sqrt(spots * 1.6)), rows = Math.ceil(spots / cols);
    for (let i = 0; i < spots; i++) {
      const disc = new three.Mesh(new three.CircleGeometry(4 * M, 20), led);
      disc.rotation.x = Math.PI / 2;
      disc.position.set(bb.min.x + 0.5 + ((i % cols) + 0.5) * ((bb.max.x - bb.min.x - 1) / cols), h.ceiling * M - 0.003, bb.min.z + 0.7 + (Math.floor(i / cols) + 0.5) * ((Math.max(1.5, bb.max.z - bb.min.z) - 0.9) / rows));
      root.add(disc);
    }
  }
  if (l.lighting?.pendants && isl) {
    const n = l.lighting.pendants;
    for (let i = 0; i < n; i++) {
      const px = isl.cx + ((i + 0.5) / n - 0.5) * isl.w * 0.8;
      const wire = new three.Mesh(new three.CylinderGeometry(0.3 * M, 0.3 * M, (h.ceiling - 165) * M, 6), mats.black);
      wire.position.set(px * M, ((h.ceiling + 165) / 2) * M, isl.cz * M);
      root.add(wire);
      const lamp = new three.Mesh(new three.SphereGeometry(11 * M, 20, 14), led);
      lamp.position.set(px * M, 155 * M, isl.cz * M);
      root.add(lamp);
    }
  }
  return { root, box: bb, ready: Promise.all(loading) };
}

/** shotRef: takes a 16:9 picture from the angle now on screen. paint: while set, a touch on a front paints it. */
export default function Kitchen3D({ layout, still = false, height = 420, shotRef, paint, inside = false }: {
  layout: KitchenLayout; still?: boolean; height?: number; shotRef?: MutableRefObject<(() => string) | null>; paint?: (ref: string) => void;
  /** the fronts off, to see what's inside the cabinets */ inside?: boolean;
}) {
  const host = useRef<HTMLDivElement>(null);
  const [img, setImg] = useState("");
  const [failed, setFailed] = useState(false);
  const key = JSON.stringify(layout);
  const keyRef = useRef(key);
  keyRef.current = key;
  const insideRef = useRef(inside);
  insideRef.current = inside;
  const paintRef = useRef(paint);
  paintRef.current = paint;
  const swap = useRef<((k: string) => void) | null>(null);

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
      const ratio = still ? 2 : Math.min(1.5, window.devicePixelRatio || 1);
      renderer.setPixelRatio(ratio);
      renderer.setSize(W, H);
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = three.PCFShadowMap;
      renderer.shadowMap.autoUpdate = false; // the sun stands still: shadows are drawn again only when the kitchen changes
      renderer.toneMapping = three.NeutralToneMapping; // keeps the Bluran colors true
      renderer.toneMappingExposure = 1;
      el.appendChild(renderer.domElement);

      const scene = new three.Scene();
      scene.background = new three.Color("#f4f1ec");
      const pmrem = new three.PMREMGenerator(renderer);
      const envMap = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
      scene.environment = envMap;
      scene.environmentIntensity = 0.95;
      let builtKey = keyRef.current + insideRef.current;
      let kitchen = buildKitchen(three, JSON.parse(keyRef.current), insideRef.current);
      scene.add(kitchen.root);
      const { box } = kitchen;

      // a wall unit stands up to the ceiling: the view takes in all of it
      const wallUnit = !hasCounter(JSON.parse(keyRef.current));
      const center = new three.Vector3((box.min.x + box.max.x) / 2, wallUnit ? box.max.y / 2 : 1.0, (box.min.z + box.max.z) / 2);
      const size = Math.max(box.max.x - box.min.x, box.max.z - box.min.z, 2.5);
      scene.add(new three.HemisphereLight(0xffffff, 0xdcd3c4, 0.95));
      const sun = new three.DirectionalLight(0xfff4e6, 1.25);
      sun.position.set(center.x - size * 0.7, 4.2, center.z + size * 1.3); // from the room's open side, on every wall of an L
      sun.target.position.copy(center);
      sun.castShadow = true;
      sun.shadow.mapSize.set(2048, 2048);
      sun.shadow.radius = 4;
      const sc = sun.shadow.camera;
      sc.left = -size; sc.right = size; sc.top = size; sc.bottom = -size; sc.near = 0.5; sc.far = 20;
      sun.shadow.bias = -0.0004;
      sun.shadow.normalBias = 0.01;
      scene.add(sun, sun.target);
      renderer.shadowMap.needsUpdate = true;
      const fill = new three.DirectionalLight(0xffffff, 0.45); // the other way, so no wall stays grey
      fill.position.set(center.x + size, 2.5, center.z + size);
      fill.target.position.copy(center);
      scene.add(fill, fill.target);

      const cam = new three.PerspectiveCamera(42, W / H, 0.05, 60);
      // from the room's open side, above eye level; an L is seen from the left so its side wall faces the camera
      const walls = (JSON.parse(keyRef.current) as KitchenLayout).walls.length;
      const side = walls === 2 ? -0.42 : walls === 1 ? 0.18 : 0;
      cam.position.set(center.x + size * side, wallUnit ? center.y + 0.25 : 1.6 + size * 0.2, center.z + size * (wallUnit ? 1.1 : 0.85) + 0.8);
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

      const controls = new OrbitControls(cam, renderer.domElement);
      controls.target.copy(center);
      controls.enableDamping = true;
      controls.maxPolarAngle = Math.PI * 0.49;
      controls.minDistance = 0.4;
      controls.maxDistance = size * 3 + 3;
      controls.update();

      // what a touch can paint, and the glow on the front under the mouse
      const hl = new three.Mesh(new three.BufferGeometry(), new three.MeshBasicMaterial({ color: "#b5835a", transparent: true, opacity: 0.35, depthTest: false }));
      hl.matrixAutoUpdate = false;
      hl.visible = false;
      hl.renderOrder = 10;
      scene.add(hl);

      let dirty = true;
      const invalidate = () => { dirty = true; };
      controls.addEventListener("change", invalidate);

      const reshade = () => { renderer.shadowMap.needsUpdate = true; invalidate(); };
      kitchen.ready.then(reshade);

      const dispose3D = (root: T.Object3D) => root.traverse((o) => {
        const m = o as T.Mesh;
        if (!m.isMesh) return;
        m.geometry.dispose();
        (Array.isArray(m.material) ? m.material : [m.material]).forEach((x) => x.dispose());
      });
      // the layout changed (a door painted, a width typed): only the kitchen is rebuilt, the view stays where it is
      swap.current = (k) => {
        if (k + insideRef.current === builtKey) return;
        builtKey = k + insideRef.current;
        scene.remove(kitchen.root);
        dispose3D(kitchen.root);
        kitchen = buildKitchen(three, JSON.parse(k), insideRef.current);
        scene.add(kitchen.root);
        hl.visible = false;
        kitchen.ready.then(reshade);
        reshade();
      };
      swap.current(keyRef.current); // it may have changed while the 3D was loading

      let raf = 0;
      const loop = () => {
        controls.update();
        if (dirty) {
          renderer.render(scene, cam);
          dirty = false;
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
        const w = el.clientWidth;
        const SW = 1920, SH = 1080;
        hl.visible = false;
        renderer.setPixelRatio(1);
        renderer.setSize(SW, SH, false);
        cam.aspect = SW / SH;
        cam.updateProjectionMatrix();
        renderer.render(scene, cam);
        const jpeg = renderer.domElement.toDataURL("image/jpeg", 0.92);
        renderer.setPixelRatio(ratio);
        renderer.setSize(w, H);
        cam.aspect = w / H;
        cam.updateProjectionMatrix();
        invalidate();
        return jpeg;
      };

      const ro = new ResizeObserver(() => {
        const w = el.clientWidth;
        if (!w) return;
        renderer.setSize(w, H);
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
        if (shotRef) shotRef.current = null;
        controls.dispose();
        dispose3D(kitchen.root);
        pmrem.dispose();
        envMap.dispose();
        renderer.forceContextLoss(); // gives the graphics card's memory back at once
        renderer.dispose();
        renderer.domElement.remove();
      };
    })().catch(() => setFailed(true));
    return () => { disposed = true; cleanup(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [still ? key : "", still, height]);

  useEffect(() => {
    if (!still) swap.current?.(key);
  }, [key, still, inside]);

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
