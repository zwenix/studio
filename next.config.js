/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // FIX: Allow next/image to load from Supabase storage and common CDNs.
  // Without this, Image components show a 400 error in production.
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.supabase.co',
      },
      {
        protocol: 'https',
        hostname: '**.supabase.in',
      },
      {
        protocol: 'https',
        hostname: 'i.ibb.co',
      },
      {
        protocol: 'https',
        hostname: 'images.pexels.com',
      },
    ],
  },

  // FIX: Suppress the 'punycode' deprecation warning from Node 22
  // that polluted logs and made build output hard to read.
  webpack(config) {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      punycode: false,
    };
    return config;
  },

  experimental: {
    // FIX: serverActions was always on in Next 14 — this removes the
    // "serverActions: true is deprecated" warning.
    // serverActions: true,   <-- removed
  },
};

module.exports = nextConfig;
