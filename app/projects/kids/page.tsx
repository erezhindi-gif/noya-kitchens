import CategoryPage from "@/components/CategoryPage";
import Footer from "@/components/Footer";
import { getProjectImages } from "@/lib/getProjectImages";

export const metadata = { title: "חדרי ילדים | NOYA Kitchens", alternates: { canonical: "/projects/kids" } };

export default async function Page() {
  const images = await getProjectImages("חדרי ילדים");
  return <><CategoryPage title="חדרי ילדים" subtitle="עולם קסום מעוצב לילד שלכם" images={images} /><Footer /></>;
}
