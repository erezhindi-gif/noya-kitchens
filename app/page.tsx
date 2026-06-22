import Image from "next/image";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import WhatsAppButton from "@/components/WhatsAppButton";

const categories = [
  { id: "kitchens", title: "מטבחים", img: "/images/kitchens/kitchen-2.jpg" },
  { id: "bathrooms", title: "ארונות אמבטיה", img: "/images/bathrooms/bathroom-1.jpg" },
  { id: "kids", title: "חדרי ילדים", img: "/images/kids/kids-1.jpg" },
  { id: "wall-units", title: "ארונות קיר", img: "/images/wall-units/wall-1.jpg" },
  { id: "entrance", title: "ארונות כניסה", img: "/images/entrance/entrance-1.jpg" },
  { id: "buffet", title: "מזנונים ושולחן סלון", img: "/images/buffet/buffet-1.jpg" },
];

const stats = [
  { number: "30+", label: "שנות ניסיון" },
  { number: "500+", label: "פרויקטים" },
  { number: "BLUM", label: "פרזול אוסטרי מקורי" },
  { number: "100%", label: "עבודה ידנית אישית" },
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

export default function Home() {
  return (
    <>
      <Navbar />
      <WhatsAppButton />

      {/* HERO */}
      <section className="hero-section pt-[72px]">
        <div className="absolute inset-0">
          <Image
            src="/images/kitchens/kitchen-1.jpg"
            alt="מטבח יוקרתי — נויה מטבחים"
            fill
            className="object-cover"
            priority
            quality={90}
          />
          <div className="absolute inset-0 bg-gradient-to-l from-black/80 via-black/50 to-black/25" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-6 w-full">
          <div className="max-w-2xl">
            <p className="text-[#C9A96E] text-xs tracking-[0.35em] uppercase mb-4 font-semibold">
              נגרות יוקרתית בהתאמה אישית
            </p>
            <h1 className="font-['Playfair_Display'] text-white text-4xl md:text-6xl font-bold mb-5 leading-tight">
              מטבחים שמספרים<br />
              <span className="text-[#C9A96E]">את הסיפור שלך</span>
            </h1>
            <p className="text-white/75 text-lg mb-10 leading-relaxed font-light max-w-xl">
              ארז הנדי — נגר מקצועי עם למעלה מ־30 שנות ניסיון.<br />
              כל פרויקט מתוכנן, מיוצר ומותקן על ידי ארז עצמו — ללא פשרות.
            </p>
            <div className="flex flex-wrap gap-4">
              <a href="#contact" className="btn-gold">קבל הצעת מחיר חינם</a>
              <a href="#about" className="btn-outline border-white/60 text-white hover:bg-white hover:text-[#3a3a3a]">
                קרא עוד עלי
              </a>
            </div>
          </div>
        </div>

        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2">
          <div className="w-0.5 h-10 bg-gradient-to-b from-[#C9A96E] to-transparent animate-pulse" />
        </div>
      </section>

      {/* STATS */}
      <section className="bg-[#F0EBE1] border-b border-[#8B6F47]/15">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-x-reverse divide-[#8B6F47]/15">
            {stats.map((stat, i) => (
              <div key={i} className="py-10 px-6 text-center">
                <div className="font-['Playfair_Display'] text-3xl md:text-4xl font-bold text-[#8B6F47] mb-1">
                  {stat.number}
                </div>
                <div className="text-[#6b6b6b] text-sm">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ABOUT */}
      <section id="about" className="section-py bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid md:grid-cols-2 gap-16 items-start">
            {/* Photo */}
            <div className="relative">
              <div className="aspect-[3/4] relative overflow-hidden rounded-sm shadow-xl max-w-md mx-auto">
                <Image
                  src="/images/erez-photo.jpg"
                  alt="ארז הנדי — נויה מטבחים"
                  fill
                  className="object-cover object-top"
                />
              </div>
              <div className="absolute -bottom-4 -left-4 bg-[#8B6F47] text-white p-5 hidden md:block shadow-lg">
                <p className="font-bold text-2xl font-['Playfair_Display']">30+</p>
                <p className="text-sm text-white/80">שנות ניסיון</p>
              </div>
            </div>

            {/* Text */}
            <div className="pt-4">
              <p className="section-label mb-2">אודות</p>
              <h2 className="section-title mb-3">
                ארז הנדי —<br />
                <span className="text-[#8B6F47]">נגר מקצועי</span>
              </h2>
              <div className="gold-divider mb-6" />

              <p className="text-[#6b6b6b] leading-relaxed mb-4 text-[0.95rem]">
                נויה – מטבחים ונגרות בהתאמה אישית, מנוהלת על-ידי ארז הנדי, נגר מקצועי בעל ניסיון של למעלה מ־30 שנה בתחום התכנון, העיצוב והייצור של מטבחים ופתרונות נגרות ברמה הגבוהה ביותר.
              </p>
              <p className="text-[#6b6b6b] leading-relaxed mb-4 text-[0.95rem]">
                כל מטבח ופרויקט נגרות נבנים בעבודת יד מלאה – על-ידי ארז עצמו. ללא קבלני משנה, ללא פשרות, ועם שליטה מלאה בכל שלבי העבודה: תכנון, מדידות, בחירת חומרים, ייצור והתקנה.
              </p>
              <p className="text-[#6b6b6b] leading-relaxed mb-6 text-[0.95rem]">
                כל פרויקט מתחיל בהקשבה לצרכים שלך ומסתיים ביצירה מדויקת, עם חומרים נבחרים, צבע איכותי, ופרזול Blum האוסטרי – מהאיכותיים בעולם.
              </p>

              <p className="text-[#8B6F47] text-sm font-medium mb-5">
                משרת את: נתניה, קיסריה, חדרה, פרדס חנה, זכרון יעקב, מושבי השרון ואזור גוש דן.
              </p>

              <ul className="space-y-3 mb-8">
                {[
                  "פרזול Blum האוסטרי המקורי — מהאיכותיים בעולם",
                  "שליטה מלאה מלקיחת מידות ועד ההתקנה",
                  "ללא קבלני משנה — ארז עצמו בכל שלב",
                  "ייצור מקומי עם גימור ברמה הגבוהה ביותר",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-3 text-[#6b6b6b] text-sm">
                    <span className="w-5 h-5 rounded-full border border-[#8B6F47] flex items-center justify-center flex-shrink-0 mt-0.5">
                      <svg width="9" height="9" viewBox="0 0 12 12" fill="none">
                        <path d="M2 6l3 3 5-5" stroke="#8B6F47" strokeWidth="1.5" strokeLinecap="round"/>
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

      {/* WHY ME */}
      <section className="section-py bg-[#F0EBE1]">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-14">
            <p className="section-label mb-2">למה לבחור בי</p>
            <h2 className="section-title">היתרונות שלי</h2>
            <div className="gold-divider mx-auto mt-3" />
          </div>
          <div className="grid md:grid-cols-4 gap-5">
            {[
              { icon: "🏆", title: "30+ שנות ניסיון", text: "ניסיון עשיר בכל סוגי פרויקטי הנגרות" },
              { icon: "⚙️", title: "פרזול Blum מקורי", text: "רק פרזול אוסטרי מקורי מהיצרן" },
              { icon: "✋", title: "עבודה ידנית מלאה", text: "שליטה מלקיחת מידות ועד ההתקנה" },
              { icon: "🤝", title: "ארז עצמו אצלך", text: "ללא קבלני משנה — שירות אישי וישיר" },
            ].map((item, i) => (
              <div key={i} className="bg-white p-7 text-center border border-[#8B6F47]/10 hover:border-[#8B6F47]/35 hover:shadow-md transition-all duration-300 group">
                <div className="text-3xl mb-4">{item.icon}</div>
                <h3 className="text-[#8B6F47] font-bold text-base mb-2">{item.title}</h3>
                <p className="text-[#6b6b6b] text-sm leading-relaxed">{item.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PROJECTS */}
      <section id="categories" className="section-py bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-14">
            <p className="section-label mb-2">מה אני עושה</p>
            <h2 className="section-title">הפרויקטים שלי</h2>
            <div className="gold-divider mx-auto mt-3" />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {categories.map((cat) => (
              <div key={cat.id} id={cat.id} className="category-card group">
                <Image src={cat.img} alt={cat.title} fill className="object-cover" />
                <div className="card-overlay">
                  <h3 className="text-white text-lg font-bold group-hover:text-white transition-colors">
                    {cat.title}
                  </h3>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PROJECT PHOTO STRIPS */}
      <section className="bg-[#F0EBE1] section-py">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-14">
            <p className="section-label mb-2">מבחר עבודות</p>
            <h2 className="section-title">מתוך הפרויקטים שלי</h2>
            <div className="gold-divider mx-auto mt-3" />
          </div>
          <div className="columns-2 md:columns-3 gap-4 space-y-4">
            {[
              "/images/kitchens/kitchen-3.jpg",
              "/images/kitchens/kitchen-4.jpg",
              "/images/bathrooms/bathroom-2.jpg",
              "/images/kids/kids-2.jpg",
              "/images/wall-units/wall-2.jpg",
              "/images/kitchens/kitchen-5.jpg",
              "/images/entrance/entrance-2.jpg",
              "/images/buffet/buffet-2.jpg",
              "/images/kitchens/kitchen-6.jpg",
            ].map((src, i) => (
              <div key={i} className="break-inside-avoid overflow-hidden rounded-sm group">
                <Image
                  src={src}
                  alt={`פרויקט ${i + 1}`}
                  width={600}
                  height={450}
                  className="w-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section id="testimonials" className="section-py bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-14">
            <p className="section-label mb-2">מה אומרים עלי</p>
            <h2 className="section-title">לקוחות מרוצים</h2>
            <div className="gold-divider mx-auto mt-3" />
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {testimonials.map((t, i) => (
              <div key={i} className="testimonial-card">
                <div className="flex gap-0.5 mb-4">
                  {Array.from({ length: t.stars }).map((_, j) => (
                    <span key={j} className="text-[#C9A96E] text-lg">★</span>
                  ))}
                </div>
                <p className="text-[#5a5a5a] leading-relaxed mb-6 text-sm italic">"{t.text}"</p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#8B6F47]/15 border border-[#8B6F47]/30 flex items-center justify-center text-[#8B6F47] font-bold text-sm">
                    {t.name[0]}
                  </div>
                  <div>
                    <p className="text-[#3a3a3a] font-semibold text-sm">{t.name}</p>
                    <p className="text-[#9a9a9a] text-xs">{t.city}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="text-center mt-10">
            <a
              href="https://share.google/DlkIEwVynx7sEg1Su"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-[#8B6F47] border border-[#8B6F47]/30 hover:border-[#8B6F47] px-6 py-3 text-sm font-medium transition-all hover:bg-[#F0EBE1] rounded-sm"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className="text-[#4285F4]">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              ביקורות בגוגל
            </a>
          </div>
        </div>
      </section>

      {/* CONTACT */}
      <section id="contact" className="section-py bg-[#F0EBE1]">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <p className="section-label mb-2">מוכן להתחיל?</p>
          <h2 className="section-title mb-3">צור קשר עכשיו</h2>
          <div className="gold-divider mx-auto" />
          <p className="text-[#6b6b6b] mt-5 mb-12 text-base">
            אשמח לתת לך הצעת מחיר חינם ולתכנן את הפרויקט שלך יחד
          </p>

          <div className="grid md:grid-cols-3 gap-5 mb-10">
            <a href="tel:0502808180" className="flex flex-col items-center gap-3 p-8 bg-white border border-[#8B6F47]/15 hover:border-[#8B6F47] hover:shadow-md transition-all duration-300 group">
              <div className="w-14 h-14 rounded-full border border-[#8B6F47]/25 group-hover:bg-[#8B6F47]/8 transition-colors flex items-center justify-center">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="#8B6F47">
                  <path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/>
                </svg>
              </div>
              <span className="text-[#8B6F47] font-bold text-lg">050-2808180</span>
              <span className="text-[#9a9a9a] text-xs">התקשר ישירות</span>
            </a>

            <a href="https://wa.me/972502808180?text=שלום%20ארז%2C%20אני%20מעוניין%20לקבל%20הצעת%20מחיר" target="_blank" rel="noopener noreferrer"
              className="flex flex-col items-center gap-3 p-8 bg-white border border-[#8B6F47]/15 hover:border-[#25D366] hover:shadow-md transition-all duration-300 group">
              <div className="w-14 h-14 rounded-full border border-[#25D366]/25 group-hover:bg-[#25D366]/8 transition-colors flex items-center justify-center">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="#25D366">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
              </div>
              <span className="text-[#25D366] font-bold text-lg">WhatsApp</span>
              <span className="text-[#9a9a9a] text-xs">שלח הודעה</span>
            </a>

            <a href="https://www.facebook.com/profile.php?id=100054656460007" target="_blank" rel="noopener noreferrer"
              className="flex flex-col items-center gap-3 p-8 bg-white border border-[#8B6F47]/15 hover:border-[#1877F2] hover:shadow-md transition-all duration-300 group">
              <div className="w-14 h-14 rounded-full border border-[#1877F2]/25 group-hover:bg-[#1877F2]/8 transition-colors flex items-center justify-center">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="#1877F2">
                  <path d="M18 2h-3a5 5 0 00-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 011-1h3z"/>
                </svg>
              </div>
              <span className="text-[#1877F2] font-bold text-lg">פייסבוק</span>
              <span className="text-[#9a9a9a] text-xs">עמוד הפייסבוק שלי</span>
            </a>
          </div>

          <p className="text-[#8B6F47] text-sm font-medium">
            📍 המלאכה 4, נתניה | אזור השרון והמרכז
          </p>
        </div>
      </section>

      <Footer />
    </>
  );
}
