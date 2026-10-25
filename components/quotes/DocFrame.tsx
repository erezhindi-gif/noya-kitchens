"use client";
import { useEffect, useRef, useState } from "react";

const SHEET_W = 794;

/** Shows the fixed-width A4 sheet scaled down to fit narrow screens.
 *  Laid out left-to-right with an explicit offset: centering a wider-than-screen child with flexbox
 *  in an RTL page pushed the sheet out of view on phones. */
export default function DocFrame({ children }: { children: React.ReactNode }) {
  const outer = useRef<HTMLDivElement>(null);
  const inner = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState({ s: 1, h: 0, x: 0 });

  useEffect(() => {
    const fit = () => {
      if (!outer.current || !inner.current) return;
      const w = outer.current.clientWidth;
      const s = Math.min(1, w / SHEET_W);
      setBox({ s, h: inner.current.offsetHeight * s, x: Math.max(0, (w - SHEET_W * s) / 2) });
    };
    fit();
    const ro = new ResizeObserver(fit);
    if (outer.current) ro.observe(outer.current);
    if (inner.current) ro.observe(inner.current);
    return () => ro.disconnect();
  }, []);

  return (
    <div ref={outer} className="nq-frame" style={{ height: box.h || undefined }}>
      <div
        ref={inner}
        className="nq-frame-in"
        style={{ transform: `translateX(${box.x}px) scale(${box.s})` }}
      >
        {children}
      </div>
    </div>
  );
}
