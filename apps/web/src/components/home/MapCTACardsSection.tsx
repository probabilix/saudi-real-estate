'use client';

/**
 * MapCTACardsSection component
 * 
 * Beautifully redesigned homepage Call-To-Action cards directing users to Map Search and Drive-Time Search.
 * Uses custom glassmorphic cards, layered vector gradients, miniature floating mockups, and micro-hover animations.
 */

import React from 'react';
import Link from 'next/link';
import { useLocale } from 'next-intl';
import { Car, MapPin, Map as MapIcon, ArrowRight, Navigation, Sparkles, Compass } from 'lucide-react';

export default function MapCTACardsSection() {
  const locale = useLocale();

  return (
    <section className="py-16 bg-slate-50/50 border-t border-slate-100 relative overflow-hidden">
      {/* Decorative ambient background glows */}
      <div className="absolute top-1/4 left-10 w-72 h-72 rounded-full bg-teal-200/20 blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-10 w-82 h-82 rounded-full bg-emerald-200/20 blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          
          {/* Card 1: Search by Drive Time */}
          <Link
            href={`/${locale}/drive-time`}
            className="group relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-teal-50/90 via-[#f0fdfa]/95 to-sky-50/80 border border-teal-100/50 p-8 lg:p-10 flex flex-col justify-between min-h-[280px] shadow-sm hover:shadow-2xl hover:shadow-teal-500/10 hover:border-teal-300/50 hover:-translate-y-1.5 transition-all duration-500"
          >
            {/* Visual element on right: Floating commute route indicator */}
            <div className="absolute right-0 top-0 bottom-0 w-[45%] hidden sm:block pointer-events-none overflow-hidden">
              {/* Radial gradient backing */}
              <div className="absolute inset-0 bg-gradient-to-l from-teal-100/30 to-transparent z-0" />
              
              {/* Decorative route lines and dots */}
              <div className="absolute right-12 top-1/2 -translate-y-1/2 w-40 h-40 flex items-center justify-center">
                <div className="absolute w-24 h-24 rounded-full border-2 border-dashed border-teal-200/70 animate-spin-slow" />
                <div className="absolute w-36 h-36 rounded-full border border-dashed border-teal-100/50" />
                
                {/* Simulated Floating Map Node Card */}
                <div className="absolute right-4 top-2 bg-white/90 backdrop-blur-sm border border-teal-100/60 p-3 rounded-2xl shadow-lg transform -rotate-6 transition-transform duration-500 group-hover:rotate-0 group-hover:scale-105 z-10 flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-teal-50 flex items-center justify-center text-teal-600">
                    <Car className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-slate-800 uppercase tracking-wide">Commute</p>
                    <p className="text-[9px] font-bold text-slate-400">18 min to Riyadh A</p>
                  </div>
                </div>
                
                <Compass className="w-10 h-10 text-teal-600/30 group-hover:text-teal-600/50 group-hover:rotate-45 transition-all duration-700" />
              </div>
            </div>

            <div className="space-y-4 max-w-sm sm:max-w-md relative z-10">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-teal-500/10 text-teal-700 rounded-full text-[10px] font-black uppercase tracking-widest border border-teal-200/30">
                <Sparkles className="w-3 h-3 text-teal-600 animate-pulse" />
                <span>Smart Search</span>
              </div>
              <div className="space-y-2.5">
                <h3 className="text-2xl font-black text-slate-900 leading-tight tracking-tight">
                  Search by Drive Time
                </h3>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                  Saudi Commute Proximity Map
                </p>
                <p className="text-sm font-semibold text-slate-600 leading-relaxed pt-1">
                  Input your office, school, or gym, and immediately uncover all listings within your desired travel time.
                </p>
              </div>
            </div>

            {/* Bottom Status / CTA */}
            <div className="mt-8 flex items-center justify-between border-t border-teal-100/40 pt-5 relative z-10">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-md shadow-emerald-500/30 animate-pulse" />
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Traffic-Aware Contours</span>
              </div>
              <span className="flex items-center gap-1.5 text-xs font-black text-teal-700 bg-teal-500/10 hover:bg-teal-500/20 px-4 py-2 rounded-xl transition-all group-hover:gap-2.5">
                <span>Explore Commutes</span>
                <ArrowRight className="w-4 h-4 transition-transform duration-300" />
              </span>
            </div>
          </Link>

          {/* Card 2: Map View */}
          <Link
            href={`/${locale}/map`}
            className="group relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-emerald-50/90 via-[#f6fee7]/95 to-teal-50/80 border border-emerald-100/50 p-8 lg:p-10 flex flex-col justify-between min-h-[280px] shadow-sm hover:shadow-2xl hover:shadow-emerald-500/10 hover:border-emerald-300/50 hover:-translate-y-1.5 transition-all duration-500"
          >
            {/* Visual element on right: Floating Map Cluster Pins */}
            <div className="absolute right-0 top-0 bottom-0 w-[45%] hidden sm:block pointer-events-none overflow-hidden">
              {/* Radial gradient backing */}
              <div className="absolute inset-0 bg-gradient-to-l from-emerald-100/30 to-transparent z-0" />
              
              {/* Floating Cluster Pin graphics */}
              <div className="absolute right-12 top-1/2 -translate-y-1/2 w-40 h-40 flex items-center justify-center">
                
                {/* Simulated Floating cluster node badge */}
                <div className="absolute left-0 top-6 w-12 h-12 rounded-full bg-emerald-600 text-white font-extrabold text-xs flex items-center justify-center border-4 border-white shadow-xl transform hover:scale-110 transition-transform duration-300 group-hover:translate-x-2">
                  18+
                </div>
                
                <div className="absolute right-6 bottom-4 w-10 h-10 rounded-full bg-[#064e4b] text-white font-bold text-[10px] flex items-center justify-center border-2 border-white shadow-lg transform rotate-12 group-hover:rotate-0 transition-all duration-500">
                  5
                </div>

                <div className="absolute right-8 top-10 bg-white/95 border border-emerald-100 p-2.5 rounded-2xl shadow-lg transform rotate-6 group-hover:rotate-0 group-hover:scale-105 z-10 flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-emerald-600" />
                  <span className="text-[10px] font-black text-slate-800">Riyadh</span>
                </div>
                
                <MapIcon className="w-12 h-12 text-emerald-600/20 group-hover:text-emerald-600/40 transition-colors duration-500" />
              </div>
            </div>

            <div className="space-y-4 max-w-sm sm:max-w-md relative z-10">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-500/10 text-emerald-700 rounded-full text-[10px] font-black uppercase tracking-widest border border-emerald-200/30">
                <MapPin className="w-3 h-3 text-emerald-600 animate-bounce" />
                <span>Interactive Map</span>
              </div>
              <div className="space-y-2.5">
                <h3 className="text-2xl font-black text-slate-900 leading-tight tracking-tight">
                  Map View Explorer
                </h3>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                  Split-Screen Area Search
                </p>
                <p className="text-sm font-semibold text-slate-600 leading-relaxed pt-1">
                  Browse the entire Saudi Arabia map with real-time clusters. Zero in on districts, project locations, and layouts seamlessly.
                </p>
              </div>
            </div>

            {/* Bottom Status / CTA */}
            <div className="mt-8 flex items-center justify-between border-t border-emerald-100/40 pt-5 relative z-10">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-600 shadow-md shadow-emerald-600/30 animate-pulse" />
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Dynamic Grid Clustering</span>
              </div>
              <span className="flex items-center gap-1.5 text-xs font-black text-emerald-700 bg-emerald-500/10 hover:bg-emerald-500/20 px-4 py-2 rounded-xl transition-all group-hover:gap-2.5">
                <span>Open Map Search</span>
                <ArrowRight className="w-4 h-4 transition-transform duration-300" />
              </span>
            </div>
          </Link>

        </div>
      </div>
    </section>
  );
}
