import { client, urlFor } from "./sanity";

export async function getProjectImages(categoryName: string): Promise<string[]> {
  const project = await client.fetch(
    `*[_type == "project" && category == $category][0]{ images }`,
    { category: categoryName },
    { next: { revalidate: 60 } }
  );

  if (project?.images?.length) {
    return project.images
      .filter((img: { asset?: { _ref?: string } }) => img?.asset?._ref)
      .map((img: { asset: { _ref: string } }) => {
        try {
          return urlFor(img).width(1200).quality(85).url();
        } catch {
          return null;
        }
      })
      .filter(Boolean) as string[];
  }
  return [];
}
