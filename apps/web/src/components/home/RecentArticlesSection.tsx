'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useLocale } from 'next-intl';
import { motion } from 'framer-motion';
import { ArrowRight, BookOpen, Calendar, Clock } from 'lucide-react';

interface Article {
  id: string;
  titleEn: string;
  titleAr: string;
  slug: string;
  excerptEn: string | null;
  excerptAr: string | null;
  featuredImage: string | null;
  publishedAt: string | null;
  createdAt: string;
}

const fallbackArticles: Article[] = [
  {
    id: '1',
    titleEn: 'The Future of Ultra-Luxury Real Estate in Riyadh: Vision 2030 Impact',
    titleAr: 'مستقبل العقارات الفاخرة في الرياض: تأثير رؤية 2030',
    excerptEn: 'Explore how government initiatives, luxury mega-projects, and international investment regulations are shifting the luxury housing landscape.',
    excerptAr: 'اكتشف كيف تغير المشاريع الكبرى والأنظمة الاستثمارية الدولية مشهد الإسكان الفاخر في العاصمة الرياض.',
    featuredImage: 'https://images.unsplash.com/photo-1582407947304-fd86f028f716?w=900&q=85',
    slug: 'future-ultra-luxury-real-estate-riyadh-vision-2030',
    publishedAt: '2026-05-24T12:00:00.000Z',
    createdAt: '2026-05-24T12:00:00.000Z',
  },
  {
    id: '2',
    titleEn: 'Jeddah Waterfront Properties: A High-Return Investment Guide',
    titleAr: 'عقارات واجهة جدة البحرية: دليل الاستثمار عالي العوائد',
    excerptEn: 'Analysing supply and demand for luxury waterfront villas in Jeddah\'s premier districts.',
    excerptAr: 'تحليل العرض والطلب على الفلل الفاخرة في أرقى أحياء جدة الساحلية.',
    featuredImage: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=900&q=85',
    slug: 'jeddah-waterfront-properties-high-return-investment-guide',
    publishedAt: '2026-05-20T09:30:00.000Z',
    createdAt: '2026-05-20T09:30:00.000Z',
  },
  {
    id: '3',
    titleEn: 'Saudi Premium Residency: Real Estate Ownership Rights for Foreigners',
    titleAr: 'فهم حقوق تملك العقار لحاملي الإقامة المميزة في السعودية',
    excerptEn: 'A legal guide for international buyers looking to own freehold property under the newly revised premium residency paths.',
    excerptAr: 'دليل قانوني للمشترين الدوليين الراغبين في تملك العقارات الحرة في المملكة.',
    featuredImage: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=900&q=85',
    slug: 'understanding-saudi-premium-residency-real-estate-ownership',
    publishedAt: '2026-05-15T14:15:00.000Z',
    createdAt: '2026-05-15T14:15:00.000Z',
  },
];

function readingTime(text: string | null | undefined) {
  if (!text) return '3';
  const words = text.split(/\s+/).length;
  return Math.max(1, Math.round(words / 200)).toString();
}

interface RecentArticlesProps {
  articles?: Article[];
}

