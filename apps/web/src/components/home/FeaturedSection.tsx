'use client';

import { useRef } from 'react';
import Link from 'next/link';
import { useTranslations, useLocale } from 'next-intl';
import { motion, useInView } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
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
  const isRTL = locale === 'ar';

  return (
    <section ref={ref} className="py-20 sm:py-28 bg-surface-50 relative overflow-hidden">
      {/* Subtle dot texture overlay */}
      <div
        className="absolute inset-0 opacity-[0.022] pointer-events-none"
        style={{ backgroundImage: 'radial-gradient(circle, #0b666a 1px, transparent 1px)', backgroundSize: '24px 24px' }}
      />
      {/* Soft top glow */}
      <div className="absolute top-0 right-0 w-80 h-80 bg-primary-500/5 rounded-full blur-[120px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="flex flex-col sm:flex-row sm:items-end justify-between mb-10 sm:mb-12 gap-4"
        >
          <div className={`border-l-4 border-primary-600 pl-4 ${isRTL ? 'border-l-0 border-r-4 pl-0 pr-4' : ''}`}>
            <div className="text-[10px] font-black uppercase tracking-[0.2em] text-primary-600 mb-2">
              {t('featured')}
            </div>
            <h2 className={`text-3xl sm:text-4xl lg:text-5xl font-bold text-charcoal leading-tight ${isRTL ? 'font-arabic' : 'font-serif'}`}>
              {t('eliteProperties')}
            </h2>
          </div>

          <Link
            href={`/${locale}/listings?featured=true`}
            className="hidden sm:inline-flex items-center gap-2 text-sm font-bold text-primary-600 hover:text-primary-700 transition-colors group flex-shrink-0"
          >
            {tCommon('viewAll')}
            <ArrowRight className={`w-4 h-4 transition-transform ${isRTL ? 'rotate-180 group-hover:-translate-x-2' : 'group-hover:translate-x-2'}`} />
          </Link>
        </motion.div>

        {/* Listings Grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 lg:gap-6">
          {listings.map((listing, i) => (
            <ListingCard key={listing.id} listing={listing} index={i} />
          ))}
        </div>

        {/* Mobile View All */}
        <div className="mt-10 text-center sm:hidden">
          <Link
            href={`/${locale}/listings`}
            className="inline-flex items-center gap-3 px-8 py-3.5 rounded-xl bg-primary-600 text-white font-bold text-sm shadow-lg hover:bg-primary-700 transition-all active:scale-[0.98]"
          >
            {tCommon('viewAll')}
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}
