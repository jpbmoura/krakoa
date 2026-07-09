/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [{ protocol: "https", hostname: "*.annihil.us" }, { protocol: "http", hostname: "*.annihil.us" }],
  },
};
export default nextConfig;
