'use client';

import { useEffect, useState, Suspense, useRef } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { useCompareStore } from '@/lib/store/useCompareStore';
import { api } from '@/lib/api';
import { 
  X, ArrowRightLeft, ArrowLeft, Heart, Share2, Info, Check, Shield, Lock, 
  Sparkles, Building2, Layers, MapPin, Eye, CheckCircle, Loader2 
} from 'lucide-react';
import { formatPriceCompact } from '@saudi-re/shared';
import { useAuth } from '@/hooks/use-auth';

export default function CompareClient({ params }: { params: { locale: string } }) {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
      </div>
    }>
      <ComparePageContent params={params} />
    </Suspense>
  );
}

function ComparePageContent({ params: { locale } }: { params: { locale: string } }) {
  const isAr = locale === 'ar';
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { isAuthenticated } = useAuth();

  // Search parameters or store fallback
  const paramType = searchParams?.get('type') as 'listings' | 'projects' | null;
  const paramIds = searchParams?.get('ids')?.split(',').filter(Boolean) || [];

  const {
    comparedListings,
    comparedProjects,
    removeListing,
    removeProject,
    syncLoggedComparison
  } = useCompareStore();

  const [hydrated, setHydrated] = useState(false);
  const [activeType, setActiveType] = useState<'listings' | 'projects'>('listings');
  const [activeIds, setActiveIds] = useState<string[]>([]);
  const [itemsData, setItemsData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [highlightDiffs, setHighlightDiffs] = useState(false);
  const [amenitiesModalOpen, setAmenitiesModalOpen] = useState(false);
  const [relatedItems, setRelatedItems] = useState<any[]>([]);
  const [loadingRelated, setLoadingRelated] = useState(false);
  const [copied, setCopied] = useState(false);
  const [favoritedIds, setFavoritedIds] = useState<Set<string>>(new Set());
  const [togglingFavorites, setTogglingFavorites] = useState<Set<string>>(new Set());

  // Initialize favoritedIds
  useEffect(() => {
    const favorited = new Set<string>();
    itemsData.forEach((item) => {
      if (item.isFavorited) {
        favorited.add(item.id);
      }
    });
    setFavoritedIds(favorited);
  }, [itemsData]);

  // ── Scroll Sync State ──
  const headerScrollRef = useRef<HTMLDivElement>(null);
  const bodyScrollRef = useRef<HTMLDivElement>(null);

  const handleBodyScroll = (e: React.UIEvent<HTMLDivElement>) => {
    if (headerScrollRef.current) headerScrollRef.current.scrollLeft = e.currentTarget.scrollLeft;
  };
  const handleHeaderScroll = (e: React.UIEvent<HTMLDivElement>) => {
    if (bodyScrollRef.current) bodyScrollRef.current.scrollLeft = e.currentTarget.scrollLeft;
  };

  // Extract all custom amenities present in any of the compared items
  const customAmenityKeys = Array.from(
    new Set(
      itemsData.flatMap((item) =>
        item.amenities
          ? Object.keys(item.amenities).filter(
              (k) => item.amenities[k] === true && !AMENITY_METADATA[k]
            )
          : []
      )
    )
  );

  // 1. Hydration & Initial Scoping
  useEffect(() => {
    setHydrated(true);
    
    // Resolve compared set: query params take priority, fallback to Zustand store
    const type = paramType || (comparedProjects.length > 0 && comparedListings.length === 0 ? 'projects' : 'listings');
    const ids = paramIds.length > 0 ? paramIds : (type === 'listings' ? comparedListings : comparedProjects);
    
    setActiveType((prev) => prev !== type ? type : prev);
    setActiveIds((prev) => JSON.stringify(prev) !== JSON.stringify(ids) ? ids : prev);
  }, [searchParams, comparedListings, comparedProjects, paramType, hydrated]);

  // 2. Fetch compared items data and log co-occurrence in database
  useEffect(() => {
    if (!hydrated || activeIds.length === 0) {
      setLoading(false);
      return;
    }

    let ignore = false;
    const fetchData = async () => {
      setLoading(true);
      try {
        if (activeType === 'listings') {
          const res = await api.getListingsBatch(activeIds);
          if (res.success && res.data && !ignore) {
            setItemsData(res.data);
            syncLoggedComparison('listings', activeIds);
          }
        } else {
          const res = await api.getProjectsBatch(activeIds);
          if (res.success && res.data && !ignore) {
            setItemsData(res.data);
            syncLoggedComparison('projects', activeIds);
          }
        }
      } catch (e) {
        console.error(e);
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    };

    fetchData();
    return () => { ignore = true; };
  }, [activeIds, activeType, hydrated]);

  // 3. Fetch related items to compare below the matrix
  useEffect(() => {
    if (!hydrated || itemsData.length === 0) return;

    let ignore = false;
    const fetchRelated = async () => {
      setLoadingRelated(true);
      try {
        const baseItem = itemsData[0];
        const city = baseItem.city;
        
        if (activeType === 'listings') {
          // Fetch listings in the same city
          const params = new URLSearchParams();
          params.set('city', city);
          params.set('limit', '6');
          const res = await api.getListings(params.toString());
          let items = res.success && res.data?.items ? res.data.items : [];
          let filtered = items.filter((l: any) => !activeIds.includes(l.id));

          // Fallback to fetch from all cities if not enough matches in the same city
          if (filtered.length < 3) {
            const fallbackRes = await api.getListings('limit=6');
            if (fallbackRes.success && fallbackRes.data?.items) {
              const fallbackFiltered = fallbackRes.data.items.filter(
                (l: any) => !activeIds.includes(l.id) && !filtered.some((f) => f.id === l.id)
              );
              filtered = [...filtered, ...fallbackFiltered];
            }
          }
          if (!ignore) setRelatedItems(filtered.slice(0, 3));
        } else {
          // Fetch projects in the same city
          const res = await api.getProjectsPublic(`city=${city}&limit=6`);
          let items = res.success && res.data?.items ? res.data.items : [];
          let filtered = items.filter((p: any) => !activeIds.includes(p.id));

          // Fallback to fetch from all cities if not enough matches in the same city
          if (filtered.length < 3) {
            const fallbackRes = await api.getProjectsPublic('limit=6');
            if (fallbackRes.success && fallbackRes.data?.items) {
              const fallbackFiltered = fallbackRes.data.items.filter(
                (p: any) => !activeIds.includes(p.id) && !filtered.some((f) => f.id === p.id)
              );
              filtered = [...filtered, ...fallbackFiltered];
            }
          }
          if (!ignore) setRelatedItems(filtered.slice(0, 3));
        }
      } catch (e) {
        console.error('Failed to fetch related items', e);
      } finally {
        if (!ignore) setLoadingRelated(false);
      }
    };

    fetchRelated();
    return () => { ignore = true; };
  }, [itemsData, hydrated, activeType, activeIds]);

  const handleShare = () => {
    if (typeof window === 'undefined') return;
    const shareUrl = `${window.location.origin}/${locale}/compare?type=${activeType}&ids=${activeIds.join(',')}`;
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRemove = (id: string) => {
    if (activeType === 'listings') {
      removeListing(id);
    } else {
      removeProject(id);
    }
    // Update local state dynamically
    const updatedIds = activeIds.filter((x) => x !== id);
    setActiveIds(updatedIds);
    setItemsData((prev) => prev.filter((item) => item.id !== id));
    
    // Sync URL query params
    router.replace(`/${locale}/compare?type=${activeType}&ids=${updatedIds.join(',')}`);
  };

  const handleAddFromRelated = (id: string) => {
    if (activeIds.length >= 4) {
      alert(
        isAr 
          ? 'تم الوصول للحد الأقصى للمقارنة (4 عناصر).' 
          : 'You have reached the maximum comparison limit of 4 items.'
      );
      return;
    }
    if (activeType === 'listings') {
      const { addListing } = useCompareStore.getState();
      addListing(id);
    } else {
      const { addProject } = useCompareStore.getState();
      addProject(id);
    }
    const updatedIds = [...activeIds, id];
    setActiveIds(updatedIds);
    router.replace(`/${locale}/compare?type=${activeType}&ids=${updatedIds.join(',')}`);
  };

  const handleToggleFavorite = async (id: string) => {
    if (!isAuthenticated) {
      router.push(`/${locale}/auth/login?returnTo=${pathname}`);
      return;
    }

    if (togglingFavorites.has(id)) return;

    setTogglingFavorites((prev) => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });

    const isFav = favoritedIds.has(id);
    setFavoritedIds((prev) => {
      const next = new Set(prev);
      if (isFav) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });

    try {
      let success = false;
      if (activeType === 'listings') {
        const res = await api.toggleFavorite(id);
        success = res.success;
      } else {
        const res = await api.toggleProjectFavorite(id);
        success = res.success;
      }

      if (!success) {
        // Revert UI on failure
        setFavoritedIds((prev) => {
          const next = new Set(prev);
          if (isFav) {
            next.add(id);
          } else {
            next.delete(id);
          }
          return next;
        });
      }
    } catch (e) {
      console.error('Failed to toggle favorite', e);
      // Revert UI on error
      setFavoritedIds((prev) => {
        const next = new Set(prev);
        if (isFav) {
          next.add(id);
        } else {
          next.delete(id);
        }
        return next;
      });
    } finally {
      setTogglingFavorites((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  if (!hydrated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
      </div>
    );
  }

  // ── HELPER: Check if a row values differ across columns ──
  const isRowDifferent = (fieldGetter: (item: any) => any) => {
    if (itemsData.length < 2) return false;
    const firstVal = JSON.stringify(fieldGetter(itemsData[0]));
    return itemsData.some((item) => JSON.stringify(fieldGetter(item)) !== firstVal);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-charcoal pb-24">
      {/* Top Header bar */}
      <div className="bg-white border-b border-slate-200 py-6 relative z-10 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 md:px-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Link 
              href={`/${locale}/${activeType === 'listings' ? 'listings' : 'projects'}`}
              className="p-2 rounded-full hover:bg-slate-100 transition-colors"
            >
              <ArrowLeft className={`w-5 h-5 text-charcoal ${isAr ? 'rotate-180' : ''}`} />
            </Link>
            <div>
              <h1 className="text-xl md:text-2xl font-black tracking-tight text-slate-800 flex items-center gap-2">
                <ArrowRightLeft className="w-6 h-6 text-primary-600" />
                {isAr ? 'مقارنة العقارات والمشاريع' : 'Property & Project Comparison'}
              </h1>
              <p className="text-xs text-slate-500 font-medium mt-1">
                {isAr 
                  ? `مقارنة ${activeType === 'listings' ? 'عقارات فريدة' : 'مشاريع تطويرية'} جنباً إلى جنب` 
                  : `Side-by-side matrix for ${activeType === 'listings' ? 'properties' : 'developer projects'}`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end md:self-auto">
            {itemsData.length >= 2 && (
              <button
                onClick={() => setHighlightDiffs(!highlightDiffs)}
                className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all ${
                  highlightDiffs
                    ? 'bg-amber-50 text-amber-700 border-amber-200 shadow-sm'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
              >
                {isAr ? 'تظليل الاختلافات' : 'Highlight Differences'}
              </button>
            )}

            <button
              onClick={handleShare}
              className="flex items-center gap-2 bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-sm"
            >
              <Share2 className="w-4 h-4" />
              {copied ? (isAr ? 'تم النسخ!' : 'Copied!') : (isAr ? 'مشاركة' : 'Share')}
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 md:px-6 mt-8">
        {loading ? (
          <div className="bg-white rounded-3xl border border-slate-100 p-24 flex items-center justify-center min-h-[400px]">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
              <span className="text-sm font-semibold text-slate-500">
                {isAr ? 'جاري تحميل تفاصيل المقارنة...' : 'Loading comparison details...'}
              </span>
            </div>
          </div>
        ) : activeIds.length === 0 ? (
          /* Empty / Insufficient State */
          <div className="bg-white rounded-3xl border border-slate-200 p-16 text-center max-w-xl mx-auto shadow-sm">
            <ArrowRightLeft className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-slate-800">
              {isAr ? 'الرجاء تحديد عناصر للمقارنة' : 'No items selected to compare'}
            </h3>
            <p className="text-sm text-slate-500 mt-2">
              {isAr 
                ? 'تحتاج إلى اختيار عقار أو مشروع واحد على الأقل لبدء مقارنة side-by-side.' 
                : 'Select properties or projects to view the comparison matrix.'}
            </p>
            <div className="mt-6 flex justify-center gap-3">
              <Link
                href={`/${locale}/listings`}
                className="bg-primary-600 hover:bg-primary-700 text-white font-bold text-xs px-6 py-3 rounded-xl transition-all shadow-md shadow-primary-200"
              >
                {isAr ? 'تصفح العقارات' : 'Browse Properties'}
              </Link>
              <Link
                href={`/${locale}/projects`}
                className="bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 font-bold text-xs px-6 py-3 rounded-xl transition-all shadow-sm"
              >
                {isAr ? 'تصفح المشاريع' : 'Browse Projects'}
              </Link>
            </div>
          </div>
        ) : (
          /* Main Matrix - Dual Table Synchronized Layout */
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm relative">
            
            {/* ── HEADER TABLE (Sticky to Window) ── */}
            <div className="sticky top-0 z-40 bg-white rounded-t-3xl shadow-[0_4px_20px_-10px_rgba(0,0,0,0.1)] border-b border-slate-200/60">
              <div 
                ref={headerScrollRef}
                onScroll={handleHeaderScroll}
                className="overflow-x-auto scrollbar-none [&::-webkit-scrollbar]:hidden"
              >
                <table className="w-full border-collapse min-w-[700px] table-fixed">
                  <thead>
                    <tr className="bg-slate-50/50">
                      <th className="w-1/5 p-5 text-left rtl:text-right font-black text-xs text-primary-900 bg-primary-50 uppercase tracking-wider sticky left-0 start-0 z-30 shadow-[1px_0_0_0_rgba(226,232,240,1),0_1px_0_0_rgba(226,232,240,1)] rtl:shadow-[-1px_0_0_0_rgba(226,232,240,1),0_1px_0_0_rgba(226,232,240,1)] border-r border-slate-200">
                        {isAr ? 'المواصفات' : 'Attribute'}
                      </th>
                      {Array.from({ length: 4 }).map((_, idx) => {
                        const id = activeIds[idx];
                        const item = itemsData.find((d) => d.id === id);

                        if (id && item) {
                          const title = isAr ? item.arTitle || item.nameAr : item.enTitle || item.nameEn || item.arTitle || item.nameAr;
                          const photo = (item.photos && item.photos[0]) || '/placeholder.png';
                          const priceText = item.price 
                            ? `${item.price.toLocaleString(isAr ? 'ar-SA' : 'en-US')} SAR` 
                            : (item.minPrice ? `${item.minPrice.toLocaleString(isAr ? 'ar-SA' : 'en-US')} SAR+` : (isAr ? 'مستجدات الأسعار' : 'Ask Price'));

                          return (
                            <th key={id} className="w-1/5 p-5 align-top relative border-l border-slate-100 text-left rtl:text-right font-normal bg-white z-20 shadow-[0_1px_0_rgba(226,232,240,0.8)]">
                              <div className="flex flex-col h-full justify-between">
                                <div className="relative aspect-[4/3] rounded-2xl overflow-hidden border border-slate-200 shadow-sm shrink-0 mb-4 bg-slate-100">
                                  <Image
                                    src={photo}
                                    alt={title}
                                    fill
                                    sizes="200px"
                                    className="object-cover"
                                  />
                                  <button
                                    onClick={() => handleToggleFavorite(id)}
                                    className={`absolute top-2.5 start-2.5 rounded-full p-1.5 backdrop-blur-md shadow-md transition-all z-20 ${
                                      favoritedIds.has(id)
                                        ? 'bg-red-50 text-red-500 border border-red-100'
                                        : 'bg-white/80 hover:bg-white text-slate-500 hover:text-red-500'
                                    }`}
                                    title={isAr ? 'إضافة إلى المفضلة' : 'Add to Favorites'}
                                  >
                                    <Heart className={`w-4 h-4 ${favoritedIds.has(id) ? 'fill-current' : ''}`} />
                                  </button>
                                  <button
                                    onClick={() => handleRemove(id)}
                                    className="absolute top-2.5 right-2.5 bg-black/60 hover:bg-black/80 text-white rounded-full p-1.5 backdrop-blur-sm shadow-md transition-colors"
                                    title={isAr ? 'إزالة من المقارنة' : 'Remove item'}
                                  >
                                    <X className="w-4 h-4" />
                                  </button>
                                </div>
                                <div className="space-y-1 mb-4">
                                  <h3 className="font-bold text-sm text-slate-800 line-clamp-2 leading-tight">
                                    {title}
                                  </h3>
                                  <p className="text-xs font-black text-primary-600">
                                    {priceText}
                                  </p>
                                </div>
                                <Link
                                  href={activeType === 'listings' ? `/${locale}/listings/${id}` : `/${locale}/projects/${id}`}
                                  className="block text-center bg-slate-50 hover:bg-primary-50 text-slate-600 hover:text-primary-700 font-bold text-xs py-2 px-3 rounded-xl border border-slate-200 hover:border-primary-100 transition-all shadow-sm"
                                >
                                  {isAr ? 'عرض التفاصيل' : 'View Property'}
                                </Link>
                              </div>
                            </th>
                          );
                        }

                        return (
                          <th key={`empty-col-${idx}`} className="w-1/5 p-5 border-l border-slate-100 align-middle bg-slate-50/50 z-20 shadow-[0_1px_0_rgba(226,232,240,0.8)]">
                            <Link
                              href={`/${locale}/${activeType === 'listings' ? 'listings' : 'projects'}`}
                              className="border-2 border-dashed border-slate-200 hover:border-primary-300 hover:bg-primary-50/20 rounded-3xl h-48 flex flex-col items-center justify-center p-4 text-center select-none text-slate-400 hover:text-primary-600 transition-all group"
                            >
                              <ArrowRightLeft className="w-8 h-8 text-slate-300 mb-2 group-hover:scale-110 transition-transform" />
                              <span className="text-xs font-bold">
                                {isAr ? '+ إضافة عنصر' : '+ Add Item'}
                              </span>
                              <span className="text-[10px] text-slate-400 mt-1">
                                {isAr ? 'تصفح العقارات المتاحة' : 'Browse listings'}
                              </span>
                            </Link>
                          </th>
                        );
                      })}
                    </tr>
                  </thead>
                </table>
              </div>
            </div>

            {/* ── BODY TABLE (Horizontally Scrollable) ── */}
            <div 
              ref={bodyScrollRef}
              onScroll={handleBodyScroll}
              className="overflow-x-auto scrollbar-thin [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar]:h-2 [&::-webkit-scrollbar-thumb]:bg-slate-300/60 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-track]:bg-transparent pb-4 rounded-b-3xl"
            >
              <table className="w-full border-collapse min-w-[700px] table-fixed">
                <tbody>
                  {activeType === 'listings' ? (
                    /* ── LISTINGS ROWS ── */
                    <>
                      {/* Price */}
                      <tr className={`${highlightDiffs && isRowDifferent((item) => item.price) ? 'bg-amber-50/50' : ''} border-b border-slate-100 hover:bg-slate-50/30 transition-colors`}>
                        <td className="p-4 font-black text-xs text-primary-900 bg-primary-50 sticky left-0 start-0 shadow-[1px_0_0_0_rgba(226,232,240,1)] rtl:shadow-[-1px_0_0_0_rgba(226,232,240,1)] z-10 border-r border-slate-200 group-hover:bg-primary-50 transition-colors">
                          {isAr ? 'السعر' : 'Price'}
                        </td>
                        {Array.from({ length: 4 }).map((_, idx) => {
                          const item = itemsData.find((d) => d.id === activeIds[idx]);
                          return (
                            <td key={`price-${idx}`} className="p-4 border-l border-slate-100 text-sm font-bold text-slate-800">
                              {item ? `${item.price.toLocaleString(isAr ? 'ar-SA' : 'en-US')} SAR` : '-'}
                            </td>
                          );
                        })}
                      </tr>

                      {/* Area size */}
                      <tr className={`${highlightDiffs && isRowDifferent((item) => item.areaSqm) ? 'bg-amber-50/50' : ''} border-b border-slate-100 hover:bg-slate-50/30 transition-colors`}>
                        <td className="p-4 font-black text-xs text-primary-900 bg-primary-50 sticky left-0 start-0 shadow-[1px_0_0_0_rgba(226,232,240,1)] rtl:shadow-[-1px_0_0_0_rgba(226,232,240,1)] z-10 border-r border-slate-200 group-hover:bg-primary-50 transition-colors">
                          {isAr ? 'المساحة' : 'Size (Sqm)'}
                        </td>
                        {Array.from({ length: 4 }).map((_, idx) => {
                          const item = itemsData.find((d) => d.id === activeIds[idx]);
                          return (
                            <td key={`area-${idx}`} className="p-4 border-l border-slate-100 text-sm text-slate-800 font-medium">
                              {item?.areaSqm ? `${Number(item.areaSqm).toLocaleString(isAr ? 'ar-SA' : 'en-US')} sqm` : '-'}
                            </td>
                          );
                        })}
                      </tr>

                      {/* Price per sqm */}
                      <tr className={`${highlightDiffs && isRowDifferent((item) => item.areaSqm ? Math.round(Number(item.price) / Number(item.areaSqm)) : 0) ? 'bg-amber-50/50' : ''} border-b border-slate-100 hover:bg-slate-50/30 transition-colors`}>
                        <td className="p-4 font-black text-xs text-primary-900 bg-primary-50 sticky left-0 start-0 shadow-[1px_0_0_0_rgba(226,232,240,1)] rtl:shadow-[-1px_0_0_0_rgba(226,232,240,1)] z-10 border-r border-slate-200 group-hover:bg-primary-50 transition-colors">
                          {isAr ? 'سعر المتر' : 'Price / Sqm'}
                        </td>
                        {Array.from({ length: 4 }).map((_, idx) => {
                          const item = itemsData.find((d) => d.id === activeIds[idx]);
                          const pricePerSqm = item?.areaSqm ? Math.round(Number(item.price) / Number(item.areaSqm)) : null;
                          return (
                            <td key={`psqm-${idx}`} className="p-4 border-l border-slate-100 text-sm text-slate-800 font-bold">
                              {pricePerSqm ? `${pricePerSqm.toLocaleString(isAr ? 'ar-SA' : 'en-US')} SAR/sqm` : '-'}
                            </td>
                          );
                        })}
                      </tr>

                      {/* Bed/Baths */}
                      <tr className={`${highlightDiffs && isRowDifferent((item) => `${item.bedrooms}-${item.bathrooms}`) ? 'bg-amber-50/50' : ''} border-b border-slate-100 hover:bg-slate-50/30 transition-colors`}>
                        <td className="p-4 font-black text-xs text-primary-900 bg-primary-50 sticky left-0 start-0 shadow-[1px_0_0_0_rgba(226,232,240,1)] rtl:shadow-[-1px_0_0_0_rgba(226,232,240,1)] z-10 border-r border-slate-200 group-hover:bg-primary-50 transition-colors">
                          {isAr ? 'الغرف / الحمامات' : 'Beds / Baths'}
                        </td>
                        {Array.from({ length: 4 }).map((_, idx) => {
                          const item = itemsData.find((d) => d.id === activeIds[idx]);
                          return (
                            <td key={`bedbath-${idx}`} className="p-4 border-l border-slate-100 text-sm text-slate-800 font-medium">
                              {item ? `${item.bedrooms || 0} Beds / ${item.bathrooms || 0} Baths` : '-'}
                            </td>
                          );
                        })}
                      </tr>

                      {/* Floor */}
                      <tr className={`${highlightDiffs && isRowDifferent((item) => item.floor) ? 'bg-amber-50/50' : ''} border-b border-slate-100 hover:bg-slate-50/30 transition-colors`}>
                        <td className="p-4 font-black text-xs text-primary-900 bg-primary-50 sticky left-0 start-0 shadow-[1px_0_0_0_rgba(226,232,240,1)] rtl:shadow-[-1px_0_0_0_rgba(226,232,240,1)] z-10 border-r border-slate-200 group-hover:bg-primary-50 transition-colors">
                          {isAr ? 'الطابق' : 'Floor'}
                        </td>
                        {Array.from({ length: 4 }).map((_, idx) => {
                          const item = itemsData.find((d) => d.id === activeIds[idx]);
                          return (
                            <td key={`floor-${idx}`} className="p-4 border-l border-slate-100 text-sm text-slate-800">
                              {item?.floor != null ? `${item.floor}` : '-'}
                            </td>
                          );
                        })}
                      </tr>

                      {/* Property Age */}
                      <tr className={`${highlightDiffs && isRowDifferent((item) => item.propertyAge) ? 'bg-amber-50/50' : ''} border-b border-slate-100 hover:bg-slate-50/30 transition-colors`}>
                        <td className="p-4 font-black text-xs text-primary-900 bg-primary-50 sticky left-0 start-0 shadow-[1px_0_0_0_rgba(226,232,240,1)] rtl:shadow-[-1px_0_0_0_rgba(226,232,240,1)] z-10 border-r border-slate-200 group-hover:bg-primary-50 transition-colors">
                          {isAr ? 'عمر العقار' : 'Property Age'}
                        </td>
                        {Array.from({ length: 4 }).map((_, idx) => {
                          const item = itemsData.find((d) => d.id === activeIds[idx]);
                          return (
                            <td key={`age-${idx}`} className="p-4 border-l border-slate-100 text-sm text-slate-800">
                              {item?.propertyAge != null 
                                ? (item.propertyAge === 0 ? (isAr ? 'جديد' : 'Brand New') : `${item.propertyAge} ${isAr ? 'سنين' : 'years'}`)
                                : '-'}
                            </td>
                          );
                        })}
                      </tr>

                      {/* Furnishing Status */}
                      <tr className={`${highlightDiffs && isRowDifferent((item) => item.furnishingStatus) ? 'bg-amber-50/50' : ''} border-b border-slate-100 hover:bg-slate-50/30 transition-colors`}>
                        <td className="p-4 font-black text-xs text-primary-900 bg-primary-50 sticky left-0 start-0 shadow-[1px_0_0_0_rgba(226,232,240,1)] rtl:shadow-[-1px_0_0_0_rgba(226,232,240,1)] z-10 border-r border-slate-200 group-hover:bg-primary-50 transition-colors">
                          {isAr ? 'حالة التأثيث' : 'Furnishing'}
                        </td>
                        {Array.from({ length: 4 }).map((_, idx) => {
                          const item = itemsData.find((d) => d.id === activeIds[idx]);
                          return (
                            <td key={`furnish-${idx}`} className="p-4 border-l border-slate-100 text-sm text-slate-800">
                              {item?.furnishingStatus ? `${item.furnishingStatus}` : '-'}
                            </td>
                          );
                        })}
                      </tr>

                      {/* Completion status */}
                      <tr className={`${highlightDiffs && isRowDifferent((item) => item.completionStatus) ? 'bg-amber-50/50' : ''} border-b border-slate-100 hover:bg-slate-50/30 transition-colors`}>
                        <td className="p-4 font-black text-xs text-primary-900 bg-primary-50 sticky left-0 start-0 shadow-[1px_0_0_0_rgba(226,232,240,1)] rtl:shadow-[-1px_0_0_0_rgba(226,232,240,1)] z-10 border-r border-slate-200 group-hover:bg-primary-50 transition-colors">
                          {isAr ? 'حالة المشروع' : 'Completion Status'}
                        </td>
                        {Array.from({ length: 4 }).map((_, idx) => {
                          const item = itemsData.find((d) => d.id === activeIds[idx]);
                          return (
                            <td key={`complete-${idx}`} className="p-4 border-l border-slate-100 text-sm text-slate-800">
                              {item?.completionStatus ? `${item.completionStatus}` : '-'}
                            </td>
                          );
                        })}
                      </tr>

                      {/* Residence Type */}
                      <tr className={`${highlightDiffs && isRowDifferent((item) => item.residenceType) ? 'bg-amber-50/50' : ''} border-b border-slate-100 hover:bg-slate-50/30 transition-colors`}>
                        <td className="p-4 font-black text-xs text-primary-900 bg-primary-50 sticky left-0 start-0 shadow-[1px_0_0_0_rgba(226,232,240,1)] rtl:shadow-[-1px_0_0_0_rgba(226,232,240,1)] z-10 border-r border-slate-200 group-hover:bg-primary-50 transition-colors">
                          {isAr ? 'نوع السكن' : 'Residence Type'}
                        </td>
                        {Array.from({ length: 4 }).map((_, idx) => {
                          const item = itemsData.find((d) => d.id === activeIds[idx]);
                          return (
                            <td key={`resType-${idx}`} className="p-4 border-l border-slate-100 text-sm text-slate-800">
                              {item?.residenceType ? `${item.residenceType}` : '-'}
                            </td>
                          );
                        })}
                      </tr>

                      {/* Expat ownership */}
                      <tr className={`${highlightDiffs && isRowDifferent((item) => item.foreignerEligible) ? 'bg-amber-50/50' : ''} border-b border-slate-100 hover:bg-slate-50/30 transition-colors`}>
                        <td className="p-4 font-black text-xs text-primary-900 bg-primary-50 sticky left-0 start-0 shadow-[1px_0_0_0_rgba(226,232,240,1)] rtl:shadow-[-1px_0_0_0_rgba(226,232,240,1)] z-10 border-r border-slate-200 group-hover:bg-primary-50 transition-colors">
                          {isAr ? 'تملك الأجانب' : 'Expat Ownership'}
                        </td>
                        {Array.from({ length: 4 }).map((_, idx) => {
                          const item = itemsData.find((d) => d.id === activeIds[idx]);
                          return (
                            <td key={`expat-${idx}`} className="p-4 border-l border-slate-100 text-sm text-slate-800">
                              {item ? (
                                item.foreignerEligible 
                                  ? <span className="text-emerald-600 font-bold flex items-center gap-1"><Check className="w-4 h-4" />{isAr ? 'مسموح للأجانب' : 'Yes (Foreign Eligible)'}</span>
                                  : <span className="text-rose-600 font-medium">{isAr ? 'سعوديين فقط' : 'Saudi Nationals Only'}</span>
                              ) : '-'}
                            </td>
                          );
                        })}
                      </tr>

                      {/* Muslims Only */}
                      <tr className={`${highlightDiffs && isRowDifferent((item) => item.muslimOnly) ? 'bg-amber-50/50' : ''} border-b border-slate-100 hover:bg-slate-50/30 transition-colors`}>
                        <td className="p-4 font-black text-xs text-primary-900 bg-primary-50 sticky left-0 start-0 shadow-[1px_0_0_0_rgba(226,232,240,1)] rtl:shadow-[-1px_0_0_0_rgba(226,232,240,1)] z-10 border-r border-slate-200 group-hover:bg-primary-50 transition-colors">
                          {isAr ? 'للمسلمين فقط' : 'Muslims Only'}
                        </td>
                        {Array.from({ length: 4 }).map((_, idx) => {
                          const item = itemsData.find((d) => d.id === activeIds[idx]);
                          return (
                            <td key={`muslim-${idx}`} className="p-4 border-l border-slate-100 text-sm text-slate-800">
                              {item ? (
                                item.muslimOnly 
                                  ? <span className="text-amber-600 font-bold flex items-center gap-1"><Lock className="w-4 h-4" />{isAr ? 'للمسلمين فقط' : 'Muslim Only (Mecca/Medina rules)'}</span>
                                  : <span className="text-emerald-600 font-medium">{isAr ? 'مفتوح للجميع' : 'Open to All Religions'}</span>
                              ) : '-'}
                            </td>
                          );
                        })}
                      </tr>

                      {/* Freehold status */}
                      <tr className={`${highlightDiffs && isRowDifferent((item) => item.isFreehold) ? 'bg-amber-50/50' : ''} border-b border-slate-100 hover:bg-slate-50/30 transition-colors`}>
                        <td className="p-4 font-black text-xs text-primary-900 bg-primary-50 sticky left-0 start-0 shadow-[1px_0_0_0_rgba(226,232,240,1)] rtl:shadow-[-1px_0_0_0_rgba(226,232,240,1)] z-10 border-r border-slate-200 group-hover:bg-primary-50 transition-colors">
                          {isAr ? 'ملكية حرة' : 'Freehold'}
                        </td>
                        {Array.from({ length: 4 }).map((_, idx) => {
                          const item = itemsData.find((d) => d.id === activeIds[idx]);
                          return (
                            <td key={`freehold-${idx}`} className="p-4 border-l border-slate-100 text-sm text-slate-800">
                              {item ? (
                                item.isFreehold 
                                  ? <span className="text-emerald-600 font-bold">{isAr ? 'صك ملكية حرة' : 'Yes (Freehold)'}</span>
                                  : <span className="text-amber-600 font-medium">{isAr ? 'حق منفعة / إيجار طويل' : 'Leasehold / Usufruct'}</span>
                              ) : '-'}
                            </td>
                          );
                        })}
                      </tr>

                      {/* Location */}
                      <tr className={`${highlightDiffs && isRowDifferent((item) => `${item.city}-${item.district}`) ? 'bg-amber-50/50' : ''} border-b border-slate-100 hover:bg-slate-50/30 transition-colors`}>
                        <td className="p-4 font-black text-xs text-primary-900 bg-primary-50 sticky left-0 start-0 shadow-[1px_0_0_0_rgba(226,232,240,1)] rtl:shadow-[-1px_0_0_0_rgba(226,232,240,1)] z-10 border-r border-slate-200 group-hover:bg-primary-50 transition-colors">
                          {isAr ? 'الحي / المدينة' : 'Location'}
                        </td>
                        {Array.from({ length: 4 }).map((_, idx) => {
                          const item = itemsData.find((d) => d.id === activeIds[idx]);
                          const city = item ? (isAr ? item.arCity || item.city : item.city) : '';
                          const dist = item ? (isAr ? item.arDistrict || item.district : item.district) : '';
                          const locText = [dist, city].filter(Boolean).join(isAr ? '، ' : ', ');
                          return (
                            <td key={`loc-${idx}`} className="p-4 border-l border-slate-100 text-sm text-slate-800 font-medium">
                              {item ? locText : '-'}
                            </td>
                          );
                        })}
                      </tr>

                      {/* Amenities */}
                      <tr className="border-b border-slate-100 hover:bg-slate-50/30 transition-colors">
                        <td className="p-4 font-black text-xs text-primary-900 bg-primary-50 sticky left-0 start-0 shadow-[1px_0_0_0_rgba(226,232,240,1)] rtl:shadow-[-1px_0_0_0_rgba(226,232,240,1)] z-10 border-r border-slate-200 group-hover:bg-primary-50 transition-colors">
                          {isAr ? 'المرافق والخدمات' : 'Amenities'}
                        </td>
                        {Array.from({ length: 4 }).map((_, idx) => {
                          const item = itemsData.find((d) => d.id === activeIds[idx]);
                          const ams = item?.amenities ? Object.keys(item.amenities).filter((k) => item.amenities[k] && AMENITY_METADATA[k]) : [];
                          return (
                            <td key={`ams-${idx}`} className="p-4 border-l border-slate-100 text-xs text-slate-600">
                              {item ? (
                                ams.length > 0 ? (
                                  <div className="flex flex-col gap-2">
                                    <div className="flex flex-wrap gap-1">
                                      {ams.slice(0, 5).map((a) => {
                                        const label = isAr ? AMENITY_METADATA[a]?.labelAr : AMENITY_METADATA[a]?.labelEn;
                                        return (
                                          <span key={a} className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md font-medium text-[10px] whitespace-nowrap">
                                            {label}
                                          </span>
                                        );
                                      })}
                                    </div>
                                    <button
                                      onClick={() => setAmenitiesModalOpen(true)}
                                      className="text-[10px] font-black text-primary-600 hover:text-primary-700 transition-colors uppercase tracking-widest text-left rtl:text-right mt-1"
                                    >
                                      {isAr ? 'عرض الكل والمقارنة ←' : 'Compare All →'}
                                    </button>
                                  </div>
                                ) : (isAr ? 'لا يوجد مرافق إضافية' : 'None')
                              ) : '-'}
                            </td>
                          );
                        })}
                      </tr>
                    </>
                  ) : (
                    /* ── PROJECTS ROWS ── */
                    <>
                      {/* Price Range */}
                      <tr className={`${highlightDiffs && isRowDifferent((item) => `${item.minPrice}-${item.maxPrice}`) ? 'bg-amber-50/50' : ''} border-b border-slate-100 hover:bg-slate-50/30 transition-colors`}>
                        <td className="p-4 font-black text-xs text-primary-900 bg-primary-50 sticky left-0 start-0 shadow-[1px_0_0_0_rgba(226,232,240,1)] rtl:shadow-[-1px_0_0_0_rgba(226,232,240,1)] z-10 border-r border-slate-200 group-hover:bg-primary-50 transition-colors">
                          {isAr ? 'نطاق الأسعار' : 'Price Range'}
                        </td>
                        {Array.from({ length: 4 }).map((_, idx) => {
                          const item = itemsData.find((d) => d.id === activeIds[idx]);
                          return (
                            <td key={`prange-${idx}`} className="p-4 border-l border-slate-100 text-sm font-bold text-slate-800">
                              {item ? (
                                item.minPrice && item.maxPrice 
                                  ? `${item.minPrice.toLocaleString(isAr ? 'ar-SA' : 'en-US')} - ${item.maxPrice.toLocaleString(isAr ? 'ar-SA' : 'en-US')} SAR`
                                  : (isAr ? 'عند الطلب' : 'On Request')
                              ) : '-'}
                            </td>
                          );
                        })}
                      </tr>

                      {/* Expected Delivery */}
                      <tr className={`${highlightDiffs && isRowDifferent((item) => item.expectedDelivery) ? 'bg-amber-50/50' : ''} border-b border-slate-100 hover:bg-slate-50/30 transition-colors`}>
                        <td className="p-4 font-black text-xs text-primary-900 bg-primary-50 sticky left-0 start-0 shadow-[1px_0_0_0_rgba(226,232,240,1)] rtl:shadow-[-1px_0_0_0_rgba(226,232,240,1)] z-10 border-r border-slate-200 group-hover:bg-primary-50 transition-colors">
                          {isAr ? 'موعد التسليم المتوقع' : 'Expected Delivery'}
                        </td>
                        {Array.from({ length: 4 }).map((_, idx) => {
                          const item = itemsData.find((d) => d.id === activeIds[idx]);
                          return (
                            <td key={`delivery-${idx}`} className="p-4 border-l border-slate-100 text-sm text-slate-800 font-medium">
                              {item?.expectedDelivery || '-'}
                            </td>
                          );
                        })}
                      </tr>

                      {/* Available Layouts (BHK) */}
                      <tr className={`${highlightDiffs && isRowDifferent((item) => item.bedroomsList?.join(',')) ? 'bg-amber-50/50' : ''} border-b border-slate-100 hover:bg-slate-50/30 transition-colors`}>
                        <td className="p-4 font-black text-xs text-primary-900 bg-primary-50 sticky left-0 start-0 shadow-[1px_0_0_0_rgba(226,232,240,1)] rtl:shadow-[-1px_0_0_0_rgba(226,232,240,1)] z-10 border-r border-slate-200 group-hover:bg-primary-50 transition-colors">
                          {isAr ? 'الوحدات المتاحة' : 'Available Layouts'}
                        </td>
                        {Array.from({ length: 4 }).map((_, idx) => {
                          const item = itemsData.find((d) => d.id === activeIds[idx]);
                          return (
                            <td key={`bhk-${idx}`} className="p-4 border-l border-slate-100 text-sm font-bold text-slate-800">
                              {item ? (
                                item.bedroomsList && item.bedroomsList.length > 0
                                  ? `${item.bedroomsList.join(', ')} BHK`
                                  : '-'
                              ) : '-'}
                            </td>
                          );
                        })}
                      </tr>

                      {/* Completion status */}
                      <tr className={`${highlightDiffs && isRowDifferent((item) => item.completionStatus) ? 'bg-amber-50/50' : ''} border-b border-slate-100 hover:bg-slate-50/30 transition-colors`}>
                        <td className="p-4 font-black text-xs text-primary-900 bg-primary-50 sticky left-0 start-0 shadow-[1px_0_0_0_rgba(226,232,240,1)] rtl:shadow-[-1px_0_0_0_rgba(226,232,240,1)] z-10 border-r border-slate-200 group-hover:bg-primary-50 transition-colors">
                          {isAr ? 'حالة المشروع' : 'Project Status'}
                        </td>
                        {Array.from({ length: 4 }).map((_, idx) => {
                          const item = itemsData.find((d) => d.id === activeIds[idx]);
                          return (
                            <td key={`projStatus-${idx}`} className="p-4 border-l border-slate-100 text-sm text-slate-800">
                              {item?.completionStatus ? `${item.completionStatus}` : '-'}
                            </td>
                          );
                        })}
                      </tr>

                      {/* Expat ownership */}
                      <tr className={`${highlightDiffs && isRowDifferent((item) => item.foreignerEligible) ? 'bg-amber-50/50' : ''} border-b border-slate-100 hover:bg-slate-50/30 transition-colors`}>
                        <td className="p-4 font-black text-xs text-primary-900 bg-primary-50 sticky left-0 start-0 shadow-[1px_0_0_0_rgba(226,232,240,1)] rtl:shadow-[-1px_0_0_0_rgba(226,232,240,1)] z-10 border-r border-slate-200 group-hover:bg-primary-50 transition-colors">
                          {isAr ? 'تملك الأجانب' : 'Expat Ownership'}
                        </td>
                        {Array.from({ length: 4 }).map((_, idx) => {
                          const item = itemsData.find((d) => d.id === activeIds[idx]);
                          return (
                            <td key={`projExpat-${idx}`} className="p-4 border-l border-slate-100 text-sm text-slate-800">
                              {item ? (
                                item.foreignerEligible 
                                  ? <span className="text-emerald-600 font-bold flex items-center gap-1"><Check className="w-4 h-4" />{isAr ? 'مسموح للأجانب' : 'Yes (Foreign Eligible)'}</span>
                                  : <span className="text-rose-600 font-medium">{isAr ? 'سعوديين فقط' : 'Saudi Nationals Only'}</span>
                              ) : '-'}
                            </td>
                          );
                        })}
                      </tr>

                      {/* Muslims Only */}
                      <tr className={`${highlightDiffs && isRowDifferent((item) => item.muslimOnly) ? 'bg-amber-50/50' : ''} border-b border-slate-100 hover:bg-slate-50/30 transition-colors`}>
                        <td className="p-4 font-black text-xs text-primary-900 bg-primary-50 sticky left-0 start-0 shadow-[1px_0_0_0_rgba(226,232,240,1)] rtl:shadow-[-1px_0_0_0_rgba(226,232,240,1)] z-10 border-r border-slate-200 group-hover:bg-primary-50 transition-colors">
                          {isAr ? 'للمسلمين فقط' : 'Muslims Only'}
                        </td>
                        {Array.from({ length: 4 }).map((_, idx) => {
                          const item = itemsData.find((d) => d.id === activeIds[idx]);
                          return (
                            <td key={`projMuslim-${idx}`} className="p-4 border-l border-slate-100 text-sm text-slate-800">
                              {item ? (
                                item.muslimOnly 
                                  ? <span className="text-amber-600 font-bold flex items-center gap-1"><Lock className="w-4 h-4" />{isAr ? 'للمسلمين فقط' : 'Muslim Only'}</span>
                                  : <span className="text-emerald-600 font-medium">{isAr ? 'مفتوح للجميع' : 'Open to All'}</span>
                              ) : '-'}
                            </td>
                          );
                        })}
                      </tr>



                      {/* Location */}
                      <tr className={`${highlightDiffs && isRowDifferent((item) => `${item.city}-${item.district}`) ? 'bg-amber-50/50' : ''} border-b border-slate-100 hover:bg-slate-50/30 transition-colors`}>
                        <td className="p-4 font-black text-xs text-primary-900 bg-primary-50 sticky left-0 start-0 shadow-[1px_0_0_0_rgba(226,232,240,1)] rtl:shadow-[-1px_0_0_0_rgba(226,232,240,1)] z-10 border-r border-slate-200 group-hover:bg-primary-50 transition-colors">
                          {isAr ? 'الحي / المدينة' : 'Location'}
                        </td>
                        {Array.from({ length: 4 }).map((_, idx) => {
                          const item = itemsData.find((d) => d.id === activeIds[idx]);
                          const city = item ? (isAr ? item.arCity || item.city : item.city) : '';
                          const dist = item ? (isAr ? item.arDistrict || item.district : item.district) : '';
                          const locText = [dist, city].filter(Boolean).join(isAr ? '، ' : ', ');
                          return (
                            <td key={`projLoc-${idx}`} className="p-4 border-l border-slate-100 text-sm text-slate-800 font-medium">
                              {item ? locText : '-'}
                            </td>
                          );
                        })}
                      </tr>

                      {/* Amenities */}
                      <tr className="border-b border-slate-100 hover:bg-slate-50/30 transition-colors">
                        <td className="p-4 font-black text-xs text-primary-900 bg-primary-50 sticky left-0 start-0 shadow-[1px_0_0_0_rgba(226,232,240,1)] rtl:shadow-[-1px_0_0_0_rgba(226,232,240,1)] z-10 border-r border-slate-200 group-hover:bg-primary-50 transition-colors">
                          {isAr ? 'المرافق والخدمات' : 'Amenities'}
                        </td>
                        {Array.from({ length: 4 }).map((_, idx) => {
                          const item = itemsData.find((d) => d.id === activeIds[idx]);
                          const ams = item?.amenities ? Object.keys(item.amenities).filter((k) => item.amenities[k] && AMENITY_METADATA[k]) : [];
                          return (
                            <td key={`projAms-${idx}`} className="p-4 border-l border-slate-100 text-xs text-slate-600">
                              {item ? (
                                ams.length > 0 ? (
                                  <div className="flex flex-col gap-2">
                                    <div className="flex flex-wrap gap-1">
                                      {ams.slice(0, 5).map((a) => {
                                        const label = isAr ? AMENITY_METADATA[a]?.labelAr : AMENITY_METADATA[a]?.labelEn;
                                        return (
                                          <span key={a} className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md font-medium text-[10px] whitespace-nowrap">
                                            {label}
                                          </span>
                                        );
                                      })}
                                    </div>
                                    <button
                                      onClick={() => setAmenitiesModalOpen(true)}
                                      className="text-[10px] font-black text-primary-600 hover:text-primary-700 transition-colors uppercase tracking-widest text-left rtl:text-right mt-1"
                                    >
                                      {isAr ? 'عرض الكل والمقارنة ←' : 'Compare All →'}
                                    </button>
                                  </div>
                                ) : (isAr ? 'لا يوجد مرافق إضافية' : 'None')
                              ) : '-'}
                            </td>
                          );
                        })}
                      </tr>
                    </>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── RELATED ITEMS SECTION (BELOW MATRIX) ── */}
        {!loading && activeIds.length >= 1 && relatedItems.length > 0 && (
          <div className="mt-16 space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-black text-slate-800 flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-primary-600" />
                  {isAr ? 'عقارات مشابهة للمقارنة' : 'Related Alternatives to Compare'}
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  {isAr 
                    ? 'عقارات تقع في نفس النطاق الجغرافي وقد تناسب احتياجاتك' 
                    : 'Properties listed in the same location that match your search filters'}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {relatedItems.map((item) => {
                const title = isAr ? item.arTitle || item.nameAr : item.enTitle || item.nameEn || item.arTitle || item.nameAr;
                const photo = (item.photos && item.photos[0]) || '/placeholder.png';
                const city = isAr ? item.arCity || item.city : item.city;
                const dist = isAr ? item.arDistrict || item.district : item.district;
                const locationText = [dist, city].filter(Boolean).join(isAr ? '، ' : ', ');
                const priceText = item.price 
                  ? `${item.price.toLocaleString(isAr ? 'ar-SA' : 'en-US')} SAR` 
                  : (item.minPrice ? `${item.minPrice.toLocaleString(isAr ? 'ar-SA' : 'en-US')} SAR+` : (isAr ? 'عند الطلب' : 'Ask Price'));

                return (
                  <div
                    key={item.id}
                    className="bg-white border border-slate-200 rounded-3xl p-4 flex flex-col justify-between hover:shadow-card-hover transition-all shadow-sm"
                  >
                    <div>
                      <div className="relative aspect-[16/10] rounded-2xl overflow-hidden border border-slate-100 bg-slate-100 mb-4">
                        <Image
                          src={photo}
                          alt={title}
                          fill
                          sizes="300px"
                          className="object-cover"
                        />
                      </div>
                      <div className="space-y-1.5 px-1">
                        <h4 className="font-bold text-sm text-slate-800 line-clamp-1">
                          {title}
                        </h4>
                        <div className="flex items-center gap-1 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                          <MapPin className="w-3.5 h-3.5 text-primary-500" />
                          <span className="truncate">{locationText}</span>
                        </div>
                        <p className="text-sm font-black text-primary-600 pt-1">
                          {priceText}
                        </p>
                      </div>
                    </div>

                    <div className="mt-5 pt-3 border-t border-slate-100 flex gap-2">
                      <button
                        onClick={() => handleAddFromRelated(item.id)}
                        className="flex-1 bg-primary-600 hover:bg-primary-700 text-white font-bold text-xs py-2.5 px-4 rounded-xl transition-all shadow-md shadow-primary-200 flex items-center justify-center gap-1.5"
                      >
                        <ArrowRightLeft className="w-4 h-4" />
                        {isAr ? 'إضافة للمقارنة' : 'Add to Compare'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Amenities Comparison Modal */}
      {amenitiesModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in" onClick={() => setAmenitiesModalOpen(false)}>
          <div className="bg-white rounded-3xl max-w-4xl w-full max-h-[80vh] overflow-hidden flex flex-col shadow-2xl animate-scale-up" onClick={(e) => e.stopPropagation()}>
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between shrink-0">
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <ArrowRightLeft className="w-5 h-5 text-primary-600" />
                {isAr ? 'مقارنة تفصيلية للمرافق والخدمات' : 'Detailed Amenities Comparison'}
              </h3>
              <button onClick={() => setAmenitiesModalOpen(false)} className="p-2 rounded-full hover:bg-slate-100 text-slate-500 hover:text-slate-850 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-auto pb-6 pt-0 scrollbar-thin [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar]:h-1 [&::-webkit-scrollbar-thumb]:bg-slate-300/60 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-track]:bg-transparent">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b border-slate-150 text-[10px] font-bold uppercase tracking-wider text-slate-400 text-left rtl:text-right">
                    <th className="pb-3 pt-2 pl-6 rtl:pr-6 pr-3 rtl:pl-3 w-1/3 min-w-[150px] sticky top-0 left-0 start-0 bg-white z-30 border-b border-slate-150 shadow-[0_1px_0_rgba(226,232,240,0.8)]">
                      {isAr ? 'المرفق' : 'Amenity'}
                    </th>
                    {itemsData.map((item) => {
                      const title = isAr ? item.arTitle || item.nameAr : item.enTitle || item.nameEn || item.arTitle || item.nameAr;
                      return (
                        <th key={item.id} className="pb-3 pt-2 px-3 text-center truncate max-w-[150px] text-xs font-bold text-slate-700 sticky top-0 bg-white z-20 border-b border-slate-150 shadow-[0_1px_0_rgba(226,232,240,0.8)] last:pr-6 rtl:last:pl-6" title={title}>
                          {title}
                        </th>
                      );
                    })}
                    {Array.from({ length: 4 - itemsData.length }).map((_, idx) => (
                      <th key={`empty-header-${idx}`} className="pb-3 pt-2 px-3 text-center text-slate-350 font-normal sticky top-0 bg-white z-20 border-b border-slate-150 shadow-[0_1px_0_rgba(226,232,240,0.8)] last:pr-6 rtl:last:pl-6">
                        -
                      </th>
                    ))}
                  </tr>
                </thead>
                  <tbody className="divide-y divide-slate-100">
                    {Object.entries(AMENITY_METADATA).map(([key, meta]) => {
                      const label = isAr ? meta.labelAr : meta.labelEn;
                      // Only show rows that are present in at least one item to keep it clean and relevant
                      const isUsed = itemsData.some((item) => item.amenities?.[key] === true);
                      if (!isUsed) return null;

                      return (
                        <tr key={key} className="hover:bg-slate-50/50 transition-colors">
                          <td className="py-3 pl-6 rtl:pr-6 pr-3 rtl:pl-3 text-sm font-semibold text-slate-700 sticky left-0 start-0 bg-white z-10">{label}</td>
                          {itemsData.map((item) => {
                            const hasAmenity = item.amenities?.[key] === true;
                            return (
                              <td key={item.id} className="py-3 px-3 text-center last:pr-6 rtl:last:pl-6">
                                {hasAmenity ? (
                                  <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-100">
                                    <Check className="w-3.5 h-3.5" />
                                  </span>
                                ) : (
                                  <span className="text-slate-300 font-bold">—</span>
                                )}
                              </td>
                            );
                          })}
                          {Array.from({ length: 4 - itemsData.length }).map((_, idx) => (
                            <td key={`empty-cell-${idx}`} className="py-3 px-3 text-center text-slate-200 last:pr-6 rtl:last:pl-6">
                              -
                            </td>
                          ))}
                        </tr>
                      );
                    })}

                    {/* Custom Amenities */}
                    {customAmenityKeys.map((key) => {
                      // Humanize key (e.g. tesla_charger -> Tesla Charger)
                      const label = key
                        .split('_')
                        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
                        .join(' ');

                      return (
                        <tr key={`custom-${key}`} className="hover:bg-slate-50/50 transition-colors">
                          <td className="py-3 pl-6 rtl:pr-6 pr-3 rtl:pl-3 text-sm font-semibold text-slate-700 sticky left-0 start-0 bg-white z-10 flex items-center gap-1.5">
                            <span>{label}</span>
                            <span className="text-[9px] px-1.5 py-0.5 bg-indigo-50 text-indigo-650 rounded-md font-bold uppercase tracking-wider">
                              {isAr ? 'إضافي' : 'Custom'}
                            </span>
                          </td>
                          {itemsData.map((item) => {
                            const hasAmenity = item.amenities?.[key] === true;
                            return (
                              <td key={item.id} className="py-3 px-3 text-center last:pr-6 rtl:last:pl-6">
                                {hasAmenity ? (
                                  <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-100">
                                    <Check className="w-3.5 h-3.5" />
                                  </span>
                                ) : (
                                  <span className="text-slate-300 font-bold">—</span>
                                )}
                              </td>
                            );
                          })}
                          {Array.from({ length: 4 - itemsData.length }).map((_, idx) => (
                            <td key={`empty-custom-cell-${idx}`} className="py-3 px-3 text-center text-slate-200 last:pr-6 rtl:last:pl-6">
                              -
                            </td>
                          ))}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const AMENITY_METADATA: Record<string, { labelEn: string; labelAr: string }> = {
  swimming_pool: { labelEn: 'Swimming Pool', labelAr: 'مسبح' },
  gym: { labelEn: 'Gym / Fitness Center', labelAr: 'صالة رياضية' },
  parking: { labelEn: 'Covered Parking', labelAr: 'موقف سيارات' },
  wifi: { labelEn: 'WiFi', labelAr: 'إنترنت لاسلكي' },
  private_garden: { labelEn: 'Private Garden', labelAr: 'حديقة خاصة' },
  maid_room: { labelEn: 'Maid Room', labelAr: 'غرفة خادمة' },
  smart_home: { labelEn: 'Smart Home', labelAr: 'منزل ذكي' },
  elevator: { labelEn: 'Elevator', labelAr: 'مصعد' },
  security: { labelEn: '24/7 Security', labelAr: 'حراسة وأمن' },
  central_ac: { labelEn: 'Central AC', labelAr: 'تكييف مركزي' },
  laundry: { labelEn: 'Laundry Room', labelAr: 'غرفة غسيل' },
  pets_allowed: { labelEn: 'Pets Allowed', labelAr: 'مسموح بالحيوانات' },
  basement: { labelEn: 'Basement', labelAr: 'قبو' },
  balcony: { labelEn: 'Balcony', labelAr: 'شرفة / بلكونة' },
  power: { labelEn: 'Power Backup', labelAr: 'مولد كهرباء' },
  gas: { labelEn: 'Central Gas', labelAr: 'غاز مركزي' },
  tv_room: { labelEn: 'TV Room', labelAr: 'غرفة تلفزيون' },
  lounge: { labelEn: 'Lounge', labelAr: 'صالة استقبال' },
  kitchen_plus: { labelEn: 'Equipped Kitchen', labelAr: 'مطبخ مجهز' },
  driver_room: { labelEn: 'Driver Room', labelAr: 'غرفة سائق' },
  concierge: { labelEn: 'Concierge Service', labelAr: 'خدمة بواب' },
  study_room: { labelEn: 'Study Room', labelAr: 'غرفة دراسة' },
  view_of_landmark: { labelEn: 'Landmark View', labelAr: 'إطلالة على معلم' },
  walk_in_closet: { labelEn: 'Walk-in Closet', labelAr: 'غرفة ملابس' },
  waste_disposal: { labelEn: 'Waste Disposal', labelAr: 'التخلص من النفايات' },
  built_in_wardrobes: { labelEn: 'Built-in Wardrobes', labelAr: 'خزائن مدمجة' },
  kitchen_appliances: { labelEn: 'Kitchen Appliances', labelAr: 'أجهزة مطبخ' },
  barbecue_area: { labelEn: 'Barbecue Area', labelAr: 'منطقة شواء' },
};
