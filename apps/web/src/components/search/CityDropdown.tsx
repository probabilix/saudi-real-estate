'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { ChevronDown, Check, MapPin, Search } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { CITIES } from '@saudi-re/shared';

interface CityDropdownProps {
  city: string;
  onChange: (city: string) => void;
  className?: string;
}

export default function CityDropdown({ city, onChange, className }: CityDropdownProps) {
  const tSearch = useTranslations('search');
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  // Click outside to close
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredCities = useMemo(() => {
    return CITIES.filter(c => 
      c.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [searchQuery]);

  const currentLabel = city || tSearch('allCities') || 'All Cities';

  return (
    <div className={`relative ${className || ''}`} ref={ref}>
      <div className="relative">
        <MapPin className="absolute start-4 top-1/2 -translate-y-1/2 w-5 h-5 text-primary-600 pointer-events-none z-10" />
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="appearance-none bg-white border border-surface-200 rounded-xl ps-12 pe-12 py-3 text-sm text-charcoal font-medium outline-none focus:border-primary-500 focus:ring-4 focus:ring-primary-500/5 transition-all w-full md:w-auto min-w-[200px] text-start shadow-sm"
        >
          <span className="truncate block pr-4">{currentLabel}</span>
          <ChevronDown 
            className={`absolute end-4 top-1/2 -translate-y-1/2 w-4 h-4 text-charcoal-muted transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} 
          />
        </button>
      </div>

      <AnimatePresence>
        {isOpen && (
          <>
            {/* Mobile Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 bg-charcoal/40 backdrop-blur-sm z-[999] md:hidden"
            />
            
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.98 }}
              className="fixed inset-x-4 top-[15%] md:absolute md:top-full md:start-0 md:inset-x-auto md:mt-2 md:w-full bg-white rounded-2xl shadow-2xl border border-surface-100 p-3 z-[1000] overflow-hidden min-w-[280px] md:max-w-none"
            >
              {/* Search Input inside dropdown */}
              <div className="relative mb-3">
                <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-charcoal-muted" />
                <input
                  type="text"
                  placeholder={tSearch('searchPlaceholder') || 'Search city...'}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-surface-50 border border-surface-100 rounded-xl ps-9 pe-4 py-2.5 text-sm outline-none focus:border-primary-500 focus:bg-white transition-all font-medium"
                  autoFocus
                />
              </div>

              <div className="max-h-[300px] overflow-y-auto pr-1 custom-scrollbar space-y-1">
                <button
                  type="button"
                  onClick={() => {
                    onChange('');
                    setIsOpen(false);
                    setSearchQuery('');
                  }}
                  className={`w-full flex items-center justify-between px-4 py-3 text-sm rounded-xl transition-all ${
                    city === ''
                      ? 'bg-primary-50 text-primary-700 font-bold'
                      : 'text-charcoal hover:bg-surface-50 font-medium'
                  }`}
                >
                  {tSearch('allCities') || 'All Cities'}
                  {city === '' && <Check className="w-4 h-4" />}
                </button>

                {filteredCities.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => {
                      onChange(c);
                      setIsOpen(false);
                      setSearchQuery('');
                    }}
                    className={`w-full flex items-center justify-between px-4 py-3 text-sm rounded-xl transition-all ${
                      city === c
                        ? 'bg-primary-50 text-primary-700 font-bold'
                        : 'text-charcoal hover:bg-surface-50 font-medium'
                    }`}
                  >
                    {c}
                    {city === c && <Check className="w-4 h-4" />}
                  </button>
                ))}

                {filteredCities.length === 0 && (
                  <div className="py-8 text-center text-charcoal-muted text-sm font-medium">
                    No cities found
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
