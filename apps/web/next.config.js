const createNextIntlPlugin = require('next-intl/plugin');
const withNextIntl = createNextIntlPlugin('./src/i18n.ts');

/** @type {import('next').NextConfig} */
const nextConfig = {
  // ── Internationalization via next-intl ──
  // Locale routing is handled by middleware + next-intl

  // ── Image optimization ──
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
        pathname: '/**',
      },
      {
        // Allow any domain during dev (will be tightened in production)
        protocol: 'https',
        hostname: '**',
      },
    ],
    formats: ['image/avif', 'image/webp'],
  },

  // ── Transpile shared monorepo package ──
  transpilePackages: ['@saudi-re/shared'],

  // ── Strict mode ──
  reactStrictMode: true,

  // Ignore build linting/ts issues for rapid iterations
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },

  // ── Custom Webpack Options ──
  webpack: (config, { dev }) => {
    if (dev) {
      config.cache = false; // Disable pack file cache allocation OOM crashes in dev monorepo environments
    }
    return config;
  },

  // ── Headers for security ──
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: "frame-ancestors 'self' https://portfolio.adonixdigital.com http://localhost:3000 http://localhost:3001",
          },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'origin-when-cross-origin' },
        ],
      },
    ];
  },
};

module.exports = withNextIntl(nextConfig);
