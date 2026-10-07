/** @type {import('next').NextConfig} */
const nextConfig = {
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
