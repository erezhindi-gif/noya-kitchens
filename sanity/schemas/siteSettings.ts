import { defineField, defineType } from "sanity";

export const siteSettingsSchema = defineType({
  name: "siteSettings",
  title: "הגדרות אתר",
  type: "document",
  groups: [
    { name: "hero", title: "🖼️ גיבור (Hero)" },
    { name: "about", title: "👤 אודות" },
    { name: "benefits", title: "✅ יתרונות" },
    { name: "contact", title: "📞 יצירת קשר" },
    { name: "footer", title: "📋 כותרת תחתונה" },
  ],
  fields: [
    // HERO
    defineField({ name: "heroLabel", title: "שורה קטנה מעל כותרת (Hero)", type: "string", group: "hero", initialValue: "נגרות יוקרתית בהתאמה אישית" }),
    defineField({ name: "heroTitle", title: "כותרת ראשית (Hero)", type: "string", group: "hero", initialValue: "מטבחים שמספרים את הסיפור שלך" }),
    defineField({ name: "heroTitleHighlight", title: "חלק מודגש בכותרת (Hero) — בצבע זהב", type: "string", group: "hero", initialValue: "את הסיפור שלך" }),
    defineField({ name: "heroSubtitle", title: "תת-כותרת (Hero)", type: "text", rows: 3, group: "hero", initialValue: "ארז הנדי — נגר מקצועי עם למעלה מ־30 שנות ניסיון.\nכל פרויקט מתוכנן, מיוצר ומותקן על ידי ארז עצמו." }),
    defineField({ name: "heroCta1", title: "כפתור 1 בגיבור", type: "string", group: "hero", initialValue: "קבל הצעת מחיר חינם" }),
    defineField({ name: "heroCta2", title: "כפתור 2 בגיבור", type: "string", group: "hero", initialValue: "קרא עוד עלי" }),

    // ABOUT
    defineField({ name: "aboutLabel", title: "תווית מעל כותרת אודות", type: "string", group: "about", initialValue: "הסיפור שלי" }),
    defineField({ name: "aboutTitle", title: "כותרת אודות", type: "string", group: "about", initialValue: "ארז הנדי — נגר שאוהב את המלאכה" }),
    defineField({ name: "aboutText", title: "טקסט אודות", type: "text", rows: 5, group: "about", initialValue: "מעל 30 שנה אני בונה מטבחים, ארונות וריהוט בהתאמה אישית. כל פרויקט מתחיל בשיחה אישית, עובר דרך תכנון מדויק, ייצור בסדנה שלי ומסתיים בהתקנה ללא דאגה. הכל על ידי — ללא קבלני משנה." }),
    defineField({ name: "aboutImage", title: "תמונת אודות", type: "image", options: { hotspot: true }, group: "about" }),

    // BENEFITS
    defineField({ name: "benefitsTitle", title: "כותרת קטע יתרונות", type: "string", group: "benefits", initialValue: "למה לבחור ב-NOYA?" }),
    defineField({ name: "benefit1Title", title: "יתרון 1 — כותרת", type: "string", group: "benefits", initialValue: "30+ שנות ניסיון" }),
    defineField({ name: "benefit1Text", title: "יתרון 1 — טקסט", type: "string", group: "benefits", initialValue: "ניסיון עשיר בכל סוגי פרויקטי הנגרות" }),
    defineField({ name: "benefit2Title", title: "יתרון 2 — כותרת", type: "string", group: "benefits", initialValue: "פרזול Blum מקורי" }),
    defineField({ name: "benefit2Text", title: "יתרון 2 — טקסט", type: "string", group: "benefits", initialValue: "רק פרזול אוסטרי מקורי — מהאיכותיים בעולם" }),
    defineField({ name: "benefit3Title", title: "יתרון 3 — כותרת", type: "string", group: "benefits", initialValue: "עבודה ידנית מלאה" }),
    defineField({ name: "benefit3Text", title: "יתרון 3 — טקסט", type: "string", group: "benefits", initialValue: "שליטה מלקיחת מידות ועד ההתקנה הסופית" }),
    defineField({ name: "benefit4Title", title: "יתרון 4 — כותרת", type: "string", group: "benefits", initialValue: "ארז עצמו אצלך" }),
    defineField({ name: "benefit4Text", title: "יתרון 4 — טקסט", type: "string", group: "benefits", initialValue: "ללא קבלני משנה — שירות אישי וישיר ממני" }),

    // CONTACT
    defineField({ name: "contactTitle", title: "כותרת צור קשר", type: "string", group: "contact", initialValue: "בואו נדבר על הפרויקט שלכם" }),
    defineField({ name: "contactSubtitle", title: "תת-כותרת צור קשר", type: "string", group: "contact", initialValue: "זמינים לכם בטלפון, בוואטסאפ ובאימייל" }),
    defineField({ name: "phone", title: "טלפון", type: "string", group: "contact", initialValue: "050-2808180" }),
    defineField({ name: "whatsapp", title: "WhatsApp (עם קידומת 972)", type: "string", group: "contact", initialValue: "972502808180" }),
    defineField({ name: "email", title: "אימייל", type: "string", group: "contact", initialValue: "erezhindi@gmail.com" }),
    defineField({ name: "address", title: "כתובת", type: "string", group: "contact", initialValue: "המלאכה 4, נתניה" }),
    defineField({ name: "facebookUrl", title: "קישור פייסבוק", type: "url", group: "contact" }),

    // FOOTER
    defineField({ name: "footerTagline", title: "סלוגן בכותרת תחתונה", type: "string", group: "footer", initialValue: "נגרות יוקרתית בהתאמה אישית — מעל 30 שנות ניסיון" }),
    defineField({ name: "footerCopyright", title: "טקסט זכויות יוצרים", type: "string", group: "footer", initialValue: "© 2025 NOYA מטבחים — ארז הנדי. כל הזכויות שמורות." }),
  ],
});
