'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { useRouter, usePathname } from 'next/navigation';
import { Square, MapPin, Star, Shield, Heart } from 'lucide-react';
import { motion } from 'framer-motion';
import { formatPriceCompact } from '@saudi-re/shared';
import type { Listing } from '@saudi-re/shared';
import { useAuth } from '@/hooks/use-auth';
import { api } from '@/lib/api';

interface ListingCardProps {
  listing: Listing;
  index?: number;
  isDashboard?: boolean;
  onDelete?: (id: string) => void;
  onToggleFavorite?: (id: string, favorited: boolean) => void;
}

export default function ListingCard({ listing, index = 0, isDashboard, onDelete, onToggleFavorite }: ListingCardProps) {
  const locale = useLocale();
  const t = useTranslations('listing');
  const tSearch = useTranslations('search');
  const tCommon = useTranslations('common');
  const { isAuthenticated } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const [favorited, setFavorited] = useState(!!listing.isFavorited);
  const [isToggling, setIsToggling] = useState(false);

  const handleToggleFavorite = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!isAuthenticated) {
      router.push(`/${locale}/auth/login?returnTo=${pathname}`);
      return;
    }

    if (isToggling) return;

    setIsToggling(true);
    const prev = favorited;
    setFavorited(!prev);

    try {
      const res = await api.toggleFavorite(listing.id);
      if (!res.success) {
        setFavorited(prev);
      } else {
        const newStatus = !!res.data?.isFavorited;
        setFavorited(newStatus);
        onToggleFavorite?.(listing.id, newStatus);
      }
    } catch {
      setFavorited(prev);
    } finally {
      setIsToggling(false);
    }
  };

  const title = locale === 'ar' ? listing.arTitle : (listing.enTitle ?? listing.arTitle);
  const city = locale === 'ar' ? listing.arCity : listing.city;
  const district = locale === 'ar' ? listing.arDistrict : listing.district;
  const location = [district, city].filter(Boolean).join(locale === 'ar' ? '، ' : ', ');
  const photo = listing.photos[0];

  const statusColors: Record<string, string> = {
    ACTIVE: 'text-emerald-600 bg-emerald-50 border-emerald-100',
    DRAFT: 'text-slate-500 bg-slate-50 border-slate-100',
    FLAGGED: 'text-amber-600 bg-amber-50 border-amber-100',
    REMOVED: 'text-rose-600 bg-rose-50 border-rose-100',
  };

  const purposeLabel: Record<string, string> = {
    SALE: tSearch('sale'),
    RENT: tSearch('rent'),
    LEASE: tSearch('lease'),
  };

  const purposeBg: Record<string, string> = {
    SALE: 'bg-primary-600 text-white',
    RENT: 'bg-accent-500 text-white',
    LEASE: 'bg-primary-500 text-white',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.05 }}
      className="h-full relative group"
    >
      <div className="bg-white border border-surface-200 rounded-xl overflow-hidden shadow-card hover:shadow-card-hover transition-all duration-300 transform hover:-translate-y-1 relative h-full flex flex-col">
        {/* Link Overlay for the whole card area EXCEPT buttons */}
        <Link 
          href={`/${locale}/listings/${listing.id}`}
          className="absolute inset-0 z-0"
          aria-label={title}
        />

        {/* Image Section */}
        <div className="relative h-56 overflow-hidden shrink-0 pointer-events-none">
          <Image
            src={photo}
            alt={title}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-700"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            unoptimized={photo.includes('unsplash')}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-60" />
        </div>

        {/* Badges & Buttons (Above Link) */}
        <div className="absolute top-4 start-4 flex flex-col gap-2 z-10 pointer-events-none">
          {isDashboard ? (
            <div className={`flex items-center gap-1.5 backdrop-blur-md text-[10px] font-black px-2.5 py-1 rounded-lg border shadow-sm uppercase tracking-widest ${statusColors[listing.status]}`}>
              {listing.status}
            </div>
          ) : (
            <>
              {listing.isFeatured && (
                <div className="flex items-center gap-1.5 bg-white/90 backdrop-blur-md text-primary-700 text-[10px] font-bold px-2.5 py-1 rounded-lg border border-primary-100 shadow-sm">
                  <Star className="w-3 h-3 fill-primary-600 text-primary-600" />
                  {t('featured')}
                </div>
              )}
              {listing.verified && (
                <div className="flex items-center gap-1.5 bg-white/90 backdrop-blur-md text-accent-600 text-[10px] font-bold px-2.5 py-1 rounded-lg border border-accent-100 shadow-sm">
                  <Shield className="w-3 h-3 fill-accent-500 text-accent-500" />
                  {t('verified')}
                </div>
              )}
            </>
          )}
        </div>

        <div className="absolute top-4 end-4 z-10 flex flex-col gap-2 items-end">
          <span className={`text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-lg shadow-lg pointer-events-none ${purposeBg[listing.purpose]}`}>
            {purposeLabel[listing.purpose]}
          </span>
          
          {!isDashboard && (
            <button
              onClick={handleToggleFavorite}
              className={`p-2 rounded-lg backdrop-blur-md border shadow-sm transition-all relative z-20 ${
                favorited 
                  ? 'bg-red-50/90 text-red-500 border-red-100' 
                  : 'bg-white/80 text-gray-400 border-gray-100 hover:text-red-500 hover:bg-white'
              }`}
            >
              <Heart className={`w-4 h-4 ${favorited ? 'fill-current' : ''}`} />
            </button>
          )}
        </div>

        {/* Content Section */}
        <div className="p-5 flex flex-col flex-1 relative z-10 pointer-events-none">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-baseline gap-1">
              <span className={`text-2xl font-bold text-charcoal tracking-tight ${locale === 'ar' ? 'font-arabic' : ''}`}>
                {formatPriceCompact(listing.price, locale as 'en' | 'ar')}
              </span>
              {listing.purpose === 'RENT' && (
                <span className="text-xs text-charcoal-muted font-medium">/{t('perYear')}</span>
              )}
            </div>
          </div>

          <h3 className={`text-base font-semibold text-charcoal mb-2 line-clamp-1 group-hover:text-primary-600 transition-colors ${locale === 'ar' ? 'font-arabic' : ''}`}>
            {title}
          </h3>

          <div className="flex items-center gap-1.5 text-xs text-charcoal-muted mb-6">
            <MapPin className="w-3.5 h-3.5 text-primary-500 shrink-0" />
            <span className={`line-clamp-1 ${locale === 'ar' ? 'font-arabic' : ''}`}>{location}</span>
          </div>

          <div className="flex items-center gap-4 pt-4 border-t border-surface-100 mt-auto pointer-events-auto">
            <div className="flex items-center gap-1.5 text-xs text-charcoal-muted pointer-events-none">
              <Square className="w-4 h-4 text-primary-500/70" />
              <span className="font-medium">{listing.areaSqm?.toLocaleString()} {tCommon('sqm')}</span>
            </div>
            
            {isDashboard && (
              <div className="ms-auto flex items-center gap-2 relative z-20">
                <Link 
                  href={`/${locale}/edit-property/${listing.id}`}
                  className="p-2.5 bg-slate-50 hover:bg-primary-50 text-slate-400 hover:text-primary-600 rounded-xl transition-all border border-slate-100 hover:border-primary-100"
                >
                  <span className="text-[10px] font-bold uppercase tracking-widest px-1">Edit</span>
                </Link>
                {onDelete && (
                  <button 
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      onDelete(listing.id);
                    }}
                    className="p-2.5 bg-rose-50 hover:bg-rose-100 text-rose-400 hover:text-rose-600 rounded-xl transition-all border border-rose-100"
                  >
                    <span className="text-[10px] font-bold uppercase tracking-widest px-1">Delete</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

