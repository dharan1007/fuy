// next.config.mjs
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [{ protocol: "https", hostname: "**" }],
  },
  // IMPORTANT: build for SSR, not static export
  output: "standalone",

  // Fix for @xenova/transformers and other native modules
  experimental: {
    serverComponentsExternalPackages: ['sharp', 'onnxruntime-node', '@xenova/transformers'],
  },

  webpack: (config) => {
    // Ignore node-specific modules when bundling for the browser
    config.resolve.alias = {
      ...config.resolve.alias,
      "sharp$": false,
      "onnxruntime-node$": false,
    };
    return config;
  },

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
