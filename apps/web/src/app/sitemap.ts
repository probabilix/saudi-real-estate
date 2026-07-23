import { MetadataRoute } from 'next';
import { getApiBaseUrl } from '../lib/api';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.NEXT_PUBLIC_WEB_URL || 'https://tamleeq.sa';
  const apiBase = getApiBaseUrl();
  const locales = ['en', 'ar'];

  const staticRoutes = [
    '',
    '/listings',
    '/projects',
    '/news',
    '/about',
    '/contact',
    '/buy-in-saudi',
    '/map',
    '/drive-time',
    '/faqs',
    '/compare',
    '/legal/privacy',
    '/legal/terms',
  ];

  // 1. Generate localized static pages
  const staticPages = locales.flatMap((locale) =>
    staticRoutes.map((route) => {
      const path = route ? `${locale}${route}` : locale;
      return {
        url: `${base}/${path}`,
        lastModified: new Date(),
        changeFrequency: 'weekly' as const,
        priority: route === '' ? 1.0 : 0.8,
        alternates: {
          languages: {
            en: `${base}/${route ? `en${route}` : 'en'}`,
            ar: `${base}/${route ? `ar${route}` : 'ar'}`,
          },
        },
      };
    })
  );

  // 2. Fetch and add news articles dynamic pages
  let newsPages: MetadataRoute.Sitemap = [];
  try {
    const res = await fetch(`${apiBase}/news`, { next: { revalidate: 3600 } });
    if (res.ok) {
      const json = await res.json();
      const posts = json?.data || [];
      newsPages = locales.flatMap((locale) =>
        posts.map((post: any) => ({
          url: `${base}/${locale}/news/${post.slug}`,
          lastModified: new Date(post.updatedAt || post.publishedAt),
          changeFrequency: 'monthly' as const,
          priority: 0.7,
          alternates: {
            languages: {
              en: `${base}/en/news/${post.slug}`,
              ar: `${base}/ar/news/${post.slug}`,
            },
          },
        }))
      );
    }
  } catch (err) {
    console.error('Failed to fetch news for sitemap:', err);
  }

  // 3. Fetch and add properties dynamic pages
  let listingPages: MetadataRoute.Sitemap = [];
  try {
    const res = await fetch(`${apiBase}/listings?limit=100`, { next: { revalidate: 3600 } });
    if (res.ok) {
      const json = await res.json();
      const listings = json?.data?.items || json?.items || [];
      listingPages = locales.flatMap((locale) =>
        listings.map((item: any) => ({
          url: `${base}/${locale}/listings/${item.id}`,
          lastModified: new Date(item.updatedAt || item.createdAt),
          changeFrequency: 'weekly' as const,
          priority: 0.7,
          alternates: {
            languages: {
              en: `${base}/en/listings/${item.id}`,
              ar: `${base}/ar/listings/${item.id}`,
            },
          },
        }))
      );
    }
  } catch (err) {
    console.error('Failed to fetch listings for sitemap:', err);
  }

  // 4. Fetch and add projects dynamic pages
  let projectPages: MetadataRoute.Sitemap = [];
  try {
    const res = await fetch(`${apiBase}/system/projects?limit=100`, { next: { revalidate: 3600 } });
    if (res.ok) {
      const json = await res.json();
      const projects = json?.data?.items || json?.items || [];
      projectPages = locales.flatMap((locale) =>
        projects.map((project: any) => ({
          url: `${base}/${locale}/projects/${project.id}`,
          lastModified: new Date(project.updatedAt || project.createdAt),
          changeFrequency: 'weekly' as const,
          priority: 0.7,
          alternates: {
            languages: {
              en: `${base}/en/projects/${project.id}`,
              ar: `${base}/ar/projects/${project.id}`,
            },
          },
        }))
      );
    }
  } catch (err) {
    console.error('Failed to fetch projects for sitemap:', err);
  }

  return [...staticPages, ...newsPages, ...listingPages, ...projectPages];
}
