'use client';

import React, { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { 
  TrendingUp, 
  Users, 
  Eye, 
  MessageSquare, 
  Building, 
  Star,
  ChevronRight,
  ArrowUpRight,
  Clock,
  Heart
} from 'lucide-react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { api } from '@/lib/api';
import { useAuth } from '@/hooks/use-auth';

export default function DashboardOverview({ params: { locale } }: { params: { locale: string } }) {
  const t = useTranslations('dashboard');
  const tCommon = useTranslations('common');
  const { user, refreshUser } = useAuth();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [stats, setStats] = useState<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    // Sync profile on mount
    refreshUser();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    async function fetchStats() {
      try {
        const res = await api.getDashboardStats();
        if (res.success) {
          setStats(res.data);
        }
      } catch {
        console.error('Failed to fetch stats');
      } finally {
        setFetching(false);
      }
    }
    if (user) {
      fetchStats();
    }
  }, [user]);

  const isRTL = locale === 'ar';

  const isBuyer = user?.role === 'BUYER';
 
  if (isBuyer) {
    return (
      <div className="space-y-8 pb-20" dir={isRTL ? 'rtl' : 'ltr'}>
        {/* ── Welcome Header ── */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className={`${isRTL ? 'text-start' : ''}`}>
            <h1 className="text-3xl font-bold text-gray-900 mb-1">
              {t('welcomeBack', { name: user?.name?.split(' ')[0] || 'User' })}! 👋
            </h1>
            <p className="text-gray-500 font-medium">{t('overview.readyToFind')}</p>
          </div>
          <div className="flex items-center gap-3 text-sm font-bold text-gray-400 bg-white px-4 py-2 rounded-xl border border-gray-100 shadow-sm shrink-0">
            <Clock className="w-4 h-4" />
            {new Date().toLocaleDateString(isRTL ? 'ar-SA' : 'en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
          </div>
        </div>
 
        {/* ── Discovery Grid ── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Link href={`/${locale}/listings`} className="group bg-primary-600 p-8 rounded-[32px] text-white shadow-xl shadow-primary-600/20 hover:scale-[1.02] transition-all">
            <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center mb-6">
              <Eye className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-xl font-bold mb-2">{t('overview.exploreTitle')}</h3>
            <p className="text-primary-100 text-sm leading-relaxed mb-6">{t('overview.exploreDesc')}</p>
            <div className="flex items-center gap-2 font-bold text-xs">
              {t('overview.startSearching')} <ChevronRight className={`w-4 h-4 transition-transform ${isRTL ? 'rotate-180 group-hover:-translate-x-1' : 'group-hover:translate-x-1'}`} />
            </div>
          </Link>
 
          <Link href={`/${locale}/favorites`} className="group bg-white p-8 rounded-[32px] border border-gray-100 shadow-sm hover:border-primary-200 transition-all">
            <div className="w-12 h-12 bg-primary-50 rounded-2xl flex items-center justify-center mb-6">
              <Heart className="w-6 h-6 text-primary-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">{t('overview.favoritesTitle')}</h3>
            <p className="text-gray-400 text-sm leading-relaxed mb-6">{t('overview.favoritesDesc')}</p>
            <div className="flex items-center gap-2 font-bold text-xs text-primary-600">
              {t('overview.viewFavorites')} <ChevronRight className={`w-4 h-4 transition-transform ${isRTL ? 'rotate-180 group-hover:-translate-x-1' : 'group-hover:translate-x-1'}`} />
            </div>
          </Link>
 
          <div className="bg-amber-50 p-8 rounded-[32px] border border-amber-100">
            <div className="w-12 h-12 bg-amber-100 rounded-2xl flex items-center justify-center mb-6">
              <TrendingUp className="w-6 h-6 text-amber-600" />
            </div>
            <h3 className="text-xl font-bold text-amber-900 mb-2">{t('overview.investmentTitle')}</h3>
            <p className="text-amber-700/70 text-sm leading-relaxed mb-6">{t('overview.investmentDesc')}</p>
            <div className="px-4 py-2 bg-amber-200/50 rounded-xl text-[10px] uppercase tracking-widest font-bold text-amber-800 w-fit">
              {t('overview.comingSoon')}
            </div>
          </div>
        </div>
 
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Saved Searches */}
          <div className="lg:col-span-2 bg-white rounded-3xl border border-gray-100 shadow-xl shadow-black/[0.02] overflow-hidden">
            <div className="p-6 border-b border-gray-50 flex items-center justify-between">
              <h3 className="font-bold text-gray-900">{t('overview.savedSearches')}</h3>
              <Clock className="w-4 h-4 text-gray-400" />
            </div>
            <div className="p-12 text-center">
              <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-300">
                <ArrowUpRight className="w-8 h-8" />
              </div>
              <p className="text-sm font-bold text-gray-400">{t('overview.noActiveAlerts')}</p>
              <p className="text-xs text-gray-300 mt-1">{t('overview.saveSearchDesc')}</p>
              <Link href={`/${locale}/listings`} className="inline-block mt-6 px-6 py-2.5 bg-gray-900 text-white rounded-xl text-xs font-bold hover:bg-black transition-all">
                {t('overview.searchNow')}
              </Link>
            </div>
          </div>
 
          {/* Become a Professional */}
          <div className="space-y-6">
             <div className="bg-gradient-to-br from-gray-900 to-black rounded-[32px] p-8 text-white shadow-xl">
               <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center mb-6">
                 <Building className="w-5 h-5 text-gold" />
               </div>
               <h3 className="text-lg font-bold mb-2">{t('overview.professionalTitle')}</h3>
               <p className="text-gray-400 text-sm mb-6 leading-relaxed">
                 {t('overview.professionalDesc')}
               </p>
               <Link 
                 href={`/${locale}/dashboard/settings`}
                 className="flex items-center justify-center gap-2 w-full py-3 bg-white text-gray-900 rounded-2xl font-bold text-sm hover:bg-primary-50 transition-all font-serif"
               >
                 {t('overview.verifyLicense')}
                 <ChevronRight className={`w-4 h-4 ${isRTL ? 'rotate-180' : ''}`} />
               </Link>
             </div>
          </div>
        </div>
      </div>
    );
  }
 

  // Derive counts from stats with fallbacks
  const listingCount = stats?.totalListings || 0;
  const leadsCount = stats?.activeLeads || 0;
  const viewsCount = stats?.totalViews || 0;

  if (isBuyer) {
    // ... (rest of the buyer logic remains same, but I'll make sure it uses stats too if needed)
    // For now keeping it simple to address the broker issues
  }

  // Define dynamic stats for Broker/Firm
  const statCards = [
    { 
      label: t('totalViews'), 
      value: viewsCount.toLocaleString(), 
      change: '+0%', 
      icon: Eye, 
      color: 'text-blue-600', 
      bg: 'bg-blue-50' 
    },
    { 
      label: t('activeLeads'), 
      value: leadsCount.toLocaleString(), 
      change: '+0%', 
      icon: MessageSquare, 
      color: 'text-green-600', 
      bg: 'bg-green-50' 
    },
    { 
      label: t('listingsStat'), 
      value: listingCount.toLocaleString(), 
      change: stats?.statusCounts?.ACTIVE ? `+${stats.statusCounts.ACTIVE}` : '+0', 
      icon: Building, 
      color: 'text-primary-600', 
      bg: 'bg-primary-50' 
    },
    { 
      label: t('profileRating'), 
      value: '5.0', 
      change: 'New', 
      icon: Star, 
      color: 'text-amber-500', 
      bg: 'bg-amber-50' 
    },
  ];

  return (
    <div className="space-y-8 pb-20" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* ── Welcome Header ── */}
      <div className="lg:sticky lg:top-[82px] bg-white z-20 pt-8 pb-4 mb-4 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all duration-300 border-b border-gray-100/60">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-1">
            {t('welcomeBack', { name: user?.name?.split(' ')[0] || 'User' })}! 👋
          </h1>
          <p className="text-gray-500 font-medium">{t('subheading')}</p>
        </div>
        <div className="flex items-center gap-3 text-sm font-bold text-gray-400 bg-white px-4 py-2 rounded-xl border border-gray-100 shadow-sm shrink-0">
          <Clock className="w-4 h-4" />
          {new Date().toLocaleDateString(isRTL ? 'ar-SA' : 'en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
        </div>
      </div>

      {/* ── Stats Grid ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        {statCards.map((stat, i) => (
          <motion.div 
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="bg-white p-6 rounded-2xl border border-gray-200/60 shadow-sm group hover:border-primary-100 transition-all flex flex-col justify-between min-h-[160px]"
          >
            <div className="flex justify-between items-start mb-4">
              <div className={`w-12 h-12 ${stat.bg} ${stat.color} rounded-xl flex items-center justify-center`}>
                <stat.icon className="w-6 h-6" />
              </div>
              <span className={`text-[10px] font-bold px-2 py-1 rounded-lg ${stat.color} ${stat.bg}`}>
                {stat.change}
              </span>
            </div>
            <div>
              <p className="text-[10px] font-extrabold text-gray-400 uppercase tracking-widest mb-1">{stat.label}</p>
              <h3 className="text-2xl font-black text-gray-900">{stat.value}</h3>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recent Activity */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-[32px] border border-gray-100 shadow-xl shadow-black/[0.02] overflow-hidden">
            <div className="p-6 border-b border-gray-50 flex items-center justify-between">
              <h3 className="font-bold text-gray-900">{t('recentLeads')}</h3>
              <Link href={`/${locale}/dashboard/leads`} className="text-xs font-bold text-primary-600 hover:underline">{tCommon('viewAll')}</Link>
            </div>
            <div className="p-12 text-center">
              <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="w-8 h-8 text-gray-200" />
              </div>
              <p className="text-sm font-bold text-gray-400">{t('noRecentLeads')}</p>
              <p className="text-xs text-gray-300 mt-1">{t('noRecentLeadsDesc')}</p>
            </div>
          </div>

          <div className="bg-white rounded-[32px] border border-gray-100 shadow-xl shadow-black/[0.02] overflow-hidden">
            <div className="p-6 border-b border-gray-50 flex items-center justify-between">
              <h3 className="font-bold text-gray-900">{t('performanceInsights')}</h3>
              <TrendingUp className="w-4 h-4 text-gray-400" />
            </div>
            <div className="p-12 flex flex-col items-center justify-center gap-4">
               <div className="w-full h-32 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-100 flex items-center justify-center">
                  <p className="text-xs font-bold text-gray-300">{t('analyticsPending')}</p>
               </div>
            </div>
          </div>
        </div>

        {/* Right Sidebar: Shortcuts & Status */}
        <div className="space-y-6">
          <div className="bg-primary-600 rounded-2xl p-8 text-white shadow-lg shadow-primary-600/20">
            <h3 className="text-xl font-bold mb-4">{t('growBusiness')}</h3>
            <p className="text-primary-100 text-sm mb-6 leading-relaxed">
              {t('completeProfileDesc')}
            </p>
            <Link 
              href={`/${locale}/dashboard/settings`}
              className="flex items-center justify-center gap-2 w-full py-3 bg-white text-primary-600 rounded-2xl font-bold text-sm hover:bg-primary-50 transition-all font-serif"
            >
              {t('completeProfile')}
              <ArrowUpRight className={`w-4 h-4 ${isRTL ? 'rotate-[-90deg]' : ''}`} />
            </Link>
          </div>

          <div className="bg-white rounded-2xl p-6 border border-gray-200/60 shadow-sm">
            <h4 className="font-bold text-gray-900 mb-4">{t('accountStatus')}</h4>
            <div className="space-y-4">
               <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{t('role')}</span>
                  <span className="text-xs font-bold text-gray-900">
                    {user?.role ? t(`roles.${user.role}`) : ''}
                  </span>
               </div>
               <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{t('verification')}</span>
                  <span className={`text-[10px] font-bold px-2 py-1 rounded-lg ${
                    user?.verificationStatus === 'VERIFIED' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                  }`}>
                    {user?.verificationStatus}
                  </span>
               </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
