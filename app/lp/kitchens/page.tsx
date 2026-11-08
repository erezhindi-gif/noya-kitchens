import Image from "next/image";
import type { Metadata } from "next";
import WhatsAppButton from "@/components/WhatsAppButton";
import ContactForm from "@/components/ContactForm";
import GoogleReviews from "@/components/GoogleReviews";
import { GOOGLE_REVIEWS_URL, getReviewsView } from "@/lib/reviews/google";
import { HERO, getImageOverrides, swap } from "@/lib/site-images";

// The page the Google Ads kitchen campaign sends people to. Someone who searched "נגר מטבחים" sees
// on the first phone screen that this is a kitchen carpenter in the Sharon, his Google rating, and a
// button to call — no menu to wander off into. Not indexed: the home page stays the page for search.
export const metadata: Metadata = {
  title: "נגר מטבחים בשרון | מטבח בהתאמה אישית — NOYA מטבחים, ארז הנדי",
  description: "מטבחים בהתאמה אישית בשרון: ארז הנדי מתכנן, מייצר ומתקין בעצמו. דירוג 5.0 מ-42 ביקורות בגוגל. 050-2808180",
  robots: { index: false, follow: true },
  alternates: { canonical: "/lp/kitchens" },
};

const PHONE = "050-2808180";
const TEL = "tel:0502808180";
const WA = "https://wa.me/972502808180?text=" + encodeURIComponent("שלום ארז, אני מתעניין/ת במטבח בהתאמה אישית");
const MIDRAG = "https://www.midrag.co.il/SpCard/Sp/52824?areaId=4&serviceId=216";
const TOWNS = "נתניה · רעננה · כפר סבא · הוד השרון · הרצליה · רמת השרון · אבן יהודה · קדימה צורן · תל מונד · עמק חפר";

const STEPS = [
  ["פגישה ומדידה", "ארז מגיע, מודד ומקשיב למה שאתם צריכים"],
  ["תכנון והצעת מחיר", "תוכנית מדויקת בקנה מידה, ותלת-ממד של המטבח שלכם"],
  ["ייצור בנגרייה", "בנגרייה של ארז בנתניה, עם פרזול Blum מקורי"],
  ["התקנה", "ארז מתקין בעצמו, בלי קבלני משנה"],
];

