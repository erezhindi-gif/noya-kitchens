/** @type {import('next').NextConfig} */
const nextConfig = {
  // The version this build came from; the admin app compares it with the site to reload after an update.
  env: { NEXT_PUBLIC_BUILD: process.env.VERCEL_GIT_COMMIT_SHA || "dev" },
  // Server-only packages (PDF printing, Gmail send and read); keep them out of the bundle.
  experimental: { serverComponentsExternalPackages: ["@sparticuz/chromium", "puppeteer-core", "imapflow", "mailparser", "nodemailer"] },
  async redirects() {
    // Addresses from the old site that Google still crawls: send each, permanently, to the page that replaced it.
    return [
      { source: '/contact', destination: '/', permanent: true },
      { source: '/about', destination: '/', permanent: true },
      { source: '/gallery', destination: '/projects', permanent: true },
      { source: '/services', destination: '/', permanent: true },
      { source: '/index.html', destination: '/', permanent: true },
      { source: '/newpage', destination: '/', permanent: true },
      { source: '/movie', destination: '/', permanent: true },
      { source: '/Kitchens', destination: '/projects/kitchens', permanent: true },
      { source: '/Kitchenette', destination: '/projects/kitchenette', permanent: true },
      { source: '/Entrance_cabinets', destination: '/projects/entrance', permanent: true },
      { source: '/Wall_cases', destination: '/projects/wall-units', permanent: true },
      { source: '/Bathroom_cabinet', destination: '/projects/bathrooms', permanent: true },
      { source: '/Buffet', destination: '/projects/buffet', permanent: true },
      { source: '/Miscellaneous', destination: '/projects', permanent: true },
    ];
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "cdn.sanity.io",
      },
      {
        protocol: "https",
        hostname: "lirp.cdn-website.com",
      },
    ],
  },
};

export default nextConfig;
