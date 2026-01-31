// next.config.mjs
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: false,
  images: {
    remotePatterns: [{ protocol: "https", hostname: "**" }],
  },
  // IMPORTANT: build for SSR, not static export
  output: "standalone",
  eslint: {
    // Warning: This allows production builds to successfully complete even if
    // your project has ESLint errors.
    ignoreDuringBuilds: true,
  },

  // Add permissions policy headers for microphone access

  // Add permissions policy headers for microphone access
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Permissions-Policy',
            value: 'camera=*, microphone=*, browsing-topics=()'
          }
        ],
      },
    ];
  },
};

export default nextConfig;

// Trigger rebuild to clear webpack cache

