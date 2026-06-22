import Image from "next/image";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import WhatsAppButton from "@/components/WhatsAppButton";
import HeroSlider from "@/components/HeroSlider";

const categories = [
  { id: "kitchens", title: "מטבחים", href: "/projects/kitchens", img: "/images/kitchens/kitchen-2.jpg" },
  { id: "bathrooms", title: "ארונות אמבטיה", href: "/projects/bathrooms", img: "/images/bathrooms/bathroom-1.jpg" },
  { id: "kids", title: "חדרי ילדים", href: "/projects/kids", img: "/images/kids/kids-1.jpg" },
  { id: "wall-units", title: "ארונות קיר", href: "/projects/wall-units", img: "/images/wall-units/wall-1.jpg" },
  { id: "entrance", title: "ארונות כניסה", href: "/projects/entrance", img: "/images/entrance/entrance-1.jpg" },
  { id: "buffet", title: "מזנונים ושולחן סלון", href: "/projects/buffet", img: "/images/buffet/buffet-1.jpg" },
];

const benefits = [
  {
    icon: (
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#8B6F47" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 7H4a2 2 0 00-2 2v6a2 2 0 002 2h16a2 2 0 002-2V9a2 2 0 00-2-2z"/>
        <path d="M16 21V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v16"/>
      </svg>
    ),
    title: "30+ שנות ניסיון",
    text: "ניסיון עשיר בכל סוגי פרויקטי הנגרות",
  },
  {
    icon: (
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#8B6F47" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
        <path d="M9 12l2 2 4-4"/>
      </svg>
    ),
    title: "פרזול Blum מקורי",
    text: "רק פרזול אוסטרי מקורי — מהאיכותיים בעולם",
  },
  {
    icon: (
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#8B6F47" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z"/>
      </svg>
    ),
    title: "עבודה ידנית מלאה",
    text: "שליטה מלקיחת מידות ועד ההתקנה הסופית",
  },
  {
    icon: (
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#8B6F47" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
        <circle cx="9" cy="7" r="4"/>
        <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/>
      </svg>
    ),
    title: "ארז עצמו אצלך",
    text: "ללא קבלני משנה — שירות אישי וישיר ממני",
  },
];

const reviews = [
  {
    name: "רחל כהן",
    city: "נתניה",
    rating: 5,
    text: "ארז בנה לנו מטבח מדהים. הדיוק, הניקיון בעבודה והתשומת לב לפרטים פשוט לא מתוארים. ממליצה בחום!",
    timeAgo: "לפני 2 חודשים",
    initials: "ר",
    color: "#E91E63",
  },
  {
    name: "משה לוי",
    city: "הרצליה",
    rating: 5,
    text: "30 שנה ניסיון — זה מרגישים. המטבח שלנו יצא בדיוק כפי שדמיינו, בלי פשרות ובמחיר הוגן.",
    timeAgo: "לפני 3 חודשים",
    initials: "מ",
    color: "#2196F3",
  },
  {
    name: "דנה אברהם",
    city: "כפר סבא",
    rating: 5,
    text: "עשינו ארון ילדים וארון קיר. שניהם יצאו מושלמים. שירות אישי, מקצועי וסבלני. תודה ארז!",
    timeAgo: "לפני חודש",
    initials: "ד",
    color: "#4CAF50",
  },
];

const GoogleStars = ({ count }: { count: number }) => (
  <div className="flex gap-0.5">
    {Array.from({ length: count }).map((_, i) => (
      <svg key={i} width="16" height="16" viewBox="0 0 24 24" fill="#FBBC04">
        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
      </svg>
    ))}
  </div>
);

const GoogleIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
  </svg>
);

