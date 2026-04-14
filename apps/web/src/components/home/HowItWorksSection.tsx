'use client';

import { useRef } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { motion, useInView } from 'framer-motion';
import { Search, Zap, Users } from 'lucide-react';

const steps = [
  { icon: Search, key: 'step1', color: 'bg-primary-50 text-primary-600 border-primary-100' },
  { icon: Zap, key: 'step2', color: 'bg-accent-50 text-accent-600 border-accent-100' },
  { icon: Users, key: 'step3', color: 'bg-primary-50 text-primary-600 border-primary-100' },
];

export default function HowItWorksSection() {
  const t = useTranslations('howItWorks');
  const locale = useLocale();
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-100px' });

  return (
    <section ref={ref} className="py-24 bg-white relative overflow-hidden">
      {/* Decorative clean background element */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full max-w-7xl mx-auto opacity-[0.03] pointer-events-none">
        <div className="w-full h-full border-x border-surface-200" />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-20"
        >
          <span className="inline-block text-[10px] font-black uppercase tracking-[0.2em] text-primary-600 mb-4">
            {t('process')}
          </span>
          <h2
            className={`text-4xl lg:text-5xl font-bold text-charcoal mb-6 ${locale === 'ar' ? 'font-arabic' : 'font-serif'}`}
          >
            {t('title')}
          </h2>
          <p className={`text-charcoal-muted max-w-xl mx-auto text-lg ${locale === 'ar' ? 'font-arabic' : ''}`}>
            {t('subtitle')}
          </p>
          <div className="mt-8 w-12 h-1 bg-primary-600 mx-auto rounded-full" />
        </motion.div>

        {/* Steps */}
        <div className="grid md:grid-cols-3 gap-12 lg:gap-16 relative">
          {/* Connector line (Soft & Light) */}
          <div className={`hidden md:block absolute top-[52px] ${locale === 'ar' ? 'right-1/4 left-1/4' : 'start-1/4 end-1/4'} h-px bg-dashed border-t border-dashed border-surface-200`} />

          {steps.map((step, i) => {
            const Icon = step.icon;
            return (
              <motion.div
                key={step.key}
                initial={{ opacity: 0, y: 30 }}
                animate={inView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.6, delay: i * 0.15 }}
                className="relative group"
              >
                <div className="flex flex-col items-center text-center">
                  <div className="relative mb-8">
                    {/* Icon Container - No more rounded-none */}
                    <div
                      className={`w-28 h-28 rounded-2xl border ${step.color} flex items-center justify-center shadow-sm group-hover:shadow-md transition-all duration-300 transform group-hover:-translate-y-1`}
                    >
                      <Icon className="w-10 h-10 transition-transform duration-500 group-hover:scale-110" />
                    </div>
                    
                    {/* Step Number Badge */}
                    <div className={`absolute -top-3 ${locale === 'ar' ? '-start-3' : '-end-3'} w-9 h-9 rounded-full bg-white border border-surface-100 shadow-sm flex items-center justify-center z-10 scale-0 group-hover:scale-100 transition-transform duration-300`}>
                      <span className="text-xs font-black text-primary-600">{i + 1}</span>
                    </div>
                    
                    {/* Minimalist index for static state */}
                    <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 px-2 bg-white text-[10px] font-black text-surface-300 uppercase tracking-widest border border-surface-100 rounded-full group-hover:opacity-0 transition-opacity">
                      {t('phase')} {i + 1}
                    </div>
                  </div>

                  <h3
                    className={`text-xl font-bold text-charcoal mb-4 ${locale === 'ar' ? 'font-arabic' : 'font-serif'}`}
                  >
                    {t(`${step.key}Title` as 'step1Title' | 'step2Title' | 'step3Title')}
                  </h3>
                  <p
                    className={`text-sm text-charcoal-muted leading-relaxed max-w-xs mx-auto ${locale === 'ar' ? 'font-arabic' : ''}`}
                  >
                    {t(`${step.key}Desc` as 'step1Desc' | 'step2Desc' | 'step3Desc')}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
