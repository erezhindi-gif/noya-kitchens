import Image from "next/image";
import type { Metadata } from "next";
import WhatsAppButton from "@/components/WhatsAppButton";
import ContactForm from "@/components/ContactForm";
import GoogleReviews from "@/components/GoogleReviews";
import HeroSlider from "@/components/HeroSlider";
import Footer from "@/components/Footer";
import { GOOGLE_REVIEWS_URL, getReviewsView } from "@/lib/reviews/google";
import { HERO, getImageOverrides, swap } from "@/lib/site-images";

// The page the Google Ads kitchen campaign sends people to, in the site's own look (hero photos,
// gold labels, Playfair titles). Someone who searched "נגר מטבחים" sees on the first phone screen
// that this is a kitchen carpenter from the center to Pardes Hanna, his ratings, and a button to call. No menu to
// wander off into. Not indexed: the home page stays the page for organic search.
export const metadata: Metadata = {
  title: "נגר מטבחים בהתאמה אישית — מהמרכז ועד פרדס חנה | NOYA מטבחים, ארז הנדי",
  description: "מטבחים בהתאמה אישית מהמרכז ועד פרדס חנה: ארז הנדי מתכנן, מייצר ומתקין בעצמו. דירוג 5.0 מ-42 ביקורות בגוגל. 050-2808180",
  robots: { index: false, follow: true },
  alternates: { canonical: "/lp/kitchens" },
};

const PHONE = "050-2808180";
const TEL = "tel:0502808180";
const WA = "https://wa.me/972502808180?text=" + encodeURIComponent("שלום ארז, אני מתעניין/ת במטבח בהתאמה אישית");
const SANITY = "https://cdn.sanity.io/images/5wc1kx4k/production";
const MIDRAG = "https://www.midrag.co.il/SpCard/Sp/52824?areaId=4&serviceId=216";
const TOWNS = "נתניה · רעננה · כפר סבא · הוד השרון · הרצליה · רמת השרון · ראש העין · גבעת שמואל · אבן יהודה · כפר יונה · תל מונד · קדימה צורן · עמק חפר · פרדס חנה-כרכור · קיסריה";

const STEPS = [
  ["תכנון והצעת מחיר", "לפי המידות והרצונות שלכם: תוכנית בקנה מידה ותלת-ממד של המטבח"],
  ["פגישה ומדידה", "ארז מגיע, מודד במדויק ומתאים כל פרט לפני הייצור"],
  ["ייצור בנגרייה", "בנגרייה של ארז בנתניה, עם פרזול Blum מקורי"],
  ["התקנה", "ארז מתקין בעצמו, בלי קבלני משנה"],
];

const Check = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#C9A96E" strokeWidth="1.6" strokeLinecap="round" aria-hidden><path d="M5 12l5 5 9-10" /></svg>
);

