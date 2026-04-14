'use client';

import React from 'react';
import Image from 'next/image';
import { 
  CheckCircle2, 
  MapPin, 
  Phone, 
  Mail, 
  MessageCircle,
  ShieldCheck,
  Star,
  Award
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useTranslations, useLocale } from 'next-intl';

interface BrokerHeroProps {
  broker: {
    id: string;
    name: string;
    avatarUrl: string | null;
    role: string;
    phone: string | null;
    email: string;
    regaVerified: boolean;
    firm?: {
      id: string;
      name: string;
    } | null;
    profile?: {
      titleEn: string | null;
      titleAr: string | null;
      languages: string[];
    } | null;
  };
}

export default function BrokerHero({ broker }: BrokerHeroProps) {
  const t = useTranslations('profiles');
  const locale = useLocale();
  const isRTL = locale === 'ar';

  const title = locale === 'ar' ? broker.profile?.titleAr : broker.profile?.titleEn;
  const languages = broker.profile?.languages || [];

  return (
    <div className="relative overflow-hidden bg-white rounded-[40px] border border-surface-100 shadow-xl shadow-black/[0.03]">
      {/* Background patterns */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-primary-50 rounded-full blur-3xl -mr-32 -mt-32 opacity-50" />
      <div className="absolute bottom-0 left-0 w-48 h-48 bg-amber-50 rounded-full blur-3xl -ml-24 -mb-24 opacity-50" />

      <div className="relative z-10 p-8 lg:p-12">
        <div className="flex flex-col lg:flex-row gap-10 items-start">
          {/* Avatar & Verification Bundle */}
          <div className="relative group shrink-0">
            <div className="w-32 h-32 lg:w-44 lg:h-44 rounded-[32px] overflow-hidden border-4 border-white shadow-2xl relative transform group-hover:scale-[1.02] transition-all duration-500">
              <Image 
                src={broker.avatarUrl || '/avatars/default-broker.jpg'} 
                alt={broker.name}
                fill
                className="object-cover"
              />
            </div>
            {broker.regaVerified && (
              <motion.div 
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute -bottom-2 -right-2 bg-primary-600 text-white p-2.5 rounded-2xl shadow-lg border-4 border-white"
              >
                <ShieldCheck className="w-5 h-5 lg:w-6 lg:h-6" />
              </motion.div>
            )}
            
            {/* TruBroker Badge (Elite Status) */}
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap px-4 py-1.5 bg-gradient-to-r from-amber-400 to-amber-600 text-white text-[10px] font-black uppercase tracking-[0.2em] rounded-full shadow-lg">
              TruBroker™
            </div>
          </div>

          {/* Core Info */}
          <div className="flex-1 space-y-4">
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-3xl lg:text-4xl font-bold text-charcoal">{broker.name}</h1>
                <div className="flex gap-1.5">
                   <div className="px-3 py-1 bg-surface-50 text-surface-600 rounded-lg text-[10px] font-bold uppercase tracking-wider border border-surface-100 italic">
                      Quality Lister
                   </div>
                   <div className="px-3 py-1 bg-amber-50 text-amber-700 rounded-lg text-[10px] font-bold uppercase tracking-wider border border-amber-100 flex items-center gap-1">
                      <Award className="w-3 h-3" />
                      Super Lister
                   </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                 <p className="text-lg text-primary-600 font-bold">{title || t('professionalAgent')}</p>
                 {broker.firm && (
                    <>
                      <span className="text-surface-300">|</span>
                      <Link href={`/${locale}/firms/${broker.firm.id}`} className="text-charcoal-muted hover:text-primary-600 transition-colors font-medium underline underline-offset-4 decoration-surface-200">
                        {broker.firm.name}
                      </Link>
                    </>
                 )}
              </div>
            </div>

            <p className="text-charcoal-muted max-w-2xl leading-relaxed">
              Authorized by The General Real Estate Authority. Expert in Saudi market dynamics with a focus on trust and transparency.
            </p>

            <div className="flex flex-wrap gap-6 pt-2">
              <div className="flex items-center gap-2.5 text-sm font-medium text-charcoal">
                <div className="w-8 h-8 rounded-xl bg-surface-50 flex items-center justify-center text-primary-600">
                  <MessageCircle className="w-4 h-4" />
                </div>
                <span>{t('speaks')}: {languages.length > 0 ? languages.join(', ') : 'Arabic, English'}</span>
              </div>
              <div className="flex items-center gap-2.5 text-sm font-medium text-charcoal">
                <div className="w-8 h-8 rounded-xl bg-surface-50 flex items-center justify-center text-primary-600">
                  <Star className="w-4 h-4 fill-primary-600" />
                </div>
                <span>4.9/5.0 <span className="text-charcoal-muted font-normal">(120+ {t('reviews')})</span></span>
              </div>
            </div>

            {/* CTA Actions */}
            <div className="flex flex-wrap gap-4 pt-6">
               <button className="flex items-center gap-2 px-8 py-3.5 bg-primary-600 text-white rounded-2xl font-bold shadow-xl shadow-primary-600/20 hover:bg-primary-700 transition-all active:scale-95">
                  <Mail className="w-4 h-4" />
                  {t('email')}
               </button>
               <button className="flex items-center gap-2 px-8 py-3.5 bg-white border border-surface-200 text-charcoal rounded-2xl font-bold hover:bg-surface-50 transition-all active:scale-95 shadow-sm">
                  <Phone className="w-4 h-4" />
                  {t('call')}
               </button>
               <button className="flex items-center gap-2 px-8 py-3.5 bg-[#25D366] text-white rounded-2xl font-bold shadow-xl shadow-[#25D366]/20 hover:bg-[#128C7E] transition-all active:scale-95">
                  <MessageCircle className="w-4 h-4" />
                  WhatsApp
               </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

import Link from 'next/link';
