/** @type {import('next').NextConfig} */
const nextConfig = {
  // Configures Next.js to treat Genkit and tracing libs as external during build
  serverExternalPackages: ['genkit', 'require-in-the-middle'],
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'i.ibb.co' },
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: 'firebasestorage.googleapis.com' },
      { protocol: 'https', hostname: 'picsum.photos' },
    ],
  },
};

export default nextConfig;
