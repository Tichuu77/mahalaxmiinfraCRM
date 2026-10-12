/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  experimental: {
    serverComponentsExternalPackages: ['mongoose', 'bullmq', 'ioredis', 'bcryptjs', 'jsonwebtoken', 'jspdf']
  }
};

export default nextConfig;
