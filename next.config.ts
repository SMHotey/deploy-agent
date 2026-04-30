import type { NextConfig } from "next";
import createNextIntlPlugin from 'next-intl/plugin';
import createMDX from '@next/mdx';

const withNextIntl = createNextIntlPlugin('./i18n/request.tsx');
const withMDX = createMDX({
  options: {
    // MDX options
  },
});

const nextConfig: NextConfig = {
  // Allow specific host for HMR in development
  allowedDevOrigins: ["192.168.1.123", "192.168.1.123:3000"],
};

export default withNextIntl(withMDX(nextConfig));
