'use client';

import { useRef } from 'react';
import Link from 'next/link';
import { useTranslations, useLocale } from 'next-intl';
import { motion, useInView } from 'framer-motion';
import { ArrowRight, Star } from 'lucide-react';
import ListingCard from '@/components/listings/ListingCard';
import type { Listing } from '@saudi-re/shared';

interface FeaturedSectionProps {
  listings: Listing[];
}

export default function FeaturedSection({ listings }: FeaturedSectionProps) {
  const t = useTranslations('listing');
  const tCommon = useTranslations('common');
  const locale = useLocale();
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-80px' });

  return (
    <section ref={ref} className="py-24 bg-surface-50 relative overflow-hidden">
      {/* Soft decorative background glow */}
      <div className="absolute top-0 right-0 w-1/3 h-1/3 bg-primary-500/5 rounded-full blur-[100px] pointer-events-none" />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-6"
        >
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Star className="w-4 h-4 text-primary-500 fill-primary-500" />
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-primary-600">
                {t('featured')}
              </span>
            </div>
            <h2
              className={`text-4xl lg:text-5xl font-bold text-charcoal leading-tight ${locale === 'ar' ? 'font-arabic' : 'font-serif'}`}
            >
              {t('eliteProperties')}
            </h2>
            <div className="mt-4 w-12 h-1 bg-primary-600 rounded-full" />
          </div>

          <Link
            href={`/${locale}/listings?featured=true`}
            className="hidden sm:flex items-center gap-2 text-sm font-bold text-primary-600 hover:text-primary-700 transition-colors group"
          >
            {tCommon('viewAll')}
            <ArrowRight className={`w-4 h-4 transition-transform ${locale === 'ar' ? 'rotate-180 group-hover:-translate-x-2' : 'group-hover:translate-x-2'}`} />
          </Link>
        </motion.div>

        {/* Listings Grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8 lg:gap-10">
          {listings.map((listing, i) => (
            <ListingCard key={listing.id} listing={listing} index={i} />
          ))}
        </div>

        {/* Mobile View All */}
        <div className="mt-12 text-center sm:hidden">
          <Link
            href={`/${locale}/listings`}
            className="inline-flex items-center gap-3 px-8 py-4 rounded-xl bg-primary-600 text-white font-bold text-sm shadow-lg hover:bg-primary-700 transition-all active:scale-[0.98]"
          >
            {tCommon('viewAll')}
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}
