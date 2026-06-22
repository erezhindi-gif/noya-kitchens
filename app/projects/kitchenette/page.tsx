import CategoryPage from "@/components/CategoryPage";

const images = Array.from({length: 3}, (_, i) => `/images/kitchenette/kitchenette-${i+1}.jpg`);

export const metadata = { title: "מטבחונים | NOYA Kitchens" };
export default function Page() {
  return <CategoryPage title="מטבחונים" subtitle="מטבחונים קומפקטיים עם גימור יוקרתי" images={images} />;
}
