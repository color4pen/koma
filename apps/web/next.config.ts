import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ['@koma/crm', '@koma/shared'],
  webpack: (config) => {
    config.resolve = {
      ...config.resolve,
      extensionAlias: {
        '.js': ['.ts', '.tsx', '.js'],
        '.jsx': ['.tsx', '.jsx'],
      },
    };
    return config;
  },
};

export default nextConfig;
