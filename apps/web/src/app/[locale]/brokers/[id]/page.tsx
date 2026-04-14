'use client';

import React, { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { 
  Building, 
  ChevronLeft, 
  ChevronRight, 
  LayoutGrid, 
  List as ListIcon,
  Search,
  Filter
} from 'lucide-react';
import Link from 'next/link';
import ListingCard from '@/components/listings/ListingCard';
import BrokerHero from '@/components/profiles/BrokerHero';
import ProfileSidebar from '@/components/profiles/ProfileSidebar';
import { api } from '@/lib/api';

export default function BrokerProfilePage({ params: { locale, id } }: { params: { locale: string, id: string } }) {
  const t = useTranslations('profiles');
  const tCommon = useTranslations('common');
  const isRTL = locale === 'ar';

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [brokerData, setBrokerData] = useState<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [listings, setListings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        // Fetch public broker info
        const userRes = await api.getPublicBroker(id);
        
        if (userRes.success) {
          setBrokerData(userRes.data);
        }

        // Fetch broker's listings
        const listingsRes = await api.getListings(`ownerId=${id}&limit=20`);
        
        if (listingsRes.success && listingsRes.data) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          setListings((listingsRes.data as any).items || []);
        }
      } catch (err) {
        console.error('Failed to fetch broker profile:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-white">
        <div className="w-12 h-12 border-4 border-primary-100 border-t-primary-600 rounded-full animate-spin mb-4" />
        <p className="text-charcoal-muted font-bold uppercase tracking-widest text-xs">{tCommon('loading')}</p>
      </div>
    );
  }

  if (!brokerData) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-8 text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">{tCommon('notFoundTitle')}</h2>
        <p className="text-gray-500 mb-8">{tCommon('notFoundDesc')}</p>
        <Link href={`/${locale}/listings`} className="px-6 py-2 bg-primary-600 text-white rounded-xl font-bold">
           {t('backToListings')}
        </Link>
      </div>
    );
  }

  const { broker, stats } = brokerData;

  return (
    <div className="bg-surface-25 min-h-screen pb-20" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Breadcrumbs / Back navigation */}
      <div className="container mx-auto px-4 py-6">
        <Link 
          href={`/${locale}/listings`}
          className="inline-flex items-center gap-2 text-charcoal-muted hover:text-primary-600 font-bold transition-colors mb-6 text-sm"
        >
          {isRTL ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          {t('backToListings')}
        </Link>

        {/* Hero Section */}
        <BrokerHero broker={{ ...broker, stats }} />

        {/* Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 mt-10">
          
          {/* Main Content (Listings) */}
          <div className="lg:col-span-8 order-2 lg:order-1 space-y-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
               <div>
                  <h2 className="text-2xl font-bold text-charcoal">{t('allProperties')}</h2>
                  <p className="text-charcoal-muted text-sm font-medium">
                     {listings.length} {t('activeProperties')}
                  </p>
               </div>
               
               <div className="flex items-center gap-3">
                  <div className="bg-white p-1 rounded-xl border border-surface-100 flex gap-1 shadow-sm">
                    <button 
                      onClick={() => setViewMode('grid')}
                      className={`p-2 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-primary-50 text-primary-600' : 'text-surface-400 hover:text-surface-600'}`}
                    >
                      <LayoutGrid className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => setViewMode('list')}
                      className={`p-2 rounded-lg transition-all ${viewMode === 'list' ? 'bg-primary-50 text-primary-600' : 'text-surface-400 hover:text-surface-600'}`}
                    >
                      <ListIcon className="w-4 h-4" />
                    </button>
                  </div>
               </div>
            </div>

            {/* Filter Bar Placeholder */}
            <div className="bg-white p-4 rounded-3xl border border-surface-100 shadow-sm flex flex-col md:flex-row items-center gap-4">
               <div className="relative flex-1 w-full">
                  <Search className="absolute inset-inline-start-4 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
                  <input 
                    type="text" 
                    placeholder={tCommon('search')}
                    className="w-full h-12 bg-surface-25 rounded-2xl ps-12 pe-4 text-sm font-bold border-none outline-none focus:ring-2 focus:ring-primary-600/10 transition-all"
                  />
               </div>
               <button className="flex items-center gap-2 px-6 h-12 bg-surface-25 text-charcoal rounded-2xl text-sm font-bold border-none">
                  <Filter className="w-4 h-4" />
                  {tCommon('filters')}
               </button>
            </div>

            {/* Property Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
               {listings.length > 0 ? (
                 listings.map((item, idx) => (
                   <ListingCard key={item.id} listing={item} index={idx} />
                 ))
               ) : (
                 <div className="col-span-full py-20 text-center bg-white rounded-[40px] border border-dashed border-surface-200">
                    <Building className="w-16 h-16 text-surface-100 mx-auto mb-4" />
                    <h3 className="text-xl font-bold text-charcoal mb-2">No active listings</h3>
                    <p className="text-charcoal-muted max-w-sm mx-auto">This broker currently has no public active listings available for viewing.</p>
                 </div>
               )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-4 order-1 lg:order-2">
            <ProfileSidebar type="broker" data={{ ...broker.brokerProfile, stats, createdAt: broker.createdAt }} />
          </div>
        </div>
      </div>
    </div>
  );
}
