import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Ensure the correct workspace root is used for Turbopack/webpack resolution
    // This fixes module resolution for path aliases like "@/..." in monorepos
    // where multiple lockfiles exist.
    turbopack: {
      // Use this Next.js app directory as the root
      root: __dirname,
    } as any,
  },
};

export default nextConfig;
