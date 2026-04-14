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

  // ── Headers for security ──
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'origin-when-cross-origin' },
        ],
      },
    ];
  },
  // ── Ignore ESLint during builds ──
  eslint: {
    ignoreDuringBuilds: true,
  },
  // ── Ignore TypeScript errors during builds ──
  typescript: {
    ignoreBuildErrors: true,
  },
};

module.exports = withNextIntl(nextConfig);
