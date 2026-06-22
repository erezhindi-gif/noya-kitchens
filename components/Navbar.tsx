"use client";
import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";

const projectCategories = [
  { label: "מטבחים", href: "/projects/kitchens" },
  { label: "ארונות אמבטיה", href: "/projects/bathrooms" },
  { label: "חדרי ילדים", href: "/projects/kids" },
  { label: "ארונות קיר", href: "/projects/wall-units" },
  { label: "ארונות כניסה", href: "/projects/entrance" },
  { label: "מזנונים ושולחן סלון", href: "/projects/buffet" },
  { label: "מטבחונים", href: "/projects/kitchenette" },
];

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLLIElement>(null);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 60);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node))
        setDropdownOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <nav className={`fixed top-0 w-full z-50 transition-all duration-300 navbar-strip ${scrolled ? "shadow-sm" : ""}`}>
      <div className="max-w-7xl mx-auto px-4 md:px-8 flex items-center justify-between h-[160px]">

        {/* Logo — seamless with strip */}
        <Link href="/" className="flex items-center">
          <div style={{ backgroundColor: '#FAF3EB', lineHeight: 0 }}>
            <Image
              src="/images/logo-new.jpg"
              alt="NOYA Kitchens by Erez Hindi"
              width={300}
              height={120}
              className="h-[150px] w-auto block"
              priority
            />
          </div>
        </Link>

        {/* Desktop nav */}
        <ul className="hidden md:flex items-center gap-7">
          <li>
            <Link href="/" className="text-[#3a3a3a] hover:text-[#8B6F47] transition-colors text-sm font-medium">דף הבית</Link>
          </li>
          <li>
            <Link href="/#about" className="text-[#3a3a3a] hover:text-[#8B6F47] transition-colors text-sm font-medium">אודות</Link>
          </li>
          <li className="relative" ref={dropdownRef}>
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="flex items-center gap-1.5 text-[#3a3a3a] hover:text-[#8B6F47] transition-colors text-sm font-medium"
            >
              פרויקטים
              <svg width="11" height="11" viewBox="0 0 12 12" fill="none"
                className={`transition-transform duration-200 ${dropdownOpen ? "rotate-180" : ""}`}>
                <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" fill="none"/>
              </svg>
            </button>
            {dropdownOpen && (
              <div className="dropdown-menu">
                {projectCategories.map((cat) => (
                  <Link key={cat.href} href={cat.href} onClick={() => setDropdownOpen(false)}>{cat.label}</Link>
                ))}
              </div>
            )}
          </li>
          <li>
            <Link href="/#testimonials" className="text-[#3a3a3a] hover:text-[#8B6F47] transition-colors text-sm font-medium">המלצות</Link>
          </li>
          <li>
            <Link href="/#contact" className="text-[#3a3a3a] hover:text-[#8B6F47] transition-colors text-sm font-medium">צור קשר</Link>
          </li>
        </ul>

        {/* Phone CTA */}
        <a href="tel:0502808180"
          className="hidden md:flex items-center gap-2 bg-gradient-to-l from-[#8B6F47] to-[#C9A96E] text-white text-sm font-bold px-5 py-2.5 rounded-full transition-all hover:shadow-lg hover:-translate-y-0.5">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
            <path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/>
          </svg>
          050-2808180
        </a>

        {/* Mobile burger */}
        <button className="md:hidden p-2 text-[#3a3a3a]" onClick={() => setMenuOpen(!menuOpen)} aria-label="תפריט">
          <div className={`w-6 h-0.5 bg-current mb-1.5 transition-all origin-center ${menuOpen ? "rotate-45 translate-y-2" : ""}`} />
          <div className={`w-6 h-0.5 bg-current mb-1.5 transition-all ${menuOpen ? "opacity-0" : ""}`} />
          <div className={`w-6 h-0.5 bg-current transition-all origin-center ${menuOpen ? "-rotate-45 -translate-y-2" : ""}`} />
        </button>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="md:hidden bg-[#FAF3EB] border-t border-[#8B6F47]/12 px-5 py-3 shadow-lg">
          <Link href="/" className="block py-3.5 text-[#3a3a3a] border-b border-[#8B6F47]/10 text-sm font-medium" onClick={() => setMenuOpen(false)}>דף הבית</Link>
          <Link href="/#about" className="block py-3.5 text-[#3a3a3a] border-b border-[#8B6F47]/10 text-sm font-medium" onClick={() => setMenuOpen(false)}>אודות</Link>
          <div className="py-2 border-b border-[#8B6F47]/10">
            <p className="text-[#8B6F47] text-[10px] font-bold tracking-widest uppercase mb-2 pt-1">פרויקטים</p>
            {projectCategories.map((cat) => (
              <Link key={cat.href} href={cat.href} className="block py-2.5 pr-3 text-[#3a3a3a] text-sm hover:text-[#8B6F47] transition-colors" onClick={() => setMenuOpen(false)}>
                {cat.label}
              </Link>
            ))}
          </div>
          <Link href="/#testimonials" className="block py-3.5 text-[#3a3a3a] border-b border-[#8B6F47]/10 text-sm font-medium" onClick={() => setMenuOpen(false)}>המלצות</Link>
          <Link href="/#contact" className="block py-3.5 text-[#3a3a3a] text-sm font-medium" onClick={() => setMenuOpen(false)}>צור קשר</Link>
          <a href="tel:0502808180" className="flex items-center justify-center gap-2 mt-3 mb-1 bg-gradient-to-l from-[#8B6F47] to-[#C9A96E] text-white text-sm font-bold px-5 py-3 rounded-full">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
              <path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/>
            </svg>
            050-2808180
          </a>
        </div>
      )}
    </nav>
  );
}
