import CategoryPage from "@/components/CategoryPage";
import Footer from "@/components/Footer";
import { getProjectImages } from "@/lib/getProjectImages";

export const metadata = { title: "מזנונים ושולחן סלון | NOYA Kitchens" };

export default async function Page() {
  const images = await getProjectImages("מזנונים ושולחנות סלון");
  return <><CategoryPage title="מזנונים ושולחן סלון" subtitle="אלגנטיות ופרקטיות לסלון שלכם" images={images} /><Footer /></>;
}
