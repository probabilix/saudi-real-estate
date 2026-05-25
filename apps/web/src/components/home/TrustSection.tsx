'use client';

import { useRef, useEffect, useState } from 'react';
import { useLocale } from 'next-intl';
import { motion, useInView } from 'framer-motion';
import { Building2, ShieldCheck, Globe, TrendingUp } from 'lucide-react';

interface TrustSectionProps {
  stats?: {
    listings?: string;
    transactions?: string;
    cities?: string;
    ownership?: string;
  };
}

function AnimatedNumber({ target, suffix = '', duration = 2000 }: { target: string; suffix?: string; duration?: number }) {
  const [display, setDisplay] = useState('0');
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-60px' });

  useEffect(() => {
    if (!inView) return;
    // Check if target is purely numeric
    const numMatch = target.match(/^(\d+)/);
    if (!numMatch) {
      // Non-numeric like "SAR 50M+", just show after a short delay
      const timer = setTimeout(() => setDisplay(target + suffix), 300);
      return () => clearTimeout(timer);
    }
    const end = parseInt(numMatch[1]);
    const suffix2 = target.replace(numMatch[1], '');
    let start = 0;
    const step = Math.ceil(end / (duration / 16));
    const timer = setInterval(() => {
      start = Math.min(start + step, end);
      setDisplay(start + suffix2 + suffix);
      if (start >= end) clearInterval(timer);
    }, 16);
    return () => clearInterval(timer);
  }, [inView, target, suffix, duration]);

  return <span ref={ref}>{display}</span>;
}

const STATS = [
  {
    icon: Building2,
    key: 'listings',
    labelEn: 'Curated Listings',
    labelAr: 'عقار مختار',
    default: '200+',
  },
  {
    icon: TrendingUp,
    key: 'transactions',
    labelEn: 'In Transactions',
    labelAr: 'في المعاملات',
    default: 'SAR 50M+',
  },
  {
    icon: Globe,
    key: 'cities',
    labelEn: 'Prime Cities',
    labelAr: 'مدن رئيسية',
    default: '4',
  },
  {
    icon: ShieldCheck,
    key: 'ownership',
    labelEn: 'Direct Ownership',
    labelAr: 'ملكية مباشرة',
    default: '100%',
  },
];

export default function TrustSection({ stats = {} }: TrustSectionProps) {
  const locale = useLocale();
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-80px' });
  const isRTL = locale === 'ar';

  return (
    <section ref={ref} className="relative py-20 sm:py-24 overflow-hidden bg-gradient-to-br from-charcoal via-[#1a2e30] to-[#0b3a3d]">
      {/* Geometric Arabic pattern overlay */}
      <div
        className="absolute inset-0 opacity-[0.04] pointer-events-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='60' height='60'%3E%3Cpath d='M30 0L60 30L30 60L0 30Z' fill='none' stroke='%23ffffff' stroke-width='1'/%3E%3Cpath d='M30 10L50 30L30 50L10 30Z' fill='none' stroke='%23ffffff' stroke-width='0.5'/%3E%3C/svg%3E")`,
          backgroundSize: '60px 60px',
        }}
      />

      {/* Glow orbs */}
      <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-primary-600/10 blur-[100px] pointer-events-none" />
      <div className="absolute -bottom-32 -right-32 w-96 h-96 rounded-full bg-accent-500/10 blur-[100px] pointer-events-none" />

      {/* Gold top accent */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-gold/60 to-transparent" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7 }}
          className="text-center mb-14 sm:mb-16"
        >
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/8 border border-white/12 text-white/70 text-[11px] font-black uppercase tracking-[0.2em] mb-5">
            <span className="w-1.5 h-1.5 rounded-full bg-gold" />
            {isRTL ? 'أرقام تتحدث عن نفسها' : 'BY THE NUMBERS'}
          </div>
          <h2 className={`text-3xl sm:text-4xl lg:text-5xl font-bold text-white leading-tight ${isRTL ? 'font-arabic' : 'font-serif'}`}>
            {isRTL ? 'ثقة مبنية على النتائج' : 'Trust Built on Results'}
          </h2>
          <p className={`mt-4 text-white/60 max-w-md mx-auto text-base ${isRTL ? 'font-arabic' : ''}`}>
            {isRTL
              ? 'أرقام حقيقية من محفظتنا العقارية الحصرية في المملكة العربية السعودية'
              : 'Real numbers from our exclusive property portfolio across the Kingdom.'}
          </p>
        </motion.div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {STATS.map((stat, i) => {
            const Icon = stat.icon;
            const value = (stats as any)[stat.key] || stat.default;
            return (
              <motion.div
                key={stat.key}
                initial={{ opacity: 0, y: 30 }}
                animate={inView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.6, delay: i * 0.12 }}
                className="group relative"
              >
                <div className="relative bg-white/6 backdrop-blur-md rounded-2xl sm:rounded-3xl p-6 sm:p-8 border border-white/10 hover:border-primary-400/40 hover:bg-white/10 transition-all duration-300 text-center overflow-hidden">
                  {/* Hover glow */}
                  <div className="absolute inset-0 bg-gradient-to-br from-primary-600/0 to-primary-600/0 group-hover:from-primary-600/10 group-hover:to-transparent transition-all duration-500 rounded-2xl sm:rounded-3xl" />

                  <div className="relative z-10">
                    <div className="w-11 h-11 rounded-xl bg-white/10 border border-white/15 flex items-center justify-center mx-auto mb-4 group-hover:bg-primary-500/20 group-hover:border-primary-400/30 transition-all duration-300">
                      <Icon className="w-5 h-5 text-white/70 group-hover:text-primary-300 transition-colors duration-300" />
                    </div>
                    <div className={`text-3xl sm:text-4xl font-black text-white mb-2 tracking-tight ${isRTL ? 'font-arabic' : ''}`}>
                      <AnimatedNumber target={value} />
                    </div>
                    <div className={`text-xs text-white/50 font-semibold uppercase tracking-wider ${isRTL ? 'font-arabic text-xs' : ''}`}>
                      {isRTL ? stat.labelAr : stat.labelEn}
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Partner badges */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={inView ? { opacity: 1 } : {}}
          transition={{ duration: 0.8, delay: 0.6 }}
          className="mt-12 sm:mt-16 flex flex-wrap items-center justify-center gap-6 sm:gap-10"
        >
          {[
            { en: 'Vision 2030', ar: 'رؤية 2030' },
            { en: 'REGA Compliant', ar: 'متوافق مع الهيئة العامة للعقار' },
            { en: 'ISO Certified Platform', ar: 'منصة معتمدة' },
          ].map((badge, i) => (
            <div key={i} className="flex items-center gap-2.5 text-white/40 text-xs font-bold uppercase tracking-widest">
              <div className="w-5 h-px bg-white/20" />
              {isRTL ? badge.ar : badge.en}
              <div className="w-5 h-px bg-white/20" />
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
