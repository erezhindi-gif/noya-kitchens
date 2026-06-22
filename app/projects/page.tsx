import Image from "next/image";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import WhatsAppButton from "@/components/WhatsAppButton";
import { getProjects, urlFor } from "@/lib/sanity";

const CATEGORIES = ["מטבחים","מטבחונים","חדרי ילדים","ארונות אמבטיה","ארונות קיר","ארונות כניסה","מזנונים ושולחנות סלון","שונות"];

export default async function ProjectsPage({
  searchParams,
}: {
  searchParams: { cat?: string };
}) {
  const cat = searchParams.cat;
  const projects = await getProjects(cat);

  return (
    <>
      <Navbar />
      <div className="pt-20 min-h-screen bg-cream">
        {/* Header */}
        <div className="bg-dark-wood py-20 text-center">
          <p className="text-gold text-xs tracking-widest uppercase mb-3">תיק עבודות</p>
          <h1 className="font-serif text-5xl text-white">{cat || "כל הפרויקטים"}</h1>
        </div>

        {/* Filter */}
        <div className="bg-white border-b border-gold/10 sticky top-20 z-40">
          <div className="max-w-7xl mx-auto px-6 py-4 flex gap-2 overflow-x-auto">
            <Link href="/projects"
              className={`whitespace-nowrap px-4 py-2 text-sm rounded-sm transition-all ${!cat ? "bg-gold text-dark-wood font-semibold" : "text-charcoal/60 hover:text-gold"}`}>
              הכל
            </Link>
            {CATEGORIES.map((c) => (
              <Link key={c} href={`/projects?cat=${encodeURIComponent(c)}`}
                className={`whitespace-nowrap px-4 py-2 text-sm rounded-sm transition-all ${cat === c ? "bg-gold text-dark-wood font-semibold" : "text-charcoal/60 hover:text-gold"}`}>
                {c}
              </Link>
            ))}
          </div>
        </div>

        {/* Grid */}
        <div className="max-w-7xl mx-auto px-6 py-16">
          {projects?.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {projects.map((project: any) => (
                <div key={project._id} className="group bg-white rounded-sm overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300">
                  <div className="relative aspect-[4/3] overflow-hidden">
                    {project.images?.[0] ? (
                      <Image
                        src={urlFor(project.images[0]).width(600).height(450).url()}
                        alt={project.title}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-700"
                      />
                    ) : (
                      <div className="w-full h-full bg-cream flex items-center justify-center">
                        <span className="text-4xl">🏠</span>
                      </div>
                    )}
                  </div>
                  <div className="p-4">
                    <p className="text-gold text-xs tracking-widest uppercase mb-1">{project.category}</p>
                    <h3 className="text-dark-wood font-serif text-lg">{project.title}</h3>
                    {project.description && (
                      <p className="text-charcoal/60 text-sm mt-2 line-clamp-2">{project.description}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-24">
              <p className="text-charcoal/40 text-lg">אין פרויקטים בקטגוריה זו עדיין.</p>
              <p className="text-charcoal/30 text-sm mt-2">הוסף פרויקטים דרך הבק אופיס</p>
              <Link href="/projects" className="btn-primary mt-8 inline-block">כל הפרויקטים</Link>
            </div>
          )}
        </div>
      </div>
      <Footer />
      <WhatsAppButton />
    </>
  );
}
