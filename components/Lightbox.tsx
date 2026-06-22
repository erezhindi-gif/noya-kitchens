"use client";
import { useEffect, useCallback } from "react";
import Image from "next/image";

interface Props {
  images: string[];
  index: number;
  alt: string;
  onClose: () => void;
  onNext: () => void;
  onPrev: () => void;
}

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

  if (!images[index]) return null;

  return (
    <div
      className="fixed inset-0 z-[99999] bg-black/95 flex items-center justify-center"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="תצוגת תמונה מוגדלת"
    >
      {/* Close */}
      <button
        onClick={onClose}
        aria-label="סגור תמונה"
        className="absolute top-5 left-5 text-white/80 hover:text-white z-10 w-10 h-10 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <path d="M18 6L6 18M6 6l12 12"/>
        </svg>
      </button>

      {/* Counter */}
      <div className="absolute top-5 right-5 text-white/60 text-sm tabular-nums">
        {index + 1} / {images.length}
      </div>

      {/* Prev (RTL = right arrow = previous) */}
      <button
        onClick={(e) => { e.stopPropagation(); onPrev(); }}
        aria-label="תמונה הקודמת"
        className="absolute right-4 top-1/2 -translate-y-1/2 text-white/80 hover:text-white z-10 w-12 h-12 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors"
      >
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <path d="M9 18l6-6-6-6"/>
        </svg>
      </button>

      {/* Next (RTL = left arrow = next) */}
      <button
        onClick={(e) => { e.stopPropagation(); onNext(); }}
        aria-label="תמונה הבאה"
        className="absolute left-4 top-1/2 -translate-y-1/2 text-white/80 hover:text-white z-10 w-12 h-12 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors"
      >
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <path d="M15 18l-6-6 6-6"/>
        </svg>
      </button>

      {/* Image */}
      <div
        className="relative max-w-5xl max-h-[90vh] w-full h-full mx-16 flex items-center justify-center"
        onClick={(e) => e.stopPropagation()}
      >
        <Image
          src={images[index]}
          alt={`${alt} ${index + 1}`}
          fill
          className="object-contain"
          sizes="90vw"
          priority
        />
      </div>

      {/* Thumbnail strip */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5 max-w-xs overflow-hidden">
        {images.map((src, i) => (
          <button
            key={i}
            onClick={(e) => { e.stopPropagation(); }}
            aria-label={`תמונה ${i + 1}`}
            className={`w-8 h-1.5 rounded-full transition-all ${i === index ? "bg-white" : "bg-white/30"}`}
          />
        ))}
      </div>
    </div>
  );
}
