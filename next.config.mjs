// next.config.mjs
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [{ protocol: "https", hostname: "**" }],
  },
  // IMPORTANT: build for SSR, not static export
  output: "standalone",
};

export default nextConfig;
