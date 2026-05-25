'use client';

import { useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useLocale, useTranslations } from 'next-intl';
import { motion, useInView } from 'framer-motion';
import { MapPin, ArrowRight } from 'lucide-react';

interface CitySpotlightProps {
  counts?: Record<string, number>;
}

const CITIES = [
  {
    name: 'Riyadh',
    nameAr: 'الرياض',
    image: 'https://images.unsplash.com/photo-1586724237569-f3d0c1dee8c6?w=1200&q=85',
    fallbackCount: 245,
    description: 'Capital & Business Hub',
    descriptionAr: 'العاصمة ومحور الأعمال',
    accent: 'from-primary-800/70 to-primary-900/80',
    className: 'md:col-span-2 md:row-span-2',
    heightClass: 'h-[380px] sm:h-[480px] md:h-full min-h-[420px]',
  },
  {
    name: 'Jeddah',
    nameAr: 'جدة',
    image: 'https://images.unsplash.com/photo-1605810230434-7631ac76ec81?w=900&q=85',
    fallbackCount: 183,
    description: 'Red Sea Cosmopolitan',
    descriptionAr: 'مدينة البحر الأحمر الراقية',
    accent: 'from-accent-700/60 to-accent-900/80',
    className: 'md:col-span-1 md:row-span-1',
    heightClass: 'h-[220px] md:h-full',
  },
  {
    name: 'Dammam',
    nameAr: 'الدمام',
    image: 'https://images.unsplash.com/photo-1570197788417-0e82375c9371?w=900&q=85',
    fallbackCount: 97,
    description: 'Eastern Province Gateway',
    descriptionAr: 'بوابة المنطقة الشرقية',
    accent: 'from-primary-600/60 to-primary-900/80',
    className: 'md:col-span-1 md:row-span-1',
    heightClass: 'h-[220px] md:h-full',
  },
];

export default function CitySpotlightSection({ counts }: CitySpotlightProps) {
  const locale = useLocale();
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-80px' });
  const isRTL = locale === 'ar';

  return (
    <section ref={ref} className="py-20 sm:py-28 bg-[#F9F7F4] relative overflow-hidden">
      {/* Warm light watermark behind heading */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/3 text-[200px] sm:text-[280px] font-black text-charcoal/[0.025] select-none pointer-events-none leading-none font-serif">
        {isRTL ? 'مدن' : 'KSA'}
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-12 sm:mb-14"
        >
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary-50 border border-primary-100 text-primary-700 text-[11px] font-black uppercase tracking-[0.2em] mb-4">
            <MapPin className="w-3.5 h-3.5" />
            {isRTL ? 'استكشف بالمدينة' : 'EXPLORE BY CITY'}
          </div>
          <h2 className={`text-3xl sm:text-4xl lg:text-5xl font-bold text-charcoal ${isRTL ? 'font-arabic' : 'font-serif'}`}>
            {isRTL ? 'أين تريد الاستثمار؟' : 'Where Do You Want to Invest?'}
          </h2>
          <p className={`mt-3 text-charcoal-muted text-base max-w-md mx-auto ${isRTL ? 'font-arabic' : ''}`}>
            {isRTL
              ? 'اختر وجهتك وتصفح العقارات المتاحة في كل مدينة'
              : 'Choose your destination and explore premium listings in each city.'}
          </p>
        </motion.div>

        {/* Bento Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 md:grid-rows-2 gap-4 sm:gap-5" style={{ minHeight: '480px' }}>
          {CITIES.map((city, i) => {
            const count = (counts && counts[city.name] !== undefined) ? counts[city.name] : city.fallbackCount;

            return (
              <motion.div
                key={city.name}
                initial={{ opacity: 0, y: 30 }}
                animate={inView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.6, delay: i * 0.1 }}
                className={`${city.className} ${city.heightClass}`}
              >
                <Link href={`/${locale}/listings?city=${city.name}`} className="block h-full">
                  <div className="group relative h-full rounded-2xl sm:rounded-3xl overflow-hidden shadow-md cursor-pointer bg-surface-100 hover:shadow-2xl transition-all duration-500">
                    <Image
                      src={city.image}
                      alt={city.name}
                      fill
                      className="object-cover transition-transform duration-700 group-hover:scale-105"
                      sizes="(max-width: 768px) 100vw, 40vw"
                      unoptimized
                    />

                    {/* Gradient overlays */}
                    <div className={`absolute inset-0 bg-gradient-to-t ${city.accent} transition-opacity duration-300`} />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />

                    {/* Content */}
                    <div className="absolute inset-0 p-6 sm:p-8 flex flex-col justify-end">
                      <div className="flex items-end justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 mb-1.5">
                            <MapPin className="w-3 h-3 text-white/60 flex-shrink-0" />
                            <span className="text-[10px] text-white/60 font-bold uppercase tracking-widest">
                              {isRTL ? 'المملكة العربية السعودية' : 'Saudi Arabia'}
                            </span>
                          </div>
                          <h3 className={`text-2xl sm:text-3xl font-bold text-white mb-1 leading-tight ${isRTL ? 'font-arabic' : 'font-serif'}`}>
                            {isRTL ? city.nameAr : city.name}
                          </h3>
                          <p className={`text-xs text-white/60 ${isRTL ? 'font-arabic' : ''}`}>
                            {isRTL ? city.descriptionAr : city.description}
                          </p>
                        </div>

                        <div className="text-right flex-shrink-0">
                          <div className="text-2xl sm:text-3xl font-black text-white leading-none">{count}</div>
                          <div className="text-[10px] text-white/50 uppercase tracking-widest mt-0.5">
                            {isRTL ? 'عقار' : 'listings'}
                          </div>
                        </div>
                      </div>

                      {/* CTA arrow */}
                      <div className="mt-5 flex items-center gap-2 text-white/0 group-hover:text-white/80 transition-all duration-300 translate-y-1 group-hover:translate-y-0">
                        <span className={`text-xs font-bold uppercase tracking-widest ${isRTL ? 'font-arabic' : ''}`}>
                          {isRTL ? 'استكشف العقارات' : 'Explore Listings'}
                        </span>
                        <ArrowRight className={`w-3.5 h-3.5 transition-transform group-hover:translate-x-1 ${isRTL ? 'rotate-180 group-hover:-translate-x-1' : ''}`} />
                      </div>
                    </div>
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
