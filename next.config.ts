import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow specific host for HMR in development
  allowedDevOrigins: ["192.168.1.123", "192.168.1.123:3000"],
};

export default nextConfig;
