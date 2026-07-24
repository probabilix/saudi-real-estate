import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const base = process.env.NEXT_PUBLIC_WEB_URL 
    || (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : '')
    || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : '')
    || process.env.FRONTEND_URL 
    || 'https://tamleeq.sa';
  return {
    rules: [
      {
        userAgent: '*',
        allow: [
          '/',
          '/en/',
          '/ar/',
          '/en/listings',
          '/ar/listings',
          '/en/projects',
          '/ar/projects',
          '/en/news',
          '/ar/news',
          '/en/about',
          '/ar/about',
          '/en/contact',
          '/ar/contact',
          '/en/buy-in-saudi',
          '/ar/buy-in-saudi',
          '/en/faqs',
          '/ar/faqs',
          '/en/map',
          '/ar/map',
          '/en/drive-time',
          '/ar/drive-time',
          '/en/compare',
          '/ar/compare',
          '/en/legal',
          '/ar/legal',
        ],
        disallow: [
          '/en/dashboard',
          '/ar/dashboard',
          '/en/auth',
          '/ar/auth',
          '/en/favorites',
          '/ar/favorites',
          '/en/post-property',
          '/ar/post-property',
          '/en/edit-property',
          '/ar/edit-property',
          '/en/unsubscribe',
          '/ar/unsubscribe',
        ],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}
