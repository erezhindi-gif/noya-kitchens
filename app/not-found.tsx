import Link from "next/link";

export default function NotFound() {
  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center text-center px-4"
      dir="rtl"
    >
      <h1 className="text-6xl font-bold text-gray-800 mb-4">404</h1>
      <p className="text-xl text-gray-600 mb-8">הדף שחיפשת לא נמצא</p>
      <Link
        href="/"
        className="bg-[#8B7355] text-white px-8 py-3 rounded hover:bg-[#7a6447] transition-colors"
      >
        חזרה לדף הבית
      </Link>
    </div>
  );
}
