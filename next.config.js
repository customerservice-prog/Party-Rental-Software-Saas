/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Temporary defense while upgrading the framework: serve original image URLs
  // and make /_next/image return 404 instead of decoding untrusted AVIF files.
  // Do not restore wildcard remotePatterns or optimization before the upgrade.
  images: { unoptimized: true },
};
module.exports = nextConfig;
