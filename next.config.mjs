/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'i.ibb.co' },
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: 'firebasestorage.googleapis.com' },
      { protocol: 'https', hostname: 'picsum.photos' },
      { protocol: 'https', hostname: 'images.pexels.com' },
    ],
  },
  experimental: {
    serverExternalPackages: ['genkit', '@genkit-ai/google-genai', 'require-in-the-middle', 'wav'],
  },
};

export default nextConfig;
