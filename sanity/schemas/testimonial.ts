import { defineField, defineType } from "sanity";

export const testimonialSchema = defineType({
  name: "testimonial",
  title: "המלצה",
  type: "document",
  fields: [
    defineField({
      name: "name",
      title: "שם הלקוח",
      type: "string",
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "text",
      title: "טקסט ההמלצה",
      type: "text",
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "rating",
      title: "דירוג (1-5)",
      type: "number",
      validation: (Rule) => Rule.min(1).max(5),
      initialValue: 5,
    }),
    defineField({
      name: "location",
      title: "עיר / איזור",
      type: "string",
    }),
  ],
});
