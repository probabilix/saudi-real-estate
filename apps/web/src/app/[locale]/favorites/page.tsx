'use client';

import React, { useState, useEffect } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { 
  Heart, 
  Search, 
  LayoutGrid,
  List as ListIcon,
  Loader2,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { api } from '@/lib/api';
import { Listing } from '@saudi-re/shared';
import ListingCard from '@/components/listings/ListingCard';

export default function FavoritesPage() {
  const t = useTranslations('dashboard');
  const tCommon = useTranslations('common');
  const tListing = useTranslations('listing');
  const locale = useLocale();
  const { isAuthenticated, loading: authLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push(`/${locale}/auth/login?returnTo=${pathname}`);
    }
  }, [authLoading, isAuthenticated, locale, router, pathname]);

  const isRTL = locale === 'ar';

  useEffect(() => {
    if (isAuthenticated) {
      fetchFavorites();
    }
  }, [isAuthenticated]);

  async function fetchFavorites() {
    setLoading(true);
    try {
      const res = await api.getFavorites();
      if (res.success && res.data) {
        setListings(res.data.items);
      }
    } catch (err) {
      console.error('Failed to fetch favorites:', err);
    } finally {
      setLoading(false);
    }
  }

  const filteredListings = listings.filter(l => {
    const title = locale === 'ar' ? l.arTitle : (l.enTitle || l.arTitle);
    const city = locale === 'ar' ? l.arCity : l.city;
    return title.toLowerCase().includes(searchQuery.toLowerCase()) || 
           city.toLowerCase().includes(searchQuery.toLowerCase());
  });

  if (!isMounted || (authLoading && !isAuthenticated)) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface-50/50 pb-10">
      {/* ── Premium Hero Section ── */}
      <div className="bg-white border-b border-surface-200 overflow-hidden relative">
        <div className="absolute top-0 right-0 w-1/3 h-full bg-gradient-to-l from-primary-50/50 to-transparent pointer-events-none" />
        <div className="max-w-7xl mx-auto px-6 py-4 md:py-10 relative z-10">
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col md:flex-row md:items-center justify-between gap-4"
          >
            <div className="max-w-2xl">
              <div className="flex items-center gap-2 mb-1">
                <div className="p-1 bg-red-50 rounded-lg">
                  <Heart className="w-3.5 h-3.5 text-red-500 fill-current" />
                </div>
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-primary-600">
                  {tListing('shortlisted') || 'Shortlisted'}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <h1 className={`text-2xl md:text-3xl font-black text-charcoal tracking-tight ${isRTL ? 'font-arabic' : ''}`}>
                  {t('menu.favorites')}
                </h1>
                <div className="flex items-center gap-1.5 px-3 py-1 bg-surface-50 rounded-full border border-surface-200 shadow-sm shrink-0">
                  <Sparkles className="w-3 h-3 text-primary-500" />
                  <span className="text-xs font-bold text-charcoal-muted">
                    {listings.length}
                  </span>
                </div>
              </div>
            </div>

            <div className="hidden md:flex items-center gap-4">
              <div className="bg-white p-1 rounded-2xl border border-surface-200 shadow-sm flex items-center gap-1">
                <button 
                  onClick={() => setViewMode('grid')}
                  className={`p-2 rounded-xl transition-all ${viewMode === 'grid' ? 'bg-primary-600 text-white shadow-lg' : 'text-charcoal-muted hover:bg-surface-50'}`}
                >
                  <LayoutGrid className="w-4 h-4" />
                </button>
                <button 
                  onClick={() => setViewMode('list')}
                  className={`p-2 rounded-xl transition-all ${viewMode === 'list' ? 'bg-primary-600 text-white shadow-lg' : 'text-charcoal-muted hover:bg-surface-50'}`}
                >
                  <ListIcon className="w-4 h-4" />
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 mt-6">
        {/* ── Search Bar (Simplified & Modern) ── */}
        <div className="relative mb-6">
          <div className={`absolute inset-y-0 ${isRTL ? 'right-4' : 'left-4'} flex items-center pointer-events-none`}>
            <Search className="w-4 h-4 text-charcoal-muted" />
          </div>
          <input 
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t('listingsPage.searchPlaceholder', { type: t('menu.favorites') })}
            className={`w-full h-12 ${isRTL ? 'pr-11 pl-4' : 'pl-11 pr-4'} bg-white border border-surface-200 rounded-2xl text-sm font-bold shadow-sm focus:ring-4 focus:ring-primary-600/5 focus:border-primary-600 outline-none transition-all placeholder:text-charcoal-muted/40`}
          />
        </div>

        {/* ── Listings Container ── */}
        {loading ? (
          <div className="min-h-[400px] flex flex-col items-center justify-center gap-4 bg-white rounded-[40px] border border-surface-200 shadow-sm">
            <div className="relative">
               <Loader2 className="w-12 h-12 text-primary-600 animate-spin" />
               <Heart className="absolute inset-0 m-auto w-4 h-4 text-red-400" />
            </div>
            <p className="text-sm font-bold text-charcoal-muted animate-pulse tracking-widest uppercase">{tCommon('loading')}</p>
          </div>
        ) : filteredListings.length > 0 ? (
          <div className={viewMode === 'grid' ? "grid sm:grid-cols-2 lg:grid-cols-3 gap-6" : "max-w-4xl mx-auto space-y-4"}>
            <AnimatePresence mode="popLayout">
              {filteredListings.map((item, i) => (
                <motion.div
                  key={item.id}
                  layout
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9, y: 20 }}
                  transition={{ duration: 0.3 }}
                >
                  <ListingCard 
                    listing={item} 
                    index={i} 
                    onToggleFavorite={(id, favorited) => {
                      if (!favorited) {
                        setListings(prev => prev.filter(l => l.id !== id));
                      }
                    }}
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        ) : (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="min-h-[500px] flex flex-col items-center justify-center text-center p-12 bg-white rounded-[40px] border border-dashed border-surface-200 shadow-sm group"
          >
            <div className="w-32 h-32 bg-red-50 rounded-full flex items-center justify-center mb-8 group-hover:scale-110 transition-transform duration-500 relative">
              <Heart className="w-12 h-12 text-red-200" />
              <div className="absolute inset-0 border-2 border-red-100 rounded-full animate-ping opacity-20" />
            </div>
            <h3 className="text-2xl font-black text-charcoal mb-3">
              {searchQuery ? 'No matching favorites' : (isRTL ? 'لا توجد مفضلات بعد' : 'Your Heart is Empty')}
            </h3>
            <p className="text-charcoal-muted max-w-sm mb-10 font-medium leading-relaxed">
              {searchQuery ? 'Try a different search term.' : 'Properties you save will appear here for quick access across all your devices.'}
            </p>
            {!searchQuery && (
              <Link 
                href={`/${locale}/listings`}
                className="flex items-center gap-4 px-12 py-4 bg-charcoal text-white rounded-2xl font-bold hover:bg-primary-600 transition-all shadow-2xl shadow-charcoal/20 active:scale-95 group/btn"
              >
                {isRTL ? 'استكشف العقارات' : 'Explore Properties'}
                <ArrowRight className={`w-5 h-5 transition-transform ${isRTL ? 'rotate-180' : 'group-hover:translate-x-1'}`} />
              </Link>
            )}
          </motion.div>
        )}
      </div>
    </div>
  );
}
