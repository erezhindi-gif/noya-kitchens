import CategoryPage from "@/components/CategoryPage";

const images = Array.from({length: 20}, (_, i) => `/images/kitchens/kitchen-${i+1}.jpg`);

// export const metadata = { title: "מטבחים | NOYA Kitchens" };
export default function Page() {
  return <CategoryPage title="מטבחים" subtitle="עיצוב ויצור מטבח חלומות — כל מטבח לפי מידה ורצון הלקוח" images={images} />;
}
