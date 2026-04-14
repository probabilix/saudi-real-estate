'use client';

import { useRef } from 'react';
import Link from 'next/link';
import { useTranslations, useLocale } from 'next-intl';
import { motion, useInView } from 'framer-motion';
import { ArrowRight, Users, TrendingUp } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';

export default function CTASection() {
  const t = useTranslations('cta');
  const tCommon = useTranslations('common');
  const locale = useLocale();
  const { isAuthenticated } = useAuth();
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-80px' });

  return (
    <section ref={ref} className="py-24 bg-white dark:bg-charcoal relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-8 lg:gap-12">
          {/* Broker CTA - Deep Teal Panel */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={inView ? { opacity: 1, scale: 1 } : {}}
            transition={{ duration: 0.6 }}
            className="relative rounded-3xl overflow-hidden bg-primary-600 shadow-xl shadow-primary-600/20"
          >
            {/* Soft decorative background pattern */}
            <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '24px 24px' }} />
            
            <div className="relative p-10 lg:p-14">
              <div className="w-16 h-16 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center mb-8 border border-white/20">
                <Users className="w-8 h-8 text-white" />
              </div>
              <h3 className={`text-3xl lg:text-4xl font-bold text-white mb-4 ${locale === 'ar' ? 'font-arabic' : 'font-serif'}`}>
                {t('brokerTitle')}
              </h3>
              <p className={`text-white/80 leading-relaxed mb-10 text-lg ${locale === 'ar' ? 'font-arabic' : ''}`}>
                {t('brokerSubtitle')}
              </p>

              {/* Stats Highlighting */}
              <div className="grid grid-cols-2 gap-6 mb-10">
                <div className="bg-white/5 backdrop-blur-sm p-4 rounded-xl border border-white/10">
                  <div className="text-2xl font-bold text-white">94%</div>
                  <div className="text-[10px] text-white/50 uppercase tracking-widest font-bold mt-1">{t('leadQuality')}</div>
                </div>
                <div className="bg-white/5 backdrop-blur-sm p-4 rounded-xl border border-white/10">
                  <div className="text-2xl font-bold text-white">{tCommon('sar')} 299</div>
                  <div className="text-[10px] text-white/50 uppercase tracking-widest font-bold mt-1">{t('startingPrice')}</div>
                </div>
              </div>

              <Link
                href={isAuthenticated ? `/${locale}/dashboard` : `/${locale}/auth/register?role=SOLO_BROKER`}
                className="inline-flex items-center gap-3 px-8 py-4 rounded-xl bg-white text-primary-700 font-bold text-sm shadow-lg hover:bg-surface-50 transition-all group"
              >
                {t('brokerCta')}
                <ArrowRight className={`w-4 h-4 transition-transform ${locale === 'ar' ? 'rotate-180 group-hover:-translate-x-1' : 'group-hover:translate-x-1'}`} />
              </Link>
            </div>
          </motion.div>

          {/* Buyer CTA - Clean Soft Panel */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={inView ? { opacity: 1, scale: 1 } : {}}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="relative rounded-3xl overflow-hidden bg-charcoal dark:bg-gray-900 shadow-xl shadow-charcoal/20 border border-transparent dark:border-gray-800"
          >
            <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '24px 24px' }} />
            
            <div className="relative p-10 lg:p-14">
              <div className="w-16 h-16 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center mb-8 border border-white/20">
                <TrendingUp className="w-8 h-8 text-white" />
              </div>
              <h3 className={`text-3xl lg:text-4xl font-bold text-white mb-4 ${locale === 'ar' ? 'font-arabic' : 'font-serif'}`}>
                {t('buyerTitle')}
              </h3>
              <p className={`text-white/80 leading-relaxed mb-10 text-lg ${locale === 'ar' ? 'font-arabic' : ''}`}>
                {t('buyerSubtitle')}
              </p>

              <div className="grid grid-cols-2 gap-6 mb-10">
                <div className="bg-white/5 backdrop-blur-sm p-4 rounded-xl border border-white/10">
                  <div className="text-2xl font-bold text-white">500+</div>
                  <div className="text-[10px] text-white/50 uppercase tracking-widest font-bold mt-1">{t('listingsCount')}</div>
                </div>
                <div className="bg-white/5 backdrop-blur-sm p-4 rounded-xl border border-white/10">
                  <div className="text-2xl font-bold text-white">{tCommon('free')}</div>
                  <div className="text-[10px] text-white/50 uppercase tracking-widest font-bold mt-1">{t('forBuyers')}</div>
                </div>
              </div>

              <Link
                href={`/${locale}/listings`}
                className="inline-flex items-center gap-3 px-8 py-4 rounded-xl bg-primary-600 text-white font-bold text-sm shadow-lg hover:bg-primary-500 transition-all group"
              >
                {t('buyerCta')}
                <ArrowRight className={`w-4 h-4 transition-transform ${locale === 'ar' ? 'rotate-180 group-hover:-translate-x-1' : 'group-hover:translate-x-1'}`} />
              </Link>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
