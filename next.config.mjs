/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverExternalPackages: ['genkit', 'require-in-the-middle'],
  },
  // Suppress hydration warnings from browser extensions
  compiler: {
    styledComponents: true,
  },
};

export default nextConfig;
