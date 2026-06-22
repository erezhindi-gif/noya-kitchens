import { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = "https://noya-kitchens.vercel.app";
  const categories = ["kitchens","bathrooms","kids","wall-units","entrance","buffet","kitchenette"];
  return [
    { url: base, lastModified: new Date(), changeFrequency: "weekly", priority: 1 },
    ...categories.map((c) => ({
      url: `${base}/projects/${c}`,
      lastModified: new Date(),
      changeFrequency: "monthly" as const,
      priority: 0.8,
    })),
  ];
}
