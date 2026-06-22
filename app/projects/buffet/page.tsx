import CategoryPage from "@/components/CategoryPage";

const images = Array.from({length: 10}, (_, i) => `/images/buffet/buffet-${i+1}.jpg`);

// export const metadata = { title: "מזנונים ושולחן סלון | NOYA Kitchens" };
export default function Page() {
  return <CategoryPage title="מזנונים ושולחן סלון" subtitle="אלגנטיות ופרקטיות לסלון שלכם" images={images} />;
}
