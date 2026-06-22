import CategoryPage from "@/components/CategoryPage";
import { getProjectImages } from "@/lib/getProjectImages";

export const metadata = { title: "ארונות אמבטיה | NOYA Kitchens" };

export default async function Page() {
  const images = await getProjectImages("ארונות אמבטיה");
  return <CategoryPage title="ארונות אמבטיה" subtitle="פתרונות אחסון אלגנטיים לחדר האמבטיה" images={images} />;
}
