'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { 
  Users, 
  TrendingUp, 
  Plus, 
  Search, 
  MoreHorizontal, 
  Star, 
  Building, 
  MessageSquare,
  ArrowUpRight,
  ShieldCheck,
  CreditCard,
  Loader2,
  CheckCircle,
  AlertCircle,
  Minus
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '@/lib/api';
import { useAuth } from '@/hooks/use-auth';
import Image from 'next/image';

export default function BrokersPage({ params: { locale } }: { params: { locale: string } }) {
  const t = useTranslations('dashboard');
  const tCommon = useTranslations('common');
  const { user, loading: authLoading, refreshUser, updateCredits } = useAuth();
  const isRTL = locale === 'ar';

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [brokers, setBrokers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [selectedBroker, setSelectedBroker] = useState<any>(null);
  const [isCreditModalOpen, setIsCreditModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'allocate' | 'reclaim'>('allocate');
  const [creditAmount, setCreditAmount] = useState(10);
  const [transferring, setTransferring] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [stats, setStats] = useState<any>(null);
  const router = useRouter();

  const [statusModal, setStatusModal] = useState<{
    isOpen: boolean;
    type: 'success' | 'error' | 'warning';
    title: string;
    message: string;
    actionType?: 'buy' | 'close';
  }>({
    isOpen: false,
    type: 'success',
    title: '',
    message: ''
  });

  const notifyStatus = (type: 'success' | 'error' | 'warning', title: string, message: string, actionType: 'buy' | 'close' = 'close') => {
    setStatusModal({ isOpen: true, type, title, message, actionType });
  };

  useEffect(() => {
    // Initial profile sync on mount
    refreshUser();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    // Fetch brokers only when user is ready and auth is not loading.
    // Depend on user?.id (not the whole user object) so that updateCredits()
    // patching creditsBalance does NOT re-trigger this and overwrite optimistic updates.
    if (!authLoading && user) {
      fetchBrokers();
    } else if (!authLoading && !user) {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, authLoading]);

  useEffect(() => {
    // Reset credit amount whenever modal closes to prevent "899" or other test values from persisting
    if (!isCreditModalOpen) {
      setCreditAmount(10);
    }
  }, [isCreditModalOpen]);

  useEffect(() => {
    // Auto-close success modal after 5 seconds
    let timer: NodeJS.Timeout;
    if (statusModal.isOpen && statusModal.type === 'success') {
      timer = setTimeout(() => {
        setStatusModal(prev => ({ ...prev, isOpen: false }));
      }, 2000); // Changed to 2 seconds as requested
    }
    return () => clearTimeout(timer);
  }, [statusModal.isOpen, statusModal.type]);

  const fetchBrokers = async () => {
    try {
      const [brokersRes, statsRes] = await Promise.all([
        api.getFirmBrokers(),
        api.getDashboardStats()
      ]);
      if (brokersRes.success) {
        setBrokers(brokersRes.data || []);
      }
      if (statsRes.success) {
        setStats(statsRes.data);
      }
    } catch {
      console.error('Failed to fetch brokers data');
    } finally {
      setLoading(false);
    }
  };

  const handleCreditAction = async () => {
    if (!selectedBroker || transferring) return;
    setTransferring(true);
    try {
      const isReclaim = modalMode === 'reclaim';
      const action = isReclaim ? api.reclaimBrokerCredits : api.allocateBrokerCredits;
      
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const res = await (action as any).call(api, selectedBroker.id, creditAmount);
      
      if (res.success) {
        // 1. Close allocation modal immediately for a clean transition
        setIsCreditModalOpen(false);
        setCreditAmount(10);
        
        // 2. Clear loader state
        setTransferring(false);
        
        // 3. Show success centered card
        notifyStatus(
          'success', 
          isReclaim ? t('reclaimSuccessTitle') : t('transferSuccessTitle'), 
          isReclaim 
            ? tCommon('successfullyAllocatedCredits', { amount: creditAmount, name: selectedBroker.name }) 
            : tCommon('successfullyAllocatedCredits', { amount: creditAmount, name: selectedBroker.name })
        );
        
        // 4. Instant UI update using balances returned directly from the API.
        // We do NOT make any extra network calls — they race with the DB and return stale data.
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const res2 = res as any;
        setBrokers(prev => prev.map(b =>
          b.id === selectedBroker.id
            ? { ...b, creditsBalance: res2.brokerBalance ?? b.creditsBalance }
            : b
        ));
        if (res2.ownerBalance !== undefined) {
          updateCredits(res2.ownerBalance);
        }
      } else {
        const isInsufficient = res.error?.toLowerCase().includes('insufficient') || res.message?.toLowerCase().includes('insufficient');
        
        if (isInsufficient) {
          notifyStatus(
            'error',
            isReclaim ? t('agentBalanceLowTitle') : t('insufficientBalanceTitle'),
            isReclaim 
              ? tCommon('agentHasInsufficientCredits', { name: selectedBroker.name, amount: selectedBroker.creditsBalance || 0 })
              : t('insufficientBalanceDesc'),
            isReclaim ? 'close' : 'buy'
          );
        } else {
          notifyStatus('error', isReclaim ? t('reclaimFailed') : t('transferFailed'), res.error || res.message || 'An error occurred');
        }
        setIsCreditModalOpen(false);
      }
    } catch {
      notifyStatus('error', tCommon('error'), tCommon('serverUnreachable'));
      console.error('Action failed');
      setIsCreditModalOpen(false);
    } finally {
      setTransferring(false);
    }
  };

  const filteredBrokers = brokers.filter(b => 
    b.name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
    b.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading || authLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 className="w-10 h-10 text-primary-600 animate-spin" />
        <p className="text-xs font-bold text-gray-400 animate-pulse uppercase tracking-widest">{tCommon('loading')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-20 relative" dir={isRTL ? 'rtl' : 'ltr'}>

      {/* ── Header ── */}
      <div className="lg:sticky lg:top-[82px] bg-white z-20 pt-8 pb-4 mb-4 flex flex-col md:flex-row md:items-center justify-between gap-6 transition-all duration-300 border-b border-gray-100/60">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight mb-2">
            {t('menu.brokers')}
          </h1>
          <p className="text-gray-500 font-medium">{t('subheadingAgents') || 'Manage and monitor your team performance.'}</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-primary-600 transition-colors" />
            <input 
              type="text"
              placeholder={t('searchBrokers') || 'Search agents...'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-11 pr-4 py-3 bg-white border border-gray-100 rounded-2xl text-sm font-medium w-full md:w-64 shadow-xl shadow-black/[0.02] focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none transition-all"
            />
          </div>
          <button className="flex items-center gap-2 px-6 py-3 bg-gray-900 text-white rounded-2xl font-bold text-sm hover:bg-black transition-all shadow-xl shadow-gray-900/10 active:scale-95">
            <Plus className="w-4 h-4" />
            {t('addBroker')}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-primary-600 p-8 rounded-2xl text-white shadow-lg shadow-primary-600/20 relative overflow-hidden">
          <div className="relative z-10">
            <p className="text-primary-100 text-[10px] font-black uppercase tracking-widest mb-1">{t('inventory')}</p>
            <h3 className="text-4xl font-black mb-4">
              {stats?.statusCounts?.ACTIVE || 0}
            </h3>
            <div className="flex items-center gap-2 text-[10px] font-black bg-white/10 w-fit px-3 py-1 rounded-full uppercase tracking-widest">
              <TrendingUp className="w-3 h-3" />
              {t('tabs.active')}
            </div>
          </div>
          <Building className="absolute -right-8 -bottom-8 w-48 h-48 text-white/5 rotate-12" />
        </div>
        
        <div className="bg-white p-8 rounded-2xl border border-gray-200/60 shadow-sm transition-all hover:shadow-md group">
          <p className="text-gray-400 text-[10px] font-black uppercase tracking-widest mb-1">{t('activeLeads')}</p>
          <h3 className="text-4xl font-black text-gray-900 mb-4 tracking-tight">
            {stats?.activeLeads || 0}
          </h3>
          <div className="flex items-center gap-2 text-[10px] font-black text-green-600 bg-green-50 w-fit px-3 py-1 rounded-full uppercase tracking-widest">
            <MessageSquare className="w-3.5 h-3.5" />
            {t('live')}
          </div>
        </div>

        <div className="bg-amber-50 p-8 rounded-2xl border border-amber-100 shadow-sm transition-all hover:shadow-md group">
          <p className="text-amber-700/60 text-[10px] font-black uppercase tracking-widest mb-1">{t('globalRating')}</p>
          <div className="flex items-center gap-2 mb-4">
            <h3 className="text-4xl font-black text-amber-900 tracking-tight">4.9</h3>
            <div className="flex items-center text-amber-500">
              <Star className="w-7 h-7 fill-current" />
            </div>
          </div>
          <div className="text-amber-700/60 text-[10px] font-black uppercase tracking-widest">{t('basedOnReviews', { count: 124 })}</div>
        </div>
      </div>

      {/* ── My Balance Card ── */}
      <div className="bg-white p-8 rounded-2xl border border-gray-200/60 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6 overflow-hidden relative group transition-all hover:shadow-md">
        <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-primary-600" />
        <div className="flex items-center gap-6">
          <div className="w-14 h-14 bg-primary-50 rounded-xl flex items-center justify-center transition-transform group-hover:scale-105">
            <CreditCard className="w-7 h-7 text-primary-600" />
          </div>
          <div>
            <p className="text-gray-400 text-[10px] font-black uppercase tracking-widest mb-1">{t('firmCreditsLabel')}</p>
            <h3 className="text-3xl font-black text-gray-900 tracking-tight">{user?.creditsBalance || 0}</h3>
          </div>
        </div>
        <div className="flex flex-col gap-1 items-end">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tight">{t('needMoreCredits')}</p>
          <button className="text-primary-600 font-black text-sm hover:text-primary-700 flex items-center gap-1.5 group/btn">
            {t('topUpAccount')} 
            <ArrowUpRight className={`w-4 h-4 transition-transform group-hover/btn:translate-x-0.5 group-hover/btn:-translate-y-0.5 ${isRTL ? 'rotate-[270deg]' : ''}`} />
          </button>
        </div>
      </div>

      {/* ── Broker List ── */}
      <div className="bg-white rounded-2xl border border-gray-200/60 shadow-sm overflow-hidden">
        {/* Desktop Table View */}
        <div className="hidden lg:block overflow-x-auto">
          <table className="w-full text-start border-collapse">
            <thead>
              <tr className="border-b border-gray-50">
                <th className="px-8 py-6 text-start text-[10px] font-black text-gray-400 uppercase tracking-widest">{t('agentInfo')}</th>
                <th className="px-8 py-6 text-start text-[10px] font-black text-gray-400 uppercase tracking-widest">{t('inventory')}</th>
                <th className="px-8 py-6 text-start text-[10px] font-black text-gray-400 uppercase tracking-widest">{t('performance')}</th>
                <th className="px-8 py-6 text-start text-[10px] font-black text-gray-400 uppercase tracking-widest">{t('creditsLabel')}</th>
                <th className="px-8 py-6 text-start text-[10px] font-black text-gray-400 uppercase tracking-widest">{t('status')}</th>
                <th className="px-8 py-6"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredBrokers && filteredBrokers.length > 0 ? (
                filteredBrokers.map((broker) => (
                  <motion.tr 
                    key={broker.id} 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    onClick={() => router.push(`/${locale}/brokers/${broker.id}`)}
                    className="hover:bg-gray-50/50 transition-colors group cursor-pointer"
                  >
                    <td className="px-8 py-6 text-sm">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-primary-50 flex items-center justify-center text-primary-600 font-extrabold text-lg border border-primary-100 overflow-hidden relative">
                          {broker.avatarUrl ? (
                            <Image src={broker.avatarUrl} alt={broker.name || ''} fill className="object-cover" unoptimized />
                          ) : (
                            <span>{broker.name?.[0] || 'A'}</span>
                          )}
                        </div>
                        <div>
                          <p className="font-bold text-gray-900 group-hover:text-primary-600 transition-colors">{broker.name || 'Unnamed Agent'}</p>
                          <p className="text-xs text-gray-400 font-medium">{broker.email || 'No email'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-6">
                        <div className="flex flex-col">
                          <span className="text-sm font-black text-gray-900">{broker.stats?.activeListings || 0}</span>
                          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tight">{t('inventory')}</span>
                        </div>
                        <div className="w-px h-8 bg-gray-100" />
                        <div className="flex flex-col">
                          <span className="text-sm font-black text-gray-900">{broker.stats?.totalViews || 0}</span>
                          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tight">{t('totalViews')}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex flex-col gap-1.5">
                        <div className="flex items-center gap-1.5">
                          <MessageSquare className="w-3.5 h-3.5 text-primary-500" />
                          <span className="text-xs font-bold text-gray-700">{broker.stats?.totalLeads || 0} {t('activeLeads')}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                          <span className="text-xs font-bold text-gray-700">4.8 {t('profileRating')}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                        <div className={`flex items-center bg-gray-50/50 p-1 rounded-2xl border border-gray-100/50 w-fit ${isRTL ? 'flex-row-reverse' : ''}`}>
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedBroker(broker);
                              setModalMode('reclaim');
                              setIsCreditModalOpen(true);
                            }}
                            className="w-9 h-9 flex items-center justify-center text-amber-600 hover:bg-white hover:shadow-sm rounded-xl transition-all active:scale-90"
                            title={t('reclaimCreditsTitle')}
                          >
                            <Minus className="w-4 h-4" />
                          </button>
                          
                          <div className="px-4 text-center min-w-[70px]">
                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-tighter block leading-none mb-1">{t('creditsLabel')}</span>
                            <span className="text-sm font-black text-gray-900 leading-none">{broker.creditsBalance || 0}</span>
                          </div>

                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedBroker(broker);
                              setModalMode('allocate');
                              setIsCreditModalOpen(true);
                            }}
                            className="w-9 h-9 flex items-center justify-center text-primary-600 hover:bg-white hover:shadow-sm rounded-xl transition-all active:scale-90"
                            title={t('allocateCreditsTitle')}
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                        </div>
                    </td>
                    <td className="px-8 py-6">
                      {broker.regaVerified ? (
                        <span className="px-3 py-1 rounded-full bg-green-50 text-green-700 text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 w-fit">
                          <ShieldCheck className="w-3.5 h-3.5" />
                          {tCommon('regaOfficial')}
                        </span>
                      ) : (
                        <span className="px-3 py-1 rounded-full bg-gray-50 text-gray-400 text-[10px] font-black uppercase tracking-widest w-fit">
                          {t('standard')}
                        </span>
                      )}
                    </td>
                    <td className="px-8 py-6 text-end">
                      <button 
                        onClick={(e) => e.stopPropagation()}
                        className="p-2 text-gray-400 hover:text-gray-900 transition-colors"
                      >
                        <MoreHorizontal className="w-5 h-5" />
                      </button>
                    </td>
                  </motion.tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-8 py-20 text-center">
                    <div className="flex flex-col items-center gap-4">
                      <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center text-gray-300">
                        <Users className="w-10 h-10" />
                      </div>
                      <div className="text-gray-900 font-bold text-lg">{t('noBrokersFound')}</div>
                      <p className="text-gray-400 text-sm max-w-xs mx-auto">{t('noBrokersFoundDesc')}</p>
                      <button className="mt-4 px-8 py-3 bg-gray-900 text-white rounded-2xl font-bold text-sm hover:bg-black transition-all shadow-lg active:scale-95">
                        {t('addBroker')}
                      </button>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Card View */}
        <div className="lg:hidden space-y-4">
          {filteredBrokers.length > 0 ? (
            filteredBrokers.map((broker) => (
              <motion.div 
                key={broker.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                onClick={() => router.push(`/${locale}/brokers/${broker.id}`)}
                className="bg-white border-b border-gray-100 p-6 space-y-6 cursor-pointer"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-primary-50 flex items-center justify-center text-primary-600 font-black text-xl border border-primary-100 overflow-hidden relative">
                      {broker.avatarUrl ? (
                        <Image src={broker.avatarUrl} alt={broker.name} fill className="object-cover" />
                      ) : (
                        broker.name?.charAt(0)
                      )}
                    </div>
                    <div>
                      <p className="font-bold text-gray-900 text-base">{broker.name}</p>
                      <p className="text-xs text-gray-400 font-medium">{broker.email}</p>
                    </div>
                  </div>
                  <button 
                    onClick={(e) => e.stopPropagation()}
                    className="p-2 text-gray-400"
                  >
                    <MoreHorizontal className="w-5 h-5" />
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-50 p-4 rounded-2xl">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">{t('inventory')}</p>
                    <div className="flex items-center gap-2">
                       <span className="text-lg font-black text-gray-900">{broker.stats?.activeListings || 0}</span>
                       <span className="text-[10px] font-bold text-primary-600 bg-primary-50 px-2 py-0.5 rounded-md">{t('live')}</span>
                    </div>
                  </div>
                  <div className="bg-gray-50/50 p-4 rounded-[24px] border border-gray-100/50">
                    <div className="flex items-center justify-between gap-4">
                      <div className={`flex items-center bg-white p-1 rounded-2xl shadow-sm border border-gray-100/30 flex-1 ${isRTL ? 'flex-row-reverse' : ''}`}>
                        <button 
                           onClick={(e) => {
                             e.stopPropagation();
                             setSelectedBroker(broker);
                             setModalMode('reclaim');
                             setIsCreditModalOpen(true);
                           }}
                           className="w-10 h-10 flex items-center justify-center text-amber-600 hover:bg-gray-50 rounded-xl transition-all active:scale-90"
                        >
                           <Minus className="w-4 h-4" />
                        </button>
                        
                        <div className="flex-1 text-center">
                          <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest block leading-none mb-1">{t('creditsLabel')}</span>
                          <span className="text-base font-black text-gray-900 leading-none">{broker.creditsBalance || 0}</span>
                        </div>

                        <button 
                           onClick={(e) => {
                             e.stopPropagation();
                             setSelectedBroker(broker);
                             setModalMode('allocate');
                             setIsCreditModalOpen(true);
                           }}
                           className="w-10 h-10 flex items-center justify-center text-primary-600 hover:bg-gray-50 rounded-xl transition-all active:scale-90"
                        >
                           <Plus className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1">
                       <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
                       <span className="text-xs font-bold text-gray-700">4.8</span>
                    </div>
                    <div className="flex items-center gap-1 text-gray-400">
                       <MessageSquare className="w-3 h-3" />
                       <span className="text-xs font-bold">{broker.stats?.totalLeads} Leads</span>
                    </div>
                  </div>
                  {broker.regaVerified && (
                     <span className="flex items-center gap-1 text-[10px] font-bold text-green-600">
                        <CheckCircle className="w-3 h-3" /> {tCommon('regaOfficial')}
                     </span>
                  )}
                </div>
              </motion.div>
            ))
          ) : (
             <div className="px-6 py-20 text-center">
                <p className="text-gray-400 font-bold">{t('noBrokersFound') || 'No agents found'}</p>
             </div>
          )}
        </div>
      </div>

      {/* ── Credit Allocation Modal ── */}
      <AnimatePresence>
        {isCreditModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                setIsCreditModalOpen(false);
                setCreditAmount(10);
              }}
              className="absolute inset-0 bg-gray-900/60 backdrop-blur-xl"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-md bg-white rounded-[40px] shadow-2xl overflow-hidden p-10"
            >
              <div className="mb-8">
                <div className={`w-16 h-16 rounded-3xl flex items-center justify-center mb-6 ${
                  modalMode === 'reclaim' ? 'bg-amber-50 text-amber-600' : 'bg-primary-50 text-primary-600'
                }`}>
                  <CreditCard className="w-8 h-8" />
                </div>
                <h2 className="text-2xl font-black text-gray-900 mb-2">
                  {modalMode === 'reclaim' ? t('reclaimCreditsTitle') : t('allocateCreditsTitle')}
                </h2>
                <p className="text-gray-500 font-medium leading-relaxed">
                  {modalMode === 'reclaim' 
                    ? t('reclaimCreditDesc') 
                    : t('allocateCreditDesc')}
                  <span className={`${modalMode === 'reclaim' ? 'text-amber-600' : 'text-primary-600'} font-bold mx-1`}>
                    {selectedBroker?.name}
                  </span>
                </p>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-3">Amount</label>
                  <div className="grid grid-cols-3 gap-3">
                    {[10, 25, 50].map(amt => (
                      <button 
                        key={amt}
                        onClick={() => setCreditAmount(amt)}
                        className={`py-3 rounded-2xl font-bold text-sm transition-all border ${
                          creditAmount === amt 
                            ? modalMode === 'reclaim'
                              ? 'bg-amber-600 text-white border-amber-600 shadow-xl shadow-amber-600/30'
                              : 'bg-primary-600 text-white border-primary-600 shadow-xl shadow-primary-600/30'
                            : 'bg-white text-gray-600 border-gray-100 hover:bg-gray-50'
                        }`}
                      >
                        {amt}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="relative">
                  <span className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-400 font-bold">#</span>
                  <input 
                    type="number"
                    value={creditAmount}
                    onChange={(e) => setCreditAmount(Number(e.target.value))}
                    className="w-full pl-12 pr-6 py-4 bg-gray-50 rounded-2xl border-none font-bold text-gray-900 focus:ring-2 focus:ring-primary-500/20 transition-all outline-none"
                    placeholder="Custom amount"
                  />
                </div>

                <div className="flex gap-4 mt-10">
                  <button 
                    onClick={() => {
                      setIsCreditModalOpen(false);
                      setCreditAmount(10);
                    }}
                    className="flex-1 py-4 bg-gray-50 text-gray-600 rounded-2xl font-bold text-sm hover:bg-gray-100 transition-all"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={handleCreditAction}
                    disabled={transferring}
                    className={`flex-1 py-4 text-white rounded-2xl font-bold text-sm shadow-2xl transition-all disabled:opacity-50 flex items-center justify-center gap-2 ${
                      modalMode === 'reclaim'
                        ? 'bg-amber-600 hover:bg-amber-500 shadow-amber-600/30'
                        : 'bg-primary-600 hover:bg-primary-500 shadow-primary-600/30'
                    }`}
                  >
                    {transferring ? <Loader2 className="w-4 h-4 animate-spin" /> : modalMode === 'reclaim' ? <Minus className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                    {modalMode === 'reclaim' ? 'Withdraw Credits' : 'Confirm Transfer'}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      {/* ── Dynamic Status Modal ── */}
      <AnimatePresence>
        {statusModal.isOpen && (
          <div className="fixed inset-0 z-[300] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setStatusModal(prev => ({ ...prev, isOpen: false }))}
              className="absolute inset-0 bg-gray-900/60 backdrop-blur-xl"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 30 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 30 }}
              transition={{ type: "spring", damping: 25, stiffness: 350 }}
              className="relative w-full max-w-sm bg-white rounded-[40px] shadow-[0_30px_60px_-15px_rgba(0,0,0,0.3)] overflow-hidden p-10 text-center"
            >
              <div className="mb-8 flex flex-col items-center">
                <div className={`w-20 h-20 rounded-[30px] flex items-center justify-center mb-6 ${
                  statusModal.type === 'success' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'
                }`}>
                  {statusModal.type === 'success' ? <CheckCircle className="w-10 h-10" /> : <AlertCircle className="w-10 h-10" />}
                </div>
                <h2 className="text-2xl font-black text-gray-900 mb-2 truncate px-2">{statusModal.title}</h2>
                <p className="text-gray-500 font-medium leading-relaxed px-4 text-sm">
                  {statusModal.message}
                </p>
              </div>

              <div className="flex flex-col gap-3">
                {statusModal.actionType === 'buy' ? (
                  <>
                    <button 
                      onClick={() => router.push(`/${locale}/packages`)}
                      className={`w-full py-4 bg-primary-600 text-white rounded-2xl font-bold text-sm hover:bg-primary-500 shadow-xl shadow-primary-600/30 transition-all flex items-center justify-center gap-2 group ${isRTL ? 'flex-row-reverse' : ''}`}
                    >
                      {t('buyCreditsCTA')}
                      <ArrowUpRight className={`w-4 h-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 ${isRTL ? 'rotate-[270deg]' : ''}`} />
                    </button>
                    <button 
                      onClick={() => setStatusModal(prev => ({ ...prev, isOpen: false }))}
                      className="w-full py-4 text-gray-400 font-bold text-xs hover:text-gray-600 transition-all"
                    >
                      {t('maybeLater')}
                    </button>
                  </>
                ) : (
                  <button 
                    onClick={() => setStatusModal(prev => ({ ...prev, isOpen: false }))}
                    className={`w-full py-4 rounded-2xl font-bold text-sm shadow-xl transition-all ${
                      statusModal.type === 'success' 
                        ? 'bg-gray-900 text-white shadow-gray-900/10 hover:bg-black' 
                        : 'bg-red-600 text-white shadow-red-600/10 hover:bg-red-500'
                    }`}
                  >
                    {statusModal.type === 'success' ? t('great') : t('dismiss')}
                  </button>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
