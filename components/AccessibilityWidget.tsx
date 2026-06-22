"use client";
import { useState, useEffect } from "react";

export default function AccessibilityWidget() {
  const [open, setOpen] = useState(false);
  const [fontSize, setFontSize] = useState(100);
  const [highContrast, setHighContrast] = useState(false);
  const [linksHighlight, setLinksHighlight] = useState(false);
  const [readingGuide, setReadingGuide] = useState(false);
  const [guideY, setGuideY] = useState(0);

  useEffect(() => {
    document.documentElement.style.fontSize = fontSize + "%";
  }, [fontSize]);

  useEffect(() => {
    document.body.classList.toggle("high-contrast", highContrast);
  }, [highContrast]);

  useEffect(() => {
    document.body.classList.toggle("links-highlight", linksHighlight);
  }, [linksHighlight]);

  useEffect(() => {
    if (!readingGuide) return;
    const move = (e: MouseEvent) => setGuideY(e.clientY);
    window.addEventListener("mousemove", move);
    return () => window.removeEventListener("mousemove", move);
  }, [readingGuide]);

  const reset = () => {
    setFontSize(100);
    setHighContrast(false);
    setLinksHighlight(false);
    setReadingGuide(false);
  };

  return (
    <>
      {/* Reading guide */}
      {readingGuide && (
        <div className="fixed left-0 right-0 h-8 bg-yellow-300/30 pointer-events-none z-[9998]"
          style={{ top: guideY - 16 }} />
      )}

      {/* Widget button */}
      <button
        onClick={() => setOpen(!open)}
        aria-label="פתח תפריט נגישות"
        className="fixed bottom-28 left-7 z-[9999] w-14 h-14 rounded-full bg-[#2C6FBF] text-white flex items-center justify-center shadow-lg hover:bg-[#1a5aad] transition-colors"
      >
        <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M12 2a2 2 0 110 4 2 2 0 010-4zm-1 5h2l1 4 3-1 .5 2-3.5 1v4h-1l-1-4-1 4h-1v-4l-3.5-1L8 11l3 1 1-4z"/>
        </svg>
      </button>

      {/* Panel */}
      {open && (
        <div
          role="dialog"
          aria-label="תפריט נגישות"
          className="fixed bottom-44 left-7 z-[9999] bg-white rounded-2xl shadow-2xl border border-gray-200 w-64 p-4"
        >
          <div className="flex justify-between items-center mb-3 border-b pb-2">
            <h2 className="font-bold text-sm text-gray-800">הגדרות נגישות</h2>
            <button onClick={() => setOpen(false)} aria-label="סגור תפריט נגישות" className="text-gray-400 hover:text-gray-700 text-lg leading-none">✕</button>
          </div>

          {/* Font size */}
          <div className="mb-3">
            <p className="text-xs text-gray-500 mb-2">גודל טקסט</p>
            <div className="flex gap-2">
              <button onClick={() => setFontSize(f => Math.max(80, f - 10))} aria-label="הקטן טקסט"
                className="flex-1 border rounded-lg py-2 text-sm hover:bg-gray-50">א-</button>
              <button onClick={reset} aria-label="איפוס גודל טקסט"
                className="flex-1 border rounded-lg py-2 text-sm hover:bg-gray-50">איפוס</button>
              <button onClick={() => setFontSize(f => Math.min(150, f + 10))} aria-label="הגדל טקסט"
                className="flex-1 border rounded-lg py-2 text-sm font-bold hover:bg-gray-50">א+</button>
            </div>
          </div>

          {/* Toggles */}
          {[
            { label: "ניגודיות גבוהה", val: highContrast, set: setHighContrast },
            { label: "הדגשת קישורים", val: linksHighlight, set: setLinksHighlight },
            { label: "מדריך קריאה", val: readingGuide, set: setReadingGuide },
          ].map(({ label, val, set }) => (
            <button key={label}
              onClick={() => set(!val)}
              role="switch"
              aria-checked={val}
              className={`w-full flex justify-between items-center px-3 py-2.5 rounded-lg mb-1.5 text-sm transition-colors ${val ? "bg-[#2C6FBF] text-white" : "border hover:bg-gray-50 text-gray-700"}`}
            >
              {label}
              <span className={`w-9 h-5 rounded-full transition-colors relative ${val ? "bg-white/30" : "bg-gray-200"}`}>
                <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${val ? "right-0.5" : "right-4"}`} />
              </span>
            </button>
          ))}

          <div className="border-t mt-3 pt-2 text-center">
            <a href="/accessibility" className="text-xs text-[#2C6FBF] hover:underline">הצהרת נגישות</a>
          </div>
        </div>
      )}
    </>
  );
}
