import { defineField, defineType } from "sanity";

export const projectSchema = defineType({
  name: "project",
  title: "פרויקט",
  type: "document",
  fields: [
    defineField({
      name: "title",
      title: "כותרת",
      type: "string",
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "category",
      title: "קטגוריה",
      type: "string",
      options: {
        list: [
          { title: "מטבחים", value: "מטבחים" },
          { title: "מטבחונים", value: "מטבחונים" },
          { title: "חדרי ילדים", value: "חדרי ילדים" },
          { title: "ארונות אמבטיה", value: "ארונות אמבטיה" },
          { title: "ארונות קיר", value: "ארונות קיר" },
          { title: "ארונות כניסה", value: "ארונות כניסה" },
          { title: "מזנונים ושולחנות סלון", value: "מזנונים ושולחנות סלון" },
          { title: "שונות", value: "שונות" },
        ],
      },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "images",
      title: "תמונות",
      type: "array",
      of: [
        {
          type: "image",
          options: { hotspot: true },
          fields: [
            {
              name: "alt",
              title: "תיאור תמונה",
              type: "string",
            },
          ],
        },
      ],
    }),
    defineField({
      name: "description",
      title: "תיאור",
      type: "text",
    }),
    defineField({
      name: "featured",
      title: "מוצג בדף הבית",
      type: "boolean",
      initialValue: false,
    }),
    defineField({
      name: "order",
      title: "סדר תצוגה",
      type: "number",
    }),
  ],
  preview: {
    select: {
      title: "title",
      category: "category",
      media: "images.0",
    },
    prepare({ title, category, media }) {
      return {
        title,
        subtitle: category,
        media,
      };
    },
  },
});
