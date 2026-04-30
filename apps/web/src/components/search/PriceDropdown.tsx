'use client';

import { useState, useRef, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface PriceDropdownProps {
  minPrice: number | undefined;
  maxPrice: number | undefined;
  onChange: (min: number | undefined, max: number | undefined) => void;
}

const MIN_PRICES = [0, 200000, 225000, 250000, 275000, 300000, 400000, 500000, 750000];
const MAX_PRICES = [400000, 450000, 500000, 550000, 750000, 1000000, 1500000];

export default function PriceDropdown({ minPrice, maxPrice, onChange }: PriceDropdownProps) {
  const t = useTranslations('search');
  const [isOpen, setIsOpen] = useState(false);
  const [activeSelect, setActiveSelect] = useState<'min' | 'max' | null>(null);
  
  const ref = useRef<HTMLDivElement>(null);

  // Click outside to close
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setIsOpen(false);
        setActiveSelect(null);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const formatPrice = (p: number | undefined) => p ? p.toLocaleString() : 'Any';

  const label = (minPrice || maxPrice) 
    ? `${minPrice ? formatPrice(minPrice) : '0'} - ${maxPrice ? formatPrice(maxPrice) : 'Any'}` 
    : t('priceRange') || 'Price (SAR)';

  const handleReset = () => {
    onChange(undefined, undefined);
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="appearance-none bg-white border border-surface-200 rounded-xl px-5 py-3 flex items-center justify-between gap-2 text-sm text-charcoal font-medium outline-none focus:border-primary-500 focus:ring-4 focus:ring-primary-500/5 transition-all w-full md:w-auto min-w-[160px] shadow-sm"
      >
        <span className="truncate">{label}</span>
        {isOpen ? <ChevronUp className="w-4 h-4 text-primary-600 shrink-0" /> : <ChevronDown className="w-4 h-4 text-charcoal-muted shrink-0" />}
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            {/* Mobile Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => { setIsOpen(false); setActiveSelect(null); }}
              className="fixed inset-0 bg-charcoal/40 backdrop-blur-sm z-[999] md:hidden"
            />

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="fixed inset-x-4 top-[35%] md:absolute md:top-full md:start-0 md:inset-x-auto md:mt-2 md:w-[320px] bg-white rounded-2xl shadow-xl border border-surface-200 p-4 z-[1000] pointer-events-auto"
            >
              <div className="flex gap-4">
                {/* Min Price */}
                <div className="flex-1 relative">
                  <label className="text-[10px] uppercase font-bold text-charcoal-muted mb-1 block">{t('minPrice')}</label>
                  <div 
                    className={`border rounded-xl px-3 py-2 text-sm cursor-pointer ${activeSelect === 'min' ? 'border-primary-500 ring-1 ring-primary-500/20' : 'border-surface-200'} flex items-center justify-between`}
                    onClick={() => setActiveSelect(activeSelect === 'min' ? null : 'min')}
                  >
                    <span className="text-charcoal font-medium">{minPrice !== undefined ? minPrice.toLocaleString() : '0'}</span>
                  </div>
                  
                  {/* Min Dropdown list */}
                  {activeSelect === 'min' && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-surface-100 rounded-xl shadow-lg max-h-48 overflow-y-auto z-50">
                      <div 
                        className="px-4 py-2 text-sm text-charcoal hover:bg-primary-50 hover:text-primary-600 cursor-pointer transition-colors"
                        onClick={() => { onChange(undefined, maxPrice); setActiveSelect(null); }}
                      >
                        0
                      </div>
                      {MIN_PRICES.filter(p => p !== 0).map(price => (
                        <div 
                          key={price}
                          className="px-4 py-2 text-sm text-charcoal hover:bg-primary-50 hover:text-primary-600 cursor-pointer transition-colors"
                          onClick={() => { onChange(price, maxPrice); setActiveSelect(null); }}
                        >
                          {price.toLocaleString()}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Max Price */}
                <div className="flex-1 relative">
                  <label className="text-[10px] uppercase font-bold text-charcoal-muted mb-1 block">{t('maxPrice')}</label>
                  <div 
                    className={`border rounded-xl px-3 py-2 text-sm cursor-pointer ${activeSelect === 'max' ? 'border-primary-500 ring-1 ring-primary-500/20' : 'border-surface-200'} flex items-center justify-between`}
                    onClick={() => setActiveSelect(activeSelect === 'max' ? null : 'max')}
                  >
                    <span className="text-charcoal font-medium">{maxPrice !== undefined ? maxPrice.toLocaleString() : 'Any'}</span>
                  </div>
                  
                  {/* Max Dropdown list */}
                  {activeSelect === 'max' && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-surface-100 rounded-xl shadow-lg max-h-48 overflow-y-auto z-50">
                      <div 
                        className="px-4 py-2 text-sm text-charcoal hover:bg-primary-50 hover:text-primary-600 cursor-pointer transition-colors"
                        onClick={() => { onChange(minPrice, undefined); setActiveSelect(null); }}
                      >
                        Any
                      </div>
                      {MAX_PRICES.map(price => (
                        <div 
                          key={price}
                          className="px-4 py-2 text-sm text-charcoal hover:bg-primary-50 hover:text-primary-600 cursor-pointer transition-colors"
                          onClick={() => { onChange(minPrice, price); setActiveSelect(null); }}
                        >
                          {price.toLocaleString()}
                        </div>
                      ))}
                      <div 
                        className="px-4 py-2 text-sm text-charcoal hover:bg-primary-50 hover:text-primary-600 cursor-pointer transition-colors"
                        onClick={() => { onChange(minPrice, 10000000); setActiveSelect(null); }}
                      >
                        Any
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-surface-100 flex justify-end">
                <button
                  type="button"
                  onClick={handleReset}
                  className="text-sm font-bold text-primary-600 hover:text-primary-700 hover:underline px-2 py-1"
                >
                  Reset
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
