import Image from "next/image";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import WhatsAppButton from "@/components/WhatsAppButton";

const categories = [
  { title: "מטבחים", subtitle: "עיצוב ויצור מטבח חלומות", img: "/images/kitchens/kitchen-1.jpg", count: "45+" },
  { title: "ארונות אמבטיה", subtitle: "פתרונות אחסון אלגנטיים", img: "/images/bathrooms/bathroom-1.jpg", count: "30+" },
  { title: "חדרי ילדים", subtitle: "עולם קסום לילד שלכם", img: "/images/kids/kids-1.jpg", count: "25+" },
  { title: "ארונות קיר", subtitle: "ניצול מקסימלי של השטח", img: "/images/wall-units/wall-1.jpg", count: "40+" },
  { title: "ארונות כניסה", subtitle: "רושם ראשון מושלם", img: "/images/entrance/entrance-1.jpg", count: "20+" },
  { title: "מזנונים", subtitle: "אלגנטיות לסלון שלכם", img: "/images/buffet/buffet-1.jpg", count: "15+" },
];

const galleryImages = [
  "/images/kitchens/kitchen-2.jpg",
  "/images/kitchens/kitchen-3.jpg",
  "/images/bathrooms/bathroom-2.jpg",
  "/images/kitchens/kitchen-4.jpg",
  "/images/kids/kids-2.jpg",
  "/images/wall-units/wall-2.jpg",
  "/images/kitchens/kitchen-5.jpg",
  "/images/entrance/entrance-2.jpg",
  "/images/kitchens/kitchen-6.jpg",
];

const testimonials = [
  {
    name: "רחל כהן",
    city: "נתניה",
    text: "ארז בנה לנו מטבח מדהים. הדיוק, הניקיון בעבודה והתשומת לב לפרטים פשוט לא מתוארים. ממליצה בחום!",
    stars: 5,
  },
  {
    name: "משה לוי",
    city: "הרצליה",
    text: "30 שנה ניסיון — זה מרגישים. המטבח שלנו יצא בדיוק כפי שדמיינו, בלי פשרות ובמחיר הוגן.",
    stars: 5,
  },
  {
    name: "דנה אברהם",
    city: "כפר סבא",
    text: "עשינו ארון ילדים וארון קיר. שניהם יצאו מושלמים. שירות אישי, מקצועי וסבלני. תודה ארז!",
    stars: 5,
  },
];

const stats = [
  { number: "30+", label: "שנות ניסיון" },
  { number: "500+", label: "פרויקטים הושלמו" },
  { number: "100%", label: "פרזול BLUM מקורי" },
  { number: "∞", label: "שביעות רצון לקוחות" },
];

