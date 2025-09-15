import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  experimental: {
    runtime: 'edge',
  },
};

export default nextConfig;
