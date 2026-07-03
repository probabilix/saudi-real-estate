'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useLocale } from 'next-intl';
import { useRouter, usePathname } from 'next/navigation';
import { Square, MapPin, Layers, Sparkles, Shield, Construction, CheckCircle, Clock, Heart, ChevronLeft, ChevronRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { formatPriceCompact } from '@saudi-re/shared';
import { useAuth } from '@/hooks/use-auth';
import { api } from '@/lib/api';

interface ProjectCardProps {
  project: {
    id: string;
    nameEn: string;
    nameAr: string;
    city: string;
    district: string | null;
    completionStatus: 'READY' | 'OFF_PLAN' | 'UNDER_CONSTRUCTION' | null;
    expectedDelivery: string | null;
    totalUnits: number | null;
    brochureUrl: string | null;
    regaFalLicense: string | null;
    photos: string[];
    createdAt: string;
    isFavorited?: boolean;
  };
  layoutCount: number;
  minPrice: number;
  minBedrooms?: number;
  maxBedrooms?: number;
  index?: number;
  isFavorited?: boolean;
  onToggleFavorite?: (id: string, favorited: boolean) => void;
}

export default function ProjectCard({
  project,
  layoutCount,
  minPrice,
  minBedrooms,
  maxBedrooms,
  index = 0,
  isFavorited,
  onToggleFavorite
}: ProjectCardProps) {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated } = useAuth();

  const [favorited, setFavorited] = useState(!!isFavorited || !!project.isFavorited);
  const [isToggling, setIsToggling] = useState(false);
  const [currentPhotoIdx, setCurrentPhotoIdx] = useState(0);

  const photos = project.photos || [];

  const handlePrevPhoto = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setCurrentPhotoIdx((prev) => (prev === 0 ? photos.length - 1 : prev - 1));
  };

  const handleNextPhoto = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setCurrentPhotoIdx((prev) => (prev === photos.length - 1 ? 0 : prev + 1));
  };

  useEffect(() => {
    setFavorited(!!isFavorited || !!project.isFavorited);
  }, [isFavorited, project.isFavorited]);

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
      const res = await api.toggleProjectFavorite(project.id);
      if (!res.success) {
        setFavorited(prev);
      } else {
        const newStatus = !!res.data?.isFavorited;
        setFavorited(newStatus);
        onToggleFavorite?.(project.id, newStatus);
      }
    } catch {
      setFavorited(prev);
    } finally {
      setIsToggling(false);
    }
  };

  const title = locale === 'ar' ? project.nameAr : project.nameEn;
  const location = [project.district, project.city].filter(Boolean).join(locale === 'ar' ? '، ' : ', ');
  
  // Try to use project photo, fallback to placeholder
  const photo = project.photos && project.photos[0] 
    ? project.photos[0] 
    : 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=600&q=80';

  const statusBadges = {
    READY: locale === 'ar' ? 'جاهز' : 'Ready to Move',
    OFF_PLAN: locale === 'ar' ? 'على الخارطة' : 'Off-Plan',
    UNDER_CONSTRUCTION: locale === 'ar' ? 'قيد الإنشاء' : 'Under Construction'
  };

  const statusIcons = {
    READY: <CheckCircle className="w-3 h-3 text-emerald-600 fill-current" />,
    OFF_PLAN: <Clock className="w-3 h-3 text-amber-600 fill-current" />,
    UNDER_CONSTRUCTION: <Construction className="w-3 h-3 text-blue-600" />
  };

  const statusColors = {
    READY: 'bg-emerald-50 text-emerald-700 border-emerald-100',
    OFF_PLAN: 'bg-amber-50 text-amber-700 border-amber-100',
    UNDER_CONSTRUCTION: 'bg-blue-50 text-blue-700 border-blue-100'
  };

  const bedsText = () => {
    if (minBedrooms !== undefined && maxBedrooms !== undefined) {
      if (minBedrooms === maxBedrooms) {
        return locale === 'ar' ? `${minBedrooms} غرف` : `${minBedrooms} Beds`;
      }
      return locale === 'ar' ? `${minBedrooms}-${maxBedrooms} غرف` : `${minBedrooms}–${maxBedrooms} Beds`;
    }
    return locale === 'ar' ? 'غرف متنوعة' : 'Multiple Beds';
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.05 }}
      className="h-full relative group"
    >
      <div className="bg-white border border-surface-200 rounded-xl overflow-hidden shadow-card hover:shadow-card-hover transition-all duration-300 relative h-full flex flex-col">
        {/* Link Overlay */}
        <Link
          href={`/${locale}/projects/${project.id}`}
          className="absolute inset-0 z-0"
          aria-label={title}
        />

        {/* Image Section */}
        <div className="relative h-56 overflow-hidden shrink-0">
          <Image
            key={currentPhotoIdx}
            src={photos[currentPhotoIdx] || photo}
            alt={title}
            fill
            className="object-cover transition-transform duration-700 pointer-events-none"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/10 to-transparent opacity-80 pointer-events-none" />

          {photos.length > 1 && (
            <>
              <button
                onClick={handlePrevPhoto}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 z-20 bg-black/50 hover:bg-black/70 text-white p-1.5 rounded-full backdrop-blur-sm transition-all pointer-events-auto shadow-md"
                aria-label="Previous image"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={handleNextPhoto}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 z-20 bg-black/50 hover:bg-black/70 text-white p-1.5 rounded-full backdrop-blur-sm transition-all pointer-events-auto shadow-md"
                aria-label="Next image"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
              {/* Bottom dots */}
              <div className="absolute bottom-2.5 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1.5 pointer-events-none">
                {photos.map((_, dotIdx) => (
                  <div
                    key={dotIdx}
                    className={`w-1.5 h-1.5 rounded-full transition-all ${
                      dotIdx === currentPhotoIdx ? 'bg-white scale-125' : 'bg-white/40'
                    }`}
                  />
                ))}
              </div>
            </>
          )}
          
          {/* Starting Price Overlay (Premium) */}
          <div className="absolute bottom-4 start-4 flex flex-col pointer-events-none">
            <span className="text-[10px] uppercase font-bold text-white/80 tracking-wider">
              {locale === 'ar' ? 'يبدأ من' : 'Starting From'}
            </span>
            <span className="text-xl font-bold text-white tracking-tight">
              {formatPriceCompact(minPrice, locale as 'en' | 'ar')}
            </span>
          </div>

          {/* Development Badge */}
          <div className="absolute top-4 start-4 flex items-center gap-1.5 bg-primary-600/90 backdrop-blur-md text-white text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-lg border border-primary-500/20 shadow-sm">
            <Layers className="w-3 h-3" />
            {locale === 'ar' ? 'مجمع سكني' : 'Project Compound'}
          </div>
          
          {/* Verification Badge & Favorite Button */}
          <div className="absolute top-4 end-4 z-10 flex flex-col gap-2 items-end pointer-events-auto">
            <div className="flex items-center gap-1.5 bg-white/95 backdrop-blur-md text-accent-600 text-[10px] font-bold px-2 py-1.5 rounded-lg border border-accent-100 shadow-sm">
              <Shield className="w-3 h-3 fill-accent-500 text-accent-500" />
              {locale === 'ar' ? 'موثوق' : 'Verified'}
            </div>

            <button
              onClick={handleToggleFavorite}
              className={`p-2 rounded-lg backdrop-blur-md border shadow-sm transition-all relative z-20 ${favorited
                  ? 'bg-red-50/90 text-red-500 border-red-100'
                  : 'bg-white/80 text-gray-400 border-gray-100 hover:text-red-500 hover:bg-white'
                }`}
            >
              <Heart className={`w-4 h-4 ${favorited ? 'fill-current' : ''}`} />
            </button>
          </div>
        </div>

        {/* Content Section */}
        <div className="p-5 flex flex-col flex-1 relative z-10 pointer-events-none">
          {/* Status Badge */}
          <div className="flex items-center gap-1.5 mb-2.5">
            {project.completionStatus && (
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-[10px] font-bold uppercase tracking-wider ${statusColors[project.completionStatus]}`}>
                {statusIcons[project.completionStatus]}
                {statusBadges[project.completionStatus]}
              </span>
            )}
            {project.expectedDelivery && (
              <span className="text-[10px] font-medium text-surface-500">
                • {locale === 'ar' ? `التسليم: ${project.expectedDelivery}` : `Delivery: ${project.expectedDelivery}`}
              </span>
            )}
          </div>

          {/* Title */}
          <h3 className={`text-base font-bold text-charcoal mb-2 line-clamp-1 group-hover:text-primary-600 transition-colors ${locale === 'ar' ? 'font-arabic' : ''}`}>
            {title}
          </h3>

          {/* Location */}
          <div className="flex items-center gap-1.5 text-xs text-charcoal-muted mb-5">
            <MapPin className="w-3.5 h-3.5 text-primary-500 shrink-0" />
            <span className={`line-clamp-1 ${locale === 'ar' ? 'font-arabic' : ''}`}>{location}</span>
          </div>

          {/* Metadata Footer */}
          <div className="flex items-center justify-between pt-4 border-t border-surface-100 mt-auto">
            <div className="flex items-center gap-1.5 text-xs text-charcoal-muted">
              <Square className="w-4 h-4 text-primary-500/70" />
              <span className="font-bold">{bedsText()}</span>
            </div>
            
            <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-50 border border-indigo-100 text-indigo-700 text-[10px] font-black uppercase tracking-wider">
              <Sparkles className="w-3 h-3" />
              {layoutCount} {locale === 'ar' ? 'نماذج متوفرة' : 'Layouts'}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
