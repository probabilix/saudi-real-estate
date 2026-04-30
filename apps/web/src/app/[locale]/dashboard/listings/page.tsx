'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { 
  Building, 
  PlusCircle, 
  Search, 
  ChevronRight, 
  LayoutGrid,
  List as ListIcon,
  ArrowUpRight,
  TrendingUp,
  AlertCircle,
  Loader2,
  X
} from 'lucide-react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { useAuth } from '@/hooks/use-auth';
import { api } from '@/lib/api';
import { Listing } from '@saudi-re/shared';
import ListingCard from '@/components/listings/ListingCard';
import { ConfirmationModal } from '@/components/layout/ConfirmationModal';

export default function MyListingsPage({ params: { locale } }: { params: { locale: string } }) {
  const t = useTranslations('dashboard');
  const tCommon = useTranslations('common');
  const { user, loading: authLoading } = useAuth();
  
  // State
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [activeTab, setActiveTab] = useState<'ACTIVE' | 'DRAFT' | 'FLAGGED' | 'SOLD' | 'REMOVED'>('ACTIVE');
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [counts, setCounts] = useState({
    ACTIVE: 0,
    DRAFT: 0,
    FLAGGED: 0,
    SOLD: 0,
    REMOVED: 0
  });
  const [isMounted, setIsMounted] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [listingToDelete, setListingToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const isRTL = locale === 'ar';

  const fetchListings = useCallback(async (q: string = '') => {
    if (!user) return;
    
    // Stable ID capture for TS
    const userId = user.id;
    const userRole = user.role;
    
    setLoading(true);
    try {
      const isFirmOwner = userRole === 'FIRM';
      const params = {
        ...(isFirmOwner ? { firmId: userId } : { ownerId: userId }),
        status: activeTab as string,
        q: q || searchQuery || undefined,
        limit: 50
      };

      const res = await api.getMyDashboardListings(params);
      if (res.success && res.data) {
        setListings(res.data.items);
      }
    } catch {
      console.error('Failed to fetch dashboard listings');
    } finally {
      setLoading(false);
    }
  }, [user, activeTab, searchQuery]);

  // Initial fetch and on tab change
  useEffect(() => {
    if (!authLoading && user) {
      fetchListings();
    }
  }, [authLoading, user, activeTab, fetchListings]);

  const onTabChange = (tabId: string) => {
    setListings([]); // Clear listings to prevent stale count flickering
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    setActiveTab(tabId as any);
  };

  // Debounced search logic
  useEffect(() => {
    if (searchQuery.length > 0) {
      const timer = setTimeout(() => {
        fetchListings(searchQuery);
      }, 500);
      return () => clearTimeout(timer);
    } else {
      fetchListings();
    }
  }, [searchQuery, fetchListings]);

  // Fetch stats & counts once
  useEffect(() => {
    if (!authLoading && user) {
      async function fetchStats() {
        try {
          const res = await api.getDashboardStats();
          if (res.success && res.data) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            setCounts(res.data.statusCounts as any);
          }
        } catch {
          console.error('Stats fetch failed');
        }
      }
      fetchStats();
    }
  }, [authLoading, user]);

  const tabs = [
    { id: 'ACTIVE', label: t('tabs.active'), count: counts.ACTIVE || 0, translationKey: 'active' },
    { id: 'DRAFT', label: t('tabs.draft'), count: counts.DRAFT || 0, translationKey: 'draft' },
    { id: 'FLAGGED', label: t('tabs.pending'), count: counts.FLAGGED || 0, translationKey: 'pending' },
    { id: 'SOLD', label: t('tabs.removed'), count: counts.SOLD || 0, translationKey: 'removed' },
    { id: 'REMOVED', label: t('tabs.license'), count: counts.REMOVED || 0, translationKey: 'license' },
  ];

  const activeTabInfo = tabs.find(tab => tab.id === activeTab) || tabs[0];

  const handleDelete = async () => {
    if (!listingToDelete) return;
    setIsDeleting(true);
    setError(null);
    try {
      const res = await api.deleteListing(listingToDelete);
      if (!res.success) throw new Error(res.error || 'Delete failed');
      
      // Close modal immediately on success
      setDeleteModalOpen(false);
      setListingToDelete(null);
      await fetchListings(searchQuery);
      
      // Refresh stats
      const statsRes = await api.getDashboardStats();
      if (statsRes.success && statsRes.data) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        setCounts(statsRes.data.statusCounts as any);
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      console.error('Delete failed:', err);
      setError(err.message || 'Failed to delete listing');
      // Auto-hide error after 5s
      setTimeout(() => setError(null), 5000);
    } finally {
      setIsDeleting(false);
    }
  };

  if (!isMounted) return <div className="min-h-screen bg-white" />;

  return (
    <div className="space-y-8 pb-20" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* ── Page Header ── */}
      <div className="lg:sticky lg:top-[82px] bg-white z-20 pt-8 pb-4 mb-4 flex flex-col md:flex-row md:items-center justify-between gap-6 transition-all duration-300 border-b border-gray-100/60">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-1">{t('menu.myListings')}</h1>
          <p className="text-gray-500 font-medium">{t('subheading')}</p>
        </div>
        <div className="flex items-center gap-3">
          <Link 
            href={`/${locale}/post-property`}
            className="flex items-center justify-center gap-2 px-8 py-3 bg-[#064e4b] text-white rounded-2xl font-bold shadow-xl shadow-[#064e4b]/20 hover:bg-[#086a66] transition-all active:scale-95"
          >
            <PlusCircle className="w-5 h-5" />
            {tCommon('postListing')}
          </Link>
        </div>
      </div>

      {/* ── Metrics Hero ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 relative overflow-hidden bg-gradient-to-br from-[#064e4b] to-[#043331] rounded-[32px] p-6 md:p-8 text-white shadow-2xl">
          <div className="relative z-10 text-center md:text-start">
            <h3 className="text-lg md:text-xl font-bold mb-3">{t('credits.packagePromo')}</h3>
            <p className="text-[#a5ccca] text-xs md:text-sm mb-6 md:mb-8 max-w-md mx-auto md:mx-0 leading-relaxed">
              {t('credits.packageDesc')}
            </p>
            <Link 
              href={`/${locale}/packages`}
              className="inline-block px-8 md:px-10 py-3 bg-white text-primary-900 rounded-2xl font-extrabold text-sm hover:bg-[#e6f2f1] transition-all shadow-lg shadow-black/20"
            >
              {t('credits.buyPackage')}
            </Link>
          </div>
          <div className="absolute right-0 bottom-0 opacity-5 md:opacity-10 pointer-events-none">
            <Building className="w-48 h-48 md:w-64 md:h-64 -mb-12 -mr-8" />
          </div>
        </div>

        <div className="bg-white p-6 md:p-8 rounded-2xl border border-gray-200/60 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <h4 className="text-[10px] md:text-xs font-black text-primary-900 uppercase tracking-widest">{t('broker.performance')}</h4>
            </div>
            <div className="grid grid-cols-3 gap-2 md:gap-4 py-4 md:py-5 border-b border-gray-50">
              <div>
                <p className="text-[9px] md:text-[10px] font-bold text-gray-400 mb-0.5 uppercase tracking-tight">{t('tabs.active')}</p>
                <p className="text-xl md:text-2xl font-black text-primary-700">{counts.ACTIVE || 0}</p>
              </div>
              <div>
                <p className="text-[9px] md:text-[10px] font-bold text-gray-400 mb-0.5 uppercase tracking-tight">{t('tabs.draft')}</p>
                <p className="text-xl md:text-2xl font-black text-gray-400">{counts.DRAFT || 0}</p>
              </div>
              <div>
                <p className="text-[9px] md:text-[10px] font-bold text-gray-400 mb-0.5 uppercase tracking-tight">{t('tabs.pending')}</p>
                <p className="text-xl md:text-2xl font-black text-[#D4AF37]">{counts.FLAGGED || 0}</p>
              </div>
            </div>
          </div>
          <div className="pt-3 md:pt-4 flex items-center justify-between">
            <span className="text-[9px] md:text-[10px] font-bold text-gray-500">{t('broker.activeListings')}</span>
            <span className="text-[9px] md:text-[10px] font-black text-primary-600">
               {counts.ACTIVE + counts.DRAFT > 0 
                 ? `${Math.round((counts.ACTIVE / (counts.ACTIVE + counts.DRAFT)) * 100)}% Live` 
                 : '0% Live'}
            </span>
          </div>
        </div>
      </div>

      {/* ── Search & Filters ── */}
      <div className="space-y-6">
        <div className="flex flex-col gap-6">
          <div className="bg-gray-100/50 p-2 rounded-2xl w-full border border-gray-200/60 overflow-hidden">
            <div className="flex overflow-x-auto no-scrollbar md:flex-wrap gap-2 py-1 px-1 scroll-smooth" dir={isRTL ? 'rtl' : 'ltr'}>
              {tabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => onTabChange(tab.id)}
                  className={`relative flex-shrink-0 whitespace-nowrap px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                    activeTab === tab.id 
                      ? 'text-primary-700 bg-white shadow-md ring-1 ring-black/5' 
                      : 'text-gray-400 hover:text-gray-600 hover:bg-white/50'
                  }`}
                >
                  {tab.label} <span className={`ml-1 ${activeTab === tab.id ? 'text-primary-500' : 'text-gray-300'}`}>({tab.count})</span>
                  {activeTab === tab.id && (
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.5 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="absolute bottom-1 left-1/2 -translate-x-1/2 w-4 h-0.5 bg-primary-600 rounded-full" 
                    />
                  )}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-white p-4 rounded-3xl border border-gray-200/60 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex-1 w-full md:w-auto flex items-center bg-white rounded-2xl border-2 border-gray-100 focus-within:border-emerald-950 transition-all shadow-sm h-14 px-4 gap-3">
              <Search className="w-4 h-4 text-gray-400 shrink-0" />
              <input 
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t('listingsPage.searchPlaceholder', { type: t(`tabs.${activeTabInfo.translationKey}`) })}
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
        </div>

        {/* ── Listings Container ── */}
        {loading && listings.length === 0 ? (
          <div className="min-h-[400px] flex items-center justify-center bg-white rounded-[40px] border border-gray-100">
            <Loader2 className="w-12 h-12 text-primary-600 animate-spin" />
          </div>
        ) : listings.length > 0 ? (
          <div className={viewMode === 'grid' ? "grid sm:grid-cols-2 lg:grid-cols-3 gap-8" : "space-y-6"}>
            {listings.map((item, i) => (
              <ListingCard 
                key={item.id} 
                listing={item} 
                index={i} 
                isDashboard={true}
                onDelete={(id) => {
                  setListingToDelete(id);
                  setDeleteModalOpen(true);
                }}
              />
            ))}
          </div>
        ) : (
          <div className="min-h-[450px] flex flex-col items-center justify-center text-center p-12 bg-white rounded-[40px] border border-dashed border-gray-200 shadow-sm group">
            <div className="w-32 h-32 bg-primary-50 rounded-full flex items-center justify-center mb-8 group-hover:scale-110 transition-transform duration-500">
              <div className="relative">
                <Building className="w-12 h-12 text-primary-200" />
                <PlusCircle className="absolute -bottom-1 -right-1 w-6 h-6 text-primary-600 bg-white rounded-full" />
              </div>
            </div>
            <h3 className="text-2xl font-black text-gray-900 mb-3">
              {activeTab === 'DRAFT' ? 'No Drafts Found' : 
               activeTab === 'FLAGGED' ? 'No Pending Properties' :
               activeTab === 'REMOVED' ? 'No Removed Listings' :
               t('noListingsFound')}
            </h3>
            <p className="text-gray-500 max-w-sm mb-10 font-medium leading-relaxed">
              {activeTab === 'DRAFT' ? 'You haven\'t saved any listings to drafts yet.' :
               activeTab === 'FLAGGED' ? 'You don\'t have any properties currently under review.' :
               activeTab === 'REMOVED' ? 'Your removed properties history is empty.' :
               t('noListingsFoundDesc')}
            </p>
            {(activeTab === 'ACTIVE' || activeTab === 'DRAFT') && (
              <Link 
                href={`/${locale}/listings/post`}
                className="flex items-center gap-3 px-12 py-4 bg-primary-600 text-white rounded-2xl font-bold hover:bg-primary-500 transition-all shadow-2xl shadow-primary-600/30 active:scale-95 group/btn"
              >
                {tCommon('postListing')}
                <ArrowUpRight className="w-5 h-5 group-hover/btn:translate-x-1 group-hover/btn:-translate-y-1 transition-transform" />
              </Link>
            )}
          </div>
        )}
      </div>

      {/* ── Helpful Resources ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-gradient-to-br from-gray-900 to-gray-800 p-8 rounded-[32px] text-white shadow-xl">
          <AlertCircle className="w-10 h-10 text-primary-400 mb-4" />
          <h4 className="text-xl font-bold mb-2">{t('listingsPage.regaComplianceTips')}</h4>
          <p className="text-gray-400 text-sm mb-6 leading-relaxed">
            {t('listingsPage.regaComplianceDesc')}
          </p>
          <button className="text-sm font-bold text-primary-400 flex items-center gap-2 hover:gap-3 transition-all">
            {tCommon('learnMore')} <ChevronRight className={`w-4 h-4 ${isRTL ? 'rotate-180' : ''}`} />
          </button>
        </div>
        <div className="bg-primary-50 p-8 rounded-[32px] border border-primary-100 shadow-sm">
          <TrendingUp className="w-10 h-10 text-primary-600 mb-4" />
          <h4 className="text-xl font-bold text-gray-900 mb-2">{t('listingsPage.boostVisibility')}</h4>
          <p className="text-gray-600 text-sm mb-6 leading-relaxed">
            {t('listingsPage.boostVisibilityDesc')}
          </p>
          <Link href={`/${locale}/packages`} className="text-sm font-bold text-primary-600 flex items-center gap-2 hover:gap-3 transition-all">
            {t('credits.buyPackage')} <ChevronRight className={`w-4 h-4 ${isRTL ? 'rotate-180' : ''}`} />
          </Link>
        </div>
      </div>

      <ConfirmationModal
        isOpen={deleteModalOpen}
        onClose={() => !isDeleting && setDeleteModalOpen(false)}
        onConfirm={handleDelete}
        title="Are you sure?"
        message="This action will move the listing to removed status. You can reactivate it later from the license tab."
        confirmLabel="Yes, Delete"
        cancelLabel="Keep Listing"
        isDanger={true}
        loading={isDeleting}
      />

      {error && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="fixed bottom-12 left-1/2 -translate-x-1/2 z-[100] bg-rose-600 text-white px-10 py-5 rounded-3xl shadow-2xl flex items-center gap-4 border border-rose-400/30 backdrop-blur-xl">
          <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
            <AlertCircle className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="font-black uppercase tracking-widest text-[10px]">Error</p>
            <p className="font-bold text-sm">{error}</p>
          </div>
          <button onClick={() => setError(null)} className="ml-4 p-1 hover:bg-white/10 rounded-full transition-all">
            <X className="w-4 h-4 text-white" />
          </button>
        </motion.div>
      )}
    </div>
  );
}
