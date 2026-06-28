import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Allow larger file uploads through server actions (local file storage).
    serverActions: {
      bodySizeLimit: "25mb",
    },
  },
};

export default nextConfig;
