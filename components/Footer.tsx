import Image from "next/image";

export default function Footer() {
  return (
    <footer className="bg-[#FAF3EB] border-t border-[#8B6F47]/15 pt-14 pb-8">
      <div className="max-w-7xl mx-auto px-5 md:px-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10 mb-10">

          {/* Logo — seamless, no border */}
          <div>
            <Image
              src="/images/logo-new.jpg"
              alt="NOYA Kitchens"
              width={150}
              height={60}
              className="h-14 w-auto object-contain mb-4"
              style={{ mixBlendMode: "multiply" }}
            />
            <p className="text-[#6b6b6b] text-sm leading-relaxed">
              מטבחים ונגרות בהתאמה אישית.<br />
              מעל 30 שנות ניסיון — ארז הנדי.
            </p>
          </div>

          <div>
            <h4 className="text-[#8B6F47] font-semibold mb-4 text-xs tracking-widest uppercase">ניווט</h4>
            <ul className="space-y-2.5 text-sm text-[#6b6b6b]">
              {[["אודות","#about"],["פרויקטים","#categories"],["המלצות","#testimonials"],["צור קשר","#contact"]].map(([label,href]) => (
                <li key={href}><a href={href} className="hover:text-[#8B6F47] transition-colors">{label}</a></li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-[#8B6F47] font-semibold mb-4 text-xs tracking-widest uppercase">יצירת קשר</h4>
            <ul className="space-y-3 text-sm text-[#6b6b6b]">
              <li><a href="tel:0502808180" className="hover:text-[#8B6F47] transition-colors flex items-center gap-2">📞 050-2808180</a></li>
              <li><a href="mailto:erezhindi@gmail.com" className="hover:text-[#8B6F47] transition-colors flex items-center gap-2">✉️ erezhindi@gmail.com</a></li>
              <li className="flex items-center gap-2">📍 המלאכה 4, נתניה</li>
            </ul>
            <div className="flex gap-3 mt-5">
              <a href="https://www.facebook.com/profile.php?id=100054656460007" target="_blank" rel="noopener noreferrer"
                className="w-9 h-9 rounded-full bg-[#8B6F47]/12 hover:bg-[#1877F2] group flex items-center justify-center transition-all">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className="text-[#8B6F47] group-hover:text-white">
                  <path d="M18 2h-3a5 5 0 00-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 011-1h3z"/>
                </svg>
              </a>
              <a href="https://wa.me/972502808180" target="_blank" rel="noopener noreferrer"
                className="w-9 h-9 rounded-full bg-[#8B6F47]/12 hover:bg-[#25D366] group flex items-center justify-center transition-all">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className="text-[#8B6F47] group-hover:text-white">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
              </a>
            </div>
          </div>
        </div>
        <div className="border-t border-[#8B6F47]/12 pt-6 text-center text-[#9a9a9a] text-xs">
          © 2024 NOYA מטבחים ונגרות — ארז הנדי. כל הזכויות שמורות.
        </div>
      </div>
    </footer>
  );
}
