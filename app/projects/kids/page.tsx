import CategoryPage from "@/components/CategoryPage";
import { getProjectImages } from "@/lib/getProjectImages";

export const metadata = { title: "חדרי ילדים | NOYA Kitchens" };

export default async function Page() {
  const images = await getProjectImages("חדרי ילדים");
  return <CategoryPage title="חדרי ילדים" subtitle="עולם קסום מעוצב לילד שלכם" images={images} />;
}