export default function RecentArticlesSection({ articles = [] }: RecentArticlesProps) {
  const locale = useLocale();
  const [mounted, setMounted] = useState(false);
  const isRTL = locale === 'ar';

  useEffect(() => { setMounted(true); }, []);

  const displayArticles = articles.length > 0 ? articles : fallbackArticles;
  const [featured, ...rest] = displayArticles;

  function formatDate(dateVal: any) {
    if (!dateVal || !mounted) return '';
    try {
      const date = typeof dateVal === 'string' ? new Date(dateVal) : dateVal;
      if (isNaN(date.getTime())) return '';
      return date.toLocaleDateString(locale === 'ar' ? 'ar-SA' : 'en-US', {
        year: 'numeric', month: 'short', day: 'numeric',
      });
    } catch { return ''; }
  }

  const featuredTitle = isRTL ? featured.titleAr : featured.titleEn;
  const featuredExcerpt = isRTL ? featured.excerptAr : featured.excerptEn;
  const featuredImage = featured.featuredImage || fallbackArticles[0].featuredImage;

  return (
    <section className="py-20 sm:py-28 bg-[#f0f7f7] relative overflow-hidden">
      {/* Subtle teal tint background */}
      <div className="absolute inset-0 opacity-30 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse at 80% 0%, rgba(13,115,119,0.06) 0%, transparent 60%)' }} />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section header */}
        <div className={`flex flex-col sm:flex-row sm:items-end justify-between mb-12 gap-4`}>
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary-50 border border-primary-100 text-primary-700 text-[11px] font-black uppercase tracking-[0.2em]">
              <BookOpen className="w-3.5 h-3.5" />
              {isRTL ? 'مقالات وتحليلات' : 'INSIGHTS & ARTICLES'}
            </div>
            <h2 className={`text-3xl sm:text-4xl font-bold text-charcoal leading-tight ${isRTL ? 'font-arabic' : 'font-serif'}`}>
              {isRTL ? 'أحدث التحليلات العقارية' : 'Latest Real Estate Insights'}
            </h2>
          </div>
          <Link
            href={`/${locale}/news`}
            className="inline-flex items-center gap-2 text-primary-600 hover:text-primary-700 font-bold text-sm transition-colors group flex-shrink-0"
          >
            {isRTL ? 'عرض الكل' : 'View All Articles'}
            <ArrowRight className={`w-4 h-4 transition-transform group-hover:translate-x-1 ${isRTL ? 'rotate-180 group-hover:-translate-x-1' : ''}`} />
          </Link>
        </div>

        {/* Magazine layout: 1 large + 2 stacked */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

          {/* Featured (large) article */}
          {featured && (
            <motion.article
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ duration: 0.7 }}
              className="lg:col-span-3 group"
            >
              <Link href={`/${locale}/news/${featured.slug}`} className="block h-full">
                <div className="relative aspect-[4/3] sm:aspect-[16/9] lg:aspect-[4/3] rounded-2xl sm:rounded-3xl overflow-hidden bg-gray-100 mb-5">
                  <Image
                    src={featuredImage as string}
                    alt={featuredTitle}
                    fill
                    className="object-cover transition-transform duration-700 group-hover:scale-105"
                    sizes="(max-width: 1024px) 100vw, 60vw"
                    unoptimized
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-charcoal/70 via-charcoal/10 to-transparent" />
                  {/* Featured badge */}
                  <div className="absolute top-4 left-4 px-3 py-1 rounded-full bg-gold/90 backdrop-blur text-[10px] font-black text-white uppercase tracking-widest">
                    {isRTL ? 'مقال مميز' : 'Featured'}
                  </div>
                </div>

                <div className="flex items-center gap-4 text-[11px] font-bold text-charcoal-muted uppercase tracking-wider mb-3">
                  <span className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5" />
                    {formatDate(featured.publishedAt || featured.createdAt)}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" />
                    {readingTime(featuredExcerpt)} {isRTL ? 'د قراءة' : 'min read'}
                  </span>
                </div>

                <h3 className={`text-xl sm:text-2xl font-bold text-charcoal group-hover:text-primary-600 transition-colors leading-snug mb-3 ${isRTL ? 'font-arabic' : 'font-serif'}`}>
                  {featuredTitle}
                </h3>
                <p className={`text-sm text-charcoal-muted leading-relaxed line-clamp-3 ${isRTL ? 'font-arabic' : ''}`}>
                  {featuredExcerpt}
                </p>

                <div className="mt-4 inline-flex items-center gap-2 text-primary-600 font-bold text-xs sm:text-sm uppercase tracking-wider group/btn">
                  {isRTL ? 'اقرأ المقال' : 'Read Article'}
                  <ArrowRight className={`w-3.5 h-3.5 transition-transform group-hover/btn:translate-x-1 ${isRTL ? 'rotate-180 group-hover/btn:-translate-x-1' : ''}`} />
                </div>
              </Link>
            </motion.article>
          )}

          {/* Three stacked secondary articles */}
          <div className="lg:col-span-2 flex flex-col gap-5">
            {rest.slice(0, 3).map((article, i) => {
              const title = isRTL ? article.titleAr : article.titleEn;
              const excerpt = isRTL ? article.excerptAr : article.excerptEn;
              const image = article.featuredImage || fallbackArticles[(i + 1) % fallbackArticles.length]?.featuredImage;

              return (
                <motion.article
                  key={article.id}
                  initial={{ opacity: 0, y: 25 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '-40px' }}
                  transition={{ duration: 0.6, delay: i * 0.1 }}
                  className="group flex gap-4 bg-white rounded-2xl p-4 border border-gray-100 hover:border-primary-100 hover:shadow-lg transition-all duration-300"
                >
                  <Link href={`/${locale}/news/${article.slug}`} className="flex gap-4 w-full">
                    {image && (
                      <div className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-xl overflow-hidden bg-gray-100 flex-shrink-0">
                        <Image
                          src={image}
                          alt={title}
                          fill
                          className="object-cover transition-transform duration-500 group-hover:scale-110"
                          sizes="112px"
                          unoptimized
                        />
                      </div>
                    )}
                    <div className="flex flex-col justify-between min-w-0 flex-1">
                      <div>
                        <div className="flex items-center gap-2 text-[10px] font-bold text-charcoal-muted uppercase tracking-wider mb-2">
                          <Calendar className="w-3 h-3 flex-shrink-0" />
                          {formatDate(article.publishedAt || article.createdAt)}
                          <span className="w-px h-3 bg-gray-200" />
                          <Clock className="w-3 h-3 flex-shrink-0" />
                          {readingTime(excerpt)}m
                        </div>
                        <h3 className={`text-sm sm:text-base font-bold text-charcoal group-hover:text-primary-600 transition-colors line-clamp-2 leading-snug ${isRTL ? 'font-arabic' : 'font-serif'}`}>
                          {title}
                        </h3>
                      </div>
                      <div className="mt-2 text-primary-600 font-bold text-[11px] uppercase tracking-wider inline-flex items-center gap-1">
                        {isRTL ? 'اقرأ' : 'Read'}
                        <ArrowRight className={`w-3 h-3 ${isRTL ? 'rotate-180' : ''}`} />
                      </div>
                    </div>
                  </Link>
                </motion.article>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
