'use client';

import { useRef } from 'react';
import { useLocale } from 'next-intl';
import { motion, useInView } from 'framer-motion';
import { Building2, ShieldCheck, KeyRound } from 'lucide-react';

const steps = [
  {
    number: '01',
    icon: Building2,
    titleEn: 'Explore Elite Properties',
    titleAr: 'استكشف العقارات الحصرية',
    descEn: 'Browse our handpicked portfolio of premium properties across Saudi Arabia\'s most sought-after districts.',
    descAr: 'تصفح محفظتنا المختارة من أفضل العقارات في أرقى مناطق المملكة العربية السعودية.',
  },
  {
    number: '02',
    icon: ShieldCheck,
    titleEn: 'AI-Powered Qualification',
    titleAr: 'تأهيل بالذكاء الاصطناعي',
    descEn: 'Our Noor AI Concierge evaluates your budget, intent, and preferences — ensuring perfect alignment before connecting you.',
    descAr: 'يقيّم مساعدنا الذكي نور ميزانيتك ونواياك وتفضيلاتك لضمان التوافق المثالي قبل ربطك بالوكيل.',
  },
  {
    number: '03',
    icon: KeyRound,
    titleEn: 'Unlock & Close the Deal',
    titleAr: 'افتح ملف العقار وأتمّ الصفقة',
    descEn: 'Once qualified, broker contact details are instantly unlocked. Direct, fast, no middlemen.',
    descAr: 'بمجرد التأهيل، يُفتح ملف الوكيل فورًا. تواصل مباشر وسريع دون وسطاء.',
  },
];

export default function HowItWorksSection() {
  const locale = useLocale();
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-80px' });
  const isRTL = locale === 'ar';

  return (
    <section ref={ref} className="py-20 sm:py-28 bg-[#F8F6F2] relative overflow-hidden">
      {/* Subtle texture dots */}
      <div
        className="absolute inset-0 opacity-[0.025] pointer-events-none"
        style={{ backgroundImage: 'radial-gradient(circle, #0b666a 1px, transparent 1px)', backgroundSize: '28px 28px' }}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-16 sm:mb-20"
        >
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary-50 border border-primary-100 text-primary-700 text-[11px] font-black uppercase tracking-[0.2em] mb-5">
            {isRTL ? 'كيف يعمل' : 'HOW IT WORKS'}
          </div>
          <h2 className={`text-3xl sm:text-4xl lg:text-5xl font-bold text-charcoal leading-tight ${isRTL ? 'font-arabic' : 'font-serif'}`}>
            {isRTL ? 'رحلتك إلى العقار المثالي' : 'Your Path to the Perfect Property'}
          </h2>
          <p className={`mt-4 text-charcoal-muted max-w-lg mx-auto text-base sm:text-lg ${isRTL ? 'font-arabic' : ''}`}>
            {isRTL
              ? 'ثلاث خطوات بسيطة تفصلك عن امتلاك عقار فاخر في المملكة'
              : 'Three refined steps between you and owning premium real estate in the Kingdom.'}
          </p>
        </motion.div>

        {/* Steps grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 relative">
          {/* Connecting line between steps on desktop */}
          <div className="hidden md:block absolute top-14 left-[calc(33%+24px)] right-[calc(33%+24px)] h-px bg-gradient-to-r from-primary-200 via-primary-400 to-primary-200 pointer-events-none" />

          {steps.map((step, i) => {
            const Icon = step.icon;
            return (
              <motion.div
                key={step.number}
                initial={{ opacity: 0, y: 30 }}
                animate={inView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.7, delay: i * 0.15 }}
                className="group relative"
              >
                <div className="relative bg-white rounded-2xl sm:rounded-3xl p-7 sm:p-8 border border-surface-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 h-full overflow-hidden">
                  {/* Large decorative step number */}
                  <div className="absolute -top-4 -right-2 text-[80px] font-black text-primary-50 leading-none select-none pointer-events-none">
                    {step.number}
                  </div>

                  {/* Icon */}
                  <div className="relative mb-6 inline-flex">
                    <div className="w-14 h-14 rounded-2xl bg-primary-50 border border-primary-100 flex items-center justify-center group-hover:bg-primary-600 group-hover:border-primary-600 transition-all duration-300">
                      <Icon className="w-6 h-6 text-primary-600 group-hover:text-white transition-colors duration-300" />
                    </div>
                    <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-white border-2 border-primary-200 flex items-center justify-center">
                      <span className="text-[9px] font-black text-primary-600">{i + 1}</span>
                    </div>
                  </div>

                  <h3 className={`text-lg sm:text-xl font-bold text-charcoal mb-3 ${isRTL ? 'font-arabic' : 'font-serif'}`}>
                    {isRTL ? step.titleAr : step.titleEn}
                  </h3>
                  <p className={`text-sm text-charcoal-muted leading-relaxed ${isRTL ? 'font-arabic' : ''}`}>
                    {isRTL ? step.descAr : step.descEn}
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
