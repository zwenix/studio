
/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'picsum.photos' },
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: 'i.ibb.co' },
      { protocol: 'https', hostname: 'images.pexels.com' },
      { protocol: 'https', hostname: 'pixabay.com' },
      { protocol: 'https', hostname: 'firebasestorage.googleapis.com' },
    ],
  },
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals.push('genkit', '@genkit-ai/google-genai', '@genkit-ai/ai', 'genkitx-groq', 'require-in-the-middle');
    }
    return config;
  },
};

export default nextConfig;
