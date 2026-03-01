import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: [
    "localhost:3000",
    "localhost:3001",
    "127.0.0.1:3000",
    "127.0.0.1:3001",
    "*.app.github.dev",
    "*.githubpreview.dev",
    "*.vercel.app",
  ],
  experimental: {
    serverActions: {
      allowedOrigins: [
        "localhost:3000",
        "localhost:3001",
        "127.0.0.1:3000",
        "127.0.0.1:3001",
        "*.app.github.dev",
        "*.githubpreview.dev",
        "*.vercel.app",
      ],
    },
  },
};

export default nextConfig;
