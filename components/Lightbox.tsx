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

// Full-screen photo viewer. On a phone the photo fills the screen and moves with the finger:
// drag sideways for the next/previous photo (RTL: the next one comes from the left, like the arrows),
// drag down to close.
export default function Lightbox({ images, index, alt, onClose, onNext, onPrev }: Props) {
  const handleKey = useCallback((e: KeyboardEvent) => {
    if (e.key === "Escape") onClose();
    if (e.key === "ArrowLeft") onNext();
    if (e.key === "ArrowRight") onPrev();
  }, [onClose, onNext, onPrev]);

  useEffect(() => {
    document.addEventListener("keydown", handleKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKey);
      document.body.style.overflow = "";
    };
  }, [handleKey]);

  // finger drag
  const start = useRef<{ x: number; y: number } | null>(null);
  const [drag, setDrag] = useState({ x: 0, y: 0 });
  const onTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length !== 1) return;
    start.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  };
  const onTouchMove = (e: React.TouchEvent) => {
    if (!start.current) return;
    const dx = e.touches[0].clientX - start.current.x, dy = e.touches[0].clientY - start.current.y;
    // follow one direction only, whichever the finger started with
    setDrag(Math.abs(dx) > Math.abs(dy) ? { x: dx, y: 0 } : { x: 0, y: Math.max(0, dy) });
  };
  const onTouchEnd = () => {
    if (!start.current) return;
    start.current = null;
    const w = typeof window !== "undefined" ? window.innerWidth : 400;
    if (drag.x > Math.min(80, w * 0.18)) onNext();
    else if (drag.x < -Math.min(80, w * 0.18)) onPrev();
    else if (drag.y > 120) onClose();
    setDrag({ x: 0, y: 0 });
  };

  // load the neighbours ahead, so the swipe shows the next photo at once
  useEffect(() => {
    for (const i of [index + 1, index - 1]) {
      const src = images[(i + images.length) % images.length];
      if (src) { const im = new Image(); im.src = src; }
    }
  }, [index, images]);

  if (!images[index]) return null;
  const moving = drag.x !== 0 || drag.y !== 0;

  return (
    <div
      className="fixed inset-0 z-[99999] bg-black flex items-center justify-center select-none"
      style={{ touchAction: "none", backgroundColor: `rgba(0,0,0,${moving && drag.y ? Math.max(0.4, 1 - drag.y / 400) : 1})` }}
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
        {index + 1} / {images.length}
      </div>

      {/* Prev (RTL = right arrow = previous); on a phone the finger does this */}
      <button
        onClick={(e) => { e.stopPropagation(); onPrev(); }}
        aria-label="תמונה הקודמת"
        className="hidden sm:flex absolute right-4 top-1/2 -translate-y-1/2 text-white/80 hover:text-white z-10 w-12 h-12 items-center justify-center rounded-full hover:bg-white/10 transition-colors"
      >
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <path d="M9 18l6-6-6-6"/>
        </svg>
      </button>

      {/* Next (RTL = left arrow = next) */}
      <button
        onClick={(e) => { e.stopPropagation(); onNext(); }}
        aria-label="תמונה הבאה"
        className="hidden sm:flex absolute left-4 top-1/2 -translate-y-1/2 text-white/80 hover:text-white z-10 w-12 h-12 items-center justify-center rounded-full hover:bg-white/10 transition-colors"
      >
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <path d="M15 18l-6-6 6-6"/>
        </svg>
      </button>

      {/* Image: the whole screen on a phone */}
      <div
        className="w-full h-full sm:w-auto sm:h-auto sm:max-w-5xl sm:max-h-[90vh] sm:mx-16 flex items-center justify-center"
        style={{ transform: `translate(${drag.x}px, ${drag.y}px)`, transition: moving ? "none" : "transform 0.2s ease-out" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={images[index]}
          alt={`${alt} ${index + 1}`}
          draggable={false}
          className="w-full h-full object-contain sm:w-auto sm:h-auto sm:max-w-full sm:max-h-[90vh]"
        />
      </div>

      {/* Position dots, only when there are few photos */}
      {images.length <= 20 && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5 max-w-xs overflow-hidden">
          {images.map((_, i) => (
            <span key={i} className={`w-8 h-1.5 rounded-full transition-all ${i === index ? "bg-white" : "bg-white/30"}`} />
          ))}
        </div>
      )}
    </div>
  );
}
