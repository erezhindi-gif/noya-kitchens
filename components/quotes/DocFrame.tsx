"use client";
import { useEffect, useRef, useState } from "react";

/** Shows the fixed-width A4 sheet scaled down to fit narrow screens. */
export default function DocFrame({ children }: { children: React.ReactNode }) {
  const outer = useRef<HTMLDivElement>(null);
  const inner = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState({ s: 1, h: 0 });

  useEffect(() => {
    const fit = () => {
      if (!outer.current || !inner.current) return;
      const s = Math.min(1, outer.current.clientWidth / 794);
      setBox({ s, h: inner.current.offsetHeight * s });
    };
    fit();
    const ro = new ResizeObserver(fit);
    if (outer.current) ro.observe(outer.current);
    if (inner.current) ro.observe(inner.current);
    return () => ro.disconnect();
  }, []);

  return (
    <div ref={outer} className="nq-frame" style={{ height: box.h || undefined }}>
      <div ref={inner} className="nq-frame-in" style={{ transform: `scale(${box.s})` }}>
        {children}
      </div>
    </div>
  );
}
