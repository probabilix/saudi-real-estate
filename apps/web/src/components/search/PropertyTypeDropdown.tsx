'use client';

import { useState, useRef, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// Mocked lists since they aren't fully exported correctly in subsets from original LISTING_TYPES
const RESIDENTIAL_TYPES = ['APARTMENT', 'VILLA', 'TOWNHOUSE', 'DUPLEX', 'LUXURY_PENTHOUSE', 'RESIDENTIAL_LAND'];
const COMMERCIAL_TYPES = ['OFFICE', 'RETAIL', 'WAREHOUSE', 'COMMERCIAL_BUILDING', 'COMMERCIAL_LAND'];

interface PropertyTypeDropdownProps {
  type: string;
  onChange: (type: string) => void;
}

export default function PropertyTypeDropdown({ type, onChange }: PropertyTypeDropdownProps) {
  const tSearch = useTranslations('search');
  const tTypes = useTranslations('propertyTypes');
  
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'residential' | 'commercial'>('residential');
  
  const ref = useRef<HTMLDivElement>(null);

  // Auto-switch tab based on selected type
  useEffect(() => {
    if (COMMERCIAL_TYPES.includes(type)) {
      setActiveTab('commercial');
    } else {
      setActiveTab('residential');
    }
  }, [type]);

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

  const label = type ? (tTypes as any)(type) : tSearch('propertyType') || 'Property Type';

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
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="absolute top-full start-0 mt-2 w-[400px] max-w-[90vw] bg-white rounded-2xl shadow-xl border border-surface-200 p-4 z-50 pointer-events-auto"
          >
            {/* Tabs */}
            <div className="flex border-b border-surface-200 mb-4">
              <button
                type="button"
                className={`flex-1 pb-2 text-sm font-bold border-b-2 transition-colors ${activeTab === 'residential' ? 'border-primary-600 text-primary-600' : 'border-transparent text-charcoal-muted hover:text-charcoal'}`}
                onClick={() => setActiveTab('residential')}
              >
                Residential
              </button>
              <button
                type="button"
                className={`flex-1 pb-2 text-sm font-bold border-b-2 transition-colors ${activeTab === 'commercial' ? 'border-primary-600 text-primary-600' : 'border-transparent text-charcoal-muted hover:text-charcoal'}`}
                onClick={() => setActiveTab('commercial')}
              >
                Commercial
              </button>
            </div>

            {/* Content list */}
            <div className="grid grid-cols-2 gap-2 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
              <label className="flex items-center gap-2 cursor-pointer p-2 hover:bg-surface-50 rounded-lg group">
                  <input 
                    type="radio" 
                    name="property_type" 
                    checked={type === ''}
                    onChange={() => { onChange(''); setIsOpen(false); }}
                    className="w-4 h-4 text-primary-600 border-surface-300 focus:ring-primary-500" 
                  />
                  <span className={`text-sm ${type === '' ? 'text-primary-700 font-bold' : 'text-charcoal group-hover:text-primary-600'}`}>All</span>
              </label>

              {(activeTab === 'residential' ? RESIDENTIAL_TYPES : COMMERCIAL_TYPES).map((pt) => {
                const ptName = (tTypes as any)(pt) || pt;
                return (
                  <label key={pt} className="flex items-center gap-2 cursor-pointer p-2 hover:bg-surface-50 rounded-lg group">
                    <input 
                      type="radio" 
                      name="property_type"
                      checked={type === pt}
                      onChange={() => { onChange(pt); setIsOpen(false); }}
                      className="w-4 h-4 text-primary-600 border-surface-300 focus:ring-primary-500" 
                    />
                    <span className={`text-sm leading-tight ${type === pt ? 'text-primary-700 font-bold' : 'text-charcoal group-hover:text-primary-600'} whitespace-normal`}>{ptName}</span>
                  </label>
                );
              })}
            </div>

          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
