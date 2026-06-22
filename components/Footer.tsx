import Image from "next/image";
import Link from "next/link";

export default function Footer() {
  return (
    <footer className="bg-[#0d0d0d] border-t border-[#C9A96E]/20 pt-16 pb-8">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 mb-12">
          {/* Brand */}
          <div>
            <Image src="/images/logo.jpg" alt="NOYA" width={130} height={55} className="object-contain mb-4 brightness-110" />
            <p className="text-white/50 text-sm leading-relaxed">
              מטבחים ונגרות בהתאמה אישית.<br />
              מעל 30 שנות ניסיון, אזור השרון ונתניה.
            </p>
          </div>

          {/* Links */}
          <div>
            <h4 className="text-[#C9A96E] font-semibold mb-4 text-sm tracking-widest uppercase">ניווט</h4>
            <ul className="space-y-2">
              {["אודות", "גלריה", "המלצות", "צור קשר"].map((item) => (
                <li key={item}>
                  <a href={`#${item}`} className="text-white/50 hover:text-[#C9A96E] transition-colors text-sm">
                    {item}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="text-[#C9A96E] font-semibold mb-4 text-sm tracking-widest uppercase">צור קשר</h4>
            <ul className="space-y-3 text-sm text-white/50">
              <li className="flex items-center gap-2">
                <span className="text-[#C9A96E]">📞</span>
                <a href="tel:0502808180" className="hover:text-[#C9A96E] transition-colors">050-2808180</a>
              </li>
              <li className="flex items-center gap-2">
                <span className="text-[#C9A96E]">📧</span>
                <a href="mailto:erezhindi@gmail.com" className="hover:text-[#C9A96E] transition-colors">erezhindi@gmail.com</a>
              </li>
              <li className="flex items-center gap-2">
                <span className="text-[#C9A96E]">📍</span>
                <span>המלאכה 4, נתניה</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-white/5 pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-white/30 text-xs">© 2024 NOYA מטבחים ונגרות — ארז הנדי. כל הזכויות שמורות.</p>
          <a
            href="https://wa.me/972502808180"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#25D366] text-xs hover:text-[#C9A96E] transition-colors flex items-center gap-1"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
            WhatsApp
          </a>
        </div>
      </div>
    </footer>
  );
}
