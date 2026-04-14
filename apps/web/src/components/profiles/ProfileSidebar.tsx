'use client';

import React from 'react';
import { 
  Info, 
  TrendingUp, 
  Map, 
  Languages, 
  CheckCircle,
  Calendar
} from 'lucide-react';
import { useTranslations, useLocale } from 'next-intl';

interface ProfileSidebarProps {
  type: 'broker' | 'firm';
  data: {
    bioEn?: string | null;
    bioAr?: string | null;
    experienceLevel?: string | null;
    languages?: string[];
    serviceAreas?: string[];
    createdAt: string;
    stats: {
      successListings: number;
      activeListings: number;
    };
  };
}

export default function ProfileSidebar({ data }: ProfileSidebarProps) {
  const t = useTranslations('profiles');
  const locale = useLocale();

  const bio = locale === 'ar' ? data.bioAr : data.bioEn;
  const experience = data.experienceLevel || '0-2';

  return (
    <div className="space-y-8">
      {/* Success Metrics Card */}
      <div className="bg-gradient-to-br from-charcoal to-black rounded-[32px] p-8 text-white shadow-xl">
        <div className="flex items-center gap-3 mb-6">
           <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-amber-400" />
           </div>
           <h3 className="text-lg font-bold">{t('marketTrackRecord')}</h3>
        </div>
        
        <div className="space-y-6">
           <div>
              <p className="text-charcoal-light text-[10px] font-black uppercase tracking-[0.2em] mb-1">{t('propertiesClosed')}</p>
              <p className="text-3xl font-bold">{data.stats.successListings}</p>
           </div>
           <div>
              <p className="text-charcoal-light text-[10px] font-black uppercase tracking-[0.2em] mb-1">{t('activeInventory')}</p>
              <p className="text-3xl font-bold">{data.stats.activeListings}</p>
           </div>
           <div className="pt-4 border-t border-white/10">
              <div className="flex items-center gap-2 text-xs font-bold text-amber-400">
                 <CheckCircle className="w-4 h-4" />
                 {t('verifiedPerformance')}
              </div>
           </div>
        </div>
      </div>

      {/* About Section */}
      <div className="bg-white rounded-[32px] p-8 border border-surface-100 shadow-sm">
        <h3 className="text-lg font-bold text-charcoal mb-6 flex items-center gap-2">
           <Info className="w-5 h-5 text-primary-600" />
           {t('about')}
        </h3>
        <p className="text-charcoal-muted leading-relaxed whitespace-pre-line text-sm">
           {bio || t('noBioProvided')}
        </p>
      </div>

      {/* Technical Spec Card */}
      <div className="bg-surface-50 rounded-[32px] p-8 border border-surface-100">
        <div className="space-y-6">
           <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-white rounded-xl shadow-sm flex items-center justify-center shrink-0">
                 <Calendar className="w-5 h-5 text-primary-600" />
              </div>
              <div>
                 <p className="text-[10px] font-black uppercase tracking-widest text-charcoal-muted mb-0.5">{t('experience')}</p>
                 <p className="font-bold text-charcoal">{experience} {t('years')}</p>
              </div>
           </div>

           <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-white rounded-xl shadow-sm flex items-center justify-center shrink-0">
                 <Map className="w-5 h-5 text-primary-600" />
              </div>
              <div>
                 <p className="text-[10px] font-black uppercase tracking-widest text-charcoal-muted mb-0.5">{t('serviceAreas')}</p>
                 <p className="font-bold text-charcoal">{data.serviceAreas?.join(', ') || 'Riyadh, Jeddah'}</p>
              </div>
           </div>

           <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-white rounded-xl shadow-sm flex items-center justify-center shrink-0">
                 <Languages className="w-5 h-5 text-primary-600" />
              </div>
              <div>
                 <p className="text-[10px] font-black uppercase tracking-widest text-charcoal-muted mb-0.5">{t('languages')}</p>
                 <p className="font-bold text-charcoal">{data.languages?.join(', ') || 'Arabic, English'}</p>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
}
