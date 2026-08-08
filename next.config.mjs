import withSerwistInit from "@serwist/next";

const withSerwist = withSerwistInit({
  swSrc: "src/app/sw.ts",
  swDest: "public/sw.js",
  // Only register/build the service worker in production builds.
  disable: process.env.NODE_ENV === "development",
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Produce a self-contained server bundle for a slim Docker runtime.
  output: "standalone",
  reactStrictMode: true,
  eslint: {
    // Linting is run as a separate CI step; don't fail production builds on it.
    ignoreDuringBuilds: true,
  },
  experimental: {
    // Allow Server Actions / route handlers to accept larger bodies (image uploads).
    serverActions: {
      bodySizeLimit: "8mb",
    },
  },
};

export default withSerwist(nextConfig);
