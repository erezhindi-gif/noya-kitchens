import Image from "next/image";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import WhatsAppButton from "@/components/WhatsAppButton";
import { getSiteSettings, getFeaturedProjects, getTestimonials, urlFor } from "@/lib/sanity";

const CATEGORIES = [
  { name: "מטבחים", emoji: "🍳" },
  { name: "מטבחונים", emoji: "☕" },
  { name: "חדרי ילדים", emoji: "🌟" },
  { name: "ארונות אמבטיה", emoji: "🛁" },
  { name: "ארונות קיר", emoji: "📦" },
  { name: "ארונות כניסה", emoji: "🚪" },
  { name: "מזנונים ושולחנות סלון", emoji: "🛋" },
  { name: "שונות", emoji: "✨" },
];

export default async function Home() {
  const [settings, featuredProjects, testimonials] = await Promise.all([
    getSiteSettings(),
    getFeaturedProjects(),
    getTestimonials(),
  ]);

  return (
    <>
      <Navbar />

      {/* HERO */}
      <section id="home" className="relative min-h-screen flex items-center justify-center overflow-hidden">
        {/* Background */}
        <div className="absolute inset-0 bg-dark-wood">
          {settings?.heroImage ? (
            <Image
              src={urlFor(settings.heroImage).width(1920).url()}
              alt="נויה מטבחים"
              fill
              className="object-cover opacity-40"
              priority
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-dark-wood via-warm-brown/30 to-dark-wood" />
          )}
          <div className="absolute inset-0 bg-gradient-to-b from-dark-wood/60 via-transparent to-dark-wood/80" />
        </div>

        {/* Content */}
        <div className="relative z-10 text-center px-6 max-w-4xl mx-auto">
          <p className="text-gold text-xs tracking-[0.4em] uppercase mb-6 font-medium">
            נויה מטבחים · ארז הנדי
          </p>
          <h1 className="font-serif text-5xl md:text-7xl text-white leading-tight mb-6">
            {settings?.heroTitle || "מטבחים ונגרות\nבהתאמה אישית"}
          </h1>
          <div className="w-16 h-px bg-gold mx-auto mb-6" />
          <p className="text-cream/80 text-lg md:text-xl leading-relaxed mb-10 max-w-2xl mx-auto">
            {settings?.heroSubtitle || "תכנון, ייצור והתקנה בליווי אישי — מעל 30 שנות ניסיון, רמת גימור גבוהה ופרזול BLUM כסטנדרט."}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/projects" className="btn-primary">
              צפייה בפרויקטים
            </Link>
            <a href="https://wa.me/972502808180" target="_blank" rel="noopener noreferrer" className="btn-outline">
              שלח הודעה
            </a>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-cream/40">
          <span className="text-xs tracking-widest">גלול למטה</span>
          <div className="w-px h-10 bg-gold/40 animate-pulse" />
        </div>
      </section>

      {/* STATS BAR */}
      <section className="bg-gold py-10">
        <div className="max-w-5xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {[
            ["30+", "שנות ניסיון"],
            ["BLUM", "פרזול מקורי"],
            ["100%", "התאמה אישית"],
            ["ליווי", "אישי מלא"],
          ].map(([val, label]) => (
            <div key={label}>
              <div className="text-dark-wood font-serif text-3xl font-bold">{val}</div>
              <div className="text-dark-wood/70 text-xs tracking-widest uppercase mt-1">{label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* CATEGORIES */}
      <section className="py-24 bg-cream">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <p className="section-subtitle">תחומי עיסוק</p>
            <h2 className="section-title">מה אנחנו עושים</h2>
            <div className="w-12 h-px bg-gold mx-auto" />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {CATEGORIES.map((cat) => (
              <Link
                key={cat.name}
                href={`/projects?cat=${encodeURIComponent(cat.name)}`}
                className="group bg-white border border-gold/10 p-6 rounded-sm hover:border-gold hover:shadow-lg transition-all duration-300 text-center"
              >
                <div className="text-3xl mb-3">{cat.emoji}</div>
                <div className="text-dark-wood text-sm font-medium group-hover:text-gold transition-colors">
                  {cat.name}
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* FEATURED PROJECTS */}
      {featuredProjects?.length > 0 && (
        <section className="py-24 bg-white">
          <div className="max-w-7xl mx-auto px-6">
            <div className="text-center mb-16">
              <p className="section-subtitle">תיק עבודות</p>
              <h2 className="section-title">פרויקטים נבחרים</h2>
              <div className="w-12 h-px bg-gold mx-auto" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {featuredProjects.map((project: any) => (
                <Link key={project._id} href={`/projects?cat=${encodeURIComponent(project.category)}`}
                  className="group relative overflow-hidden rounded-sm aspect-[4/3] block">
                  {project.images?.[0] && (
                    <Image
                      src={urlFor(project.images[0]).width(600).height(450).url()}
                      alt={project.title}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-700"
                    />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-dark-wood/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  <div className="absolute bottom-0 right-0 left-0 p-4 translate-y-full group-hover:translate-y-0 transition-transform duration-300">
                    <p className="text-gold text-xs tracking-widest uppercase">{project.category}</p>
                    <h3 className="text-white font-serif text-lg">{project.title}</h3>
                  </div>
                </Link>
              ))}
            </div>
            <div className="text-center mt-12">
              <Link href="/projects" className="btn-primary">כל הפרויקטים</Link>
            </div>
          </div>
        </section>
      )}

      {/* ABOUT */}
      <section id="about" className="py-24 bg-cream">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div className="relative">
              <div className="absolute -top-4 -right-4 w-full h-full border-2 border-gold/30 rounded-sm" />
              <div className="relative aspect-[3/4] overflow-hidden rounded-sm">
                {settings?.aboutImage ? (
                  <Image
                    src={urlFor(settings.aboutImage).width(600).url()}
                    alt="ארז הנדי"
                    fill
                    className="object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-warm-brown/20 flex items-center justify-center">
                    <span className="text-6xl">👨‍🔧</span>
                  </div>
                )}
              </div>
            </div>
            <div>
              <p className="section-subtitle">אודות</p>
              <h2 className="section-title">הכירו את ארז הנדי</h2>
              <div className="w-12 h-px bg-gold mb-8" />
              <div className="prose prose-lg text-charcoal/80 leading-relaxed space-y-4">
                <p>שלום, אני ארז הנדי. כבר מעל 30 שנה אני מתכנן, מייצר ומתקין מטבחים, ארונות ונגרות בהתאמה אישית.</p>
                <p>כל פרויקט מקבל ליווי אישי משלב הרעיון והתכנון ועד ההתקנה בביתכם, תוך הקפדה על חומרי גלם איכותיים, פרזול BLUM מקורי ורמת גימור נקייה ומדויקת.</p>
                <p>עבורי כל מטבח הוא פרויקט אישי, ולכן אני מלווה את הלקוחות בעצמי לאורך כל הדרך.</p>
              </div>
              <div className="mt-8 grid grid-cols-2 gap-4">
                {[["30+","שנות ניסיון"],["BLUM","פרזול מקורי"],["100%","התאמה אישית"],["השרון","אזור הפעילות"]].map(([v, l]) => (
                  <div key={l} className="border border-gold/20 p-4 rounded-sm">
                    <div className="text-gold font-serif text-xl font-bold">{v}</div>
                    <div className="text-charcoal/60 text-xs tracking-wide mt-1">{l}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section id="reviews" className="py-24 bg-dark-wood">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <p className="text-gold text-xs tracking-widest uppercase mb-3">לקוחות ממליצים</p>
            <h2 className="font-serif text-4xl text-white">מה אומרים עלינו</h2>
            <div className="w-12 h-px bg-gold mx-auto mt-4" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {testimonials?.length > 0 ? testimonials.map((t: any) => (
              <div key={t._id} className="bg-white/5 border border-gold/20 p-8 rounded-sm">
                <div className="text-gold text-xl mb-4">{"★".repeat(t.rating || 5)}</div>
                <p className="text-cream/80 leading-relaxed mb-6">"{t.text}"</p>
                <div>
                  <div className="text-white font-medium">{t.name}</div>
                  {t.location && <div className="text-gold/60 text-sm">{t.location}</div>}
                </div>
              </div>
            )) : [
              { text: "עבודה נקייה ומדויקת, שירות אישי ותוצאה ברמה גבוהה.", name: "יוסי כהן", location: "נתניה" },
              { text: "מהתכנון ועד ההתקנה הכל היה מסודר ומקצועי. ממליץ בחום!", name: "מירה לוי", location: "חדרה" },
              { text: "המטבח יצא מדהים. הקפדה על פרטים קטנים וגימור יפה.", name: "דוד אברהם", location: "קיסריה" },
            ].map((t, i) => (
              <div key={i} className="bg-white/5 border border-gold/20 p-8 rounded-sm">
                <div className="text-gold text-xl mb-4">★★★★★</div>
                <p className="text-cream/80 leading-relaxed mb-6">"{t.text}"</p>
                <div>
                  <div className="text-white font-medium">{t.name}</div>
                  <div className="text-gold/60 text-sm">{t.location}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CONTACT */}
      <section id="contact" className="py-24 bg-white">
        <div className="max-w-4xl mx-auto px-6">
          <div className="text-center mb-16">
            <p className="section-subtitle">בואו נדבר</p>
            <h2 className="section-title">צור קשר</h2>
            <div className="w-12 h-px bg-gold mx-auto" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            <div className="space-y-6">
              <a href="tel:0502808180" className="flex items-center gap-4 p-4 border border-gold/20 rounded-sm hover:border-gold transition-colors group">
                <div className="w-10 h-10 bg-gold/10 rounded-full flex items-center justify-center group-hover:bg-gold transition-colors">
                  <span className="text-gold group-hover:text-white">📞</span>
                </div>
                <div>
                  <div className="text-xs text-charcoal/50 tracking-wide">טלפון</div>
                  <div className="text-dark-wood font-medium">050-2808180</div>
                </div>
              </a>
              <a href="https://wa.me/972502808180" target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-4 p-4 border border-gold/20 rounded-sm hover:border-gold transition-colors group">
                <div className="w-10 h-10 bg-gold/10 rounded-full flex items-center justify-center group-hover:bg-gold transition-colors">
                  <span className="text-gold group-hover:text-white">💬</span>
                </div>
                <div>
                  <div className="text-xs text-charcoal/50 tracking-wide">WhatsApp</div>
                  <div className="text-dark-wood font-medium">שלח הודעה</div>
                </div>
              </a>
              <div className="flex items-center gap-4 p-4 border border-gold/20 rounded-sm">
                <div className="w-10 h-10 bg-gold/10 rounded-full flex items-center justify-center">
                  <span className="text-gold">📍</span>
                </div>
                <div>
                  <div className="text-xs text-charcoal/50 tracking-wide">אזור שירות</div>
                  <div className="text-dark-wood font-medium text-sm">נתניה, השרון, חדרה, קיסריה, פרדס חנה, זכרון יעקב ועוד</div>
                </div>
              </div>
            </div>
            <ContactForm />
          </div>
        </div>
      </section>

      <Footer />
      <WhatsAppButton />
    </>
  );
}

function ContactForm() {
  return (
    <form className="space-y-4" action="https://formsubmit.co/erezhindi@gmail.com" method="POST">
      <input type="hidden" name="_subject" value="פנייה חדשה מאתר נויה מטבחים" />
      <input type="hidden" name="_next" value="https://noya-k.co.il/?sent=true" />
      <input type="hidden" name="_captcha" value="false" />
      <div>
        <input type="text" name="name" placeholder="שם מלא" required
          className="w-full border border-gold/20 rounded-sm px-4 py-3 text-sm focus:outline-none focus:border-gold transition-colors" />
      </div>
      <div>
        <input type="tel" name="phone" placeholder="טלפון" required
          className="w-full border border-gold/20 rounded-sm px-4 py-3 text-sm focus:outline-none focus:border-gold transition-colors" />
      </div>
      <div>
        <select name="project_type"
          className="w-full border border-gold/20 rounded-sm px-4 py-3 text-sm focus:outline-none focus:border-gold transition-colors text-charcoal/60">
          <option value="">סוג פרויקט</option>
          <option>מטבח</option>
          <option>מטבחון</option>
          <option>חדר ילדים</option>
          <option>ארון אמבטיה</option>
          <option>ארון קיר</option>
          <option>אחר</option>
        </select>
      </div>
      <div>
        <textarea name="message" placeholder="ספרו לי על הפרויקט שלכם..." rows={4}
          className="w-full border border-gold/20 rounded-sm px-4 py-3 text-sm focus:outline-none focus:border-gold transition-colors resize-none" />
      </div>
      <button type="submit" className="btn-primary w-full">שליחת פנייה</button>
    </form>
  );
}
