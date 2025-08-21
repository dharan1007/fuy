// next.config.mjs
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    // add your domains if you load remote avatars
    remotePatterns: [{ protocol: 'https', hostname: '**' }],
  },
  // no deprecated experimental keys
};

export default nextConfig;
