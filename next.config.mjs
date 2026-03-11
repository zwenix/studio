/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: [
    'genkit',
    '@genkit-ai/google-genai',
    '@genkit-ai/core',
    'require-in-the-middle',
  ],
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
