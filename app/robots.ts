import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/admin", "/q/", "/studio"] },
    sitemap: "https://www.noya-k.co.il/sitemap.xml",
  };
}
