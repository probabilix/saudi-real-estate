import React from 'react';
import Link from 'next/link';
import { useLocale } from 'next-intl';
import { Car, MapPin, Map as MapIcon, ArrowRight } from 'lucide-react';

export default function MapCTACardsSection() {
  const locale = useLocale();

  return (
    <section className="py-12 bg-white border-t border-slate-100 relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          
          {/* Card 1: Search by Drive Time */}
          <Link
            href={`/${locale}/drive-time`}
            className="group relative flex flex-col sm:flex-row items-start sm:items-center justify-between rounded-3xl bg-slate-50 border border-slate-100 p-8 shadow-sm hover:shadow-md hover:border-slate-200/80 transition-all duration-300 min-h-[180px] gap-6"
          >
            <div className="flex-1 space-y-3 z-10 text-start">
              <h3 className="text-xl font-bold text-slate-800 group-hover:text-primary-600 transition-colors">
                {locale === 'ar' ? 'البحث عن طريق وقت القيادة' : 'Search by Drive Time'}
              </h3>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                {locale === 'ar' ? 'خريطة وقت القيادة' : 'Saudi Commute Proximity Map'}
              </p>
              <p className="text-sm text-slate-600 leading-relaxed max-w-sm">
                {locale === 'ar'
                  ? 'ابحث عن منزلك المثالي بناءً على الأماكن التي تزورها بشكل متكرر ووقت القيادة المفضل لديك.'
                  : 'Find your ideal home based on the travel time from the locations you frequently visit.'}
              </p>
              <div className="inline-flex items-center gap-1.5 text-xs font-black text-primary-700 bg-primary-50 px-3 py-1.5 rounded-xl transition-all group-hover:gap-2.5 mt-2">
                <span>{locale === 'ar' ? 'استكشف أوقات التنقل' : 'Explore Commutes'}</span>
                <ArrowRight className="w-3.5 h-3.5 transition-transform duration-300" />
              </div>
            </div>

            {/* Custom Visual Illustration */}
            <div className="relative w-36 h-28 hidden sm:block shrink-0 overflow-hidden rounded-2xl bg-sky-50/50 border border-sky-100/50">
              {/* Road Lane */}
              <div className="absolute bottom-4 left-0 right-0 h-1.5 bg-slate-200" />
              <div className="absolute bottom-4 left-0 right-0 h-1.5 border-t border-dashed border-white" />
              
              {/* Buildings silhouette */}
              <div className="absolute bottom-5 right-3 w-8 h-14 bg-slate-200/40 border border-slate-300/30 rounded-md" />
              <div className="absolute bottom-5 right-9 w-6 h-18 bg-slate-200/40 border border-slate-300/30 rounded-md" />
              <div className="absolute bottom-5 right-14 w-10 h-10 bg-slate-200/40 border border-slate-300/30 rounded-md" />

              {/* Pin pointing from above */}
              <div className="absolute top-2 left-6 animate-bounce">
                <div className="relative flex flex-col items-center">
                  <MapPin className="w-8 h-8 text-emerald-600 fill-emerald-100" />
                  <div className="absolute top-1.5 w-2.5 h-2.5 rounded-full bg-white flex items-center justify-center text-[7px] font-black text-emerald-700">A</div>
                </div>
              </div>
              
              {/* Car driving */}
              <div className="absolute bottom-5 left-3 transition-transform duration-500 group-hover:translate-x-4">
                <Car className="w-8 h-8 text-[#064e4b] fill-current" />
              </div>
            </div>
          </Link>

          {/* Card 2: Map View */}
          <Link
            href={`/${locale}/map`}
            className="group relative flex flex-col sm:flex-row items-start sm:items-center justify-between rounded-3xl bg-slate-50 border border-slate-100 p-8 shadow-sm hover:shadow-md hover:border-slate-200/80 transition-all duration-300 min-h-[180px] gap-6"
          >
            <div className="flex-1 space-y-3 z-10 text-start">
              <h3 className="text-xl font-bold text-slate-800 group-hover:text-primary-600 transition-colors">
                {locale === 'ar' ? 'عرض الخريطة التفاعلية' : 'Map View Explorer'}
              </h3>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                {locale === 'ar' ? 'البحث عن طريق المنطقة' : 'Split-Screen Area Search'}
              </p>
              <p className="text-sm text-slate-600 leading-relaxed max-w-sm">
                {locale === 'ar'
                  ? 'تصفح خريطة العقارات مع تحديث الأسعار والمشاريع ونماذج الشقق مباشرة في الوقت الفعلي.'
                  : 'Browse the entire map with real-time clusters. Zero in on districts, project locations, and layouts.'}
              </p>
              <div className="inline-flex items-center gap-1.5 text-xs font-black text-primary-700 bg-primary-50 px-3 py-1.5 rounded-xl transition-all group-hover:gap-2.5 mt-2">
                <span>{locale === 'ar' ? 'افتح خريطة البحث' : 'Open Map Search'}</span>
                <ArrowRight className="w-3.5 h-3.5 transition-transform duration-300" />
              </div>
            </div>

            {/* Custom Visual Illustration */}
            <div className="relative w-36 h-28 hidden sm:block shrink-0 overflow-hidden rounded-2xl bg-teal-50/30 border border-teal-100/50">
              {/* Grid background */}
              <div className="absolute inset-0 bg-[linear-gradient(to_right,#cbd5e1_1px,transparent_1px),linear-gradient(to_bottom,#cbd5e1_1px,transparent_1px)] bg-[size:14px_14px] opacity-20" />
              
              {/* River/road path */}
              <svg className="absolute inset-0 w-full h-full text-[#064e4b]/10" fill="none" viewBox="0 0 144 112">
                <path d="M-10,80 C30,80 50,30 90,30 C110,30 130,50 160,50" stroke="currentColor" strokeWidth="10" strokeLinecap="round" />
              </svg>

              {/* Map Pins */}
              <div className="absolute top-4 right-10 animate-bounce" style={{ animationDelay: '0.2s' }}>
                <MapPin className="w-7 h-7 text-amber-500 fill-amber-100" />
              </div>
              <div className="absolute bottom-6 left-12 animate-bounce">
                <MapPin className="w-8 h-8 text-[#064e4b] fill-[#064e4b]/10" />
              </div>
            </div>
          </Link>

        </div>
      </div>
    </section>
  );
}
