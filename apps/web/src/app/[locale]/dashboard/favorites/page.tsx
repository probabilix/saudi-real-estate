'use client';

import React, { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { 
  Heart, 
  Search, 
  LayoutGrid,
  List as ListIcon,
  Loader2,
  ArrowRight
} from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/hooks/use-auth';
import { api } from '@/lib/api';
import { Listing } from '@saudi-re/shared';
import ListingCard from '@/components/listings/ListingCard';

export default function FavoritesPage({ params: { locale } }: { params: { locale: string } }) {
  const t = useTranslations('dashboard');
  const tCommon = useTranslations('common');
  const { user, loading: authLoading } = useAuth();
  
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const isRTL = locale === 'ar';

  useEffect(() => {
    if (!authLoading && user) {
      fetchFavorites();
    }
  }, [authLoading, user]);

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
    return title.toLowerCase().includes(searchQuery.toLowerCase()) || 
           l.city.toLowerCase().includes(searchQuery.toLowerCase());
  });

  if (!isMounted) return <div className="min-h-screen bg-white" />;

  return (
    <div className="space-y-8 pb-20" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* ── Page Header ── */}
      <div className="lg:sticky lg:top-[82px] bg-white z-20 pt-8 pb-4 mb-4 flex flex-col md:flex-row md:items-center justify-between gap-6 transition-all duration-300 border-b border-gray-100/60">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-1 flex items-center gap-3">
            <Heart className="w-8 h-8 text-red-500 fill-current" />
            {t('menu.favorites')}
          </h1>
          <p className="text-gray-500 font-medium">{tCommon('savedProperties') || 'Your shortlisted properties'}</p>
        </div>
      </div>

      {/* ── Search & Filters ── */}
      <div className="bg-white p-4 rounded-3xl border border-gray-200/60 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex-1 w-full md:w-auto flex items-center bg-white rounded-2xl border-2 border-gray-100 focus-within:border-primary-600 transition-all shadow-sm h-14 px-4 gap-3">
          <Search className="w-4 h-4 text-gray-400 shrink-0" />
          <input 
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t('listingsPage.searchPlaceholder', { type: t('menu.favorites') })}
            className="flex-1 h-full bg-transparent text-sm font-bold outline-none border-none"
          />
        </div>
        <div className="flex items-center gap-2 w-full md:w-auto">
          <div className="bg-gray-100 p-1 rounded-xl flex gap-1">
            <button 
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-white text-primary-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button 
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-lg transition-all ${viewMode === 'list' ? 'bg-white text-primary-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
            >
              <ListIcon className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* ── Listings Container ── */}
      {loading ? (
        <div className="min-h-[400px] flex items-center justify-center bg-white rounded-[40px] border border-gray-100">
          <Loader2 className="w-12 h-12 text-primary-600 animate-spin" />
        </div>
      ) : filteredListings.length > 0 ? (
        <div className={viewMode === 'grid' ? "grid sm:grid-cols-2 lg:grid-cols-3 gap-8" : "space-y-6"}>
          {filteredListings.map((item, i) => (
            <ListingCard 
              key={item.id} 
              listing={item} 
              index={i} 
            />
          ))}
        </div>
      ) : (
        <div className="min-h-[450px] flex flex-col items-center justify-center text-center p-12 bg-white rounded-[40px] border border-dashed border-gray-200 shadow-sm group">
          <div className="w-32 h-32 bg-red-50 rounded-full flex items-center justify-center mb-8 group-hover:scale-110 transition-transform duration-500">
            <Heart className="w-12 h-12 text-red-200" />
          </div>
          <h3 className="text-2xl font-black text-gray-900 mb-3">
            {searchQuery ? 'No matching favorites' : 'No Favorites Yet'}
          </h3>
          <p className="text-gray-500 max-w-sm mb-10 font-medium leading-relaxed">
            {searchQuery ? 'Try a different search term.' : 'Properties you save will appear here for quick access.'}
          </p>
          {!searchQuery && (
            <Link 
              href={`/${locale}/listings`}
              className="flex items-center gap-3 px-12 py-4 bg-primary-600 text-white rounded-2xl font-bold hover:bg-primary-500 transition-all shadow-2xl shadow-primary-600/30 active:scale-95 group/btn"
            >
              Browse Properties
              <ArrowRight className="w-5 h-5 group-hover/btn:translate-x-1 transition-transform" />
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
