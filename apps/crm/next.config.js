/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@saudi-re/shared'],
  reactStrictMode: true,
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'res.cloudinary.com', pathname: '/**' },
      { protocol: 'https', hostname: '**' },
    ],
  },
};

module.exports = nextConfig;
