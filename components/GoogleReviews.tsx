"use client";
// The home page reviews: Google rating, then every written review in a strip you scroll sideways
// (arrows on a computer, a finger on a phone). Long reviews open with "קרא עוד".
import { useRef, useState } from "react";
import type { ReviewsView } from "@/lib/reviews/google";

const GOLD = "#E2A33B";
const AVATAR = ["#8B6F47", "#5B7B6F", "#7A5C8E", "#B5654A", "#4F6D8F", "#9A7B2F"];

const Stars = ({ n, size = 15 }: { n: number; size?: number }) => (
  <span aria-label={`${n} כוכבים`} style={{ color: GOLD, fontSize: size, letterSpacing: 1 }}>{"★".repeat(Math.round(n))}</span>
);

const GoogleG = ({ size = 18 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden>
    <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
    <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
    <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z" />
    <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.1-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
  </svg>
);

/** "לפני שנה", "לפני 3 חודשים"… counted from the review date */
function ago(iso: string) {
  const days = Math.max(0, (Date.now() - Date.parse(iso)) / 864e5);
  if (days < 7) return "השבוע";
  if (days < 30) { const w = Math.round(days / 7); return w <= 1 ? "לפני שבוע" : w === 2 ? "לפני שבועיים" : `לפני ${w} שבועות`; }
  const m = Math.round(days / 30.4);
  if (m < 12) return m <= 1 ? "לפני חודש" : m === 2 ? "לפני חודשיים" : `לפני ${m} חודשים`;
  const y = Math.floor(m / 12);
  return y === 1 ? "לפני שנה" : y === 2 ? "לפני שנתיים" : `לפני ${y} שנים`;
}

function Card({ r }: { r: ReviewsView["reviews"][number] }) {
  const [open, setOpen] = useState(false);
  const long = r.text.length > 210;
  const color = AVATAR[r.author.split("").reduce((a, c) => a + c.charCodeAt(0), 0) % AVATAR.length];
  return (
    <figure className="snap-start shrink-0 w-[285px] md:w-[320px] rounded-2xl bg-[#FAF3EB] p-5 flex flex-col m-0">
      <div className="flex items-center gap-3 mb-3">
        <span className="w-10 h-10 rounded-full grid place-items-center text-white font-bold shrink-0" style={{ background: color }} aria-hidden>
          {r.author.trim().charAt(0).toUpperCase()}
        </span>
        <div className="min-w-0 flex-1">
          <div className="font-bold text-[15px] text-[#2C2C2C] truncate">{r.author}</div>
          <div className="text-xs text-[#8B6F47]" suppressHydrationWarning>{ago(r.date)}</div>
        </div>
        <GoogleG />
      </div>
      <Stars n={r.rating} />
      <blockquote
        className="mt-2 text-[15px] leading-relaxed text-[#2C2C2C] whitespace-pre-line m-0"
        style={open || !long ? undefined : { display: "-webkit-box", WebkitLineClamp: 5, WebkitBoxOrient: "vertical", overflow: "hidden" }}
      >
        {r.text}
      </blockquote>
      {long && (
        <button type="button" onClick={() => setOpen(!open)} className="mt-2 self-start text-sm font-bold text-[#8B6F47] underline">
          {open ? "פחות" : "קרא עוד"}
        </button>
      )}
    </figure>
  );
}

export default function GoogleReviews({ data, googleUrl, midragUrl }: { data: ReviewsView; googleUrl: string; midragUrl: string }) {
  const strip = useRef<HTMLDivElement>(null);
  // the page is right-to-left, so "next" scrolls toward the left
  const move = (dir: 1 | -1) => strip.current?.scrollBy({ left: -dir * (strip.current.clientWidth * 0.85), behavior: "smooth" });

  return (
    <div>
      <div className="flex flex-wrap items-center justify-center gap-3 mb-8">
        <a href={googleUrl} target="_blank" rel="noopener noreferrer"
          className="flex items-center gap-3 rounded-2xl border border-[#8B6F47]/20 bg-white px-5 py-3 hover:border-[#8B6F47]">
          <GoogleG size={28} />
          <span className="text-3xl font-bold text-[#2C2C2C]">{data.rating.toFixed(1)}</span>
          <span className="flex flex-col leading-tight">
            <Stars n={data.rating} size={18} />
            <span className="text-sm text-[#6b5b4a]">{data.count} ביקורות בגוגל</span>
          </span>
        </a>
        <a href={midragUrl} target="_blank" rel="noopener noreferrer"
          className="flex items-center gap-2 rounded-2xl border border-[#8B6F47]/20 bg-white px-5 py-3 text-sm hover:border-[#8B6F47]">
          <b className="text-2xl">10</b> במידרג · 20 מדרגים
        </a>
      </div>

      <div className="relative">
        <div ref={strip} className="flex gap-4 overflow-x-auto snap-x snap-mandatory pb-3 [scrollbar-width:thin]" role="list" aria-label="ביקורות מגוגל">
          {data.reviews.map((r, i) => <Card key={i} r={r} />)}
        </div>
        <button type="button" aria-label="הביקורות הקודמות" onClick={() => move(-1)}
          className="hidden md:grid absolute top-1/2 -translate-y-1/2 -right-5 w-10 h-10 rounded-full bg-white shadow place-items-center text-xl text-[#8B6F47]">›</button>
        <button type="button" aria-label="הביקורות הבאות" onClick={() => move(1)}
          className="hidden md:grid absolute top-1/2 -translate-y-1/2 -left-5 w-10 h-10 rounded-full bg-white shadow place-items-center text-xl text-[#8B6F47]">‹</button>
      </div>
    </div>
  );
}
