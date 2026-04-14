'use client';

import { useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useLocale, useTranslations } from 'next-intl';
import { motion, useInView } from 'framer-motion';
import { MapPin, ArrowRight } from 'lucide-react';

const CITIES = [
  {
    name: 'Riyadh',
    nameAr: 'الرياض',
    image: 'https://images.unsplash.com/photo-1576941089067-2de3c901e126?w=1200&q=80',
    count: 245,
    description: 'Capital & business hub',
    descriptionAr: 'العاصمة ومحور الأعمال',
    accent: 'from-primary-600/30 to-primary-900/50',
    className: 'md:col-span-2 md:row-span-2 h-[500px]',
  },
  {
    name: 'Jeddah',
    nameAr: 'جدة',
    image: 'https://images.unsplash.com/photo-1576941089067-2de3c901e126?w=1200&q=80',
    count: 183,
    description: 'Red Sea cosmopolitan',
    descriptionAr: 'مدينة البحر الأحمر الكوزموبوليتانية',
    accent: 'from-accent-600/30 to-accent-900/50',
    className: 'md:col-span-1 md:row-span-2 h-[500px]',
  },
  {
    name: 'Dammam',
    nameAr: 'الدمام',
    image: 'https://images.unsplash.com/photo-1576941089067-2de3c901e126?w=1200&q=80',
    count: 97,
    description: 'Eastern Province gateway',
    descriptionAr: 'بوابة المنطقة الشرقية',
    accent: 'from-primary-500/30 to-primary-800/50',
    className: 'md:col-span-1 md:row-span-1 h-[300px]',
  },
  {
    name: 'AlUla',
    nameAr: 'العلا',
    image: 'https://images.unsplash.com/photo-1576941089067-2de3c901e126?w=1200&q=80',
    count: 42,
    description: 'Visionary heritage',
    descriptionAr: 'تراث رؤيوي',
    accent: 'from-accent-500/40 to-accent-800/60',
    className: 'md:col-span-2 md:row-span-1 h-[300px]',
  },
];

export default function CitySpotlightSection() {
  const t = useTranslations('citySpotlight');
  const tCommon = useTranslations('search'); // Using 'search' for Browse by City
  const locale = useLocale();
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-80px' });

  return (
    <section ref={ref} className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <span className="inline-block text-[10px] font-black uppercase tracking-[0.2em] text-primary-600 mb-4">
            {t('curated')}
          </span>
          <h2 className={`text-4xl lg:text-5xl font-bold text-charcoal ${locale === 'ar' ? 'font-arabic' : 'font-serif'}`}>
            {tCommon('search')}
          </h2>
          <div className="mt-4 w-12 h-1 bg-primary-600 mx-auto rounded-full" />
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {CITIES.map((city, i) => (
            <motion.div
              key={city.name}
              initial={{ opacity: 0, y: 30 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6, delay: i * 0.1 }}
              className={city.className}
            >
              <Link href={`/${locale}/listings?city=${city.name}`}>
                <div className="group relative h-full rounded-2xl overflow-hidden shadow-lg cursor-pointer bg-surface-100">
                  {/* Image */}
                  <Image
                    src={city.image}
                    alt={city.name}
                    fill
                    className="object-cover transition-transform duration-700 group-hover:scale-110"
                    sizes="(max-width: 768px) 100vw, 33vw"
                    unoptimized={true}
                  />

                  {/* Elegant Gradient Overlay */}
                  <div className={`absolute inset-0 bg-gradient-to-t ${city.accent} opacity-60 transition-opacity group-hover:opacity-80`} />
                  <div className="absolute inset-0 bg-gradient-to-t from-charcoal/60 via-transparent to-transparent" />

                  {/* Content */}
                  <div className="absolute inset-0 p-8 flex flex-col justify-end">
                    <div className="flex items-end justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-1.5 mb-2">
                          <MapPin className="w-3.5 h-3.5 text-white/80" />
                          <span className="text-[10px] text-white/80 font-black uppercase tracking-widest">{locale === 'ar' ? 'المملكة العربية السعودية' : 'Saudi Arabia'}</span>
                        </div>
                        <h3 className={`text-3xl lg:text-4xl font-bold text-white mb-2 ${locale === 'ar' ? 'font-arabic' : 'font-serif'}`}>
                          {locale === 'ar' ? city.nameAr : city.name}
                        </h3>
                        <p className={`text-sm text-white/70 line-clamp-1 ${locale === 'ar' ? 'font-arabic' : ''}`}>
                          {locale === 'ar' ? city.descriptionAr : city.description}
                        </p>
                      </div>
                      <div className="flex flex-col items-end shrink-0">
                        <span className="text-3xl font-bold text-white leading-none mb-1">{city.count}</span>
                        <span className="text-[10px] text-white/60 font-medium uppercase tracking-widest">{t('listingsCount')}</span>
                      </div>
                    </div>

                    {/* Interactive CTA */}
                    <motion.div
                      className="mt-6 flex items-center gap-2 text-white/60 group-hover:text-white transition-colors"
                      initial={false}
                    >
                      <span className={`text-xs font-bold uppercase tracking-widest ${locale === 'ar' ? 'font-arabic' : ''}`}>
                        {t('explore')}
                      </span>
                      <ArrowRight className={`w-4 h-4 transition-transform ${locale === 'ar' ? 'rotate-180 group-hover:-translate-x-2' : 'group-hover:translate-x-2'}`} />
                    </motion.div>
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
