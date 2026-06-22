"use client";
import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";

const projectCategories = [
  { label: "מטבחים", href: "#kitchens" },
  { label: "ארונות אמבטיה", href: "#bathrooms" },
  { label: "חדרי ילדים", href: "#kids" },
  { label: "ארונות קיר", href: "#wall-units" },
  { label: "ארונות כניסה", href: "#entrance" },
  { label: "מזנונים ושולחן סלון", href: "#buffet" },
  { label: "מטבחונים", href: "#kitchenette" },
];

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 60);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <nav className={`fixed top-0 w-full z-50 transition-all duration-400 navbar-strip ${scrolled ? "shadow-md" : ""}`}>
      <div className="max-w-7xl mx-auto px-6 flex items-center justify-between h-[72px]">
        {/* Logo */}
        <Link href="/" className="flex items-center">
          <Image
            src="/images/logo-new.jpg"
            alt="NOYA Kitchens by Erez Hindi"
            width={150}
            height={60}
            className="object-contain h-14 w-auto"
            priority
          />
        </Link>

        {/* Desktop nav */}
        <ul className="hidden md:flex items-center gap-7">
          <li>
            <a href="#about" className="text-[#3a3a3a] hover:text-[#8B6F47] transition-colors text-sm font-medium">
              אודות
            </a>
          </li>

          {/* Projects dropdown */}
          <li className="relative" ref={dropdownRef}>
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="flex items-center gap-1 text-[#3a3a3a] hover:text-[#8B6F47] transition-colors text-sm font-medium"
            >
              פרויקטים
              <svg
                width="12" height="12" viewBox="0 0 12 12" fill="currentColor"
                className={`transition-transform duration-200 ${dropdownOpen ? "rotate-180" : ""}`}
              >
                <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
              </svg>
            </button>
            {dropdownOpen && (
              <div className="dropdown-menu">
                {projectCategories.map((cat) => (
                  <a
                    key={cat.href}
                    href={cat.href}
                    onClick={() => setDropdownOpen(false)}
                  >
                    {cat.label}
                  </a>
                ))}
              </div>
            )}
          </li>

          <li>
            <a href="#testimonials" className="text-[#3a3a3a] hover:text-[#8B6F47] transition-colors text-sm font-medium">
              המלצות
            </a>
          </li>
          <li>
            <a href="#contact" className="text-[#3a3a3a] hover:text-[#8B6F47] transition-colors text-sm font-medium">
              צור קשר
            </a>
          </li>
        </ul>

        {/* CTA Phone */}
        <a
          href="tel:0502808180"
          className="hidden md:flex items-center gap-2 btn-gold text-sm py-2.5 px-5"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
            <path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/>
          </svg>
          050-2808180
        </a>

        {/* Mobile burger */}
        <button
          className="md:hidden p-2 text-[#3a3a3a]"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="תפריט"
        >
          <div className={`w-6 h-0.5 bg-current mb-1.5 transition-all ${menuOpen ? "rotate-45 translate-y-2" : ""}`} />
          <div className={`w-6 h-0.5 bg-current mb-1.5 transition-all ${menuOpen ? "opacity-0" : ""}`} />
          <div className={`w-6 h-0.5 bg-current transition-all ${menuOpen ? "-rotate-45 -translate-y-2" : ""}`} />
        </button>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="md:hidden bg-[#F0EBE1] border-t border-[#8B6F47]/15 px-6 py-4">
          <a href="#about" className="block py-3 text-[#3a3a3a] border-b border-[#8B6F47]/10 text-sm" onClick={() => setMenuOpen(false)}>אודות</a>
          <div className="py-2 border-b border-[#8B6F47]/10">
            <p className="text-[#8B6F47] text-xs font-semibold tracking-widest uppercase mb-2 pt-1">פרויקטים</p>
            {projectCategories.map((cat) => (
              <a key={cat.href} href={cat.href} className="block py-2 pr-3 text-[#3a3a3a] text-sm hover:text-[#8B6F47]" onClick={() => setMenuOpen(false)}>
                {cat.label}
              </a>
            ))}
          </div>
          <a href="#testimonials" className="block py-3 text-[#3a3a3a] border-b border-[#8B6F47]/10 text-sm" onClick={() => setMenuOpen(false)}>המלצות</a>
          <a href="#contact" className="block py-3 text-[#3a3a3a] text-sm" onClick={() => setMenuOpen(false)}>צור קשר</a>
          <a href="tel:0502808180" className="block mt-3 btn-gold text-center text-sm">050-2808180</a>
        </div>
      )}
    </nav>
  );
}
