import { MetadataRoute } from "next";
import { CITIES } from "@/lib/seo/cities";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = "https://www.noya-k.co.il";
  const categories = ["kitchens","bathrooms","kids","wall-units","entrance","buffet","kitchenette"];
  return [
    { url: base, lastModified: new Date(), changeFrequency: "weekly", priority: 1 },
    ...categories.map((c) => ({
      url: `${base}/projects/${c}`,
      lastModified: new Date(),
      changeFrequency: "monthly" as const,
      priority: 0.8,
    })),
    { url: `${base}/kitchen-price`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.8 },
    ...CITIES.map((c) => ({
      url: `${base}/kitchens/${c.slug}`,
      lastModified: new Date(),
      changeFrequency: "monthly" as const,
      priority: 0.7,
    })),
  ];
}
