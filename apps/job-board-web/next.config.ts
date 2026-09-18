import path from 'path';
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Without this, Next walks up to the monorepo root (it finds pnpm-lock.yaml
  // there) and Turbopack watches all ten backend services and their
  // node_modules alongside this app. This app has no workspace dependencies,
  // so the app folder is the whole of its world.
  turbopack: {
    root: path.join(__dirname),
  },
  reactStrictMode: false,
  allowedDevOrigins: ['images.unsplash.com'],
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
      {
        protocol: 'http',
        hostname: '**',
      },
    ],
  },
};

export default nextConfig;
