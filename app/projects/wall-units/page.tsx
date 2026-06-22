import CategoryPage from "@/components/CategoryPage";
import { getProjectImages } from "@/lib/getProjectImages";

export const metadata = { title: "ארונות קיר | NOYA Kitchens" };

export default async function Page() {
  const images = await getProjectImages("ארונות קיר");
  return <CategoryPage title="ארונות קיר" subtitle="ניצול מקסימלי של כל סנטימטר" images={images} />;
}
