/** @type {import('next').NextConfig} */
const nextConfig = {
  // Server-only packages (PDF printing, Gmail send and read); keep them out of the bundle.
  experimental: { serverComponentsExternalPackages: ["@sparticuz/chromium", "puppeteer-core", "imapflow", "mailparser", "nodemailer"] },
  async redirects() {
    return [
      { source: '/contact', destination: '/', permanent: false },
      { source: '/about', destination: '/', permanent: false },
      { source: '/gallery', destination: '/projects', permanent: false },
      { source: '/services', destination: '/', permanent: false },
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
