import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        cream: "#F5F0E8",
        "dark-wood": "#2C1810",
        "warm-brown": "#8B5E3C",
        gold: "#C9A96E",
        "light-gold": "#E8D5B0",
        charcoal: "#1A1A1A",
      },
      fontFamily: {
        sans: ["var(--font-assistant)", "sans-serif"],
        serif: ["var(--font-playfair)", "serif"],
      },
    },
  },
  plugins: [],
};
export default config;