export default function Home() {
  return (
    <>
      <Navbar />
      <WhatsAppButton />

      {/* HERO */}
      <section className="relative h-screen min-h-[700px] flex items-center overflow-hidden">
        <div className="absolute inset-0">
          <Image
            src="/images/kitchens/kitchen-1.jpg"
            alt="מטבח יוקרתי"
            fill
            className="object-cover"
            priority
            quality={90}
          />
          <div className="absolute inset-0 bg-gradient-to-l from-[#111]/90 via-[#111]/60 to-[#111]/30" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#111] via-transparent to-transparent" />
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-6 w-full">
          <div className="max-w-2xl">
            <p className="text-[#C9A96E] text-sm tracking-[0.3em] uppercase mb-4 font-medium">
              מעל 30 שנות ניסיון
            </p>
            <h1 className="section-title text-white mb-6 leading-tight">
              מטבחים ונגרות<br />
              <span className="text-[#C9A96E]">בהתאמה אישית</span>
            </h1>
            <p className="text-white/70 text-lg mb-10 leading-relaxed font-light max-w-xl">
              ארז הנדי — יצור, עיצוב והתקנה של מטבחים, ארונות וריהוט.<br />
              פרזול BLUM מקורי. אזור השרון ונתניה.
            </p>
            <div className="flex flex-wrap gap-4">
              <a href="#contact" className="btn-gold">
                קבל הצעת מחיר חינם
              </a>
              <a href="#gallery" className="btn-outline">
                צפה בעבודות שלנו
              </a>
            </div>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-white/30">
          <span className="text-xs tracking-widest">גלול למטה</span>
          <div className="w-0.5 h-12 bg-gradient-to-b from-[#C9A96E] to-transparent animate-pulse" />
        </div>
      </section>

      {/* STATS */}
      <section className="bg-[#0d0d0d] border-y border-[#C9A96E]/15">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-x-reverse divide-[#C9A96E]/15">
            {stats.map((stat, i) => (
              <div key={i} className="py-12 px-8 text-center">
                <div className="font-['Playfair_Display'] text-4xl md:text-5xl font-bold text-[#C9A96E] mb-2">
                  {stat.number}
                </div>
                <div className="text-white/50 text-sm tracking-wide">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ABOUT */}
      <section id="about" className="section-py bg-[#111]">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <div className="relative">
              <div className="aspect-[4/5] relative overflow-hidden">
                <Image
                  src="/images/kitchens/kitchen-3.jpg"
                  alt="ארז הנדי — נויה מטבחים"
                  fill
                  className="object-cover"
                />
              </div>
              <div className="absolute -bottom-6 -right-6 bg-[#C9A96E] p-6 hidden md:block">
                <p className="text-[#111] font-bold text-2xl">30+</p>
                <p className="text-[#111] text-sm font-medium">שנות ניסיון</p>
              </div>
            </div>

            <div>
              <p className="text-[#C9A96E] text-sm tracking-[0.3em] uppercase mb-3">אודות</p>
              <h2 className="section-title text-white mb-4">
                ארז הנדי —<br />
                <span className="text-[#C9A96E]">מומחה לנגרות</span>
              </h2>
              <div className="gold-divider" />
              <p className="text-white/65 leading-relaxed mb-6 mt-6">
                מעל 30 שנה אני מלווה משפחות בבניית חלל הבית המושלם. כל פרויקט מקבל יחס אישי, פרזול BLUM מקורי, וגימור ברמה הגבוהה ביותר.
              </p>
              <p className="text-white/65 leading-relaxed mb-8">
                ממטבחים יוקרתיים ועד חדרי ילדים, ארונות אמבטיה ומזנונים — כל פיסת ריהוט מיוצרת בדיוק לפי מידות ורצונות הלקוח.
              </p>
              <ul className="space-y-3 mb-10">
                {[
                  "פרזול BLUM מקורי בלבד",
                  "ייצור מקומי — שליטה מלאה באיכות",
                  "ליווי אישי מהעיצוב ועד ההתקנה",
                  "אחריות על כל עבודה",
                ].map((item) => (
                  <li key={item} className="flex items-center gap-3 text-white/70 text-sm">
                    <span className="w-5 h-5 rounded-full bg-[#C9A96E]/20 border border-[#C9A96E] flex items-center justify-center flex-shrink-0">
                      <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                        <path d="M2 6l3 3 5-5" stroke="#C9A96E" strokeWidth="1.5" strokeLinecap="round"/>
                      </svg>
                    </span>
                    {item}
                  </li>
                ))}
              </ul>
              <a href="#contact" className="btn-gold">צור קשר עכשיו</a>
            </div>
          </div>
        </div>
      </section>

      {/* CATEGORIES */}
      <section id="categories" className="section-py bg-[#0d0d0d]">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <p className="text-[#C9A96E] text-sm tracking-[0.3em] uppercase mb-3">מה אנחנו עושים</p>
            <h2 className="section-title text-white mb-4">הפרויקטים שלנו</h2>
            <div className="gold-divider mx-auto" />
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {categories.map((cat, i) => (
              <div key={i} className="category-card group">
                <Image src={cat.img} alt={cat.title} fill className="object-cover" />
                <div className="card-overlay">
                  <span className="text-[#C9A96E] text-xs tracking-widest uppercase mb-1 group-hover:text-[#111] transition-colors">
                    {cat.count} פרויקטים
                  </span>
                  <h3 className="text-white text-xl font-bold group-hover:text-[#111] transition-colors">
                    {cat.title}
                  </h3>
                  <p className="text-white/70 text-sm mt-1 group-hover:text-[#111]/80 transition-colors">
                    {cat.subtitle}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* GALLERY */}
      <section id="gallery" className="section-py bg-[#111]">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <p className="text-[#C9A96E] text-sm tracking-[0.3em] uppercase mb-3">עבודות אחרונות</p>
            <h2 className="section-title text-white mb-4">גלריית פרויקטים</h2>
            <div className="gold-divider mx-auto" />
          </div>

          <div className="gallery-grid">
            {galleryImages.map((src, i) => (
              <div key={i} className="gallery-item">
                <Image src={src} alt={`פרויקט ${i + 1}`} fill className="object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-[#111]/60 to-transparent opacity-0 hover:opacity-100 transition-opacity duration-300 flex items-end p-4">
                  <span className="text-[#C9A96E] text-xs tracking-widest uppercase">נויה מטבחים</span>
                </div>
              </div>
            ))}
          </div>

          <div className="text-center mt-12">
            <a href="tel:0502808180" className="btn-outline">
              רוצה גם אתה? צור קשר →
            </a>
          </div>
        </div>
      </section>

      {/* WHY US */}
      <section className="section-py bg-[#0d0d0d]">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <p className="text-[#C9A96E] text-sm tracking-[0.3em] uppercase mb-3">למה לבחור בנו</p>
            <h2 className="section-title text-white">היתרונות שלנו</h2>
            <div className="gold-divider mx-auto mt-4" />
          </div>

          <div className="grid md:grid-cols-4 gap-6">
            {[
              { icon: "🏆", title: "30+ שנות ניסיון", text: "ניסיון עשיר בכל סוגי הפרויקטים" },
              { icon: "⚙️", title: "פרזול BLUM", text: "רק פרזול מקורי מהיצרן" },
              { icon: "✂️", title: "ייצור מקומי", text: "שליטה מלאה באיכות הגימור" },
              { icon: "🤝", title: "ליווי אישי", text: "מהעיצוב ועד המפתח ביד" },
            ].map((item, i) => (
              <div key={i} className="text-center p-8 border border-[#C9A96E]/10 hover:border-[#C9A96E]/40 transition-all duration-300 group">
                <div className="text-4xl mb-4">{item.icon}</div>
                <h3 className="text-[#C9A96E] font-bold text-lg mb-2 group-hover:scale-105 transition-transform">{item.title}</h3>
                <p className="text-white/50 text-sm leading-relaxed">{item.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section id="testimonials" className="section-py bg-[#111]">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <p className="text-[#C9A96E] text-sm tracking-[0.3em] uppercase mb-3">מה אומרים עלינו</p>
            <h2 className="section-title text-white">לקוחות מרוצים</h2>
            <div className="gold-divider mx-auto mt-4" />
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {testimonials.map((t, i) => (
              <div key={i} className="testimonial-card">
                <div className="flex gap-1 mb-4">
                  {Array.from({ length: t.stars }).map((_, j) => (
                    <span key={j} className="text-[#C9A96E] text-lg">★</span>
                  ))}
                </div>
                <p className="text-white/75 leading-relaxed mb-6 text-sm italic">"{t.text}"</p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#C9A96E]/20 border border-[#C9A96E]/40 flex items-center justify-center text-[#C9A96E] font-bold text-sm">
                    {t.name[0]}
                  </div>
                  <div>
                    <p className="text-white font-medium text-sm">{t.name}</p>
                    <p className="text-white/40 text-xs">{t.city}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CONTACT */}
      <section id="contact" className="section-py bg-[#0d0d0d]">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <p className="text-[#C9A96E] text-sm tracking-[0.3em] uppercase mb-3">מוכנים להתחיל?</p>
          <h2 className="section-title text-white mb-4">צרו קשר עכשיו</h2>
          <div className="gold-divider mx-auto" />
          <p className="text-white/60 mt-6 mb-12 text-lg">
            נשמח לתת לכם הצעת מחיר חינם ולהתחיל לתכנן את הפרויקט שלכם
          </p>

          <div className="grid md:grid-cols-3 gap-6 mb-12">
            <a href="tel:0502808180" className="flex flex-col items-center gap-3 p-8 border border-[#C9A96E]/20 hover:border-[#C9A96E] transition-all duration-300 group">
              <div className="w-14 h-14 rounded-full border border-[#C9A96E]/30 group-hover:bg-[#C9A96E]/10 transition-colors flex items-center justify-center">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="#C9A96E">
                  <path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/>
                </svg>
              </div>
              <span className="text-[#C9A96E] font-bold text-lg">050-2808180</span>
              <span className="text-white/40 text-sm">התקשר ישירות</span>
            </a>

            <a href="https://wa.me/972502808180" target="_blank" rel="noopener noreferrer" className="flex flex-col items-center gap-3 p-8 border border-[#C9A96E]/20 hover:border-[#25D366] transition-all duration-300 group">
              <div className="w-14 h-14 rounded-full border border-[#25D366]/30 group-hover:bg-[#25D366]/10 transition-colors flex items-center justify-center">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="#25D366">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
              </div>
              <span className="text-[#25D366] font-bold text-lg">WhatsApp</span>
              <span className="text-white/40 text-sm">שלח הודעה</span>
            </a>

            <a href="mailto:erezhindi@gmail.com" className="flex flex-col items-center gap-3 p-8 border border-[#C9A96E]/20 hover:border-[#C9A96E] transition-all duration-300 group">
              <div className="w-14 h-14 rounded-full border border-[#C9A96E]/30 group-hover:bg-[#C9A96E]/10 transition-colors flex items-center justify-center">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="#C9A96E">
                  <path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/>
                </svg>
              </div>
              <span className="text-[#C9A96E] font-bold text-lg">מייל</span>
              <span className="text-white/40 text-sm">erezhindi@gmail.com</span>
            </a>
          </div>

          <div className="border border-[#C9A96E]/15 p-6 text-white/40 text-sm">
            📍 המלאכה 4, נתניה | משרת את כל אזור השרון
          </div>
        </div>
      </section>

      <Footer />
    </>
  );
}
