"use client";
import { useState, useEffect } from "react";
import Image from "next/image";

const slides = [
  { src: "/images/hero-1.jpg", alt: "מטבח מעוצב" },
  { src: "/images/hero-2.jpg", alt: "ריהוט בהתאמה אישית" },
  { src: "/images/hero-3.jpg", alt: "עיצוב פנים" },
];

export default function HeroSlider() {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setCurrent((c) => (c + 1) % slides.length), 5000);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="absolute inset-0">
      {slides.map((s, i) => (
        <div
          key={i}
          className="absolute inset-0 transition-opacity duration-1000"
          style={{ opacity: i === current ? 1 : 0 }}
        >
          <Image src={s.src} alt={s.alt} fill className="object-cover" priority={i === 0} />
        </div>
      ))}
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/35 to-black/20" />

      {/* Dots */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-2 z-10">
        {slides.map((_, i) => (
          <button
            key={i}
            onClick={() => setCurrent(i)}
            className={`rounded-full transition-all duration-300 ${i === current ? "w-6 h-2 bg-white" : "w-2 h-2 bg-white/50"}`}
          />
        ))}
      </div>
    </div>
  );
}
