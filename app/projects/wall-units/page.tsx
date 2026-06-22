import CategoryPage from "@/components/CategoryPage";

const images = Array.from({length: 12}, (_, i) => `/images/wall-units/wall-${i+1}.jpg`);

export const metadata = { title: "ארונות קיר | NOYA Kitchens" };
export default function Page() {
  return <CategoryPage title="ארונות קיר" subtitle="ניצול מקסימלי של כל סנטימטר" images={images} />;
}
