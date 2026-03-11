/** @type {import('next').NextConfig} */
const nextConfig = {
  // Genkit and OpenTelemetry require certain packages to be handled as external in the server environment
  serverExternalPackages: [
    'genkit',
    '@genkit-ai/core',
    '@genkit-ai/dotprompt',
    '@genkit-ai/flow',
    '@genkit-ai/google-genai',
    'require-in-the-middle',
  ],
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'i.ibb.co' },
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: 'picsum.photos' },
    ],
  },
};

export default nextConfig;
