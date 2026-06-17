/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: ["images.unsplash.com"],
  },
  eslint: {
    // Warning: This allows production builds to successfully complete even if
    // the project has ESLint errors.
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Ignore typescript errors during build to make sure run works out-of-the-box
    ignoreBuildErrors: true,
  }
};

module.exports = nextConfig;
