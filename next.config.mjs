/** @type {import('next').NextConfig} */
const nextConfig = {
  async redirects() {
    return [
      { source: '/projects', destination: '/', permanent: true },
      { source: '/projects/:path*', destination: '/', permanent: true },
      { source: '/kitchenette', destination: '/', permanent: true },
      { source: '/accessibility', destination: '/', permanent: true },
      { source: '/about', destination: '/', permanent: true },
      { source: '/contact', destination: '/', permanent: true },
      { source: '/gallery', destination: '/', permanent: true },
      { source: '/services', destination: '/', permanent: true },
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
