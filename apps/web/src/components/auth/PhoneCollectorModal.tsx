'use client';
import { useState, useRef, useEffect } from 'react';
import { ShieldCheck, Loader2, Phone, Save, AlertCircle, ChevronDown, Check, Search, Globe } from 'lucide-react';
import { api } from '@/lib/api';
import { motion, AnimatePresence } from 'framer-motion';
import { getCountryCallingCode } from 'react-phone-number-input';
import type { CountryCode } from 'libphonenumber-js';

// Country Data – top countries pinned, rest alphabetical (mirrors register page)
const TOP_COUNTRIES: CountryCode[] = ['SA', 'AE', 'KW', 'QA', 'BH', 'OM', 'IN', 'US', 'GB', 'PK'];
const COUNTRY_NAMES: Record<string, string> = {
  SA: 'Saudi Arabia', AE: 'United Arab Emirates', KW: 'Kuwait', QA: 'Qatar',
  BH: 'Bahrain', OM: 'Oman', IN: 'India', US: 'United States', GB: 'United Kingdom',
  PK: 'Pakistan', EG: 'Egypt', JO: 'Jordan', LB: 'Lebanon', SY: 'Syria', IQ: 'Iraq',
  YE: 'Yemen', LY: 'Libya', MA: 'Morocco', TN: 'Tunisia', DZ: 'Algeria', SD: 'Sudan',
  TR: 'Turkey', IR: 'Iran', AF: 'Afghanistan', BD: 'Bangladesh', LK: 'Sri Lanka',
  NP: 'Nepal', MM: 'Myanmar', PH: 'Philippines', ID: 'Indonesia', MY: 'Malaysia',
  SG: 'Singapore', TH: 'Thailand', VN: 'Vietnam', KR: 'South Korea', JP: 'Japan',
  CN: 'China', HK: 'Hong Kong', TW: 'Taiwan', AU: 'Australia', NZ: 'New Zealand',
  CA: 'Canada', MX: 'Mexico', BR: 'Brazil', AR: 'Argentina', ZA: 'South Africa',
  NG: 'Nigeria', KE: 'Kenya', ET: 'Ethiopia', GH: 'Ghana', DE: 'Germany',
  FR: 'France', IT: 'Italy', ES: 'Spain', NL: 'Netherlands', CH: 'Switzerland',
  SE: 'Sweden', NO: 'Norway', DK: 'Denmark', FI: 'Finland', PL: 'Poland',
  RU: 'Russia', UA: 'Ukraine', RO: 'Romania',
};

const ALL_COUNTRIES: CountryCode[] = [
  ...TOP_COUNTRIES,
  ...Object.keys(COUNTRY_NAMES)
    .filter(c => !TOP_COUNTRIES.includes(c as CountryCode))
    .sort((a, b) => COUNTRY_NAMES[a].localeCompare(COUNTRY_NAMES[b])) as CountryCode[],
];

const flagUrl = (code: string) =>
  `https://flagcdn.com/w40/${code.toLowerCase()}.png`;

