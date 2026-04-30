'use client';

import { useState, useRef, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { ChevronDown, ChevronUp, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface BedsDropdownProps {
  value: number | undefined;
  onChange: (value: string) => void;
}

export default function BedsDropdown({ value, onChange }: BedsDropdownProps) {
  const t = useTranslations('search');
  const [isOpen, setIsOpen] = useState(false);
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

  const options = [
    { value: '', label: t('anyBedrooms') || 'Any' },
    { value: '1', label: `1+ ${t('beds')}` },
    { value: '2', label: `2+ ${t('beds')}` },
    { value: '3', label: `3+ ${t('beds')}` },
    { value: '4', label: `4+ ${t('beds')}` },
    { value: '5', label: `5+ ${t('beds')}` },
    { value: '6', label: `6+ ${t('beds')}` },
  ];

  const currentLabel = value ? `${value}+ ${t('beds')}` : (t('anyBedrooms') || 'Any');

  return (
    <div className="relative w-44" ref={ref}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="appearance-none bg-white border border-surface-200 rounded-xl px-4 py-3 flex items-center justify-between gap-2 text-sm text-charcoal font-medium outline-none focus:border-primary-500 focus:ring-4 focus:ring-primary-500/5 transition-all w-full shadow-sm"
      >
        <span className="truncate">{currentLabel}</span>
        {isOpen ? (
          <ChevronUp className="w-4 h-4 text-primary-600 shrink-0" />
        ) : (
          <ChevronDown className="w-4 h-4 text-charcoal-muted shrink-0" />
        )}
      </button>

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
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              className="fixed inset-x-4 top-[25%] md:absolute md:top-full md:start-0 md:inset-x-auto md:mt-2 md:w-full bg-white rounded-2xl shadow-2xl border border-surface-100 p-2 z-[1000] overflow-hidden"
            >
              <div className="space-y-1 max-h-60 overflow-y-auto custom-scrollbar">
                {options.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => {
                      onChange(option.value);
                      setIsOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-4 py-3 text-sm rounded-xl transition-all ${
                      String(value || '') === option.value
                        ? 'bg-primary-50 text-primary-700 font-bold'
                        : 'text-charcoal hover:bg-surface-50'
                    }`}
                  >
                    {option.label}
                    {String(value || '') === option.value && <Check className="w-4 h-4" />}
                  </button>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
