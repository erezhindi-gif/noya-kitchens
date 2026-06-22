import Image from "next/image";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import WhatsAppButton from "@/components/WhatsAppButton";

interface Props {
  title: string;
  subtitle: string;
  images: string[];
  backLabel?: string;
}

export default function CategoryPage({ title, subtitle, images }: Props) {
  return (
    <>
      <Navbar />
      <WhatsAppButton />

      {/* Hero banner */}
      <section className="pt-[88px] bg-[#F0EBE1] border-b border-[#8B6F47]/15">
        <div className="max-w-7xl mx-auto px-5 md:px-8 py-10 md:py-14">
          <Link href="/#categories" className="inline-flex items-center gap-2 text-[#8B6F47] text-sm mb-6 hover:gap-3 transition-all">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M19 12H5M12 19l-7-7 7-7"/>
            </svg>
            חזרה לכל הפרויקטים
          </Link>
          <h1 className="font-['Playfair_Display'] text-3xl md:text-5xl font-bold text-[#2C2C2C] mb-2">{title}</h1>
          <p className="text-[#8B6F47] text-sm md:text-base">{subtitle}</p>
        </div>
      </section>

      {/* Gallery */}
      <section className="py-12 md:py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          <div className="columns-2 md:columns-3 lg:columns-3 gap-3 md:gap-4 space-y-3 md:space-y-4">
            {images.map((src, i) => (
              <div key={i} className="break-inside-avoid overflow-hidden rounded-xl group cursor-pointer shadow-sm hover:shadow-lg transition-shadow">
                <Image
                  src={src}
                  alt={`${title} ${i + 1}`}
                  width={800}
                  height={600}
                  className="w-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
              </div>
            ))}
          </div>

          {images.length === 0 && (
            <p className="text-center text-[#9a9a9a] py-20">אין תמונות עדיין בקטגוריה זו</p>
          )}
        </div>
      </section>

      {/* CTA */}
      <section className="py-14 bg-[#F0EBE1] text-center">
        <p className="text-[#8B6F47] text-xs tracking-widest uppercase mb-3">רוצה גם אתה?</p>
        <h2 className="font-['Playfair_Display'] text-2xl md:text-3xl font-bold text-[#2C2C2C] mb-6">
          נדבר על הפרויקט שלך
        </h2>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <a href="tel:0502808180" className="btn-gold">התקשר עכשיו — 050-2808180</a>
          <a href="https://wa.me/972502808180" target="_blank" rel="noopener noreferrer" className="btn-outline">שלח הודעה בוואטסאפ</a>
        </div>
      </section>

      <Footer />
    </>
  );
}
