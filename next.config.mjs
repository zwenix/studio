/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  typescript: {
    // !! WARN !!
    // Dangerously allow production builds to successfully complete even if
    // your project has type errors.
    // !! WARN !!
    ignoreBuildErrors: true,
  },
  experimental: {
    serverComponentsExternalPackages: ['genkit', '@genkit-ai/google-genai', '@google-cloud/text-to-speech'],
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'images.pexels.com' },
      { protocol: 'https', hostname: 'pixabay.com' },
      { protocol: 'https', hostname: 'cdn.pixabay.com' },
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: 'i.ibb.co' },
      { protocol: 'https', hostname: 'firebasestorage.googleapis.com' },
    ],
  },
  webpack: (config, { isServer }) => {
    // Reduce memory consumption during webpack compilation.
    // Disabling parallel processing prevents the build worker from
    // spawning multiple threads that together exceed the heap limit.
    config.parallelism = 1;

    // Prevent webpack from bundling Node.js-native packages that
    // are already declared as external (Genkit, Google Cloud TTS).
    // Bundling these causes the massive heap spike that triggers OOM.
    if (isServer) {
      config.externals = [
        ...(Array.isArray(config.externals) ? config.externals : []),
        'genkit',
        '@genkit-ai/google-genai',
        '@genkit-ai/googleai',
        '@genkit-ai/ai',
        '@google-cloud/text-to-speech',
      ];
    }
    return config;
  },
};

export default nextConfig;
