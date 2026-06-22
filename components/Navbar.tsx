"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { Menu, X, Phone } from "lucide-react";

const categories = [
  "מטבחים","מטבחונים","חדרי ילדים","ארונות אמבטיה",
  "ארונות קיר","ארונות כניסה","מזנונים ושולחנות סלון","שונות",
];

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [projOpen, setProjOpen] = useState(false);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", handler);
    return () => window.removeEventListener("scroll", handler);
  }, []);

  return (
    <header
      className={`fixed top-0 w-full z-50 transition-all duration-500 ${
        scrolled
          ? "bg-white/95 backdrop-blur-md shadow-sm border-b border-gold/20"
          : "bg-transparent"
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-8">
        <div className="flex items-center justify-between h-20">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3">
            <div className={`font-serif text-2xl font-bold tracking-widest transition-colors ${scrolled ? "text-dark-wood" : "text-white"}`}>
              NOYA
            </div>
            <div className={`text-xs tracking-widest border-r pr-3 transition-colors ${scrolled ? "text-warm-brown border-warm-brown/30" : "text-gold border-gold/40"}`}>
              KITCHENS
            </div>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-8">
            <Link href="/#about" className={`text-sm tracking-wide hover:text-gold transition-colors ${scrolled ? "text-charcoal" : "text-white/90"}`}>
              אודות
            </Link>
            <div className="relative group" onMouseEnter={() => setProjOpen(true)} onMouseLeave={() => setProjOpen(false)}>
              <Link href="/projects" className={`text-sm tracking-wide hover:text-gold transition-colors ${scrolled ? "text-charcoal" : "text-white/90"}`}>
                פרויקטים ▾
              </Link>
              {projOpen && (
                <div className="absolute top-full right-0 mt-2 w-52 bg-white shadow-xl border border-gold/10 rounded-sm py-2 z-50">
                  <Link href="/projects" className="block px-4 py-2 text-sm text-charcoal hover:bg-cream hover:text-gold transition-colors">
                    כל הפרויקטים
                  </Link>
                  <div className="border-t border-gold/10 my-1" />
                  {categories.map((cat) => (
                    <Link key={cat} href={`/projects?cat=${encodeURIComponent(cat)}`}
                      className="block px-4 py-2 text-sm text-charcoal hover:bg-cream hover:text-gold transition-colors">
                      {cat}
                    </Link>
                  ))}
                </div>
              )}
            </div>
            <Link href="/#reviews" className={`text-sm tracking-wide hover:text-gold transition-colors ${scrolled ? "text-charcoal" : "text-white/90"}`}>
              המלצות
            </Link>
            <Link href="/#contact" className={`text-sm tracking-wide hover:text-gold transition-colors ${scrolled ? "text-charcoal" : "text-white/90"}`}>
              צור קשר
            </Link>
            <a href="tel:0502808180" className="flex items-center gap-2 bg-gold text-dark-wood text-sm font-semibold px-4 py-2 rounded-sm hover:bg-warm-brown hover:text-white transition-all">
              <Phone size={14} />
              050-2808180
            </a>
          </nav>

          {/* Mobile menu button */}
          <button onClick={() => setOpen(!open)} className={`md:hidden transition-colors ${scrolled ? "text-charcoal" : "text-white"}`}>
            {open ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* Mobile Nav */}
      {open && (
        <div className="md:hidden bg-white border-t border-gold/20 shadow-lg">
          <div className="px-6 py-4 space-y-4">
            <Link href="/#about" onClick={() => setOpen(false)} className="block text-charcoal hover:text-gold py-2">אודות</Link>
            <Link href="/projects" onClick={() => setOpen(false)} className="block text-charcoal hover:text-gold py-2">כל הפרויקטים</Link>
            {categories.map((cat) => (
              <Link key={cat} href={`/projects?cat=${encodeURIComponent(cat)}`} onClick={() => setOpen(false)}
                className="block text-sm text-warm-brown hover:text-gold py-1 pr-4">
                {cat}
              </Link>
            ))}
            <Link href="/#reviews" onClick={() => setOpen(false)} className="block text-charcoal hover:text-gold py-2">המלצות</Link>
            <Link href="/#contact" onClick={() => setOpen(false)} className="block text-charcoal hover:text-gold py-2">צור קשר</Link>
            <a href="tel:0502808180" className="flex items-center gap-2 bg-gold text-dark-wood font-semibold px-4 py-2 rounded-sm w-full justify-center">
              <Phone size={14} /> 050-2808180
            </a>
          </div>
        </div>
      )}
    </header>
  );
}
