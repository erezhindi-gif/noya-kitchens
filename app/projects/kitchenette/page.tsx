import CategoryPage from "@/components/CategoryPage";
import Footer from "@/components/Footer";
import { getProjectImages } from "@/lib/getProjectImages";

export const metadata = { title: "מטבחונים | NOYA Kitchens" };

export default async function Page() {
  const images = await getProjectImages("מטבחונים");
  return <><CategoryPage title="מטבחונים" subtitle="מטבחונים קומפקטיים עם גימור יוקרתי" images={images} /><Footer /></>;
}
