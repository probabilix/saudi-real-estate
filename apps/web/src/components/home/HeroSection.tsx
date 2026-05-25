'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations, useLocale } from 'next-intl';
import { ArrowRight, Phone } from 'lucide-react';
import PriceDropdown from '@/components/search/PriceDropdown';
import PropertyTypeDropdown from '@/components/search/PropertyTypeDropdown';
import CityDropdown from '@/components/search/CityDropdown';
import PurposeDropdown from '@/components/search/PurposeDropdown';

interface HeroSectionProps {
  contactPhone?: string;
}

const TRUST_PILLS = [
  { en: '200+ Verified Listings', ar: '+200 عقار موثق' },
  { en: 'Vision 2030 Aligned', ar: 'متوافق مع رؤية 2030' },
  { en: '100% Direct Ownership', ar: 'ملكية مباشرة 100٪' },
];

export default function HeroSection({ contactPhone }: HeroSectionProps) {
  const t = useTranslations('hero');
  const tSearch = useTranslations('search');
  const locale = useLocale();
  const router = useRouter();
  const isRTL = locale === 'ar';

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
    <section className="relative min-h-[92vh] sm:min-h-screen flex items-center z-20 overflow-hidden">
      {/* Background Image */}
      <div className="absolute inset-0 z-0">
        <Image
          src="https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=1920&q=90"
          alt="Saudi Luxury Real Estate"
          fill
          className="object-cover"
          priority
          quality={100}
          unoptimized
        />
        {/* Cinematic gradient — darkest at left for readability, opens right */}
        <div className="absolute inset-0 bg-gradient-to-r from-charcoal/85 via-charcoal/60 to-charcoal/30" />
      </div>

      {/* Gold accent top line */}
      <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-gold-dark via-gold to-gold-light z-10" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full z-10 pt-20 pb-16 sm:pt-24 sm:pb-24">
        <div className={`max-w-3xl ${isRTL ? 'mr-auto' : 'ml-0'}`}>

          {/* Trust Pills */}
          <div className="flex flex-wrap gap-2 mb-7">
            {TRUST_PILLS.map((pill, i) => (
              <span
                key={i}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-white/90 text-[11px] font-semibold tracking-wide"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-gold flex-shrink-0" />
                {isRTL ? pill.ar : pill.en}
              </span>
            ))}
          </div>

          {/* Main Headline */}
          <h1 className={`text-4xl sm:text-5xl lg:text-6xl font-extrabold text-white leading-[1.1] mb-5 drop-shadow-sm ${isRTL ? 'font-arabic' : 'font-serif'}`}>
            {t('title')}
          </h1>

          {/* Subtitle */}
          <p className="text-base sm:text-lg text-white/80 leading-relaxed mb-8 max-w-xl font-medium">
            {t('subtitle')}
          </p>

          {/* Search Form */}
          <div className="w-full max-w-2xl">
            <form
              onSubmit={handleSearch}
              className="bg-white/95 backdrop-blur-xl rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-[0_32px_80px_rgba(0,0,0,0.4)] border border-white/80 border-t-[3px] border-t-primary-500"
            >
              <div className="space-y-3">
                <CityDropdown city={city} onChange={setCity} className="w-full" />
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <PropertyTypeDropdown type={type} onChange={setType} />
                  <PurposeDropdown purpose={purpose} onChange={setPurpose} className="w-full" />
                  <PriceDropdown minPrice={minPrice} maxPrice={maxPrice} onChange={(min, max) => { setMinPrice(min); setMaxPrice(max); }} />
                </div>
              </div>

              <div className="mt-4 flex flex-col sm:flex-row gap-3">
                <button
                  type="submit"
                  className="flex-1 relative overflow-hidden py-3.5 rounded-xl bg-gradient-to-r from-primary-600 via-primary-700 to-primary-800 text-white font-bold text-sm tracking-[0.15em] shadow-lg shadow-primary-600/30 hover:shadow-primary-600/50 hover:-translate-y-0.5 transition-all duration-300 active:scale-[0.98] group flex items-center justify-center gap-2"
                >
                  <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/25 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-out" />
                  <span className="relative z-10">{tSearch('title').toUpperCase()}</span>
                  <ArrowRight className={`w-4 h-4 relative z-10 transition-transform duration-300 group-hover:translate-x-1 ${isRTL ? 'rotate-180 group-hover:-translate-x-1' : ''}`} />
                </button>
                <Link
                  href={`/${locale}/listings`}
                  className="sm:w-auto flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl border-2 border-primary-600/30 text-primary-700 font-bold text-sm hover:border-primary-600 hover:bg-primary-50 transition-all duration-200"
                >
                  {isRTL ? 'تصفح الكل' : 'Browse All'}
                </Link>
              </div>
            </form>

            {/* Phone CTA below form */}
            {contactPhone && (
              <div className="mt-5 flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-white/15 backdrop-blur flex items-center justify-center border border-white/20">
                  <Phone className="w-3.5 h-3.5 text-white" />
                </div>
                <a
                  href={`tel:${contactPhone.replace(/\s/g, '')}`}
                  className="text-white/80 hover:text-white text-sm font-semibold transition-colors"
                >
                  {isRTL ? `اتصل بنا: ${contactPhone}` : `Call us: ${contactPhone}`}
                </a>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
