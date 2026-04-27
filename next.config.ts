import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "storage.googleapis.com",
        pathname: "/yaschools/**",
      },
    ],
  },
  // Reduce build memory pressure from 1,800+ static pages
  experimental: {
    workerThreads: false,
    cpus: 1,
  },
};

export default nextConfig;
