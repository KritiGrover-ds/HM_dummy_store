import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // ioredis must stay a server-only Node.js dependency (never bundled for the edge/browser)
  serverExternalPackages: ["ioredis"],
  reactStrictMode: true,
};

export default nextConfig;
