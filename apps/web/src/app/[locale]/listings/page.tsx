'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { motion, AnimatePresence } from 'framer-motion';
import { SlidersHorizontal, Map, Grid3X3, X, Loader2, Search } from 'lucide-react';
import ListingCard from '@/components/listings/ListingCard';
import ChatWidget from '@/components/chat/ChatWidget';
import PriceDropdown from '@/components/search/PriceDropdown';
import PropertyTypeDropdown from '@/components/search/PropertyTypeDropdown';
import CityDropdown from '@/components/search/CityDropdown';
import PurposeDropdown from '@/components/search/PurposeDropdown';
import BedsDropdown from '@/components/search/BedsDropdown';
import { Listing } from '@saudi-re/shared';
import { api } from '@/lib/api';

function ListingsContent() {
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations('search');
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [showFilters, setShowFilters] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'map'>('grid');
  const [isLoading, setIsLoading] = useState(true);
  const [results, setResults] = useState<{ items: Listing[]; total: number }>({ items: [], total: 0 });

  // Read filters from URL
  const city = searchParams.get('city') || '';
  const type = searchParams.get('type') || '';
  const purpose = searchParams.get('purpose') || '';
  const minPrice = searchParams.get('minPrice') ? Number(searchParams.get('minPrice')) : undefined;
  const maxPrice = searchParams.get('maxPrice') ? Number(searchParams.get('maxPrice')) : undefined;
  const bedrooms = searchParams.get('bedrooms') ? Number(searchParams.get('bedrooms')) : undefined;

  useEffect(() => {
    async function fetchListings() {
      setIsLoading(true);
      try {
        const queryParams = new URLSearchParams();
        if (city) queryParams.set('city', city);
        if (type) queryParams.set('type', type);
        if (purpose) queryParams.set('purpose', purpose);
        if (minPrice) queryParams.set('minPrice', String(minPrice));
        if (maxPrice) queryParams.set('maxPrice', String(maxPrice));
        if (bedrooms) queryParams.set('bedrooms', String(bedrooms));
        queryParams.set('lang', locale);
        queryParams.set('limit', '40');

        const res = await api.getListings(queryParams.toString());
        if (res.success && res.data) {
          setResults({
            items: res.data.items || [],
            total: res.data.total || res.data.items?.length || 0
          });
        }
      } catch (error) {
        console.error('Failed to fetch listings:', error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchListings();
  }, [searchParams, locale, city, type, purpose, minPrice, maxPrice, bedrooms]);

  function updateFilter(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    router.replace(`${pathname}?${params.toString()}`);
  }

  function clearFilters() {
    router.push(pathname);
  }

  const hasActiveFilters = city || type || purpose || minPrice || maxPrice || bedrooms;

  return (
    <div className="min-h-screen bg-white">
      {/* Page Header */}
      <div className="bg-surface-50 border-b border-surface-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 lg:py-14">
          <div className="mb-8">
            <span className="inline-block text-[10px] font-black uppercase tracking-[0.2em] text-primary-600 mb-2">
              {t('browseInventory')}
            </span>
            <h1 className={`text-4xl lg:text-5xl font-bold text-charcoal ${locale === 'ar' ? 'font-arabic' : 'font-serif'}`}>
              {t('title')}
            </h1>
          </div>

          {/* Filter Bar */}
          <div className="flex flex-wrap items-center gap-4">
            {/* City */}
              <CityDropdown city={city} onChange={(val) => updateFilter('city', val)} />

            {/* Type */}
            <PropertyTypeDropdown type={type} onChange={(val) => updateFilter('type', val)} />

            {/* Purpose */}
              <PurposeDropdown purpose={purpose} onChange={(val) => updateFilter('purpose', val)} />

            {/* Price Range */}
            <div className="z-20">
              <PriceDropdown
                minPrice={minPrice}
                maxPrice={maxPrice}
                onChange={(min, max) => {
                  updateFilter('minPrice', min ? String(min) : '');
                  updateFilter('maxPrice', max ? String(max) : '');
                }}
              />
            </div>

            {/* More Filters Toggle */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-2 px-5 py-3 rounded-xl border text-sm font-bold transition-all shadow-sm ${showFilters || hasActiveFilters
                ? 'border-primary-600 text-primary-700 bg-primary-50'
                : 'border-surface-200 text-charcoal hover:border-primary-500 hover:bg-surface-50 hover:text-primary-600'
                }`}
            >
              <SlidersHorizontal className="w-4 h-4" />
              {t('sortBy')}
            </button>

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
              {t('showingResults', { count: results.total })}
            </span>

            {/* View toggle */}
            <div className="flex gap-1 p-1.5 rounded-xl bg-white border border-surface-200 shadow-sm">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-primary-600 text-white shadow-md' : 'text-charcoal-muted hover:text-primary-600 hover:bg-surface-50'}`}
              >
                <Grid3X3 className="w-5 h-5" />
              </button>
              <button
                onClick={() => setViewMode('map')}
                className={`p-2 rounded-lg transition-all ${viewMode === 'map' ? 'bg-primary-600 text-white shadow-md' : 'text-charcoal-muted hover:text-primary-600 hover:bg-surface-50'}`}
              >
                <Map className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Extended Filters Expansion */}
          <AnimatePresence>
            {showFilters && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="mt-6 pt-6 border-t border-surface-200"
              >
                <div className="flex flex-wrap gap-4">
                  <div className="space-y-1.5 hidden flex-none"></div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-widest text-charcoal-muted px-1">{t('bedrooms')}</label>
                    <BedsDropdown value={bedrooms} onChange={(val) => updateFilter('bedrooms', val)} />
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Results Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-40">
            <Loader2 className="w-12 h-12 text-primary-600 animate-spin mb-4" />
            <p className="text-charcoal-muted font-medium font-serif">{t('mapNextBuild')}</p>
          </div>
        ) : viewMode === 'map' ? (
          <div className="rounded-3xl overflow-hidden border border-surface-200 h-[650px] shadow-xl relative bg-surface-50 group">
            {/* Map Placeholder */}
            <div className="absolute inset-0 flex flex-col items-center justify-center p-12 text-center">
              <div className="w-20 h-20 bg-primary-100 rounded-full flex items-center justify-center text-primary-600 mb-6 group-hover:scale-110 transition-transform duration-500">
                <Map className="w-10 h-10" />
              </div>
              <h3 className={`text-xl font-bold text-charcoal mb-2 ${locale === 'ar' ? 'font-arabic' : 'font-serif'}`}>{t('interactiveMap')}</h3>
              <p className={`text-charcoal-muted max-w-sm mb-8 ${locale === 'ar' ? 'font-arabic' : ''}`}>{t('mapSubtitle')}</p>
              <div className="px-6 py-3 bg-white border border-surface-200 rounded-xl text-xs font-bold uppercase tracking-widest text-charcoal-muted shadow-sm">
                {t('mapNextBuild')}
              </div>
            </div>
          </div>
        ) : results.items.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-32 border-2 border-dashed border-surface-100 rounded-3xl"
          >
            <Search className="w-20 h-20 text-surface-200 mx-auto mb-6" />
            <h3 className="text-2xl font-bold text-charcoal mb-3 font-serif">{t('noResults')}</h3>
            <p className="text-charcoal-muted text-lg mb-10">{t('adjustFilters')}</p>
            <button
              onClick={clearFilters}
              className="px-10 py-4 rounded-xl bg-primary-600 text-white font-bold text-sm shadow-lg shadow-primary-600/20 hover:bg-primary-700 hover:shadow-xl transition-all active:scale-95"
            >
              {t('clearAll')}
            </button>
          </motion.div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8 lg:gap-10">
            {results.items.map((listing, i) => (
              <ListingCard key={listing.id} listing={listing} index={i} />
            ))}
          </div>
        )}
      </div>

      {/* Floating Chat Integration */}
      <ChatWidget floating />
    </div>
  );
}

export default function ListingsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-white flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-primary-600 animate-spin" />
      </div>
    }>
      <ListingsContent />
    </Suspense>
  );
}
