'use client';

import { useState, useRef, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { ChevronDown, ChevronUp, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface PurposeDropdownProps {
  purpose: string;
  onChange: (purpose: string) => void;
  className?: string;
}

export default function PurposeDropdown({ purpose, onChange, className }: PurposeDropdownProps) {
  const tSearch = useTranslations('search');
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
    { value: '', label: tSearch('allPurposes') || 'All Purposes' },
    { value: 'SALE', label: tSearch('sale') || 'For Sale' },
    { value: 'RENT', label: tSearch('rent') || 'For Rent' },
    { value: 'LEASE', label: tSearch('lease') || 'For Lease' },
  ];

  const currentLabel = options.find(o => o.value === purpose)?.label || tSearch('allPurposes');

  return (
    <div className={`relative ${className || ''}`} ref={ref}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="appearance-none bg-white border border-surface-200 rounded-xl px-5 py-3 flex items-center justify-between gap-2 text-sm text-charcoal font-medium outline-none focus:border-primary-500 focus:ring-4 focus:ring-primary-500/5 transition-all w-full md:w-auto min-w-[160px] shadow-sm"
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
              className="fixed inset-x-4 top-[30%] md:absolute md:top-full md:start-0 md:inset-x-auto md:mt-2 md:w-full md:min-w-[200px] bg-white rounded-2xl shadow-2xl border border-surface-100 p-2 z-[1000] overflow-hidden"
            >
              <div className="space-y-1">
                {options.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => {
                      onChange(option.value);
                      setIsOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-4 py-3 text-sm rounded-xl transition-all ${
                      purpose === option.value
                        ? 'bg-primary-50 text-primary-700 font-bold'
                        : 'text-charcoal hover:bg-surface-50'
                    }`}
                  >
                    {option.label}
                    {purpose === option.value && <Check className="w-4 h-4" />}
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
