'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { Loader2, Search, X, Grid3X3, SlidersHorizontal, Map, Building, MapPin } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import ProjectCard from '@/components/listings/ProjectCard';
import CityDropdown from '@/components/search/CityDropdown';
import PropertyTypeDropdown from '@/components/search/PropertyTypeDropdown';
import PurposeDropdown from '@/components/search/PurposeDropdown';
import PriceDropdown from '@/components/search/PriceDropdown';
import CompletionStatusDropdown from '@/components/search/CompletionStatusDropdown';
import ExpectedDeliveryDropdown from '@/components/search/ExpectedDeliveryDropdown';
import { api } from '@/lib/api';
import clsx from 'clsx';

interface ProjectItem {
  id: string;
  nameEn: string;
  nameAr: string;
  city: string;
  district: string | null;
  completionStatus: 'READY' | 'OFF_PLAN' | 'UNDER_CONSTRUCTION' | null;
  expectedDelivery: string | null;
  totalUnits: number | null;
  brochureUrl: string | null;
  regaFalLicense: string | null;
  photos: string[];
  createdAt: string;
  layoutCount: number;
  minPrice: number;
  minBedrooms?: number;
  maxBedrooms?: number;
  isFavorited?: boolean;
}

function ProjectsContent() {
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations('search');
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [isLoading, setIsLoading] = useState(true);
  const [showMobileFilterBar, setShowMobileFilterBar] = useState(false);
  const [results, setResults] = useState<{ items: ProjectItem[]; total: number }>({ items: [], total: 0 });
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '');

  // Read filters from URL
  const city = searchParams.get('city') || '';
  const q = searchParams.get('q') || '';
  const page = searchParams.get('page') ? Number(searchParams.get('page')) : 1;
  const completionStatus = searchParams.get('completionStatus') || '';
  const type = searchParams.get('type') || '';
  const purpose = searchParams.get('purpose') || '';
  const minPrice = searchParams.get('minPrice') || '';
  const maxPrice = searchParams.get('maxPrice') || '';
  const expectedDelivery = searchParams.get('expectedDelivery') || '';

  useEffect(() => {
    async function fetchProjects() {
      setIsLoading(true);
      try {
        const queryParams = new URLSearchParams();
        if (city) queryParams.set('city', city);
        if (q) queryParams.set('q', q);
        if (completionStatus) queryParams.set('completionStatus', completionStatus);
        if (type) queryParams.set('type', type);
        if (purpose) queryParams.set('purpose', purpose);
        if (minPrice) queryParams.set('minPrice', minPrice);
        if (maxPrice) queryParams.set('maxPrice', maxPrice);
        if (expectedDelivery) queryParams.set('expectedDelivery', expectedDelivery);
        queryParams.set('lang', locale);
        queryParams.set('limit', '21');
        queryParams.set('page', String(page));

        const res = await api.getProjectsPublic(queryParams.toString());
        if (res.success && res.data) {
          setResults({
            items: res.data.items || [],
            total: res.data.total || res.data.items?.length || 0
          });
        }
      } catch (error) {
        console.error('Failed to fetch projects:', error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchProjects();
  }, [searchParams, locale, city, q, page, completionStatus, type, purpose, minPrice, maxPrice, expectedDelivery]);

  function updateFilter(keyOrUpdates: string | Record<string, string>, value?: string) {
    const params = new URLSearchParams(searchParams.toString());
    
    if (typeof keyOrUpdates === 'string') {
      if (value) {
        params.set(keyOrUpdates, value);
      } else {
        params.delete(keyOrUpdates);
      }
      if (keyOrUpdates !== 'page') {
        params.delete('page');
      }
    } else {
      Object.entries(keyOrUpdates).forEach(([k, v]) => {
        if (v) {
          params.set(k, v);
        } else {
          params.delete(k);
        }
        if (k !== 'page') {
          params.delete('page');
        }
      });
    }
    
    router.replace(`${pathname}?${params.toString()}`);
  }

  function clearFilters() {
    setSearchQuery('');
    router.push(pathname);
  }

  const hasActiveFilters = city || q || completionStatus || type || purpose || minPrice || maxPrice || expectedDelivery;

  return (
    <div className="min-h-screen bg-white">
      {/* Page Header */}
      <div className="bg-surface-50 border-b border-surface-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 lg:py-14">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-8">
            <div>
              <span className="inline-block text-[10px] font-black uppercase tracking-[0.2em] text-primary-600 mb-2">
                {locale === 'ar' ? 'مجموعات النخبة السكنية' : 'Exclusive Communities'}
              </span>
              <h1 className={`text-4xl lg:text-5xl font-bold text-charcoal ${locale === 'ar' ? 'font-arabic' : 'font-serif'}`}>
                {locale === 'ar' ? 'المشاريع العقارية' : 'Project Developments'}
              </h1>
            </div>
            
            <div className="flex flex-wrap items-center gap-3 self-start md:self-auto">
              <Link
                href={`/${locale}/map`}
                className="inline-flex items-center gap-2.5 px-6 py-3.5 rounded-xl bg-primary-600 text-white hover:bg-primary-700 font-bold text-sm shadow-md transition-all hover:-translate-y-0.5 active:translate-y-0"
              >
                <Map className="w-4 h-4 text-emerald-400" />
                <span>{locale === 'ar' ? 'عرض الخريطة' : 'Map View'}</span>
              </Link>
              <Link
                href={`/${locale}/listings`}
                className="inline-flex items-center gap-2.5 px-6 py-3.5 rounded-xl bg-charcoal text-white hover:bg-primary-600 font-bold text-sm shadow-md transition-all hover:-translate-y-0.5 active:translate-y-0"
              >
                <Grid3X3 className="w-4 h-4" />
                {t('switchToListings')}
              </Link>
            </div>
          </div>

          {/* Mobile Search and Filters Button Row */}
          <div className="flex items-center gap-3 md:hidden">
            <div className="relative flex-1 group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400 group-focus-within:text-primary-600 transition-colors" />
              <input
                type="text"
                placeholder={t('searchPlaceholder') || 'Search area, project or district...'}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && updateFilter('q', searchQuery)}
                className="w-full pl-11 pr-4 py-3 rounded-xl border border-surface-200 bg-white text-sm font-medium focus:border-primary-600 outline-none transition-all shadow-sm"
              />
            </div>
            <button
              onClick={() => setShowMobileFilterBar(!showMobileFilterBar)}
              className={`flex items-center justify-center p-3.5 rounded-xl border text-sm font-bold transition-all shadow-sm ${showMobileFilterBar || hasActiveFilters
                ? 'border-primary-600 text-primary-700 bg-primary-50'
                : 'border-surface-200 text-charcoal hover:border-primary-500 bg-white'
              }`}
            >
              <SlidersHorizontal className="w-5 h-5" />
            </button>
          </div>

          {/* Collapsible Mobile Filters */}
          <AnimatePresence>
            {showMobileFilterBar && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="md:hidden mt-4 bg-white border border-surface-200 rounded-2xl p-4 space-y-4 shadow-md overflow-hidden"
              >
                <div className="space-y-3">
                  <h4 className="text-xs font-black uppercase tracking-wider text-charcoal-muted">
                    {locale === 'ar' ? 'خيارات التصفية' : 'Search Filters'}
                  </h4>
                  {/* City */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-widest text-charcoal-muted px-1">{locale === 'ar' ? 'المدينة' : 'City'}</label>
                    <CityDropdown city={city} onChange={(val) => updateFilter('city', val)} />
                  </div>
                  {/* Property Type */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-widest text-charcoal-muted px-1">{locale === 'ar' ? 'نوع العقار' : 'Property Type'}</label>
                    <PropertyTypeDropdown type={type} onChange={(val) => updateFilter('type', val)} />
                  </div>
                  {/* Purpose */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-widest text-charcoal-muted px-1">{locale === 'ar' ? 'الغرض' : 'Purpose'}</label>
                    <PurposeDropdown purpose={purpose} onChange={(val) => updateFilter('purpose', val)} className="w-full" />
                  </div>
                  {/* Price Range */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-widest text-charcoal-muted px-1">{locale === 'ar' ? 'نطاق السعر' : 'Price Range'}</label>
                     <PriceDropdown
                       minPrice={minPrice ? Number(minPrice) : undefined}
                       maxPrice={maxPrice ? Number(maxPrice) : undefined}
                       onChange={(min, max) => {
                         updateFilter({
                           minPrice: min ? String(min) : '',
                           maxPrice: max ? String(max) : ''
                         });
                       }}
                     />
                  </div>
                  {/* Completion Status */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-widest text-charcoal-muted px-1">{locale === 'ar' ? 'حالة المشروع' : 'Completion Status'}</label>
                    <CompletionStatusDropdown status={completionStatus} onChange={(val) => updateFilter('completionStatus', val)} className="w-full" />
                  </div>
                  {/* Expected Delivery */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-widest text-charcoal-muted px-1">{locale === 'ar' ? 'التسليم المتوقع' : 'Expected Delivery'}</label>
                    <ExpectedDeliveryDropdown delivery={expectedDelivery} onChange={(val) => updateFilter('expectedDelivery', val)} className="w-full" />
                  </div>
                  {/* Clear Filters */}
                  {hasActiveFilters && (
                    <button
                      onClick={clearFilters}
                      className="w-full flex items-center justify-center gap-2 px-4 py-3 border border-red-200 text-red-600 hover:bg-red-50 rounded-xl text-xs font-bold transition-all mt-2"
                    >
                      <X className="w-3.5 h-3.5" />
                      <span>{t('clearAll')}</span>
                    </button>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Desktop Filter Bar */}
          <div className="hidden md:flex flex-wrap items-center gap-4">
            {/* Text Search */}
            <div className="relative flex-1 min-w-[240px] max-w-md group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400 group-focus-within:text-primary-600 transition-colors" />
              <input
                type="text"
                placeholder={t('searchPlaceholder') || 'Search area, project or district...'}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && updateFilter('q', searchQuery)}
                className="w-full pl-11 pr-4 py-3 rounded-xl border border-surface-200 bg-white text-sm font-medium focus:border-primary-600 focus:ring-4 focus:ring-primary-600/5 outline-none transition-all shadow-sm"
              />
            </div>

            {/* City */}
            <CityDropdown city={city} onChange={(val) => updateFilter('city', val)} />

            {/* Type */}
            <PropertyTypeDropdown type={type} onChange={(val) => updateFilter('type', val)} />

            {/* Purpose */}
            <PurposeDropdown purpose={purpose} onChange={(val) => updateFilter('purpose', val)} />

            {/* Price Range */}
            <div className="z-20">
              <PriceDropdown
                minPrice={minPrice ? Number(minPrice) : undefined}
                maxPrice={maxPrice ? Number(maxPrice) : undefined}
                onChange={(min, max) => {
                  updateFilter({
                    minPrice: min ? String(min) : '',
                    maxPrice: max ? String(max) : ''
                  });
                }}
              />
            </div>

            {/* Completion Status */}
            <CompletionStatusDropdown status={completionStatus} onChange={(val) => updateFilter('completionStatus', val)} />

            {/* Expected Delivery */}
            <ExpectedDeliveryDropdown delivery={expectedDelivery} onChange={(val) => updateFilter('expectedDelivery', val)} />

            {/* Clear Filters */}
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="flex items-center gap-2 px-4 py-3 rounded-xl text-xs font-bold uppercase tracking-widest text-charcoal-muted hover:text-red-600 hover:bg-red-50 transition-all"
              >
                <X className="w-4 h-4" />
                {t('clearAll')}
              </button>
            )}

            {/* Spacer */}
            <div className="flex-1" />

            {/* Results count */}
            <span className="text-sm text-charcoal-muted hidden lg:block">
              {locale === 'ar' 
                ? `تم العثور على ${results.total} مشروع` 
                : `${results.total} project developments found`}
            </span>
          </div>
        </div>
      </div>

      {/* Results Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-40">
            <Loader2 className="w-12 h-12 text-primary-600 animate-spin mb-4" />
            <p className="text-charcoal-muted font-medium font-serif tracking-wide italic animate-pulse">
              {locale === 'ar' ? 'جاري تحميل المشاريع السكنية الفاخرة...' : 'Loading bespoke project compounds...'}
            </p>
          </div>
        ) : results.items.length === 0 ? (
          <div className="text-center py-32 border-2 border-dashed border-surface-100 rounded-3xl">
            <Search className="w-20 h-20 text-surface-200 mx-auto mb-6" />
            <h3 className="text-2xl font-bold text-charcoal mb-3 font-serif">
              {locale === 'ar' ? 'لم نجد مشاريع تطابق معاييرك' : 'No Projects Found'}
            </h3>
            <p className="text-charcoal-muted text-lg mb-10">
              {locale === 'ar' ? 'حاول تعديل خيارات البحث أو الفلاتر' : 'Adjust your search options to find projects.'}
            </p>
            <button
              onClick={clearFilters}
              className="px-10 py-4 rounded-xl bg-primary-600 text-white font-bold text-sm shadow-lg shadow-primary-600/20 hover:bg-primary-700 hover:shadow-xl transition-all active:scale-95"
            >
              {t('clearAll')}
            </button>
          </div>
        ) : (
          <>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8 lg:gap-10">
              {results.items.map((project, i) => (
                <ProjectCard
                  key={project.id}
                  project={project}
                  layoutCount={project.layoutCount}
                  minPrice={project.minPrice}
                  minBedrooms={project.minBedrooms}
                  maxBedrooms={project.maxBedrooms}
                  index={i}
                />
              ))}
            </div>

            {/* Pagination */}
            {Math.ceil(results.total / 21) > 1 && (
              <div className="mt-16 flex flex-wrap items-center justify-center gap-4">
                <button
                  disabled={page === 1}
                  onClick={() => updateFilter('page', String(page - 1))}
                  className="flex items-center gap-2 px-5 py-3 rounded-xl border border-surface-200 text-xs font-black uppercase tracking-widest text-charcoal hover:border-primary-500 hover:bg-surface-50 disabled:opacity-30 disabled:pointer-events-none transition-all shadow-sm"
                >
                  &lt; {locale === 'ar' ? 'السابق' : 'Previous'}
                </button>
                
                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-surface-50 rounded-2xl border border-surface-200 shadow-inner">
                  {Array.from({ length: Math.ceil(results.total / 21) }).map((_, idx) => {
                    const pNum = idx + 1;
                    return (
                      <button
                        key={pNum}
                        onClick={() => updateFilter('page', String(pNum))}
                        className={clsx(
                          "w-9 h-9 flex items-center justify-center text-xs font-black rounded-xl transition-all duration-300",
                          page === pNum
                            ? "bg-primary-600 text-white shadow-md transform scale-105"
                            : "text-surface-600 hover:text-surface-900 hover:bg-surface-200/50"
                        )}
                      >
                        {pNum}
                      </button>
                    );
                  })}
                </div>

                <button
                  disabled={page === Math.ceil(results.total / 21)}
                  onClick={() => updateFilter('page', String(page + 1))}
                  className="flex items-center gap-2 px-5 py-3 rounded-xl border border-surface-200 text-xs font-black uppercase tracking-widest text-charcoal hover:border-primary-500 hover:bg-surface-50 disabled:opacity-30 disabled:pointer-events-none transition-all shadow-sm"
                >
                  {locale === 'ar' ? 'التالي' : 'Next'} &gt;
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default function ProjectsClient() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-white flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-primary-600 animate-spin" />
      </div>
    }>
      <ProjectsContent />
    </Suspense>
  );
}
