import type { Metadata } from "next";
import { Assistant, Playfair_Display } from "next/font/google";
import "./globals.css";

const assistant = Assistant({
  subsets: ["hebrew", "latin"],
  variable: "--font-assistant",
  display: "swap",
});

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
  display: "swap",
});

export const metadata: Metadata = {
  title: "NOYA Kitchens | נויה מטבחים ונגרות בהתאמה אישית",
  description:
    "ארז הנדי — מטבחים ונגרות בהתאמה אישית. מעל 30 שנות ניסיון, פרזול BLUM, ייצור והתקנה באזור השרון.",
  keywords:
    "מטבחים, נגרות, התאמה אישית, ארז הנדי, נויה, נתניה, השרון, BLUM",
  openGraph: {
    title: "NOYA Kitchens | נויה מטבחים",
    description: "מטבחים ונגרות בהתאמה אישית — ארז הנדי",
    locale: "he_IL",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="he" dir="rtl">
      <body className={`${assistant.variable} ${playfair.variable} font-sans`}>
        {children}
      </body>
    </html>
  );
}
