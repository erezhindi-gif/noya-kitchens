import type { Metadata } from "next";
import { Heebo, Playfair_Display } from "next/font/google";
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
  title: "NOYA | מטבחים ונגרות בהתאמה אישית — ארז הנדי",
  description: "מעל 30 שנות ניסיון בעיצוב ויצור מטבחים, ארונות וריהוט בהתאמה אישית. פרזול BLUM מקורי. אזור השרון ונתניה.",
  keywords: "מטבחים, נגרות, התאמה אישית, ארז הנדי, נויה, נתניה, השרון, BLUM",
  openGraph: {
    title: "NOYA | מטבחים ונגרות בהתאמה אישית",
    description: "מעל 30 שנות ניסיון — ארז הנדי",
    locale: "he_IL",
    type: "website",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="he" dir="rtl">
      <body className={`${heebo.variable} ${playfair.variable}`}>
        {children}
      </body>
    </html>
  );
}
