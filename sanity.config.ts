"use client";

import { defineConfig } from "sanity";
import { structureTool } from "sanity/structure";
import { presentationTool } from "sanity/presentation";
import { visionTool } from "@sanity/vision";
import { media } from "sanity-plugin-media";
import { schemaTypes } from "./sanity/schemas";

export default defineConfig({
  basePath: "/studio",
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID!,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET || "production",
  title: "נויה מטבחים — ניהול תוכן",
  schema: {
    types: schemaTypes,
  },
  plugins: [
    structureTool(),
    presentationTool({
      name: "preview",
      title: "תצוגה מקדימה",
      previewUrl: {
        origin: "https://noya-kitchens.vercel.app",
        previewMode: {
          enable: "/api/draft-mode/enable",
        },
      },
    }),
    visionTool(),
    media(),
  ],
});
