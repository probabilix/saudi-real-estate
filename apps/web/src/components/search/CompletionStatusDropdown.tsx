'use client';

import { useState, useRef, useEffect } from 'react';
import { useLocale } from 'next-intl';
import { ChevronDown, ChevronUp, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface CompletionStatusDropdownProps {
  status: string;
  onChange: (status: string) => void;
  className?: string;
}

export default function CompletionStatusDropdown({ status, onChange, className }: CompletionStatusDropdownProps) {
  const locale = useLocale();
  const isRTL = locale === 'ar';
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
    { value: '', labelEn: 'Completion Status', labelAr: 'حالة المشروع' },
    { value: 'READY', labelEn: 'Ready', labelAr: 'جاهز' },
    { value: 'OFF_PLAN', labelEn: 'Off-Plan', labelAr: 'على الخارطة' },
    { value: 'UNDER_CONSTRUCTION', labelEn: 'Under Construction', labelAr: 'تحت الإنشاء' },
  ];

  const selectedOpt = options.find(o => o.value === status);
  const currentLabel = isRTL ? selectedOpt?.labelAr : selectedOpt?.labelEn;

  return (
    <div className={`relative ${className || ''}`} ref={ref}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="appearance-none bg-white border border-surface-200 rounded-xl px-5 py-3 flex items-center justify-between gap-2 text-sm text-charcoal font-medium outline-none focus:border-primary-500 focus:ring-4 focus:ring-primary-500/5 transition-all w-full md:w-auto min-w-[170px] shadow-sm z-30"
      >
        <span className="truncate">{currentLabel || (isRTL ? 'حالة المشروع' : 'Completion Status')}</span>
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
                {options.map((option) => {
                  const optLabel = isRTL ? option.labelAr : option.labelEn;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => {
                        onChange(option.value);
                        setIsOpen(false);
                      }}
                      className={`w-full flex items-center justify-between px-4 py-3 text-sm rounded-xl transition-all ${isRTL ? 'text-right' : 'text-left'} ${
                        status === option.value
                          ? 'bg-primary-50 text-primary-700 font-bold'
                          : 'text-charcoal hover:bg-surface-50'
                      }`}
                    >
                      <span>{optLabel}</span>
                      {status === option.value && <Check className="w-4 h-4 text-primary-600 shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
