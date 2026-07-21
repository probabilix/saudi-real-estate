import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import NewsArticleClient from './NewsArticleClient';
import { api, NewsPost } from '@/lib/api';

export const dynamic = 'force-dynamic';

interface Props {
  params: {
    locale: string;
    slug: string;
  };
}

// Fetch Article Helper
async function getArticleData(slug: string): Promise<{ post: NewsPost | null; relatedPosts: NewsPost[] }> {
  try {
    const res = await api.getNewsBySlug(slug);
    if (res.success && res.data) {
      const post = res.data;

      // Fetch related posts
      let relatedPosts: NewsPost[] = [];
      const newsRes = await api.getNews();
      if (newsRes.success && newsRes.data) {
        relatedPosts = newsRes.data
          .filter((p: NewsPost) => p.slug !== slug)
          .slice(0, 3);
      }

      return { post, relatedPosts };
    }
  } catch (err) {
    console.error('Error fetching article data on server:', err);
  }
  return { post: null, relatedPosts: [] };
}

// Dynamic SEO Metadata Generation
export async function generateMetadata({ params: { locale, slug } }: Props): Promise<Metadata> {
  const { post } = await getArticleData(slug);
  if (!post) {
    return {
      title: 'Article Not Found',
    };
  }

  const isRTL = locale === 'ar';
  const title = isRTL ? post.titleAr : post.titleEn;
  const description = isRTL ? post.excerptAr : post.excerptEn;
  const imageUrl = post.featuredImage || 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?q=80&w=1200';
  const pageUrl = `${process.env.NEXT_PUBLIC_WEB_URL || 'https://saudi-re.com'}/${locale}/news/${slug}`;

  return {
    title,
    description,
    alternates: {
      canonical: pageUrl,
    },
    openGraph: {
      title,
      description,
      url: pageUrl,
      siteName: 'Tamleeq',
      images: [
        {
          url: imageUrl,
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
      locale: locale === 'ar' ? 'ar_SA' : 'en_US',
      type: 'article',
      publishedTime: post.publishedAt,
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [imageUrl],
    },
  };
}

// Server Page Component
export default async function NewsArticlePage({ params: { locale, slug } }: Props) {
  const { post, relatedPosts } = await getArticleData(slug);

  if (!post) {
    notFound();
  }

  const isRTL = locale === 'ar';
  const title = isRTL ? post.titleAr : post.titleEn;
  const description = isRTL ? post.excerptAr : post.excerptEn;
  const imageUrl = post.featuredImage || 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?q=80&w=1200';
  const pageUrl = `${process.env.NEXT_PUBLIC_WEB_URL || 'https://saudi-re.com'}/${locale}/news/${slug}`;

  // Structured Data (JSON-LD) for Schema.org NewsArticle
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'NewsArticle',
    'headline': title,
    'description': description || title,
    'image': [imageUrl],
    'datePublished': post.publishedAt || post.updatedAt,
    'dateModified': post.updatedAt || post.publishedAt,
    'author': {
      '@type': 'Organization',
      'name': isRTL ? 'فريق تمليك' : 'Tamleeq Team',
      'url': `${process.env.NEXT_PUBLIC_WEB_URL || 'https://saudi-re.com'}/${locale}`,
    },
    'publisher': {
      '@type': 'Organization',
      'name': 'Tamleeq',
      'logo': {
        '@type': 'ImageObject',
        'url': `${process.env.NEXT_PUBLIC_WEB_URL || 'https://saudi-re.com'}/logo.png`,
      },
    },
    'mainEntityOfPage': {
      '@type': 'WebPage',
      '@id': pageUrl,
    },
  };

  return (
    <>
      {/* Inject JSON-LD Schema.org Metadata */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <NewsArticleClient
        post={post}
        relatedPosts={relatedPosts}
        locale={locale}
        initialIsSaved={false}
      />
    </>
  );
}
