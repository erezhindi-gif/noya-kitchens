import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/admin", "/q/", "/studio", "/oauth", "/api/"] },
    sitemap: "https://www.noya-k.co.il/sitemap.xml",
  };
}
