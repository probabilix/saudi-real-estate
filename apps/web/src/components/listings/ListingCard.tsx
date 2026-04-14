'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { Bed, Bath, Square, MapPin, Eye, Star, Shield } from 'lucide-react';
import { motion } from 'framer-motion';
import { formatPriceCompact } from '@saudi-re/shared';
import type { ListingWithOwner } from '@saudi-re/shared';

interface ListingCardProps {
  listing: ListingWithOwner;
  index?: number;
}

export default function ListingCard({ listing, index = 0 }: ListingCardProps) {
  const locale = useLocale();
  const t = useTranslations('listing');
  const tTypes = useTranslations('propertyTypes');
  const tSearch = useTranslations('search');
  const tCommon = useTranslations('common');

  const title = locale === 'ar' ? listing.arTitle : (listing.enTitle ?? listing.arTitle);
  const city = locale === 'ar' ? listing.arCity : listing.city;
  const district = locale === 'ar' ? listing.arDistrict : listing.district;
  const location = [district, city].filter(Boolean).join(locale === 'ar' ? '، ' : ', ');
  const photo = listing.photos[0];

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
    >
      <Link href={`/${locale}/listings/${listing.id}`}>
        <article className="group bg-white border border-surface-200 rounded-xl overflow-hidden shadow-card hover:shadow-card-hover transition-all duration-300 transform hover:-translate-y-1">
          {/* Image Section */}
          <div className="relative h-56 overflow-hidden">
            <Image
              src={photo}
              alt={title}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-700"
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
              unoptimized={photo.includes('unsplash')}
            />

            {/* Subtle Gradient Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-60" />

            {/* Badges */}
            <div className="absolute top-4 start-4 flex flex-col gap-2 z-10">
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
            </div>

            {/* Purpose Tag */}
            <div className="absolute top-4 end-4 z-10">
              <span className={`text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-lg shadow-lg ${purposeBg[listing.purpose]}`}>
                {purposeLabel[listing.purpose]}
              </span>
            </div>

            {/* Property Type Badge */}
            <div className="absolute bottom-4 start-4">
              <span className="bg-white/90 backdrop-blur-md px-3 py-1 text-[10px] font-bold text-charcoal rounded-lg border border-surface-100 shadow-sm uppercase tracking-wide">
                {tTypes(listing.type as any)}
              </span>
            </div>
          </div>

          {/* Content Section */}
          <div className="p-5">
            {/* Price Row */}
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-baseline gap-1">
                <span className={`text-2xl font-bold text-charcoal tracking-tight ${locale === 'ar' ? 'font-arabic' : ''}`}>
                  {formatPriceCompact(listing.price, locale as any)}
                </span>
                {listing.purpose === 'RENT' && (
                  <span className="text-xs text-charcoal-muted font-medium">/{t('perYear')}</span>
                )}
              </div>
              <div className="flex items-center gap-1 text-[11px] text-charcoal-muted">
                <Eye className="w-3 h-3" />
                <span>{listing.viewsCount.toLocaleString(locale === 'ar' ? 'ar-SA' : 'en-US')}</span>
              </div>
            </div>

            {/* Title - Elegant Hierarchy */}
            <h3 className={`text-base font-semibold text-charcoal mb-2 line-clamp-1 group-hover:text-primary-600 transition-colors ${locale === 'ar' ? 'font-arabic' : ''}`}>
              {title}
            </h3>

            {/* Location */}
            <div className="flex items-center gap-1.5 text-xs text-charcoal-muted mb-6">
              <MapPin className="w-3.5 h-3.5 text-primary-500 shrink-0" />
              <span className={`line-clamp-1 ${locale === 'ar' ? 'font-arabic' : ''}`}>{location}</span>
            </div>

            {/* Stats Row */}
            <div className="flex items-center gap-4 pt-4 border-t border-surface-100 mt-auto">
              {listing.bedrooms !== null && listing.bedrooms !== undefined && listing.bedrooms > 0 && (
                <div className="flex items-center gap-1.5 text-xs text-charcoal-muted">
                  <Bed className="w-4 h-4 text-primary-500/70" />
                  <span className="font-medium">{listing.bedrooms}</span>
                </div>
              )}
              {listing.bathrooms !== null && listing.bathrooms !== undefined && listing.bathrooms > 0 && (
                <div className="flex items-center gap-1.5 text-xs text-charcoal-muted">
                  <Bath className="w-4 h-4 text-primary-500/70" />
                  <span className="font-medium">{listing.bathrooms}</span>
                </div>
              )}
              {listing.areaSqm && (
                <div className="flex items-center gap-1.5 text-xs text-charcoal-muted ms-auto">
                  <Square className="w-4 h-4 text-primary-500/70" />
                  <span className="font-medium">{listing.areaSqm.toLocaleString()} {tCommon('sqm')}</span>
                </div>
              )}
            </div>
          </div>
        </article>
      </Link>
    </motion.div>
  );
}
