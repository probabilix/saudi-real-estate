'use client';

import Image from 'next/image';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations, useLocale } from 'next-intl';
import { motion } from 'framer-motion';
import { MapPin, ChevronDown, Sparkles } from 'lucide-react';
import ChatWidget from '@/components/chat/ChatWidget';
import PriceDropdown from '@/components/search/PriceDropdown';
import PropertyTypeDropdown from '@/components/search/PropertyTypeDropdown';
import { CITIES } from '@saudi-re/shared';

export default function HeroSection() {
  const t = useTranslations('hero');
  const tSearch = useTranslations('search');
  const locale = useLocale();
  const router = useRouter();

  const [city, setCity] = useState('');
  const [type, setType] = useState('');
  const [purpose, setPurpose] = useState('');
  const [minPrice, setMinPrice] = useState<number | undefined>();
  const [maxPrice, setMaxPrice] = useState<number | undefined>();

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams();
    if (city) params.set('city', city);
    if (type) params.set('type', type);
    if (purpose) params.set('purpose', purpose);
    if (minPrice) params.set('minPrice', String(minPrice));
    if (maxPrice) params.set('maxPrice', String(maxPrice));
    router.push(`/${locale}/listings?${params.toString()}`);
  }

  return (
    <section className="relative min-h-[90vh] flex items-center bg-surface-50 z-20 overflow-visible">
      {/* Background Image with Lighter Overlay */}
      <div className="absolute inset-0 z-0">
        <Image
          src="https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=1600&q=80"
          alt="Saudi Luxury Real Estate"
          fill
          className="object-cover"
          priority
          quality={100}
          unoptimized
        />
        <div className="absolute inset-0 bg-charcoal/30 backdrop-blur-[1px]" />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 w-full z-10">
        <div className="grid lg:grid-cols-12 gap-12 lg:gap-16 items-center">
          {/* Left Column: Headline + Search (Col 7) */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
            className="lg:col-span-7"
          >
            {/* Eyebrow Label */}
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/20 backdrop-blur-md border border-white/30 mb-8">
              <Sparkles className="w-3.5 h-3.5 text-accent-400" />
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-white">
                {t('eyebrow')}
              </span>
            </div>

            {/* Main Headline - Playfair Display */}
            <h1 className={`text-5xl sm:text-6xl lg:text-7xl font-bold text-white leading-[1.1] mb-8 ${locale === 'ar' ? 'font-arabic' : 'font-serif'}`}>
              {t('title')}
            </h1>

            {/* Subtext */}
            <p className="text-lg sm:text-xl text-white/90 leading-relaxed mb-12 max-w-xl font-medium">
              {t('subtitle')}
            </p>

            {/* Search Form Panel */}
            <div className="max-w-xl w-full">
              <motion.form
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, duration: 0.8 }}
                onSubmit={handleSearch}
                className="bg-white/95 backdrop-blur-xl rounded-2xl p-6 shadow-[0_20px_50px_rgba(0,0,0,0.2)] space-y-4 border border-white"
              >
                <div className="space-y-4">
                  <div className="relative">
                    <MapPin className="absolute start-4 top-1/2 -translate-y-1/2 w-5 h-5 text-primary-600 pointer-events-none" />
                    <select
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      suppressHydrationWarning
                      className="w-full bg-surface-50 border border-surface-100 rounded-xl ps-12 pe-4 py-4 text-sm text-charcoal appearance-none outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all font-semibold"
                    >
                      <option value="">{tSearch('allCities')}</option>
                      {CITIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                    <ChevronDown className="absolute end-4 top-1/2 -translate-y-1/2 w-4 h-4 text-charcoal-muted pointer-events-none" />
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <PropertyTypeDropdown type={type} onChange={setType} />

                    <div className="relative">
                      <select
                        value={purpose}
                        onChange={(e) => setPurpose(e.target.value)}
                        suppressHydrationWarning
                        className="w-full bg-surface-50 border border-surface-100 rounded-xl px-5 py-4 text-sm text-charcoal appearance-none outline-none focus:border-primary-500 transition-all font-semibold"
                      >
                        <option value="">{tSearch('allPurposes')}</option>
                        <option value="SALE">{tSearch('sale')}</option>
                        <option value="RENT">{tSearch('rent')}</option>
                        <option value="LEASE">{tSearch('lease')}</option>
                      </select>
                      <ChevronDown className="absolute end-4 top-1/2 -translate-y-1/2 w-4 h-4 text-charcoal-muted pointer-events-none" />
                    </div>

                    <div className="md:col-span-1 col-span-2">
                      <PriceDropdown minPrice={minPrice} maxPrice={maxPrice} onChange={(min, max) => { setMinPrice(min); setMaxPrice(max); }} />
                    </div>
                  </div>
                </div>
                <button
                  type="submit"
                  className="w-full py-5 rounded-xl bg-primary-600 text-white font-bold text-sm shadow-xl shadow-primary-600/30 hover:bg-primary-700 transition-all active:scale-[0.98]"
                >
                  {tSearch('title').toUpperCase()}
                </button>
              </motion.form>
            </div>
          </motion.div>

          {/* Right Column: ChatWidget (Col 5) */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="lg:col-span-5 flex flex-col justify-center"
          >
            <div className="bg-white/10 backdrop-blur-md rounded-3xl p-4 border border-white/20 shadow-2xl h-[600px]">
              <ChatWidget floating={false} />
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
