import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Faqs, InfoPage, PROCESS, Section, Steps, faqJsonLd, type Faq } from "@/components/InfoPage";
import { CITIES, cityBySlug } from "@/lib/seo/cities";

const SITE = "https://www.noya-k.co.il";
const PHOTOS = Array.from({ length: 20 }, (_, i) => `/images/kitchens/kitchen-${i + 1}.jpg`);

export const dynamicParams = false;
export const generateStaticParams = () => CITIES.map((c) => ({ city: c.slug }));

export function generateMetadata({ params }: { params: { city: string } }): Metadata {
  const c = cityBySlug(params.city);
  if (!c) return {};
  const title = `מטבחים בהתאמה אישית ב${c.name}`;
  return {
    title,
    description: `תכנון, ייצור והתקנה של מטבחים בהתאמה אישית ב${c.name}. ארז הנדי מתכנן ומתקין בעצמו, ייצור בנגרייה שלנו, פרזול BLUM מקורי ומעל 30 שנות ניסיון.`,
    alternates: { canonical: `/kitchens/${c.slug}` },
    openGraph: { title, url: `/kitchens/${c.slug}`, images: [PHOTOS[CITIES.indexOf(c) % PHOTOS.length]] },
  };
}

export default function Page({ params }: { params: { city: string } }) {
  const c = cityBySlug(params.city);
  if (!c) notFound();
  const i = CITIES.indexOf(c);
  // A different set of kitchens on each town's page
  const photos = Array.from({ length: 6 }, (_, k) => PHOTOS[(i * 3 + k * 7) % PHOTOS.length]);
  const faq: Faq[] = [
    { q: `אתם עובדים ב${c.name}?`, a: `כן. ${c.local}` },
    { q: "כמה עולה מטבח?", a: "המחיר נקבע אחרי מדידה ותכנון, כי כל מטבח נבנה למידות ולצרכים של הבית. אחרי התכנון מקבלים הצעה מפורטת, יחד עם שרטוט והדמיה של המטבח." },
    { q: "אפשר לראות את המטבח לפני שסוגרים?", a: "כן. מקבלים שרטוט בקנה מידה של כל קיר והדמיה תלת-ממדית, ואפשר לשנות עד שהכול מתאים." },
    { q: "מי מתקין את המטבח?", a: "ארז בעצמו. אותו אדם שמדד ותכנן הוא זה שמתקין, כך ששום פרט לא הולך לאיבוד בדרך." },
  ];
  const service = {
    "@context": "https://schema.org",
    "@type": "Service",
    name: `מטבחים בהתאמה אישית ב${c.name}`,
    serviceType: "תכנון, ייצור והתקנת מטבחים בהתאמה אישית",
    url: `${SITE}/kitchens/${c.slug}`,
    areaServed: { "@type": "City", name: c.name },
    provider: { "@id": SITE },
  };

  return (
    <InfoPage
      title={`מטבחים בהתאמה אישית ב${c.name}`}
      lead={c.intro}
      back={{ href: "/projects/kitchens", label: "לגלריית המטבחים" }}
      formTitle={`מתכננים מטבח ב${c.name}?`}
      jsonLd={[service, faqJsonLd(faq)]}
    >
      <Section title={`מטבחים ב${c.name}: מה חשוב לתכנן`}>
        <p>{c.homes}</p>
      </Section>

      <section aria-label="מטבחים שבנינו">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {photos.map((src, k) => (
            <div key={src} className="relative aspect-[4/3] overflow-hidden rounded-xl">
              <Image src={src} alt={`מטבח בהתאמה אישית של NOYA מטבחים, דוגמה ${k + 1}`} fill sizes="(max-width: 768px) 50vw, 300px" className="object-cover" />
            </div>
          ))}
        </div>
        <p className="text-sm text-[#6b6b6b] mt-3">דוגמאות ממטבחים שבנינו. עוד עבודות ב<Link className="text-[#8B6F47] underline" href="/projects/kitchens">גלריית המטבחים</Link>.</p>
      </section>

      <Section title={`למה לקוחות מ${c.name} בוחרים בנו`}>
        <ul className="space-y-2 list-disc pr-5">
          <li><b>ארז מתכנן ומתקין בעצמו:</b> איש קשר אחד מהמדידה ועד המטבח המוכן.</li>
          <li><b>ייצור עצמי בנגרייה:</b> כל מידה מותאמת לבית שלכם, בלי מתווכים.</li>
          <li><b>שרטוט והדמיה לפני שסוגרים:</b> רואים את המטבח לפני שהוא נבנה.</li>
          <li><b>מעל 30 שנות ניסיון ופרזול BLUM מקורי.</b></li>
        </ul>
      </Section>

      <Section title="איך זה עובד">
        <Steps steps={PROCESS} />
        <p>רוצים להבין מה משפיע על המחיר? <Link className="text-[#8B6F47] underline" href="/kitchen-price">כך נקבע מחיר של מטבח בהתאמה אישית</Link>.</p>
      </Section>

      <Section title="שאלות נפוצות">
        <Faqs items={faq} />
      </Section>

      <Section title="עובדים גם באזור">
        <div className="flex flex-wrap gap-2">
          {c.nearby.map((s) => cityBySlug(s)).filter(Boolean).map((n) => (
            <Link key={n!.slug} href={`/kitchens/${n!.slug}`} className="rounded-full border border-[#8B6F47]/30 px-4 py-2 text-sm text-[#8B6F47] hover:bg-[#8B6F47] hover:text-white transition-colors">מטבחים ב{n!.name}</Link>
          ))}
        </div>
      </Section>
    </InfoPage>
  );
}
