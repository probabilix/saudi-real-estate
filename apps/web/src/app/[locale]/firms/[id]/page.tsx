'use client';

import React, { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { 
  Building, 
  ChevronLeft, 
  ChevronRight, 
  Users
} from 'lucide-react';
import Link from 'next/link';
import ListingCard from '@/components/listings/ListingCard';
import FirmHero from '@/components/profiles/FirmHero';
import ProfileSidebar from '@/components/profiles/ProfileSidebar';
import AgentGrid from '@/components/profiles/AgentGrid';
import { api } from '@/lib/api';
import { User, Listing } from '@saudi-re/shared';

interface FirmStats {
  activeListings: number;
  successListings: number;
  agentsCount: number;
}

interface FirmData {
  firm: User & { stats: FirmStats };
  agents: User[];
  stats: FirmStats;
}

export default function FirmProfilePage({ params: { locale, id } }: { params: { locale: string, id: string } }) {
  const t = useTranslations('profiles');
  const tCommon = useTranslations('common');
  const isRTL = locale === 'ar';

  const [firmData, setFirmData] = useState<FirmData | null>(null);
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'listings' | 'agents'>('listings');

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        // Fetch public firm info
        const res = await api.getPublicFirm(id);
        
        if (res.success) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          setFirmData(res.data as any);
        }

        // Fetch firm's listings
        const listingsRes = await api.getListings(`firmId=${id}&limit=20`);
        
        if (listingsRes.success && listingsRes.data) {
          setListings(listingsRes.data.items || []);
        }
      } catch (err) {
        console.error('Failed to fetch firm profile:', err);
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

  if (!firmData) {
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

  const { firm, agents, stats } = firmData;

  return (
    <div className="bg-surface-25 min-h-screen pb-20" dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="container mx-auto px-4 py-6">
        <Link 
          href={`/${locale}/listings`}
          className="inline-flex items-center gap-2 text-charcoal-muted hover:text-primary-600 font-bold transition-colors mb-6 text-sm"
        >
          {isRTL ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          {t('backToListings')}
        </Link>

        {/* Hero Section */}
        <FirmHero firm={{ ...firm, stats }} />

        {/* Tabs Bar */}
        <div className="flex items-center gap-1 bg-white p-1.5 rounded-2xl w-fit border border-surface-100 mt-10 shadow-sm">
           <button 
             onClick={() => setActiveTab('listings')}
             className={`px-8 py-3 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${activeTab === 'listings' ? 'bg-primary-50 text-primary-700 shadow-sm' : 'text-charcoal-muted hover:text-charcoal'}`}
           >
              <Building className="w-4 h-4" />
              {t('allProperties')} ({stats.activeListings})
           </button>
           <button 
             onClick={() => setActiveTab('agents')}
             className={`px-8 py-3 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${activeTab === 'agents' ? 'bg-primary-50 text-primary-700 shadow-sm' : 'text-charcoal-muted hover:text-charcoal'}`}
           >
              <Users className="w-4 h-4" />
              {t('ourAgents')} ({agents.length})
           </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 mt-8">
           <div className="lg:col-span-8">
              {activeTab === 'listings' ? (
                <div className="space-y-6">
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {listings.map((item, idx) => (
                        <ListingCard key={item.id} listing={item} index={idx} />
                      ))}
                   </div>
                </div>
              ) : (
                <AgentGrid agents={agents} />
              )}
           </div>

           <div className="lg:col-span-4">
              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
              <ProfileSidebar type="firm" data={{ ...((firm as any).profile || {}), stats, createdAt: firm.createdAt }} />
           </div>
        </div>
      </div>
    </div>
  );
}
