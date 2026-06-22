"use client";

import { defineConfig } from "sanity";
import { structureTool } from "sanity/structure";
import { visionTool } from "@sanity/vision";
import { schemaTypes } from "./sanity/schemas";

const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID!;
const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET!;

export default defineConfig({
  basePath: "/studio",
  projectId,
  dataset,
  title: "נויה מטבחים — ניהול תוכן",
  schema: {
    types: schemaTypes,
  },
  plugins: [
    structureTool({
      structure: (S) =>
        S.list()
          .title("תוכן האתר")
          .items([
            S.listItem()
              .title("⚙️ הגדרות אתר")
              .id("siteSettings")
              .child(
                S.document()
                  .schemaType("siteSettings")
                  .documentId("siteSettings")
              ),
            S.listItem()
              .title("🖼️ פרויקטים וקטגוריות")
              .id("projects")
              .child(S.documentTypeList("project").title("פרויקטים")),
            S.listItem()
              .title("⭐ המלצות")
              .id("testimonials")
              .child(S.documentTypeList("testimonial").title("המלצות")),
          ]),
    }),
    visionTool(),
  ],
});
