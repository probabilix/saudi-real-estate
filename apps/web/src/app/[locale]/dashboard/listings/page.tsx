'use client';

import React, { useState } from 'react';
import { useTranslations } from 'next-intl';
import { 
  Building, 
  PlusCircle, 
  Search, 
  Filter, 
  ChevronRight, 
  LayoutGrid,
  List as ListIcon,
  ArrowUpRight,
  TrendingUp,
  AlertCircle
} from 'lucide-react';
import Link from 'next/link';

export default function MyListingsPage({ params: { locale } }: { params: { locale: string } }) {
  const t = useTranslations('dashboard');
  const tCommon = useTranslations('common');
  
  // Mock state for now
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [activeTab, setActiveTab] = useState<'active' | 'draft' | 'pending' | 'removed' | 'license'>('active');

  const isRTL = locale === 'ar';

  const tabs = [
    { id: 'active', label: t('tabs.active'), count: 0 },
    { id: 'draft', label: t('tabs.draft'), count: 0 },
    { id: 'pending', label: t('tabs.pending'), count: 0 },
    { id: 'removed', label: t('tabs.removed'), count: 0 },
    { id: 'license', label: t('tabs.license'), count: 0 },
  ];

  return (
    <div className="space-y-8 pb-20" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* ── Page Header ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-1">{t('menu.myListings')}</h1>
          <p className="text-gray-500 font-medium">{t('subheading')}</p>
        </div>
        <div className="flex items-center gap-3">
          <Link 
            href={`/${locale}/listings/post`}
            className="flex items-center justify-center gap-2 px-8 py-3 bg-primary-600 text-white rounded-2xl font-bold shadow-xl shadow-primary-600/20 hover:bg-primary-500 transition-all active:scale-95"
          >
            <PlusCircle className="w-5 h-5" />
            {tCommon('postListing')}
          </Link>
        </div>
      </div>

      {/* ── Bayut-Style Business Hero ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 relative overflow-hidden bg-gradient-to-br from-[#064e4b] to-[#043331] rounded-[32px] p-8 text-white shadow-2xl">
          <div className="relative z-10">
            <h3 className="text-xl font-bold mb-3">{t('credits.packagePromo')}</h3>
            <p className="text-[#a5ccca] text-sm mb-8 max-w-md leading-relaxed">
              {t('credits.packageDesc')}
            </p>
            <Link 
              href={`/${locale}/packages`}
              className="inline-block px-10 py-3.5 bg-white text-primary-900 rounded-2xl font-extrabold text-sm hover:bg-[#e6f2f1] transition-all shadow-lg shadow-black/20"
            >
              {t('credits.buyPackage')}
            </Link>
          </div>
          {/* Decorative Building Silhouette Placeholder */}
          <div className="absolute right-0 bottom-0 opacity-10">
            <Building className="w-64 h-64 -mb-16 -mr-8" />
          </div>
        </div>

        <div className="bg-white p-8 rounded-[32px] border border-gray-100 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <h4 className="text-sm font-bold text-gray-500 uppercase tracking-widest">{t('credits.balance')}</h4>
              <div className="w-4 h-4 rounded-full bg-gray-100 flex items-center justify-center text-[10px] text-gray-400 font-bold italic">i</div>
            </div>
            <div className="grid grid-cols-3 gap-4 py-6 border-b border-gray-50">
              <div>
                <p className="text-xs font-bold text-gray-400 mb-1">{t('credits.available')}</p>
                <p className="text-2xl font-bold text-gray-900">0</p>
              </div>
              <div>
                <p className="text-xs font-bold text-gray-400 mb-1">{t('credits.used')}</p>
                <p className="text-2xl font-bold text-gray-900">0</p>
              </div>
              <div>
                <p className="text-xs font-bold text-gray-400 mb-1">{t('credits.total')}</p>
                <p className="text-2xl font-bold text-gray-900">0</p>
              </div>
            </div>
          </div>
          <div className="pt-4">
            <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div className="w-0 h-full bg-primary-600 rounded-full" />
            </div>
          </div>
        </div>
      </div>

      {/* ── Tabs Content ── */}
      <div className="space-y-6">
        <div className="flex flex-col gap-6">
          <div className="flex items-center gap-1 bg-gray-50 p-1.5 rounded-2xl w-fit border border-gray-100">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as 'active' | 'draft' | 'pending' | 'removed' | 'license')}
                className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${
                  activeTab === tab.id 
                    ? 'bg-white text-primary-700 shadow-sm border border-gray-100' 
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab.label} ({tab.count})
              </button>
            ))}
          </div>

          {/* ── Filter Bar ── */}
          <div className="bg-white p-4 rounded-3xl border border-gray-100 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="relative flex-1 w-full md:w-auto">
              <Search className="absolute inset-inline-start-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input 
                type="text"
                placeholder={t('listingsPage.searchPlaceholder', { type: t(`tabs.${activeTab}`) })}
                className="w-full h-12 bg-gray-50 border border-gray-100 rounded-2xl ps-12 pe-4 text-sm font-bold focus:bg-white focus:border-primary-500 transition-all outline-none shadow-[inset_0_2px_4_rgba(0,0,0,0.02)]"
              />
            </div>
            <div className="flex items-center gap-2 w-full md:w-auto">
              <button className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 h-12 bg-gray-50 text-gray-600 rounded-2xl text-sm font-bold hover:bg-gray-100 transition-all shadow-[inset_0_2px_4_rgba(0,0,0,0.02)]">
                <Filter className="w-4 h-4" />
                {tCommon('filters')}
              </button>
              <div className="h-10 border-inline-end border-gray-200 mx-2 hidden md:block" />
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

        {/* ── Listings Container (Empty State) ── */}
        <div className="min-h-[400px] flex flex-col items-center justify-center text-center p-12 bg-white rounded-[40px] border border-dashed border-gray-200 shadow-sm">
          <div className="w-24 h-24 bg-gray-50 rounded-full flex items-center justify-center mb-6">
            <Building className="w-10 h-10 text-gray-300" />
          </div>
          <h3 className="text-2xl font-bold text-gray-900 mb-2">{t('noRecentLeads')}</h3>
          <p className="text-gray-500 max-w-sm mb-8 font-medium">
            {t('noRecentLeadsDesc')}
          </p>
          <Link 
            href={`/${locale}/listings/post`}
            className="flex items-center gap-2 px-10 py-4 bg-gray-900 text-white rounded-2xl font-bold hover:bg-gray-800 transition-all shadow-xl shadow-gray-900/40 active:scale-95"
          >
            {tCommon('postListing')}
            <ArrowUpRight className="w-4 h-4" />
          </Link>
        </div>
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
    </div>
  );
}
