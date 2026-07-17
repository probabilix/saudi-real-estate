'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useLocale } from 'next-intl';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useCompareStore } from '@/lib/store/useCompareStore';
import { X, ArrowRightLeft, Building2, Layers, ChevronDown } from 'lucide-react';
import clsx from 'clsx';
import { api } from '@/lib/api';

export default function ComparisonTray() {
  const locale = useLocale();
  const isAr = locale === 'ar';

  const {
    comparedListings,
    comparedProjects,
    removeListing,
    removeProject,
    clearAllListings,
    clearAllProjects
  } = useCompareStore();

  const pathname = usePathname();
  const [activeTab, setActiveTab] = useState<'listings' | 'projects'>('listings');
  const [hydrated, setHydrated] = useState(false);
  const [listingsData, setListingsData] = useState<any[]>([]);
  const [projectsData, setProjectsData] = useState<any[]>([]);

  const [prevListingsCount, setPrevListingsCount] = useState(comparedListings.length);
  const [prevProjectsCount, setPrevProjectsCount] = useState(comparedProjects.length);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Minimization states
  const [isMinimized, setIsMinimized] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Auto-switch tab based on path route context or contents fallback
  useEffect(() => {
    if (pathname.includes('/projects')) {
      setActiveTab('projects');
    } else if (pathname.includes('/listings')) {
      setActiveTab('listings');
    } else {
      if (comparedListings.length > 0 && comparedProjects.length === 0) {
        setActiveTab('listings');
      } else if (comparedProjects.length > 0 && comparedListings.length === 0) {
        setActiveTab('projects');
      }
    }
  }, [pathname, comparedListings.length, comparedProjects.length]);

  // Sync toast notifications on addition/removal
  // ALSO: Auto-expand the tray if a new item is added
  useEffect(() => {
    if (!hydrated) return;
    if (comparedListings.length > prevListingsCount) {
      setToastMessage(isAr ? 'تمت إضافة العقار للمقارنة! ↔️' : 'Property added to compare! ↔️');
      setIsMinimized(false); // Auto-expand on addition
    } else if (comparedListings.length < prevListingsCount) {
      setToastMessage(isAr ? 'تمت إزالة العقار من المقارنة' : 'Property removed from compare');
    }
    setPrevListingsCount(comparedListings.length);
  }, [comparedListings.length, hydrated, isAr, prevListingsCount]);

  useEffect(() => {
    if (!hydrated) return;
    if (comparedProjects.length > prevProjectsCount) {
      setToastMessage(isAr ? 'تمت إضافة المشروع للمقارنة! ↔️' : 'Project added to compare! ↔️');
      setIsMinimized(false); // Auto-expand on addition
    } else if (comparedProjects.length < prevProjectsCount) {
      setToastMessage(isAr ? 'تمت إزالة المشروع من المقارنة' : 'Project removed from compare');
    }
    setPrevProjectsCount(comparedProjects.length);
  }, [comparedProjects.length, hydrated, isAr, prevProjectsCount]);

  useEffect(() => {
    if (!toastMessage) return;
    const timer = setTimeout(() => setToastMessage(null), 2500);
    return () => clearTimeout(timer);
  }, [toastMessage]);

  // Hydrate store state from localStorage
  useEffect(() => {
    setHydrated(true);
  }, []);

  // Sync active tab based on contents
  useEffect(() => {
    if (comparedListings.length > 0 && comparedProjects.length === 0) {
      setActiveTab('listings');
    } else if (comparedProjects.length > 0 && comparedListings.length === 0) {
      setActiveTab('projects');
    }
  }, [comparedListings.length, comparedProjects.length]);

  // Fetch thumbnails in batch whenever IDs change
  useEffect(() => {
    if (!hydrated) return;

    const fetchListings = async () => {
      if (comparedListings.length === 0) {
        setListingsData([]);
        return;
      }
      try {
        const res = await api.getListingsBatch(comparedListings);
        if (res.success && res.data) {
          setListingsData(res.data);
        }
      } catch (e) {
        console.error(e);
      }
    };

    fetchListings();
  }, [comparedListings, hydrated]);

  useEffect(() => {
    if (!hydrated) return;

    const fetchProjects = async () => {
      if (comparedProjects.length === 0) {
        setProjectsData([]);
        return;
      }
      try {
        const res = await api.getProjectsBatch(comparedProjects);
        if (res.success && res.data) {
          setProjectsData(res.data);
        }
      } catch (e) {
        console.error(e);
      }
    };

    fetchProjects();
  }, [comparedProjects, hydrated]);

  if (!hydrated) return null;

  const totalSelected = comparedListings.length + comparedProjects.length;

  const activeIds = activeTab === 'listings' ? comparedListings : comparedProjects;
  const activeData = activeTab === 'listings' ? listingsData : projectsData;
  const activeRemove = activeTab === 'listings' ? removeListing : removeProject;
  const activeClear = activeTab === 'listings' ? clearAllListings : clearAllProjects;

  return (
    <>
      {/* Toast Alert */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95, x: '-50%' }}
            animate={{ opacity: 1, y: 0, scale: 1, x: '-50%' }}
            exit={{ opacity: 0, y: -20, scale: 0.95, x: '-50%' }}
            className="fixed bottom-24 left-1/2 z-[60] bg-slate-800/95 text-white font-bold text-xs py-3.5 px-5 rounded-2xl shadow-xl flex items-center gap-2.5 border border-slate-700 backdrop-blur-md whitespace-nowrap"
          >
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping shrink-0" />
            <span>{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {totalSelected > 0 && (
          isMinimized ? (
            /* Minimized Tray Handle/Pill */
            <motion.button
              key="minimized-tray"
              initial={{ y: 80, x: isMobile ? "0%" : "-50%", opacity: 0 }}
              animate={{ y: 0, x: isMobile ? "0%" : "-50%", opacity: 1 }}
              exit={{ y: 80, x: isMobile ? "0%" : "-50%", opacity: 0 }}
              onClick={() => setIsMinimized(false)}
              className={clsx(
                "fixed z-[100] bg-slate-900 border border-slate-700 text-white shadow-2xl flex items-center justify-center transition-all cursor-pointer hover:scale-105 active:scale-95 duration-150",
                isMobile
                  ? "bottom-20 left-4 w-12 h-12 rounded-full"
                  : "bottom-6 left-1/2 px-5 py-3 rounded-full gap-3 text-xs font-bold whitespace-nowrap"
              )}
            >
              {isMobile ? (
                <div className="relative w-full h-full flex items-center justify-center">
                  <ArrowRightLeft className="w-5 h-5 text-primary-400" />
                  <span className="absolute -top-1.5 -right-1.5 bg-primary-600 text-white rounded-full w-5 h-5 flex items-center justify-center font-black text-[10px] shadow-md border border-slate-900">
                    {totalSelected}
                  </span>
                </div>
              ) : (
                <>
                  <ArrowRightLeft className="w-4 h-4 text-primary-450 animate-pulse" />
                  <span>
                    {isAr
                      ? `قارن (${totalSelected}) - انقر للفتح`
                      : `Compare (${totalSelected}) - Click to expand`
                    }
                  </span>
                  <span className="bg-primary-600 text-white rounded-full w-5 h-5 flex items-center justify-center font-black text-[10px]">
                    {totalSelected}
                  </span>
                </>
              )}
            </motion.button>
          ) : (
            /* Fully Expanded Tray */
            <motion.div
              key="expanded-tray"
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 100, opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed bottom-0 left-0 right-0 z-[100] px-4 pb-4 pt-2 md:pb-6 md:pt-3 bg-slate-900 border-t border-slate-700 shadow-[0_-8px_30px_rgb(0,0,0,0.4)]"
            >
              {/* Tray Header Minimizer Button - Fully visible colored tab */}
              <div className="absolute right-6 top-0 -translate-y-full z-[101]">
                <button
                  onClick={() => setIsMinimized(true)}
                  className="bg-slate-900 border-x border-t border-slate-700 text-white hover:text-primary-400 px-4 py-2 rounded-t-xl text-[10px] font-black uppercase tracking-widest shadow-lg hover:bg-slate-800 transition-colors flex items-center gap-1.5 cursor-pointer border-b-0"
                >
                  <span>{isAr ? 'تصغير' : 'Minimize'}</span>
                  <ChevronDown className="w-3.5 h-3.5 text-current" />
                </button>
              </div>

              <div className="max-w-6xl mx-auto flex flex-col md:flex-row gap-4 items-center justify-between">

                {/* Header & Tabs */}
                <div className="flex flex-row md:flex-col gap-2 items-start justify-between w-full md:w-auto border-b md:border-b-0 pb-2 md:pb-0 border-slate-700">
                  <div className="flex items-center gap-2">
                    <ArrowRightLeft className="w-5 h-5 text-primary-500 animate-pulse" />
                    <h4 className="font-bold text-sm text-slate-100">
                      {isAr ? 'لوحة المقارنة' : 'Comparison Tray'}
                    </h4>
                  </div>

                  <div className="flex gap-1 bg-slate-900/50 p-0.5 rounded-lg text-xs font-semibold text-slate-400 border border-slate-750/30">
                    <button
                      onClick={() => setActiveTab('listings')}
                      className={`px-3 py-1.5 rounded-md transition-all flex items-center gap-1.5 ${activeTab === 'listings'
                          ? 'bg-slate-700 text-white shadow-sm'
                          : 'hover:text-slate-200'
                        }`}
                    >
                      <Building2 className="w-3.5 h-3.5" />
                      <span>{isAr ? 'العقارات' : 'Properties'}</span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-black transition-colors ${comparedListings.length > 0 ? 'bg-primary-650 text-white' : 'bg-slate-750 text-slate-450'
                        }`}>
                        {comparedListings.length}
                      </span>
                    </button>
                    <button
                      onClick={() => setActiveTab('projects')}
                      className={`px-3 py-1.5 rounded-md transition-all flex items-center gap-1.5 ${activeTab === 'projects'
                          ? 'bg-slate-700 text-white shadow-sm'
                          : 'hover:text-slate-200'
                        }`}
                    >
                      <Layers className="w-3.5 h-3.5" />
                      <span>{isAr ? 'المشاريع' : 'Projects'}</span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-black transition-colors ${comparedProjects.length > 0 ? 'bg-primary-650 text-white' : 'bg-slate-750 text-slate-450'
                        }`}>
                        {comparedProjects.length}
                      </span>
                    </button>
                  </div>
                </div>

                {/* Selected items tray */}
                <div className="flex items-center gap-3 w-full justify-start overflow-x-auto py-1.5 scrollbar-thin [&::-webkit-scrollbar]:h-1 [&::-webkit-scrollbar-thumb]:bg-slate-700 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-track]:bg-transparent">
                  {Array.from({ length: 4 }).map((_, idx) => {
                    const itemId = activeIds[idx];
                    const item = activeData.find((d) => d.id === itemId);

                    if (itemId && item) {
                      const title = isAr ? item.arTitle || item.nameAr : item.enTitle || item.nameEn || item.arTitle || item.nameAr;
                      const photo = (item.photos && item.photos[0]) || '/placeholder.png';
                      const priceText = item.price
                        ? `${item.price.toLocaleString(isAr ? 'ar-SA' : 'en-US')} SAR`
                        : (item.minPrice ? `${item.minPrice.toLocaleString(isAr ? 'ar-SA' : 'en-US')} SAR+` : (isAr ? 'مستجدات الأسعار' : 'Ask Price'));

                      return (
                        <div
                          key={itemId}
                          className="relative flex items-center gap-2 bg-slate-900/40 hover:bg-slate-900/60 border border-slate-750/80 rounded-xl p-1.5 pr-3 pl-2 group shrink-0 transition-colors shadow-sm"
                        >
                          <div className="relative w-10 h-10 rounded-lg overflow-hidden shrink-0 border border-slate-750">
                            <Image
                              src={photo}
                              alt="Preview"
                              fill
                              sizes="40px"
                              className="object-cover"
                            />
                          </div>
                          <div className="flex flex-col text-left max-w-[120px] md:max-w-[150px]">
                            <span className="text-[11px] font-bold text-slate-200 truncate leading-tight">
                              {title}
                            </span>
                            <span className="text-[10px] font-black text-primary-400 mt-0.5">
                              {priceText}
                            </span>
                          </div>
                          <button
                            onClick={() => activeRemove(itemId)}
                            className="absolute -top-1.5 -right-1.5 bg-rose-500 hover:bg-rose-600 text-white rounded-full p-0.5 shadow-md transition-colors"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      );
                    }

                    return (
                      <Link
                        key={`empty-${idx}`}
                        href={`/${locale}/${activeTab === 'listings' ? 'listings' : 'projects'}`}
                        className="w-[140px] md:w-[180px] h-[52px] border-2 border-dashed border-slate-700 hover:border-primary-500 hover:bg-primary-950/10 rounded-xl flex items-center justify-center text-slate-500 hover:text-primary-400 text-xs shrink-0 font-bold transition-all group"
                      >
                        <span className="group-hover:scale-105 transition-transform">
                          {isAr ? '+ إضافة' : '+ Add Item'}
                        </span>
                      </Link>
                    );
                  })}
                </div>

                {/* Action buttons */}
                <div className="flex items-center gap-3 shrink-0 w-full md:w-auto justify-end border-t md:border-t-0 pt-2 md:pt-0 border-slate-750">
                  <button
                    onClick={() => activeClear()}
                    className="text-xs text-slate-400 hover:text-rose-400 transition-colors font-semibold py-2 px-1"
                  >
                    {isAr ? 'مسح الكل' : 'Clear All'}
                  </button>
                  <Link
                    href={`/${locale}/compare?type=${activeTab}&ids=${activeIds.join(',')}`}
                    onClick={(e) => {
                      if (activeIds.length < 2) {
                        e.preventDefault();
                        alert(
                          isAr
                            ? 'يرجى اختيار عقارين على الأقل لبدء المقارنة.'
                            : 'Please select at least 2 items to compare.'
                        );
                      }
                    }}
                    className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all shadow-md shrink-0 ${activeIds.length >= 2
                        ? 'bg-primary-600 text-white hover:bg-primary-500 shadow-lg shadow-primary-900/30'
                        : 'bg-slate-700 text-slate-500 cursor-not-allowed shadow-none'
                      }`}
                  >
                    {isAr ? 'قارن الآن' : 'Compare Now'}
                  </Link>
                </div>

              </div>
            </motion.div>
          )
        )}
      </AnimatePresence>
    </>
  );
}
