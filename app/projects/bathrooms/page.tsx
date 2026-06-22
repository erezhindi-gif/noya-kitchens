import CategoryPage from "@/components/CategoryPage";

const images = Array.from({length: 15}, (_, i) => `/images/bathrooms/bathroom-${i+1}.jpg`);

// export const metadata = { title: "ארונות אמבטיה | NOYA Kitchens" };
export default function Page() {
  return <CategoryPage title="ארונות אמבטיה" subtitle="פתרונות אחסון אלגנטיים לחדר האמבטיה" images={images} />;
}
