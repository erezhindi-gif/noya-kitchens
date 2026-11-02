// Shared frame for the site's content pages (price guide, service areas): header, hero, sections, contact form, footer.
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import WhatsAppButton from "@/components/WhatsAppButton";
import ContactForm from "@/components/ContactForm";

export type Faq = { q: string; a: string };

export function InfoPage({ title, lead, back, jsonLd, children, formTitle }: {
  title: string; lead: string; back?: { href: string; label: string }; jsonLd?: object[]; children: React.ReactNode; formTitle: string;
}) {
  return (
    <>
      {jsonLd?.map((j, i) => <script key={i} type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(j) }} />)}
      <Navbar />
      <WhatsAppButton />
      <section className="pt-[160px] bg-[#FAF3EB] border-b border-[#8B6F47]/15">
        <div className="max-w-4xl mx-auto px-5 md:px-8 py-10 md:py-14" id="main-content">
          {back && (
            <Link href={back.href} className="inline-flex items-center gap-2 text-[#8B6F47] text-sm mb-6 hover:gap-3 transition-all">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M19 12H5M12 19l-7-7 7-7" /></svg>
              {back.label}
            </Link>
          )}
          <h1 className="font-['Playfair_Display'] text-3xl md:text-5xl font-bold text-[#2C2C2C] mb-4 leading-tight">{title}</h1>
          <p className="text-[#5a5a5a] text-base md:text-lg leading-relaxed max-w-3xl">{lead}</p>
          <div className="flex flex-col sm:flex-row gap-3 mt-7">
            <a href="#form" className="btn-gold justify-center">לתיאום פגישת תכנון</a>
            <a href="tel:0502808180" className="btn-outline justify-center">050-2808180</a>
          </div>
        </div>
      </section>
      <main className="bg-white">
        <div className="max-w-4xl mx-auto px-5 md:px-8 py-12 md:py-16 space-y-14">{children}</div>
      </main>
      <section id="form" className="py-14 md:py-20 bg-[#FAF3EB] scroll-mt-28">
        <div className="max-w-xl mx-auto px-5 text-center">
          <p className="section-label mb-2">מתחילים בשיחה</p>
          <h2 className="section-title mb-3">{formTitle}</h2>
          <div className="gold-divider mx-auto mb-8" />
          <ContactForm />
        </div>
      </section>
      <Footer />
    </>
  );
}

export function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-2xl md:text-3xl font-bold text-[#2C2C2C] mb-2">{title}</h2>
      <div className="gold-divider mb-6" />
      <div className="text-[#4a4a4a] leading-relaxed text-base space-y-4">{children}</div>
    </section>
  );
}

export function Steps({ steps }: { steps: { t: string; d: string }[] }) {
  return (
    <ol className="space-y-4">
      {steps.map((s, i) => (
        <li key={s.t} className="flex gap-4 items-start">
          <span className="w-9 h-9 flex-shrink-0 rounded-full bg-[#8B6F47] text-white font-bold flex items-center justify-center">{i + 1}</span>
          <div><p className="font-bold text-[#2C2C2C]">{s.t}</p><p className="text-[#5a5a5a]">{s.d}</p></div>
        </li>
      ))}
    </ol>
  );
}

export function Faqs({ items }: { items: Faq[] }) {
  return (
    <div className="divide-y divide-[#8B6F47]/15 border-y border-[#8B6F47]/15">
      {items.map((f) => (
        <details key={f.q} className="group py-4">
          <summary className="cursor-pointer list-none flex justify-between gap-4 font-bold text-[#2C2C2C]">
            {f.q}<span className="text-[#8B6F47] transition-transform group-open:rotate-45 text-xl leading-none" aria-hidden>+</span>
          </summary>
          <p className="text-[#5a5a5a] mt-3 leading-relaxed">{f.a}</p>
        </details>
      ))}
    </div>
  );
}

export const faqJsonLd = (items: Faq[]) => ({
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: items.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
});

/** The steps from first call to installed kitchen, the same everywhere on the site. */
export const PROCESS = [
  { t: "שיחה ראשונה", d: "מספרים מה אתם מחפשים: גודל בערך, סגנון, לוח זמנים. אפשר לשלוח תמונות של המטבח הקיים." },
  { t: "מדידה בבית", d: "ארז מגיע, מודד את החלל ובודק נקודות מים, חשמל וגז, קירות וחלונות." },
  { t: "תכנון והדמיה", d: "שרטוט בקנה מידה אמיתי של כל קיר והדמיה תלת-ממדית, כדי שתראו את המטבח לפני שהוא נבנה." },
  { t: "הצעת מחיר מפורטת", d: "רק אחרי שהתכנון סגור: הצעה מסודרת שמפרטת מה כלול, בלי הפתעות בהמשך." },
  { t: "ייצור בנגרייה והתקנה", d: "המטבח נבנה בנגרייה שלנו לפי המידות שלכם, וארז מתקין אותו בעצמו." },
];
