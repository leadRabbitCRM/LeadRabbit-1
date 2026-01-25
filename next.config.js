/** @type {import('next').NextConfig} */
const withPWA = require("next-pwa")({
  dest: "public", // where service worker is generated
  register: true, // auto register service worker
  skipWaiting: true, // activate new SW immediately
  disable: process.env.NODE_ENV === "development", // disable in dev
  runtimeCaching: [
    {
      urlPattern: /^https?.*/,
      handler: "NetworkFirst",
      options: {
        cacheName: "offlineCache",
        expiration: {
          maxEntries: 200,
        },
      },
    },
  ],
});

const nextConfig = {
  reactStrictMode: true,
  eslint: {
    // ✅ Ignore ESLint errors during `next build`
    ignoreDuringBuilds: true,
  },
  // Enable experimental instrumentation for immediate server startup hooks
  experimental: {
    instrumentationHook: true,
  },
  // Performance optimizations
  compress: true,
  poweredByHeader: false,
  // Security headers
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "Referrer-Policy",
            value: "origin-when-cross-origin",
          },
        ],
      },
    ];
  },
};

module.exports = withPWA(nextConfig);
