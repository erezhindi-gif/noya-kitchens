import { defineField, defineType } from "sanity";

export const siteSettingsSchema = defineType({
  name: "siteSettings",
  title: "הגדרות אתר",
  type: "document",
  fields: [
    defineField({
      name: "heroTitle",
      title: "כותרת הירו",
      type: "string",
      initialValue: "מטבחים ונגרות בהתאמה אישית",
    }),
    defineField({
      name: "heroSubtitle",
      title: "תת-כותרת הירו",
      type: "text",
      initialValue:
        "תכנון, ייצור והתקנה בליווי אישי של ארז הנדי — מעל 30 שנות ניסיון, רמת גימור גבוהה ופרזול BLUM כסטנדרט.",
    }),
    defineField({
      name: "heroImage",
      title: "תמונת הירו",
      type: "image",
      options: { hotspot: true },
    }),
    defineField({
      name: "aboutTitle",
      title: "כותרת אודות",
      type: "string",
      initialValue: "הכירו את ארז הנדי",
    }),
    defineField({
      name: "aboutText",
      title: "טקסט אודות",
      type: "array",
      of: [{ type: "block" }],
    }),
    defineField({
      name: "aboutImage",
      title: "תמונת אודות",
      type: "image",
      options: { hotspot: true },
    }),
    defineField({
      name: "phone",
      title: "טלפון",
      type: "string",
      initialValue: "050-2808180",
    }),
    defineField({
      name: "whatsapp",
      title: "WhatsApp (עם קידומת 972)",
      type: "string",
      initialValue: "972502808180",
    }),
    defineField({
      name: "email",
      title: "אימייל",
      type: "string",
      initialValue: "erezhindi@gmail.com",
    }),
    defineField({
      name: "address",
      title: "כתובת",
      type: "string",
      initialValue: "ניצני עוז",
    }),
    defineField({
      name: "facebookUrl",
      title: "קישור פייסבוק",
      type: "url",
    }),
  ],
});
