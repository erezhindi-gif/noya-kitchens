import type { Metadata, Viewport } from "next";

// Installable on the iPhone home screen ("Add to Home Screen"): opens full-screen like an app.
export const metadata: Metadata = {
  title: "NOYA הצעות מחיר",
  robots: { index: false, follow: false },
  manifest: "/noya-quotes.webmanifest",
  appleWebApp: { capable: true, title: "NOYA הצעות", statusBarStyle: "default" },
  icons: { apple: "/icons/noya-quotes-180.png", icon: "/icons/noya-quotes-192.png" },
};

export const viewport: Viewport = {
  themeColor: "#ffffff",
  viewportFit: "cover",
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return children;
}
