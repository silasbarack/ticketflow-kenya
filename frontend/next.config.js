/** @type {import('next').NextConfig} */
const nextConfig = {
  // Allows CI and local visual QA to build alongside a running dev server
  // without both processes competing for the same .next directory.
  distDir: process.env.NEXT_DIST_DIR || '.next',
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'placehold.co' },
      { protocol: 'https', hostname: '**' },
    ],
  },
};

module.exports = nextConfig;
