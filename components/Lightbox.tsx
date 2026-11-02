"use client";
import { useEffect, useCallback, useRef, useState } from "react";

interface Props {
  images: string[];
  index: number;
  alt: string;
  onClose: () => void;
  onNext: () => void;
  onPrev: () => void;
}

const GAP = 16; // space between two photos while they slide
const SLIDE_MS = 280;

// Full-screen photo viewer. The previous and next photos sit beside the current one, so a swipe
// (or an arrow) slides the next photo in smoothly. RTL: the next photo comes from the left, like
// the arrows. Drag down to close.
export default function Lightbox({ images, index, alt, onClose, onNext, onPrev }: Props) {
  const n = images.length;
  const [dx, setDx] = useState(0);
  const [dy, setDy] = useState(0);
  const [anim, setAnim] = useState(false);
  const busy = useRef(false);
  const width = () => (typeof window !== "undefined" ? window.innerWidth : 400);

  /** slide the whole row one photo over, then show that photo as the current one */
  const go = useCallback((dir: 1 | -1) => {
    if (busy.current || n < 2) return;
    busy.current = true;
    setAnim(true);
    setDy(0);
    setDx(dir * (width() + GAP));
    setTimeout(() => {
      if (dir === 1) onNext(); else onPrev();
      setAnim(false);
      setDx(0);
      busy.current = false;
    }, SLIDE_MS);
  }, [n, onNext, onPrev]);

  const handleKey = useCallback((e: KeyboardEvent) => {
    if (e.key === "Escape") onClose();
    if (e.key === "ArrowLeft") go(1);
    if (e.key === "ArrowRight") go(-1);
  }, [onClose, go]);

  useEffect(() => {
    document.addEventListener("keydown", handleKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKey);
      document.body.style.overflow = "";
    };
  }, [handleKey]);

  // finger drag: one direction only, whichever the finger started with
  const start = useRef<{ x: number; y: number; axis?: "x" | "y" } | null>(null);
  const onTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length !== 1 || busy.current) return;
    start.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  };
  const onTouchMove = (e: React.TouchEvent) => {
    const s = start.current;
    if (!s) return;
    const x = e.touches[0].clientX - s.x, y = e.touches[0].clientY - s.y;
    if (!s.axis && Math.abs(x) + Math.abs(y) > 8) s.axis = Math.abs(x) > Math.abs(y) ? "x" : "y";
    if (s.axis === "x") setDx(n < 2 ? x / 4 : x);
    if (s.axis === "y") setDy(Math.max(0, y));
  };
  const onTouchEnd = () => {
    const s = start.current;
    start.current = null;
    if (!s) return;
    const limit = Math.min(80, width() * 0.18);
    if (s.axis === "x" && dx > limit) return go(1);
    if (s.axis === "x" && dx < -limit) return go(-1);
    if (s.axis === "y" && dy > 120) return onClose();
    setAnim(true); // spring back
    setDx(0);
    setDy(0);
    setTimeout(() => setAnim(false), SLIDE_MS);
  };

  if (!images[index]) return null;
  const at = (k: number) => images[(index + k + n) % n];
  // next on the left (RTL), previous on the right
  const slides = n > 1 ? [{ k: 1, pos: -1 }, { k: 0, pos: 0 }, { k: -1, pos: 1 }] : [{ k: 0, pos: 0 }];

  return (
    <div
      className="fixed inset-0 z-[99999] flex items-center justify-center select-none overflow-hidden"
      style={{ touchAction: "none", backgroundColor: `rgba(0,0,0,${dy ? Math.max(0.4, 1 - dy / 400) : 1})` }}
      onClick={onClose}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      role="dialog"
      aria-modal="true"
      aria-label="תצוגת תמונה מוגדלת"
    >
      {/* Close */}
      <button
        onClick={onClose}
        aria-label="סגור תמונה"
        className="absolute top-4 left-4 text-white z-10 w-11 h-11 flex items-center justify-center rounded-full bg-black/40 hover:bg-white/10 transition-colors"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <path d="M18 6L6 18M6 6l12 12"/>
        </svg>
      </button>

      {/* Counter */}
      <div dir="ltr" className="absolute top-6 right-5 z-10 text-white/70 text-sm tabular-nums">
        {index + 1} / {n}
      </div>

      {/* Prev (RTL = right arrow = previous); on a phone the finger does this */}
      <button
        onClick={(e) => { e.stopPropagation(); go(-1); }}
        aria-label="תמונה הקודמת"
        className="hidden sm:flex absolute right-4 top-1/2 -translate-y-1/2 text-white/80 hover:text-white z-10 w-12 h-12 items-center justify-center rounded-full hover:bg-white/10 transition-colors"
      >
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <path d="M9 18l6-6-6-6"/>
        </svg>
      </button>

      {/* Next (RTL = left arrow = next) */}
      <button
        onClick={(e) => { e.stopPropagation(); go(1); }}
        aria-label="תמונה הבאה"
        className="hidden sm:flex absolute left-4 top-1/2 -translate-y-1/2 text-white/80 hover:text-white z-10 w-12 h-12 items-center justify-center rounded-full hover:bg-white/10 transition-colors"
      >
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <path d="M15 18l-6-6 6-6"/>
        </svg>
      </button>

      {/* The row of photos: previous, current, next */}
      {slides.map(({ k, pos }) => (
        <div
          key={at(k) + ":" + pos}
          className="absolute inset-0 flex items-center justify-center sm:px-20 sm:py-[5vh]"
          style={{
            transform: `translate3d(calc(${pos * 100}% + ${pos * GAP + dx}px), ${dy}px, 0)`,
            transition: anim ? `transform ${SLIDE_MS}ms cubic-bezier(0.22, 0.61, 0.36, 1)` : "none",
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={at(k)}
            alt={`${alt} ${((index + k + n) % n) + 1}`}
            draggable={false}
            onClick={(e) => e.stopPropagation()}
            className="max-w-full max-h-full w-auto h-auto object-contain rounded-lg"
          />
        </div>
      ))}

      {/* Position dots, only when there are few photos */}
      {n <= 20 && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5 max-w-xs overflow-hidden z-10">
          {images.map((_, i) => (
            <span key={i} className={`w-8 h-1.5 rounded-full transition-all ${i === index ? "bg-white" : "bg-white/30"}`} />
          ))}
        </div>
      )}
    </div>
  );
}
