import CategoryPage from "@/components/CategoryPage";
import { getProjectImages } from "@/lib/getProjectImages";

export const metadata = { title: "ארונות כניסה | NOYA Kitchens" };

export default async function Page() {
  const images = await getProjectImages("ארונות כניסה");
  return <CategoryPage title="ארונות כניסה" subtitle="הרושם הראשון מתחיל כאן" images={images} />;
}
