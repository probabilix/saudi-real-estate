'use client';

import React from 'react';
import Image from 'next/image';
import { 
  Building2, 
  MapPin, 
  Users, 
  Globe,
  CheckCircle2,
  Mail,
  Phone
} from 'lucide-react';
import { useTranslations, useLocale } from 'next-intl';

interface FirmHeroProps {
  firm: {
    id: string;
    name: string;
    avatarUrl: string | null;
    email: string;
    phone: string | null;
    stats: {
      activeListings: number;
      successListings: number;
      agentsCount: number;
    };
  };
}

export default function FirmHero({ firm }: FirmHeroProps) {
  const t = useTranslations('profiles');
  const locale = useLocale();
  const isRTL = locale === 'ar';

  return (
    <div className="bg-white rounded-[40px] border border-surface-100 shadow-xl shadow-black/[0.03] overflow-hidden">
      {/* Cover subtle gradient */}
      <div className="h-32 lg:h-48 bg-gradient-to-r from-primary-900 to-charcoal relative">
         <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '24px 24px' }} />
      </div>

      <div className="px-8 lg:px-12 pb-10">
        <div className="flex flex-col lg:flex-row gap-8 items-end -mt-16 relative z-10">
          {/* Logo */}
          <div className="w-32 h-32 lg:w-40 lg:h-40 bg-white rounded-[32px] p-6 shadow-2xl border border-surface-50 shrink-0 flex items-center justify-center group transform transition-transform duration-500 hover:scale-[1.05]">
             <div className="relative w-full h-full">
                <Image 
                  src={firm.avatarUrl || '/logos/default-firm.png'} 
                  alt={firm.name}
                  fill
                  className="object-contain p-2"
                />
             </div>
          </div>

          {/* Core Info */}
          <div className="flex-1 pb-2">
            <h1 className="text-3xl lg:text-4xl font-bold text-charcoal mb-2 flex items-center gap-3">
               {firm.name}
               <CheckCircle2 className="w-6 h-6 text-primary-600 fill-primary-600/10" />
            </h1>
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-charcoal-muted font-medium text-sm">
               <div className="flex items-center gap-2">
                  <Building2 className="w-4 h-4" />
                  <span>{firm.stats.activeListings} {t('activeListings')}</span>
               </div>
               <div className="flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  <span>{firm.stats.agentsCount} {t('agents')}</span>
               </div>
               <div className="flex items-center gap-2">
                  <Globe className="w-4 h-4" />
                  <span>Verified Firm</span>
               </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pb-2">
             <button className="flex items-center gap-2 px-6 py-3 bg-white border border-surface-200 text-charcoal rounded-2xl font-bold hover:bg-surface-50 transition-all shadow-sm">
                <Mail className="w-4 h-4" />
                {t('email')}
             </button>
             <button className="flex items-center gap-2 px-6 py-3 bg-white border border-surface-200 text-charcoal rounded-2xl font-bold hover:bg-surface-50 transition-all shadow-sm">
                <Phone className="w-4 h-4" />
                {t('call')}
             </button>
          </div>
        </div>
      </div>
    </div>
  );
}
