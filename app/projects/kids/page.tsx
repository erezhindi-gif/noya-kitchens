import CategoryPage from "@/components/CategoryPage";

const images = Array.from({length: 13}, (_, i) => `/images/kids/kids-${i+1}.jpg`);

// export const metadata = { title: "חדרי ילדים | NOYA Kitchens" };
export default function Page() {
  return <CategoryPage title="חדרי ילדים" subtitle="עולם קסום מעוצב לילד שלכם" images={images} />;
}