export default function Home() {
  return (
    <>
      <Navbar />
      <WhatsAppButton />

      {/* HERO */}
      <section className="hero-section pt-[80px]">
        <HeroSlider />
        <div className="relative z-10 max-w-7xl mx-auto px-5 md:px-8 w-full">
          <div className="max-w-xl md:max-w-2xl">
            <p className="text-[#C9A96E] text-xs tracking-[0.35em] uppercase mb-4 font-semibold">נגרות יוקרתית בהתאמה אישית</p>
            <h1 className="font-['Playfair_Display'] text-white text-4xl md:text-6xl font-bold mb-5 leading-tight">
              מטבחים שמספרים<br />
              <span className="text-[#C9A96E]">את הסיפור שלך</span>
            </h1>
            <p className="text-white/75 text-base md:text-lg mb-8 leading-relaxed font-light">
              ארז הנדי — נגר מקצועי עם למעלה מ־30 שנות ניסיון.<br />
              כל פרויקט מתוכנן, מיוצר ומותקן על ידי ארז עצמו.
            </p>
            <div className="flex flex-wrap gap-3">
              <a href="#contact" className="btn-gold">קבל הצעת מחיר חינם</a>
              <a href="#about" className="btn-outline border-white/60 text-white hover:bg-white/10 hover:border-white">קרא עוד עלי</a>
            </div>
          </div>
        </div>
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2">
          <div className="w-0.5 h-10 bg-gradient-to-b from-[#C9A96E] to-transparent animate-pulse mx-auto" />
        </div>
      </section>

      {/* STATS */}
      <section className="bg-[#FAF3EB] border-b border-[#8B6F47]/12">
        <div className="max-w-7xl mx-auto px-5 md:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-x-reverse divide-[#8B6F47]/12">
            {[
              { number: "30+", label: "שנות ניסיון" },
              { number: "500+", label: "פרויקטים" },
              { number: "BLUM", label: "פרזול אוסטרי" },
              { number: "100%", label: "עבודה אישית" },
            ].map((stat, i) => (
              <div key={i} className="py-8 md:py-10 px-4 md:px-6 text-center">
                <div className="font-['Playfair_Display'] text-2xl md:text-4xl font-bold text-[#8B6F47] mb-1">{stat.number}</div>
                <div className="text-[#6b6b6b] text-xs md:text-sm">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ABOUT */}
      <section id="about" className="section-py bg-white">
        <div className="max-w-7xl mx-auto px-5 md:px-8">
          <div className="grid md:grid-cols-2 gap-12 md:gap-16 items-start">
            <div className="relative order-2 md:order-1">
              <div className="aspect-[3/4] relative overflow-hidden rounded-2xl shadow-2xl max-w-sm mx-auto md:mx-0">
                <Image src="/images/erez-photo.jpg" alt="ארז הנדי" fill className="object-cover object-top" />
              </div>
              <div className="absolute -bottom-4 -left-2 md:-left-4 bg-[#8B6F47] text-white p-5 rounded-xl shadow-lg">
                <p className="font-bold text-2xl font-['Playfair_Display']">30+</p>
                <p className="text-sm text-white/80">שנות ניסיון</p>
              </div>
            </div>
            <div className="pt-2 order-1 md:order-2">
              <p className="section-label mb-2">אודות</p>
              <h2 className="section-title mb-3">ארז הנדי —<br /><span className="text-[#8B6F47]">נגר מקצועי</span></h2>
              <div className="gold-divider mb-6" />
              <p className="text-[#6b6b6b] leading-relaxed mb-4 text-sm md:text-base">
                נויה – מטבחים ונגרות בהתאמה אישית, מנוהלת על-ידי ארז הנדי, נגר מקצועי בעל ניסיון של למעלה מ־30 שנה בתחום התכנון, העיצוב והייצור של מטבחים ופתרונות נגרות ברמה הגבוהה ביותר.
              </p>
              <p className="text-[#6b6b6b] leading-relaxed mb-4 text-sm md:text-base">
                כל מטבח ופרויקט נגרות נבנים בעבודת יד מלאה – על-ידי ארז עצמו. ללא קבלני משנה, ללא פשרות, ועם שליטה מלאה בכל שלבי העבודה: תכנון, מדידות, בחירת חומרים, ייצור והתקנה.
              </p>
              <p className="text-[#6b6b6b] leading-relaxed mb-5 text-sm md:text-base">
                כל פרויקט מתחיל בהקשבה לצרכים שלך ומסתיים ביצירה מדויקת, עם חומרים נבחרים, צבע איכותי, ופרזול Blum האוסטרי – מהאיכותיים בעולם.
              </p>
              <p className="text-[#8B6F47] text-sm font-medium mb-6">
                📍 נתניה, קיסריה, חדרה, פרדס חנה, זכרון יעקב, מושבי השרון וגוש דן
              </p>
              <ul className="space-y-2.5 mb-8">
                {[
                  "פרזול Blum האוסטרי המקורי — מהאיכותיים בעולם",
                  "שליטה מלאה מלקיחת מידות ועד ההתקנה",
                  "ללא קבלני משנה — ארז עצמו בכל שלב",
                  "ייצור מקומי עם גימור ברמה הגבוהה ביותר",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-3 text-[#6b6b6b] text-sm">
                    <span className="w-5 h-5 rounded-full border border-[#8B6F47] flex items-center justify-center flex-shrink-0 mt-0.5 bg-[#8B6F47]/8">
                      <svg width="9" height="9" viewBox="0 0 12 12" fill="none">
                        <path d="M2 6l3 3 5-5" stroke="#8B6F47" strokeWidth="1.8" strokeLinecap="round"/>
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

      {/* BENEFITS */}
      <section className="section-py bg-[#2C2C2C]">
        <div className="max-w-7xl mx-auto px-5 md:px-8">
          <div className="text-center mb-14">
            <p className="text-[#C9A96E] text-xs tracking-widest uppercase mb-2">למה לבחור בי</p>
            <h2 className="font-['Playfair_Display'] text-3xl md:text-4xl font-bold text-white">היתרונות שלי</h2>
            <div className="w-12 h-0.5 bg-gradient-to-l from-[#C9A96E] to-transparent mx-auto mt-4" />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-x-reverse divide-white/8">
            {benefits.map((b, i) => (
              <div key={i} className="p-8 md:p-10 text-center group hover:bg-white/5 transition-colors duration-300">
                <div className="w-14 h-14 rounded-full border border-[#C9A96E]/40 flex items-center justify-center mx-auto mb-5 group-hover:border-[#C9A96E] transition-colors">
                  {b.icon}
                </div>
                <h3 className="text-[#C9A96E] font-bold text-sm md:text-base mb-3 tracking-wide">{b.title}</h3>
                <p className="text-white/60 text-xs md:text-sm leading-relaxed">{b.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PROJECTS */}
      <section id="categories" className="section-py bg-white">
        <div className="max-w-7xl mx-auto px-5 md:px-8">
          <div className="text-center mb-12">
            <p className="section-label mb-2">מה אני עושה</p>
            <h2 className="section-title">הפרויקטים שלי</h2>
            <div className="gold-divider mx-auto mt-3" />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
            {categories.map((cat) => (
              <Link key={cat.id} href={cat.href} id={cat.id} className="category-card group block">
                <Image src={cat.img} alt={cat.title} fill className="object-cover" />
                <div className="card-overlay">
                  <div className="flex items-center justify-between">
                    <h3 className="text-white text-sm md:text-lg font-bold">{cat.title}</h3>
                    <span className="text-white/70 text-xs hidden md:block">לחץ לצפייה ←</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* PHOTO MASONRY */}
      <section className="section-py bg-[#FAF3EB]">
        <div className="max-w-7xl mx-auto px-5 md:px-8">
          <div className="text-center mb-12">
            <p className="section-label mb-2">מבחר עבודות</p>
            <h2 className="section-title">מתוך הפרויקטים שלי</h2>
            <div className="gold-divider mx-auto mt-3" />
          </div>
          <div className="columns-2 md:columns-3 gap-3 md:gap-4 space-y-3 md:space-y-4">
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
              <div key={i} className="break-inside-avoid overflow-hidden rounded-xl group">
                <Image src={src} alt={`פרויקט ${i + 1}`} width={600} height={450}
                  className="w-full object-cover transition-transform duration-500 group-hover:scale-105" />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* GOOGLE REVIEWS — Elfsight widget */}
      <section id="testimonials" className="section-py bg-white">
        <div className="max-w-7xl mx-auto px-5 md:px-8">
          <div className="text-center mb-10">
            <p className="section-label mb-2">מה אומרים עלי</p>
            <h2 className="section-title">ממליצים עלי</h2>
            <div className="gold-divider mx-auto mt-3" />
          </div>

          {/* Elfsight Google Reviews widget */}
          <div className="elfsight-app-3f01dad4-7460-447c-b6a7-24e54ea37518" data-elfsight-app-lazy></div>

          {/* Write a review */}
          <div className="flex justify-center mt-8">
            <a href="https://share.google/DlkIEwVynx7sEg1Su" target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-2 btn-gold text-sm py-3 px-6">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M12 20h9M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z"/>
              </svg>
              כתוב המלצה
            </a>
          </div>
        </div>
      </section>

      {/* CONTACT */}
      <section id="contact" className="section-py bg-[#FAF3EB]">
        <div className="max-w-3xl mx-auto px-5 md:px-8 text-center">
          <p className="section-label mb-2">מוכן להתחיל?</p>
          <h2 className="section-title mb-3">צור קשר עכשיו</h2>
          <div className="gold-divider mx-auto" />
          <p className="text-[#6b6b6b] mt-5 mb-10 text-base">אשמח לתת לך הצעת מחיר חינם ולתכנן את הפרויקט שלך יחד</p>

          <div className="flex flex-col gap-4 max-w-sm mx-auto w-full mb-8">
            {/* Phone */}
            <a href="tel:0502808180"
              className="flex items-center gap-4 px-6 py-4 rounded-full border-2 border-[#8B6F47] text-[#8B6F47] hover:bg-[#8B6F47] hover:text-white transition-all duration-250 group">
              <div className="w-11 h-11 rounded-full border border-[#8B6F47] flex items-center justify-center flex-shrink-0 group-hover:border-white">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                  <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.81a19.79 19.79 0 01-3.07-8.67A2 2 0 012 0h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L6.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 14.92v2z"/>
                </svg>
              </div>
              <div className="text-right">
                <p className="font-bold text-base leading-tight">050-2808180</p>
                <p className="text-sm opacity-60">שיחת טלפון</p>
              </div>
            </a>

            {/* WhatsApp */}
            <a href="https://wa.me/972502808180?text=שלום%20ארז%2C%20אני%20מעוניין%20לקבל%20הצעת%20מחיר" target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-4 px-6 py-4 rounded-full border-2 border-[#25D366] text-[#25D366] hover:bg-[#25D366] hover:text-white transition-all duration-250 group">
              <div className="w-11 h-11 rounded-full border border-[#25D366] flex items-center justify-center flex-shrink-0 group-hover:border-white">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
              </div>
              <div className="text-right">
                <p className="font-bold text-base leading-tight">WhatsApp</p>
                <p className="text-sm opacity-60">הודעה מיידית</p>
              </div>
            </a>

            {/* Facebook */}
            <a href="https://www.facebook.com/profile.php?id=100054656460007" target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-4 px-6 py-4 rounded-full border-2 border-[#1877F2] text-[#1877F2] hover:bg-[#1877F2] hover:text-white transition-all duration-250 group">
              <div className="w-11 h-11 rounded-full border border-[#1877F2] flex items-center justify-center flex-shrink-0 group-hover:border-white">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18 2h-3a5 5 0 00-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 011-1h3z"/>
                </svg>
              </div>
              <div className="text-right">
                <p className="font-bold text-base leading-tight">פייסבוק</p>
                <p className="text-sm opacity-60">עמוד הפייסבוק שלי</p>
              </div>
            </a>
          </div>

          <p className="text-[#8B6F47] text-sm font-medium">📍 המלאכה 4, נתניה | אזור השרון והמרכז</p>
        </div>
      </section>

      <Footer />
    </>
  );
}
