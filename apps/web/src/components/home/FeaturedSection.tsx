'use client';

import { useState, useRef } from 'react';
import Link from 'next/link';
import { useTranslations, useLocale } from 'next-intl';
import { motion, useInView } from 'framer-motion';
import { ArrowRight, Star, Building2, Layers } from 'lucide-react';
import ListingCard from '@/components/listings/ListingCard';
import ProjectCard from '@/components/listings/ProjectCard';
import type { Listing } from '@saudi-re/shared';
import clsx from 'clsx';

interface FeaturedSectionProps {
  listings: Listing[];
  projects: any[];
}

export default function FeaturedSection({ listings, projects }: FeaturedSectionProps) {
  const t = useTranslations('listing');
  const tCommon = useTranslations('common');
  const locale = useLocale();
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-80px' });
  const isRTL = locale === 'ar';

  const [activeTab, setActiveTab] = useState<'projects' | 'listings'>('projects');

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

          {/* Premium Tab Switcher */}
          <div className="flex bg-surface-100 p-1.5 rounded-xl border border-surface-200/50 self-start sm:self-auto shadow-inner">
            <button
              onClick={() => setActiveTab('projects')}
              className={clsx(
                "flex items-center gap-2 px-5 py-2.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all duration-300",
                activeTab === 'projects'
                  ? "bg-white text-primary-700 shadow-md transform scale-105"
                  : "text-surface-500 hover:text-surface-800"
              )}
            >
              <Building2 className="w-3.5 h-3.5" />
              {locale === 'ar' ? 'المشاريع العقارية' : 'Projects'}
            </button>
            <button
              onClick={() => setActiveTab('listings')}
              className={clsx(
                "flex items-center gap-2 px-5 py-2.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all duration-300",
                activeTab === 'listings'
                  ? "bg-white text-primary-700 shadow-md transform scale-105"
                  : "text-surface-500 hover:text-surface-800"
              )}
            >
              <Layers className="w-3.5 h-3.5" />
              {locale === 'ar' ? 'الوحدات السكنية' : 'Listings'}
            </button>
          </div>

          <Link
            href={activeTab === 'projects' ? `/${locale}/projects` : `/${locale}/listings?featured=true`}
            className="hidden sm:inline-flex items-center gap-2 text-sm font-bold text-primary-600 hover:text-primary-700 transition-colors group flex-shrink-0"
          >
            {tCommon('viewAll')}
            <ArrowRight className={`w-4 h-4 transition-transform ${isRTL ? 'rotate-180 group-hover:-translate-x-2' : 'group-hover:translate-x-2'}`} />
          </Link>
        </motion.div>

        {/* Listings Grid */}
        <div className="min-h-[400px]">
          {activeTab === 'projects' ? (
            projects.length === 0 ? (
              <div className="text-center py-20 bg-white border border-surface-200 rounded-3xl p-8 shadow-sm">
                <Building2 className="w-12 h-12 text-surface-300 mx-auto mb-4" />
                <p className="text-sm font-medium text-surface-500">
                  {locale === 'ar' ? 'لا توجد مشاريع مميزة حالياً' : 'No featured projects available right now.'}
                </p>
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8 lg:gap-10">
                {projects.map((project, i) => (
                  <ProjectCard
                    key={project.id}
                    project={project}
                    layoutCount={project.layoutCount ?? 0}
                    minPrice={project.minPrice ?? 0}
                    minBedrooms={project.minBedrooms}
                    maxBedrooms={project.maxBedrooms}
                    index={i}
                  />
                ))}
              </div>
            )
          ) : (
            listings.length === 0 ? (
              <div className="text-center py-20 bg-white border border-surface-200 rounded-3xl p-8 shadow-sm">
                <Layers className="w-12 h-12 text-surface-300 mx-auto mb-4" />
                <p className="text-sm font-medium text-surface-500">
                  {locale === 'ar' ? 'لا توجد وحدات مميزة حالياً' : 'No featured listings available right now.'}
                </p>
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 lg:gap-6">
                {listings.map((listing, i) => (
                  <ListingCard key={listing.id} listing={listing} index={i} />
                ))}
              </div>
            )
          )}
        </div>

        {/* Mobile View All */}
        <div className="mt-10 text-center sm:hidden">
          <Link
            href={activeTab === 'projects' ? `/${locale}/projects` : `/${locale}/listings`}
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