export default async function KitchenLanding() {
  const [ov, reviews] = await Promise.all([getImageOverrides(), getReviewsView()]);
  const img = swap(ov);
  // the six kitchens Erez picked, in his order (photos from the kitchens gallery)
  const gallery = [
    "b1a7f7e1385f164a2ae83c3c8cce21e097d2ec9f-2400x1792.jpg", // oak island, Taj Mahal stone
    "046398599d8e1f58c449b5276d61389130c4e799-2400x1792.jpg", // white gloss with island
    "f2c26a844cb794e92bf6f86d4f8604455af18086-2400x1792.jpg", // antique green with oak shelves
    "827725031a67f9194bad82d4a5faafa1c001a4c3-1792x2400.jpg", // sahara with brown oak lift-ups
    "cd3f142eaa2771679a1caab3d50597b300fa76cc-2400x1792.jpg", // black marble island
    "c010350adad09cf9978c86ee374603672f9ca3f8-1599x1200.jpg", // anthracite with oak
  ].map((id) => `${SANITY}/${id}?w=1200`);

  return (
    <>
      {/* the site's cream strip, with the phone instead of a menu */}
      <header className="fixed top-0 inset-x-0 z-40 bg-[#FAF3EB]/95 backdrop-blur border-b border-[#8B6F47]/12">
        <div className="max-w-7xl mx-auto px-5 md:px-8 h-[72px] md:h-[88px] flex items-center justify-between">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/images/quote-logo.png" alt="NOYA Kitchens by Erez Hindi" className="h-12 md:h-16 w-auto" />
          <a href={TEL} className="btn-gold !px-5 !py-2.5 text-sm flex items-center gap-2">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6A19.79 19.79 0 012.11 4.18 2 2 0 014.11 2h3a2 2 0 012 1.72c.13.96.36 1.9.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0122 16.92z" /></svg>
            <span dir="ltr">{PHONE}</span>
          </a>
        </div>
      </header>

      {/* HERO — the site's photos and type */}
      <section id="main-content" className="hero-section pt-[72px] md:pt-[88px]">
        <HeroSlider srcs={HERO.map(img)} />
        <div className="relative z-10 max-w-7xl mx-auto px-5 md:px-8 w-full">
          <div className="max-w-xl md:max-w-2xl">
            <p className="text-[#C9A96E] text-xs tracking-[0.35em] uppercase mb-4 font-semibold">נגרות בוטיק · מהמרכז ועד פרדס חנה</p>
            <h1 className="font-['Playfair_Display'] text-4xl md:text-6xl font-bold text-white leading-tight mb-4">
              נגר מטבחים<br />בהתאמה אישית
            </h1>
            <p className="text-white/85 text-base md:text-lg leading-relaxed mb-5">
              ארז הנדי, 30 שנות ניסיון.<br />מתכנן, מייצר בנגרייה שלו ומתקין בעצמו.
            </p>
            <a href={GOOGLE_REVIEWS_URL} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-white/90 text-sm md:text-base mb-7">
              <span className="text-[#E2A33B] tracking-wider text-lg" aria-hidden>★★★★★</span>
              <b className="text-white">5.0</b> מ-{reviews.count} ביקורות בגוגל · <b className="text-white">10</b> במידרג
            </a>
            <div className="flex flex-col sm:flex-row gap-3">
              <a href={TEL} className="btn-gold text-center !text-base">📞 התקשרו לארז עכשיו</a>
              <a href={WA} target="_blank" rel="noopener noreferrer"
                className="text-center rounded-full border-2 border-white/70 text-white font-semibold px-8 py-3 hover:bg-white hover:text-[#2C2C2C] transition-colors">
                הודעה בוואטסאפ
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* STATS — as on the home page */}
      <section className="bg-[#FAF3EB] border-b border-[#8B6F47]/10">
        <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-4 divide-x divide-x-reverse divide-[#8B6F47]/15">
          {[["30+", "שנות ניסיון"], ["5.0", `${reviews.count} ביקורות בגוגל`], ["10", "דירוג במידרג"], ["100%", "ייצור והתקנה עצמיים"]].map(([n, l]) => (
            <div key={l} className="py-8 md:py-10 px-4 text-center">
              <div className="font-['Playfair_Display'] text-2xl md:text-4xl font-bold text-[#8B6F47] mb-1">{n}</div>
              <div className="text-[#6b6b6b] text-xs md:text-sm">{l}</div>
            </div>
          ))}
        </div>
      </section>

      {/* WORK */}
      <section className="section-py bg-white">
        <div className="max-w-7xl mx-auto px-5 md:px-8">
          <div className="text-center mb-12">
            <p className="section-label mb-2">מהנגרייה</p>
            <h2 className="section-title">מטבחים שארז בנה</h2>
            <div className="gold-divider mx-auto mt-3" />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
            {gallery.map((src, i) => (
              <div key={src} className="category-card">
                <Image src={src} alt={`מטבח בהתאמה אישית ${i + 1} — NOYA מטבחים`} fill className="object-cover" />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* WHY — the dark band of the home page */}
      <section className="section-py bg-[#2C2C2C]">
        <div className="max-w-7xl mx-auto px-5 md:px-8">
          <div className="text-center mb-12">
            <p className="text-[#C9A96E] text-xs tracking-widest uppercase mb-2">למה לבחור בארז</p>
            <h2 className="font-['Playfair_Display'] text-3xl md:text-4xl font-bold text-white">מטבח שנבנה בשבילכם</h2>
            <div className="w-12 h-0.5 bg-gradient-to-l from-[#C9A96E] to-transparent mx-auto mt-4" />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-x-reverse divide-white/10">
            {[
              ["ארז עצמו אצלך", "מהתכנון ועד ההתקנה, בלי קבלני משנה"],
              ["פרזול Blum מקורי", "מגירות וצירים שמחזיקים שנים"],
              ["תכנון ותלת-ממד", "רואים את המטבח לפני שהוא נבנה"],
              ["30 שנות ניסיון", "נגרות מדויקת עד המילימטר"],
            ].map(([t, d]) => (
              <div key={t} className="p-6 md:p-10 text-center">
                <div className="w-12 h-12 rounded-full border border-[#C9A96E]/40 flex items-center justify-center mx-auto mb-4"><Check /></div>
                <h3 className="text-[#C9A96E] font-bold text-sm md:text-base mb-2">{t}</h3>
                <p className="text-white/60 text-xs md:text-sm leading-relaxed">{d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* REVIEWS */}
      <section id="testimonials" className="section-py bg-white">
        <div className="max-w-7xl mx-auto px-5 md:px-8">
          <div className="text-center mb-10">
            <p className="section-label mb-2">מה אומרים עלי</p>
            <h2 className="section-title">ממליצים עלי</h2>
            <div className="gold-divider mx-auto mt-3" />
          </div>
          <GoogleReviews data={reviews} googleUrl={GOOGLE_REVIEWS_URL} midragUrl={MIDRAG} />
        </div>
      </section>

      {/* PROCESS */}
      <section className="section-py bg-[#FAF3EB]">
        <div className="max-w-7xl mx-auto px-5 md:px-8">
          <div className="text-center mb-12">
            <p className="section-label mb-2">התהליך</p>
            <h2 className="section-title">איך זה עובד</h2>
            <div className="gold-divider mx-auto mt-3" />
          </div>
          <ol className="grid gap-4 md:grid-cols-4 list-none p-0 m-0">
            {STEPS.map(([t, d], i) => (
              <li key={t} className="bg-white rounded-2xl p-6 shadow-sm border border-[#E8DCCB]">
                <div className="font-['Playfair_Display'] text-4xl font-bold text-[#C9A96E] mb-2">0{i + 1}</div>
                <h3 className="font-bold text-lg text-[#2C2C2C] mb-1">{t}</h3>
                <p className="text-[#6b6b6b] text-sm leading-relaxed">{d}</p>
              </li>
            ))}
          </ol>
          <p className="text-center text-[#8B6F47] text-sm font-medium mt-8">📍 {TOWNS}</p>
        </div>
      </section>

      {/* CONTACT */}
      <section id="contact" className="section-py bg-white">
        <div className="max-w-xl mx-auto px-5">
          <div className="text-center mb-8">
            <p className="section-label mb-2">בואו נדבר</p>
            <h2 className="section-title">רוצים הצעת מחיר למטבח?</h2>
            <div className="gold-divider mx-auto mt-3" />
            <p className="text-[#6b6b6b] mt-4">
              התקשרו <a href={TEL} className="font-bold text-[#8B6F47]" dir="ltr">{PHONE}</a>, או השאירו פרטים וארז יחזור אליכם.
            </p>
          </div>
          <ContactForm compact />
        </div>
      </section>

      <Footer />
      <WhatsAppButton />
    </>
  );
}