export default async function KitchenLanding() {
  const [ov, reviews] = await Promise.all([getImageOverrides(), getReviewsView()]);
  const img = swap(ov);
  const gallery = [HERO[0], HERO[1], "/images/kitchens/kitchen-5.jpg", "/images/kitchens/kitchen-1.jpg", "/images/kitchens/kitchen-4.jpg", "/images/kitchens/kitchen-6.jpg"];

  return (
    <main id="main-content" className="bg-[#FAF6F0] text-[#2C2C2C]">
      {/* slim bar: logo and phone only, nothing to wander off into */}
      <header className="sticky top-0 z-40 bg-[#FAF6F0]/95 backdrop-blur border-b border-[#8B6F47]/15">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/images/quote-logo.png" alt="NOYA מטבחים — ארז הנדי" className="h-11 w-auto" />
          <a href={TEL} className="flex items-center gap-2 rounded-full bg-[#8B6F47] text-white font-bold px-4 py-2 text-sm">
            📞 <span dir="ltr">{PHONE}</span>
          </a>
        </div>
      </header>

      {/* first screen */}
      <section className="max-w-6xl mx-auto px-4 pt-6 pb-8 md:grid md:grid-cols-2 md:gap-10 md:items-center md:pt-12">
        <div>
          <p className="text-sm font-bold text-[#8B6F47] mb-2">נגריית בוטיק לנגרות ומטבחים · השרון</p>
          <h1 className="text-[30px] leading-tight md:text-5xl font-bold mb-3">נגר מטבחים בשרון<br />מטבח בהתאמה אישית</h1>
          <p className="text-[17px] leading-relaxed mb-4">
            ארז הנדי, 30 שנות ניסיון. מתכנן, מייצר בנגרייה שלו ומתקין בעצמו, בלי קבלני משנה.
          </p>
          <a href={GOOGLE_REVIEWS_URL} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 mb-5 text-[15px]">
            <span className="text-[#E2A33B] tracking-wider text-lg" aria-hidden>★★★★★</span>
            <b>5.0</b> מ-{reviews.count} ביקורות בגוגל · <b>10</b> במידרג
          </a>
          <div className="flex flex-col sm:flex-row gap-3">
            <a href={TEL} className="flex items-center justify-center gap-2 rounded-xl bg-[#8B6F47] text-white text-lg font-bold py-4 px-6 shadow">
              📞 התקשרו לארז עכשיו
            </a>
            <a href={WA} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2 rounded-xl bg-[#25D366] text-white text-lg font-bold py-4 px-6 shadow">
              הודעה בוואטסאפ
            </a>
          </div>
        </div>
        <div className="mt-6 md:mt-0">
          <Image src={img(HERO[0])} alt="מטבח בהתאמה אישית של NOYA" width={1200} height={900} priority className="w-full h-auto rounded-2xl object-cover" />
        </div>
      </section>

      {/* why */}
      <section className="bg-white py-10">
        <div className="max-w-6xl mx-auto px-4 grid gap-4 sm:grid-cols-3 text-center">
          {[["30+", "שנות ניסיון בנגרות"], ["ארז עצמו", "תכנון, ייצור והתקנה בלי קבלני משנה"], ["Blum", "פרזול מקורי, ריכוך ומנגנונים איכותיים"]].map(([a, b]) => (
            <div key={a} className="rounded-2xl bg-[#FAF3EB] p-5">
              <div className="text-2xl font-bold text-[#8B6F47]">{a}</div>
              <div className="text-[15px] mt-1">{b}</div>
            </div>
          ))}
        </div>
      </section>

      {/* work */}
      <section className="py-10">
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="text-2xl md:text-3xl font-bold text-center mb-6">מטבחים שארז בנה</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {gallery.map((src, i) => (
              <Image key={src} src={img(src)} alt={`מטבח ${i + 1} של NOYA`} width={600} height={450} className="w-full h-full aspect-[4/3] object-cover rounded-xl" />
            ))}
          </div>
        </div>
      </section>

      {/* reviews */}
      <section className="bg-white py-10">
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="text-2xl md:text-3xl font-bold text-center mb-6">מה אומרים הלקוחות</h2>
          <GoogleReviews data={reviews} googleUrl={GOOGLE_REVIEWS_URL} midragUrl={MIDRAG} />
        </div>
      </section>

      {/* how it works */}
      <section className="py-10">
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="text-2xl md:text-3xl font-bold text-center mb-6">איך זה עובד</h2>
          <ol className="grid gap-3 md:grid-cols-4 list-none p-0">
            {STEPS.map(([t, d], i) => (
              <li key={t} className="rounded-2xl bg-white p-5 border border-[#8B6F47]/15">
                <div className="w-9 h-9 rounded-full bg-[#8B6F47] text-white font-bold grid place-items-center mb-2">{i + 1}</div>
                <b className="block text-lg">{t}</b>
                <span className="text-[15px] text-[#6b5b4a]">{d}</span>
              </li>
            ))}
          </ol>
          <p className="text-center text-sm text-[#6b5b4a] mt-5">אזורי שירות: {TOWNS}</p>
        </div>
      </section>

      {/* contact */}
      <section id="contact" className="bg-[#F3EADC] py-10">
        <div className="max-w-xl mx-auto px-4">
          <h2 className="text-2xl md:text-3xl font-bold text-center mb-2">רוצים הצעת מחיר למטבח?</h2>
          <p className="text-center mb-5">
            התקשרו <a href={TEL} className="font-bold underline" dir="ltr">{PHONE}</a>, או השאירו פרטים וארז יחזור אליכם.
          </p>
          <ContactForm compact />
        </div>
      </section>

      <footer className="py-6 text-center text-sm text-[#6b5b4a]">NOYA Kitchens · ארז הנדי · המלאכה 4, נתניה · <a href={TEL} dir="ltr">{PHONE}</a></footer>
      <WhatsAppButton />
    </main>
  );
}
