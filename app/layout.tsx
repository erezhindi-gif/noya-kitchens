import type { Metadata } from "next";
import { Heebo, Playfair_Display } from "next/font/google";
import Script from "next/script";
import AccessibilityWidget from "@/components/AccessibilityWidget";
import "./globals.css";

const heebo = Heebo({
  subsets: ["hebrew", "latin"],
  weight: ["300", "400", "500", "700", "900"],
  variable: "--font-heebo",
  display: "swap",
});

const playfair = Playfair_Display({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-playfair",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://noya-kitchens.vercel.app"),
  title: {
    default: "NOYA מטבחים | ארז הנדי — מטבחים ונגרות בהתאמה אישית נתניה",
    template: "%s | NOYA מטבחים",
  },
  description: "מעל 30 שנות ניסיון בעיצוב ויצור מטבחים, ארונות וריהוט בהתאמה אישית. פרזול BLUM מקורי. שירות אישי מארז הנדי — נתניה, השרון, המרכז.",
  keywords: ["מטבחים", "נגרות", "התאמה אישית", "ארז הנדי", "נויה מטבחים", "נתניה", "השרון", "BLUM", "ארונות", "עיצוב מטבח", "מטבח מעוצב"],
  authors: [{ name: "ארז הנדי" }],
  creator: "ארז הנדי",
  publisher: "NOYA Kitchens",
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
  openGraph: {
    title: "NOYA מטבחים | ארז הנדי — נגרות בהתאמה אישית",
    description: "מעל 30 שנות ניסיון — מטבחים, ארונות וריהוט בהתאמה אישית. נתניה והסביבה.",
    locale: "he_IL",
    type: "website",
    url: "https://noya-kitchens.vercel.app",
    siteName: "NOYA מטבחים",
    images: [{ url: "/images/kitchens/kitchen-1.jpg", width: 1200, height: 630, alt: "מטבח מעוצב — NOYA מטבחים" }],
  },
  alternates: {
    canonical: "https://noya-kitchens.vercel.app",
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "LocalBusiness",
  "@id": "https://noya-kitchens.vercel.app",
  name: "NOYA מטבחים — ארז הנדי",
  description: "מטבחים ונגרות בהתאמה אישית. מעל 30 שנות ניסיון.",
  url: "https://noya-kitchens.vercel.app",
  telephone: "+972-50-2808180",
  email: "erezhindi@gmail.com",
  address: {
    "@type": "PostalAddress",
    streetAddress: "המלאכה 4",
    addressLocality: "נתניה",
    addressRegion: "מחוז המרכז",
    addressCountry: "IL",
  },
  geo: {
    "@type": "GeoCoordinates",
    latitude: 32.3215,
    longitude: 34.8532,
  },
  areaServed: ["נתניה", "השרון", "המרכז", "קיסריה", "חדרה", "פרדס חנה", "זכרון יעקב"],
  openingHoursSpecification: [
    { "@type": "OpeningHoursSpecification", dayOfWeek: ["Sunday","Monday","Tuesday","Wednesday","Thursday"], opens: "08:00", closes: "18:00" },
  ],
  sameAs: ["https://www.facebook.com/profile.php?id=100054656460007"],
  priceRange: "₪₪₪",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="he" dir="rtl">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className={`${heebo.variable} ${playfair.variable}`}>
        <a href="#main-content" className="skip-link">דלג לתוכן הראשי</a>
        <AccessibilityWidget />
        <div id="page-content">{children}</div>
        <Script src="https://elfsightcdn.com/platform.js" strategy="lazyOnload" />
      </body>
    </html>
  );
}
