import Link from "next/link";

export default function Footer() {
  return (
    <footer className="bg-dark-wood text-cream/80">
      <div className="max-w-7xl mx-auto px-6 py-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
          {/* Brand */}
          <div>
            <div className="font-serif text-3xl text-white mb-2 tracking-widest">NOYA</div>
            <div className="text-gold text-xs tracking-widest mb-4">KITCHENS BY EREZ HINDI</div>
            <p className="text-sm leading-relaxed text-cream/60">
              מטבחים ונגרות בהתאמה אישית.<br />
              מעל 30 שנות ניסיון, פרזול BLUM, ליווי אישי.
            </p>
          </div>

          {/* Links */}
          <div>
            <h4 className="text-gold text-xs tracking-widest uppercase mb-4">ניווט</h4>
            <ul className="space-y-2 text-sm">
              {[["אודות","/#about"],["פרויקטים","/projects"],["המלצות","/#reviews"],["צור קשר","/#contact"]].map(([label, href]) => (
                <li key={label}>
                  <Link href={href} className="hover:text-gold transition-colors">{label}</Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="text-gold text-xs tracking-widest uppercase mb-4">צור קשר</h4>
            <ul className="space-y-3 text-sm">
              <li>
                <a href="tel:0502808180" className="hover:text-gold transition-colors flex items-center gap-2">
                  📞 050-2808180
                </a>
              </li>
              <li>
                <a href="https://wa.me/972502808180" target="_blank" rel="noopener noreferrer"
                  className="hover:text-gold transition-colors flex items-center gap-2">
                  💬 WhatsApp
                </a>
              </li>
              <li>
                <a href="mailto:erezhindi@gmail.com" className="hover:text-gold transition-colors">
                  ✉ erezhindi@gmail.com
                </a>
              </li>
              <li className="text-cream/60">📍 ניצני עוז, השרון</li>
            </ul>
          </div>
        </div>

        <div className="border-t border-cream/10 mt-12 pt-6 flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-cream/40">
          <p>© {new Date().getFullYear()} נויה מטבחים — ארז הנדי. כל הזכויות שמורות.</p>
          <p>נויה מטבחים · ניצני עוז · 050-2808180</p>
        </div>
      </div>
    </footer>
  );
}
