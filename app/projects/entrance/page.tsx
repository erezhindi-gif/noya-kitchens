import CategoryPage from "@/components/CategoryPage";

const images = Array.from({length: 8}, (_, i) => `/images/entrance/entrance-${i+1}.jpg`);

// export const metadata = { title: "ארונות כניסה | NOYA Kitchens" };
export default function Page() {
  return <CategoryPage title="ארונות כניסה" subtitle="הרושם הראשון מתחיל כאן" images={images} />;
}
