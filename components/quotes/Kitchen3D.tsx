"use client";
// The kitchen in 3D, built from the same centimeters as the drawing, so the proportions match.
// The client turns it with a finger. In `still` mode (the PDF) it renders one frame into an image.
import { useEffect, useRef, useState } from "react";
import type * as T from "three";
import {
  COUNTER_COLORS, FRONT_COLORS, colorOf, cornerPart, counterSpans, heightsOf, islandBox, mainWallIndex, partsOf, placed, tallOvenParts, upperBox, wallGeometry,
  type BaseUnit, type KitchenLayout, type LayoutHeights, type UpperRow, type UpperUnit,
} from "@/lib/quotes/layout";

type Three = typeof import("three");
type Mats = Record<"front" | "upper" | "carcass" | "upperCarcass" | "counter" | "plinth" | "steel" | "glass" | "handle" | "wall" | "floor" | "shelf" | "sink", T.Material>;

const M = 0.01; // cm → m

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
  const handles = l.colors?.handles !== "none";
  const std = (color: T.ColorRepresentation, rough = 0.6, metal = 0, extra: Partial<T.MeshStandardMaterialParameters> = {}) =>
    new three.MeshStandardMaterial({ color, roughness: rough, metalness: metal, ...extra });
  const mats: Mats = {
    front: std(front, 0.55),
    upper: std(upper, 0.55),
    carcass: std(shade(three, front, 0.55), 0.8),
    upperCarcass: std(shade(three, upper, 0.55), 0.8),
    counter: std(counter, 0.35),
    plinth: std("#4a4642", 0.9),
    steel: std("#d4d7da", 0.35, 0.25),
    glass: std("#1b1b1c", 0.12, 0.3),
    handle: std("#7d8185", 0.35, 0.4),
    wall: std("#efebe4", 0.95, 0, { side: three.FrontSide }),
    floor: std("#d6cdbf", 0.85),
    shelf: std("#e3ddd2", 0.7),
    sink: std("#b4babe", 0.3, 0.35),
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

  /** A door or drawer front with its handle; (x0,y0) is its lower-left corner on the run's face at depth z. */
  const frontPanel = (p: T.Object3D, mat: T.Material, x0: number, y0: number, w: number, hh: number, z: number, handle?: "top" | "bottom" | "mid") => {
    box(p, mat, w - 0.4, hh - 0.4, 1.8, x0 + w / 2, y0 + hh / 2, z + 0.9);
    if (!handles || !handle) return;
    const hy = handle === "top" ? y0 + hh - 4 : handle === "bottom" ? y0 + 4 : y0 + hh / 2;
    if (handle === "mid") box(p, mats.handle, 1.2, Math.min(30, hh * 0.3), 1.6, x0 + 5, hy, z + 2.6);
    else box(p, mats.handle, Math.min(16, w * 0.45), 1.2, 1.6, x0 + w / 2, hy, z + 2.6);
  };

  /** One run of base cabinets along local x, backs at z=0, fronts facing +z. */
  const baseRun = (p: T.Object3D, units: BaseUnit[], depth: number, hs: LayoutHeights, withCounter = true) => {
    const f0 = hs.plinth, f1 = hs.base - hs.counter, fh = f1 - f0;
    const z = depth - 2;
    const pl = placed(units);
    for (let idx = 0; idx < pl.length; idx++) {
      const u = pl[idx];
      const x = u.a, w = u.w, n = partsOf(u.kind, u.w, u.n);
      if (u.kind === "gap") continue;
      if (u.kind === "corner") {
        // a closed corner cabinet: only its filler strip shows, without a handle
        const c = cornerPart(units, idx, depth);
        if (c.w > 0.01) {
          box(p, mats.plinth, c.w, f0, depth - 6, x + c.a + c.w / 2, f0 / 2, (depth - 6) / 2);
          box(p, mats.carcass, c.w, f1 - f0, z, x + c.a + c.w / 2, f0 + (f1 - f0) / 2, z / 2);
        }
        if (c.filler.w > 0.01) {
          frontPanel(p, mats.front, x + c.filler.a, f0, c.filler.w + 0.4, fh, z);
          // the strips of both runs meet in the corner with no gap; a joint line shows only where the
          // strip meets the next cabinet of its own run
          const sx = x + (c.filler.a > 0 ? c.filler.a + c.filler.w : c.filler.a);
          box(p, mats.handle, 0.5, fh, 0.3, sx, f0 + fh / 2, z + 1.9);
        }
        continue;
      }
      if (u.kind === "fridge") {
        const body = u.color ? std(colorOf(u.color, FRONT_COLORS, "#d4d7da"), 0.3, 0.2) : mats.steel;
        box(p, body, w - 0.6, hs.tall, depth, x + w / 2, hs.tall / 2, depth / 2);
        const fz = hs.tall * 0.36;
        box(p, mats.plinth, w - 0.4, 0.6, 0.4, x + w / 2, fz, depth + 0.1);
        if (handles) {
          box(p, mats.handle, 1.4, 35, 2, x + 5, fz + 30, depth + 1.5);
          box(p, mats.handle, 1.4, 25, 2, x + 5, fz - 22, depth + 1.5);
        }
        continue;
      }
      const tall = u.kind === "tall" || u.kind === "tall_oven";
      const top = tall ? hs.tall : f1;
      box(p, mats.plinth, w, f0, depth - 6, x + w / 2, f0 / 2, (depth - 6) / 2);
      box(p, mats.carcass, w - 0.2, top - f0, z, x + w / 2, f0 + (top - f0) / 2, z / 2);
      switch (u.kind) {
        case "doors":
        case "sink":
          for (let i = 0; i < n; i++) frontPanel(p, mats.front, x + (i * w) / n, f0, w / n, fh, z, "top");
          break;
        case "drawers":
        case "cooktop":
          for (let i = 0; i < n; i++) frontPanel(p, mats.front, x, f0 + (i * fh) / n, w, fh / n, z, "top");
          break;
        case "dishwasher":
          frontPanel(p, mats.front, x, f0, w, fh, z, "top");
          break;
        case "oven": {
          const dr = Math.min(18, fh * 0.25);
          frontPanel(p, mats.front, x, f0, w, dr, z, "top");
          frontPanel(p, mats.glass, x, f0 + dr, w, fh - dr, z);
          box(p, mats.handle, w - 12, 1.2, 1.6, x + w / 2, f1 - 5, z + 2.6);
          break;
        }
        case "tall":
          for (let i = 0; i < n; i++) frontPanel(p, mats.front, x, f0 + (i * (top - f0)) / n, w, (top - f0) / n, z, "mid");
          break;
        case "tall_oven": {
          const t = tallOvenParts(u, hs);
          const dh = (t.d1 - t.d0) / t.drawers;
          for (let i = 0; i < t.drawers; i++) frontPanel(p, mats.front, x, t.d0 + i * dh, w, dh, z, "top");
          frontPanel(p, mats.glass, x, t.d1, w, t.o1 - t.d1, z);
          box(p, mats.handle, w - 12, 1.2, 1.6, x + w / 2, t.o1 - 5, z + 2.6);
          if (t.m1 > t.o1 + 2) frontPanel(p, mats.front, x, t.o1, w, t.m1 - t.o1, z, "bottom");
          if (t.rest) frontPanel(p, mats.front, x, t.m1, w, top - t.m1, z, "bottom");
          break;
        }
      }
      if (u.kind === "sink") {
        const sw = Math.min(w - 14, 55);
        box(p, mats.sink, sw, 0.5, 40, x + w / 2, hs.base + 0.1, depth / 2 + 2);
        const tap = new three.Mesh(new three.CylinderGeometry(1.4 * M, 1.4 * M, 30 * M, 16), mats.steel);
        tap.position.set((x + w / 2) * M, (hs.base + 15) * M, 8 * M);
        tap.castShadow = true;
        p.add(tap);
        box(p, mats.steel, 2.6, 2.6, 20, x + w / 2, hs.base + 29, 17);
      }
      if (u.kind === "cooktop") box(p, mats.glass, Math.min(w - 8, 60), 0.6, 51, x + w / 2, hs.base + 0.3, depth / 2 + 1);
    }
    if (withCounter) for (const s of counterSpans(units, depth)) box(p, mats.counter, s.w, hs.counter, depth + 2, s.a + s.w / 2, hs.base - hs.counter / 2, (depth + 2) / 2);
  };

  /** a row of upper cabinets; each cabinet may have its own depth, height and bottom */
  const upperRun = (p: T.Object3D, units: UpperUnit[], row: UpperRow) => {
    for (const u of placed(units)) {
      const x = u.a, w = u.w, n = partsOf(u.kind, u.w, u.n, true);
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
      if (u.kind === "doors") for (let i = 0; i < n; i++) frontPanel(p, mats.upper, x + (i * w) / n, y0, w / n, uh, d - 2, "bottom");
      else for (let i = 0; i < n; i++) frontPanel(p, mats.upper, x, y0 + (i * uh) / n, w, uh / n, d - 2, "bottom");
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
    baseRun(grp, w.base, h.depth, h);
    upperRun(grp, w.upper, "upper");
    upperRun(grp, w.top || [], "top");
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
    baseRun(grp, units, isl.d, h, false);
    // the counter covers the whole island even where there are no cabinets
    box(grp, mats.counter, isl.w, h.counter, isl.d + 2, isl.w / 2, h.base - h.counter / 2, isl.d / 2);
    root.add(grp);
  }

  // floor under everything
  const bb = new three.Box3().setFromObject(root);
  const fw = bb.max.x - bb.min.x + 1.2, fd = bb.max.z - bb.min.z + 2.2;
  const floor = new three.Mesh(new three.PlaneGeometry(fw, fd), mats.floor);
  floor.rotation.x = -Math.PI / 2;
  floor.position.set((bb.min.x + bb.max.x) / 2, 0, (bb.min.z + bb.max.z) / 2 + 0.5);
  floor.receiveShadow = true;
  root.add(floor);
  return { root, box: bb };
}

export default function Kitchen3D({ layout, still = false, height = 420 }: { layout: KitchenLayout; still?: boolean; height?: number }) {
  const host = useRef<HTMLDivElement>(null);
  const [img, setImg] = useState("");
  const [failed, setFailed] = useState(false);
  const key = JSON.stringify(layout);

  useEffect(() => {
    let disposed = false;
    let cleanup = () => {};
    (async () => {
      const three = await import("three");
      const { OrbitControls } = await import("three/examples/jsm/controls/OrbitControls.js");
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
      renderer.setPixelRatio(still ? 2 : Math.min(2, window.devicePixelRatio || 1));
      renderer.setSize(W, H);
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = three.PCFSoftShadowMap;
      renderer.toneMapping = three.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.05;
      el.appendChild(renderer.domElement);

      const scene = new three.Scene();
      scene.background = new three.Color("#f4f1ec");
      const { root, box } = buildKitchen(three, JSON.parse(key));
      scene.add(root);

      const center = new three.Vector3((box.min.x + box.max.x) / 2, 1.0, (box.min.z + box.max.z) / 2);
      const size = Math.max(box.max.x - box.min.x, box.max.z - box.min.z, 2.5);
      scene.add(new three.HemisphereLight(0xffffff, 0xcfc6b8, 1.6));
      const sun = new three.DirectionalLight(0xffffff, 1.9);
      sun.position.set(center.x + size * 0.6, 4.5, center.z + size * 1.2);
      sun.target.position.copy(center);
      sun.castShadow = true;
      sun.shadow.mapSize.set(2048, 2048);
      const sc = sun.shadow.camera;
      sc.left = -size; sc.right = size; sc.top = size; sc.bottom = -size; sc.near = 0.5; sc.far = 20;
      sun.shadow.bias = -0.0005;
      scene.add(sun, sun.target);

      const cam = new three.PerspectiveCamera(42, W / H, 0.05, 60);
      // from the room's open side, above eye level; an L is seen from the left so its side wall faces the camera
      const walls = (JSON.parse(key) as KitchenLayout).walls.length;
      const side = walls === 2 ? -0.42 : walls === 1 ? 0.18 : 0;
      cam.position.set(center.x + size * side, 1.6 + size * 0.2, center.z + size * 0.85 + 0.8);
      // a narrow (phone) frame needs the camera further back to fit the whole kitchen
      const back = Math.max(1, (1.25 * H) / W);
      cam.position.sub(center).multiplyScalar(back).add(center);
      cam.lookAt(center);

      const render = () => renderer.render(scene, cam);
      if (still) {
        render();
        setImg(renderer.domElement.toDataURL("image/jpeg", 0.9));
        renderer.domElement.remove();
        renderer.dispose();
        return;
      }
      const controls = new OrbitControls(cam, renderer.domElement);
      controls.target.copy(center);
      controls.enableDamping = true;
      controls.maxPolarAngle = Math.PI * 0.48;
      controls.minDistance = 1.2;
      controls.maxDistance = size * 3 + 3;
      controls.update();
      let raf = 0;
      const loop = () => { controls.update(); render(); raf = requestAnimationFrame(loop); };
      loop();
      const ro = new ResizeObserver(() => {
        const w = el.clientWidth;
        if (!w) return;
        renderer.setSize(w, H);
        cam.aspect = w / H;
        cam.updateProjectionMatrix();
      });
      ro.observe(el);
      cleanup = () => {
        cancelAnimationFrame(raf);
        ro.disconnect();
        controls.dispose();
        renderer.dispose();
        renderer.domElement.remove();
      };
    })().catch(() => setFailed(true));
    return () => { disposed = true; cleanup(); };
  }, [key, still, height]);

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
