const path = require('path');

/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@saudi-re/shared', '@saudi-re/web'],
  reactStrictMode: true,
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'res.cloudinary.com', pathname: '/**' },
      { protocol: 'https', hostname: '**' },
    ],
  },
  webpack: (config) => {
    config.resolve.alias['@'] = [
      path.resolve(__dirname, 'src'),
      path.resolve(__dirname, '../web/src'),
    ];
    return config;
  },
};

module.exports = nextConfig;
