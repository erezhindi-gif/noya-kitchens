import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export default function AccessibilityPage() {
  return (
    <>
      <Navbar />
      <main id="main-content" className="pt-[160px] pb-24 bg-white min-h-screen">
        <div className="max-w-3xl mx-auto px-5 md:px-8">

          <h1 className="font-['Playfair_Display'] text-3xl md:text-4xl font-bold text-[#2C2C2C] mb-2">הצהרת נגישות</h1>
          <p className="text-[#8B6F47] text-sm mb-10">עודכן לאחרונה: יוני 2025</p>

          <div className="space-y-8 text-[#3a3a3a] leading-relaxed">

            <section>
              <h2 className="text-xl font-bold text-[#2C2C2C] mb-3 border-b border-[#8B6F47]/20 pb-2">1. מבוא</h2>
              <p>
                NOYA מטבחים ונגרות, בבעלות ארז הנדי (להלן: "העסק"), מחויב להנגיש את אתר האינטרנט שלו לאנשים עם מוגבלות, בהתאם לחוק שוויון זכויות לאנשים עם מוגבלות, התשנ"ח–1998, תקנות שוויון זכויות לאנשים עם מוגבלות (התאמות נגישות לשירות), התשע"ג–2013, ותקן ישראלי 5568 (המבוסס על WCAG 2.1 ברמה AA).
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-[#2C2C2C] mb-3 border-b border-[#8B6F47]/20 pb-2">2. רמת הנגישות</h2>
              <p className="mb-3">
                האתר עומד ברמת התאמה <strong>AA</strong> של תקן WCAG 2.1 ובדרישות תקן ישראלי 5568. בוצעה בדיקת נגישות פנימית בחודש יוני 2025.
              </p>
              <p>האתר תומך בדפדפנים: Chrome, Firefox, Edge, Safari — בגרסאות העדכניות.</p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-[#2C2C2C] mb-3 border-b border-[#8B6F47]/20 pb-2">3. התאמות הנגישות באתר</h2>
              <ul className="list-disc list-inside space-y-2 text-sm">
                <li>ניווט מלא באמצעות מקלדת בלבד</li>
                <li>תמיכה בקוראי מסך (NVDA, JAWS, VoiceOver)</li>
                <li>תיאורי טקסט חלופי (alt text) לכל התמונות</li>
                <li>כפתור נגישות הכולל: הגדלת/הקטנת טקסט, ניגודיות גבוהה, הדגשת קישורים, מדריך קריאה</li>
                <li>מבנה כותרות סמנטי תקני (H1–H3)</li>
                <li>ציוני ARIA ו-Landmark Roles לניווט מהיר</li>
                <li>קישור "דלג לתוכן הראשי" בלחיצת Tab ראשונה</li>
                <li>שפת הדף מוגדרת כעברית (lang="he") וכיווניות RTL</li>
                <li>עיצוב רספונסיבי המותאם לכל גדלי המסך</li>
                <li>ניגודיות צבעים העומדת ביחס מינימלי של 4.5:1 לטקסט רגיל ו-3:1 לטקסט גדול</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-bold text-[#2C2C2C] mb-3 border-b border-[#8B6F47]/20 pb-2">4. מרכיבים שאינם נגישים במלואם</h2>
              <p className="mb-2">להלן מרכיבים הנמצאים בתהליך שיפור:</p>
              <ul className="list-disc list-inside space-y-2 text-sm">
                <li>חלק מהתמונות בגלריות הפרויקטים עשויות להכיל תיאורים כלליים בלבד</li>
                <li>ווידג'ט ביקורות גוגל (Elfsight) — רכיב צד שלישי שאינו בשליטתנו המלאה</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-bold text-[#2C2C2C] mb-3 border-b border-[#8B6F47]/20 pb-2">5. פניות בנושא נגישות</h2>
              <p className="mb-3">
                נתקלתם בבעיית נגישות? אנו מזמינים אתכם לפנות אלינו ונשתדל לטפל בפנייה תוך 5 ימי עבודה:
              </p>
              <div className="bg-[#FAF3EB] rounded-xl p-5 space-y-2 text-sm">
                <p><strong>רכז נגישות:</strong> ארז הנדי</p>
                <p><strong>טלפון:</strong> <a href="tel:0502808180" className="text-[#8B6F47] underline">050-2808180</a></p>
                <p><strong>דוא"ל:</strong> <a href="mailto:erezhindi@gmail.com" className="text-[#8B6F47] underline">erezhindi@gmail.com</a></p>
                <p><strong>כתובת:</strong> המלאכה 4, נתניה 4250539</p>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-bold text-[#2C2C2C] mb-3 border-b border-[#8B6F47]/20 pb-2">6. גורם אחראי ותאריך עדכון</h2>
              <p className="text-sm">
                הצהרה זו עודכנה בתאריך <strong>יוני 2025</strong> ומשקפת את מצב הנגישות של האתר במועד זה. העסק מתחייב לעדכן הצהרה זו אחת לשנה לכל הפחות, או בעת ביצוע שינויים מהותיים באתר.
              </p>
            </section>

          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
