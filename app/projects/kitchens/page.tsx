import CategoryPage from "@/components/CategoryPage";
import Footer from "@/components/Footer";
import { getProjectImages } from "@/lib/getProjectImages";

export const metadata = { title: "מטבחים | NOYA Kitchens" };

export default async function Page() {
  const images = await getProjectImages("מטבחים");
  return <><CategoryPage title="מטבחים" subtitle="עיצוב וייצור מטבח חלומות — כל מטבח לפי מידה ורצון הלקוח" images={images} /><Footer /></>;
}
