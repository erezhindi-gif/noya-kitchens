import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "הצהרת נגישות | NOYA מטבחים" };

export default function AccessibilityPage() {
  return (
    <>
      <Navbar />
      <main id="main-content" className="pt-[160px] pb-20 bg-white min-h-screen">
        <div className="max-w-3xl mx-auto px-5 md:px-8">
          <h1 className="font-['Playfair_Display'] text-3xl font-bold text-[#2C2C2C] mb-6">הצהרת נגישות</h1>

          <div className="prose prose-lg text-[#3a3a3a] space-y-6 text-right">
            <p>
              <strong>NOYA מטבחים — ארז הנדי</strong> מחויב לאפשר שימוש נגיש לאנשים עם מוגבלויות באתר האינטרנט שלנו, בהתאם לתקן ישראלי 5568 ו-WCAG 2.1 ברמה AA.
            </p>

            <h2 className="text-xl font-bold mt-6">מה עשינו?</h2>
            <ul className="list-disc list-inside space-y-2">
              <li>תמיכה בניווט מקלדת מלא</li>
              <li>תיאורי alt לכל התמונות</li>
              <li>כפתור נגישות הכולל: הגדלת טקסט, ניגודיות גבוהה, הדגשת קישורים, מדריך קריאה</li>
              <li>מבנה סמנטי תקני (headers, landmarks, ARIA)</li>
              <li>שפה מוגדרת כעברית RTL</li>
            </ul>

            <h2 className="text-xl font-bold mt-6">רמת הנגישות</h2>
            <p>האתר עומד ברמת AA של תקן WCAG 2.1 ובדרישות תקן ישראלי 5568.</p>

            <h2 className="text-xl font-bold mt-6">נתקלתם בבעיה?</h2>
            <p>
              אם נתקלתם בקושי כלשהו בשימוש באתר, אנא פנו אלינו ונשמח לסייע:
            </p>
            <ul className="list-none space-y-1">
              <li>📞 טלפון: <a href="tel:0502808180" className="text-[#8B6F47]">050-2808180</a></li>
              <li>✉️ אימייל: <a href="mailto:erezhindi@gmail.com" className="text-[#8B6F47]">erezhindi@gmail.com</a></li>
            </ul>

            <h2 className="text-xl font-bold mt-6">תאריך עדכון</h2>
            <p>הצהרה זו עודכנה לאחרונה בחודש יוני 2025.</p>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