export default function PhoneCollectorModal({ isOpen, onComplete, onLogout }: { isOpen: boolean; onComplete: (phone: string) => void; onLogout: () => void }) {
  const [country, setCountry] = useState<CountryCode | 'CUSTOM'>('SA');
  const [customDialCode, setCustomDialCode] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isOpenDropdown, setIsOpenDropdown] = useState(false);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  // Close dropdown on clicking outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpenDropdown(false);
        setSearch('');
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Focus search box when dropdown opens
  useEffect(() => {
    if (isOpenDropdown) {
      setTimeout(() => searchRef.current?.focus(), 50);
    }
  }, [isOpenDropdown]);

  if (!isOpen) return null;

  const dialCode = country === 'CUSTOM' ? `+${customDialCode || '...'}` : `+${getCountryCallingCode(country)}`;

  const filtered = ALL_COUNTRIES.filter(c => {
    const name = COUNTRY_NAMES[c] ?? c;
    const code = `+${getCountryCallingCode(c)}`;
    return (
      name.toLowerCase().includes(search.toLowerCase()) ||
      code.includes(search) ||
      c.toLowerCase().includes(search.toLowerCase())
    );
  });

  const showCustomOption = !search || 'custom'.includes(search.toLowerCase());

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const callingCode = country === 'CUSTOM' ? customDialCode.replace(/\D/g, '') : getCountryCallingCode(country);

    if (!callingCode) {
      setError('Please provide a valid country calling code.');
      setLoading(false);
      return;
    }

    const digits = phoneNumber.replace(/\D/g, '');
    const e164 = `+${callingCode}${digits}`;

    // Standard phone number format regex verification (7 to 15 digits)
    const isValid = /^\+?[0-9]{7,15}$/.test(e164);
    if (!isValid) {
      setError('Please enter a valid phone number format (7 to 15 digits).');
      setLoading(false);
      return;
    }

    try {
      const res = await api.updateProfile({ phone: e164 });
      if (res.success) {
        onComplete(e164);
      } else {
        setError(res.error || 'Failed to update phone number.');
      }
    } catch (err) {
      setError('Connection error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md"
        onClick={() => setIsOpenDropdown(false)}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          className="w-full max-w-md bg-white rounded-3xl p-8 border border-slate-100 shadow-2xl relative"
          onClick={(e) => {
            // Prevent clicking on the card itself from closing the dropdown,
            // UNLESS the click was outside the dropdown container (handled via state toggles).
            // So we don't call e.stopPropagation() here, instead we call it inside the selector row!
          }}
        >
          <div className="text-center mb-8" onClick={() => setIsOpenDropdown(false)}>
            <div className="w-16 h-16 bg-primary-50 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-sm">
              <Phone className="w-8 h-8 text-primary-600 animate-pulse" />
            </div>
            <h2 className="text-2xl font-playfair font-black text-slate-900 mb-2">Complete Your Profile</h2>
            <p className="text-sm text-slate-500 font-medium">To connect securely with direct owners and brokers, please provide a valid phone number.</p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 text-red-600 rounded-2xl text-xs font-bold border border-red-100 flex items-center gap-3" onClick={() => setIsOpenDropdown(false)}>
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 ml-1">Phone Number</label>              <div 
                className="flex items-center w-full rounded-2xl border border-slate-300 bg-slate-50 focus-within:bg-white focus-within:border-primary-500 focus-within:ring-4 focus-within:ring-primary-500/10 transition-all duration-200 relative" 
                ref={dropdownRef}
                onClick={(e) => e.stopPropagation()} // Stop bubbling so clicking the input area keeps the dropdown state intact
              >
                {/* Country Trigger */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setIsOpenDropdown(!isOpenDropdown);
                  }}
                  className="flex items-center gap-1.5 px-4 py-3.5 hover:bg-slate-100 transition-colors border-r border-slate-300 rounded-l-2xl shrink-0"
                >
                  {country === 'CUSTOM' ? (
                    <Globe className="w-5 h-5 text-slate-400 object-cover" />
                  ) : (
                    <img
                      src={flagUrl(country)}
                      alt={country}
                      style={{ width: '20px', height: '15px' }}
                      className="rounded-sm object-cover shadow-sm"
                    />
                  )}
                  <span className="text-xs font-black text-slate-700">{country === 'CUSTOM' ? 'Custom' : dialCode}</span>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                </button>

                {/* Custom Dial Code Input (renders next to selector button only if CUSTOM is selected) */}
                {country === 'CUSTOM' && (
                  <div className="flex items-center px-4 self-stretch border-r border-slate-300 bg-slate-100/80 shrink-0">
                    <span className="text-xs font-black text-slate-500 select-none">+</span>
                    <input
                      type="tel"
                      required
                      value={customDialCode}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (/[^\d]/.test(val)) return;
                        if (val.length > 4) return;
                        setCustomDialCode(val);
                      }}
                      placeholder="966"
                      className="w-10 bg-transparent text-xs font-black text-slate-800 outline-none pl-1 text-center"
                    />
                  </div>
                )}

                <input
                  type="tel"
                  required
                  value={phoneNumber}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (/[^\d\s+]/.test(val)) return;
                    if (val.replace(/\D/g, '').length > 15) return;
                    setPhoneNumber(val);
                  }}
                  placeholder="50 123 4567"
                  className="flex-1 bg-transparent px-4 py-3.5 outline-none text-sm font-bold text-slate-900 placeholder:text-slate-300 min-w-0"
                />

                {/* Dropdown with full countries search */}
                {isOpenDropdown && (
                  <div className="absolute top-full left-[-1px] right-[-1px] mt-2 bg-white border border-slate-300 rounded-2xl shadow-xl z-50 overflow-hidden">
                    {/* Search Field */}
                    <div className="p-3 border-b border-slate-50">
                      <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 rounded-xl">
                        <Search className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <input
                          ref={searchRef}
                          type="text"
                          value={search}
                          onChange={e => setSearch(e.target.value)}
                          placeholder="Search country or code..."
                          className="flex-1 bg-transparent text-xs outline-none text-slate-700 placeholder:text-slate-300"
                        />
                      </div>
                    </div>

                    {/* Scrollable list */}
                    <div className="max-h-48 overflow-y-auto py-1.5 scrollbar-thin">
                      {showCustomOption && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setCountry('CUSTOM');
                            setIsOpenDropdown(false);
                            setSearch('');
                          }}
                          className={`w-full flex items-center gap-3 px-4 py-2.5 text-left text-xs font-bold transition-colors hover:bg-slate-50 ${country === 'CUSTOM' ? 'text-primary-600 bg-primary-50/50' : 'text-slate-700'}`}
                        >
                          <Globe className="w-4 h-4 text-slate-500 shrink-0" />
                          <span className="flex-1 truncate">Custom Country Code (+...)</span>
                          {country === 'CUSTOM' && <Check className="w-3.5 h-3.5 text-primary-600 shrink-0" />}
                        </button>
                      )}

                      {filtered.length === 0 && !showCustomOption ? (
                        <div className="px-4 py-6 text-center text-xs text-slate-400">No countries found</div>
                      ) : (
                        filtered.map((c, i) => {
                          const isAll = !search && i === TOP_COUNTRIES.length;
                          return (
                            <div key={c}>
                              {isAll && (
                                <div className="px-4 pt-3 pb-1 border-t border-slate-50 mt-1">
                                  <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">All Countries</span>
                                </div>
                              )}
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  setCountry(c);
                                  setIsOpenDropdown(false);
                                  setSearch('');
                                }}
                                className={`w-full flex items-center gap-3 px-4 py-2.5 text-left text-xs font-bold transition-colors hover:bg-slate-50 ${country === c ? 'text-primary-600 bg-primary-50/50' : 'text-slate-700'}`}
                              >
                                <img
                                  src={flagUrl(c)}
                                  alt={c}
                                  style={{ width: '18px', height: '13px' }}
                                  className="rounded-sm object-cover shadow-sm shrink-0"
                                />
                                <span className="text-xs font-semibold tabular-nums text-slate-400">(+{getCountryCallingCode(c)})</span>
                                <span className="flex-1 truncate text-slate-700">{COUNTRY_NAMES[c] ?? c}</span>
                                {country === c && <Check className="w-3.5 h-3.5 text-primary-600 shrink-0" />}
                              </button>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary-600 hover:bg-primary-500 text-white font-bold py-4 rounded-2xl shadow-xl shadow-primary-600/20 active:scale-[0.98] transition-all flex items-center justify-center gap-3"
              onClick={() => setIsOpenDropdown(false)}
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                <>
                  <Save className="w-4 h-4" />
                  Save and Continue
                </>
              )}
            </button>

            <button
              type="button"
              onClick={onLogout}
              className="w-full text-center text-xs font-bold text-slate-400 hover:text-slate-600 transition-colors pt-2 block"
            >
              Sign Out
            </button>
          </form>

          <div className="mt-6 flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest text-emerald-500 bg-emerald-500/10 px-4 py-2 rounded-full border border-emerald-500/20" onClick={() => setIsOpenDropdown(false)}>
            <ShieldCheck className="w-4 h-4" />
            Verified Security Gate
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
