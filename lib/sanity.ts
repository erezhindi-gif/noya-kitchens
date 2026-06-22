import { createClient } from "next-sanity";
import imageUrlBuilder from "@sanity/image-url";
import { SanityImageSource } from "@sanity/image-url/lib/types/types";

export const client = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID!,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET || "production",
  apiVersion: "2024-01-01",
  useCdn: true,
});

const builder = imageUrlBuilder(client);

export function urlFor(source: SanityImageSource) {
  return builder.image(source);
}

export async function getProjects(category?: string) {
  const filter = category
    ? `*[_type == "project" && category == $category]`
    : `*[_type == "project"]`;
  return client.fetch(filter, { category }, { next: { revalidate: 60 } });
}

export async function getFeaturedProjects() {
  return client.fetch(
    `*[_type == "project" && featured == true] | order(order asc)[0...6]`,
    {},
    { next: { revalidate: 60 } }
  );
}

export async function getTestimonials() {
  return client.fetch(
    `*[_type == "testimonial"] | order(_createdAt desc)`,
    {},
    { next: { revalidate: 60 } }
  );
}

export async function getSiteSettings() {
  return client.fetch(
    `*[_type == "siteSettings"][0]`,
    {},
    { next: { revalidate: 60 } }
  );
}
