'use client';

import { useState, useRef, useEffect } from 'react';
import { api, API_BASE_URL } from '@/lib/api';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

import { Building2, ArrowLeft, Mail, User, Lock, Sparkles, Verified, ChevronDown, Search } from 'lucide-react';
import { RegisterInput } from '@saudi-re/shared';
import { motion, AnimatePresence } from 'framer-motion';
import { isValidPhoneNumber, getCountryCallingCode } from 'react-phone-number-input';
import type { Country } from 'react-phone-number-input';

type CountryCode = Country;

// ────────────────────────────────────────────────────────
// Country Data – top countries pinned, rest alphabetical
// ────────────────────────────────────────────────────────
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

// All unique country codes (Top + rest alphabetically)
const ALL_COUNTRIES: CountryCode[] = [
  ...TOP_COUNTRIES,
  ...Object.keys(COUNTRY_NAMES)
    .filter(c => !TOP_COUNTRIES.includes(c as CountryCode))
    .sort((a, b) => COUNTRY_NAMES[a].localeCompare(COUNTRY_NAMES[b])) as CountryCode[],
];

// Flag CDN helper – uses flagcdn.com (no install needed)
const flagUrl = (code: string) =>
  `https://flagcdn.com/w40/${code.toLowerCase()}.png`;

// ────────────────────────────────────────────────────────
// PhoneSelector Component
// ────────────────────────────────────────────────────────
interface PhoneSelectorProps {
  country: CountryCode;
  phoneNumber: string;
  onCountryChange: (c: CountryCode) => void;
  onPhoneChange: (val: string) => void;
  placeholder?: string;
}

function PhoneSelector({ country, phoneNumber, onCountryChange, onPhoneChange, placeholder }: PhoneSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const dialCode = `+${getCountryCallingCode(country)}`;

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setSearch('');
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Focus search when dropdown opens
  useEffect(() => {
    if (isOpen) setTimeout(() => searchRef.current?.focus(), 50);
  }, [isOpen]);

  const filtered = ALL_COUNTRIES.filter(c => {
    const name = COUNTRY_NAMES[c] ?? c;
    const code = `+${getCountryCallingCode(c)}`;
    return (
      name.toLowerCase().includes(search.toLowerCase()) ||
      code.includes(search) ||
      c.toLowerCase().includes(search.toLowerCase())
    );
  });

  return (
    <div ref={dropdownRef} className="relative w-full">
      {/* ── Main Input Row ── */}
      <div className="flex items-center w-full rounded-xl border border-gray-200 bg-gray-50 focus-within:bg-white focus-within:border-primary-500 focus-within:ring-2 focus-within:ring-primary-500/20 transition-all duration-200 overflow-hidden">

        {/* Country Button */}
        <button
          type="button"
          onClick={() => { setIsOpen(o => !o); }}
          className="flex items-center gap-2 px-3 py-3.5 hover:bg-gray-100 transition-colors border-r border-gray-200 shrink-0 group"
          aria-label="Select country"
        >
          <Image
            src={flagUrl(country)}
            alt={country}
            width={20}
            height={15}
            className="rounded-sm object-cover shadow-sm"
            unoptimized
          />
          <span className="text-sm font-bold text-gray-700 tabular-nums">{country}</span>
          <span className="text-xs font-semibold text-gray-400 tabular-nums">{dialCode}</span>
          <ChevronDown
            className={`w-3.5 h-3.5 text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
          />
        </button>

        {/* Divider */}
        <span className="text-gray-200 text-lg font-thin px-0.5 select-none">|</span>

        {/* Phone Number Input */}
        <input
          type="tel"
          value={phoneNumber}
          onChange={e => {
            const val = e.target.value;
            // Block completely if they type letters or special chars (allow digits, spaces, plus)
            if (/[^\d\s+]/.test(val)) return;

            // Enforce E.164 max limit globally (15 digits)
            const digitsOnly = val.replace(/\D/g, '');
            if (digitsOnly.length > 15) return;

            onPhoneChange(val);
          }}
          placeholder={placeholder ?? `${dialCode} 50 123 4567`}
          className="flex-1 bg-transparent px-3 py-3.5 outline-none text-sm font-bold text-gray-900 placeholder:text-gray-300 min-w-0"
        />
      </div>

      {/* ── Dropdown ── */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.97 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-100 rounded-2xl shadow-2xl shadow-black/10 z-[60] overflow-hidden"
          >
            {/* Search */}
            <div className="p-3 border-b border-gray-50">
              <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-xl">
                <Search className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                <input
                  ref={searchRef}
                  type="text"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search country or code..."
                  className="flex-1 bg-transparent text-sm outline-none text-gray-700 placeholder:text-gray-300"
                />
              </div>
            </div>

            {/* Top Countries Label (when no search) */}
            {!search && (
              <div className="px-4 pt-3 pb-1">
                <span className="text-[10px] font-extrabold text-gray-400 uppercase tracking-widest">
                  Popular
                </span>
              </div>
            )}

            {/* Country List */}
            <div className="max-h-[260px] overflow-y-auto py-1.5">
              {filtered.length === 0 ? (
                <div className="px-4 py-6 text-center text-sm text-gray-400">No countries found</div>
              ) : (
                filtered.map((c, i) => {
                  const isAll = !search && i === TOP_COUNTRIES.length;
                  return (
                    <div key={c}>
                      {isAll && (
                        <div className="px-4 pt-3 pb-1 border-t border-gray-50 mt-1">
                          <span className="text-[10px] font-extrabold text-gray-400 uppercase tracking-widest">All Countries</span>
                        </div>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          onCountryChange(c);
                          setIsOpen(false);
                          setSearch('');
                        }}
                        className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-primary-50 ${country === c ? 'bg-primary-50' : ''
                          }`}
                      >
                        <Image
                          src={flagUrl(c)}
                          alt={c}
                          width={20}
                          height={15}
                          className="rounded-sm object-cover shadow-sm shrink-0"
                          unoptimized
                        />
                        <span className={`text-sm font-bold ${country === c ? 'text-primary-700' : 'text-gray-700'}`}>
                          {c}
                        </span>
                        <span className={`text-xs font-semibold tabular-nums ${country === c ? 'text-primary-500' : 'text-gray-400'}`}>
                          (+{getCountryCallingCode(c)})
                        </span>
                        <span className={`flex-1 text-sm truncate ${country === c ? 'text-primary-600 font-semibold' : 'text-gray-500'}`}>
                          {COUNTRY_NAMES[c] ?? c}
                        </span>
                        {country === c && (
                          <span className="shrink-0 w-1.5 h-1.5 rounded-full bg-primary-500" />
                        )}
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function RegisterPage({ params: { locale } }: { params: { locale: string } }) {
  const t = useTranslations('auth');
  const tCommon = useTranslations('common');
  const router = useRouter();

  const [formData, setFormData] = useState({ email: '', password: '', name: '' });
  const [phoneCountry, setPhoneCountry] = useState<CountryCode>('SA');
  const [rawPhone, setRawPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showEmailForm, setShowEmailForm] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    let fullPhone: string | undefined;
    if (rawPhone.trim()) {
      const digits = rawPhone.replace(/\D/g, '');
      const dialCode = getCountryCallingCode(phoneCountry);
      const e164 = `+${dialCode}${digits}`;

      if (!isValidPhoneNumber(e164)) {
        setError('Please enter a valid phone number for the selected country.');
        setLoading(false);
        return;
      }
      fullPhone = e164;
    }

    const payload: RegisterInput = {
      email: formData.email,
      password: formData.password,
      name: formData.name,
      role: 'BUYER',
      phone: fullPhone,
    };

    const result = await api.register(payload);
    if (result.success) {
      if (result.data?.accessToken) {
        localStorage.setItem('accessToken', result.data.accessToken);
        if (result.data.user) {
          localStorage.setItem('user', JSON.stringify(result.data.user));
        }
        router.push(`/${locale}/dashboard`);
      } else {
        // For roles awaiting verification (Brokers/Firms)
        router.push(`/${locale}`);
      }
    } else {
      setError(result.error || 'Registration failed. Please try again.');
    }
    setLoading(false);
  };

  const handleGoogleLogin = () => {
    window.location.href = `${API_BASE_URL}/auth/google`;
  };

  return (
    <div className="h-screen flex bg-white overflow-hidden">
      {/* ── Left Side: Visual/Branding ── */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-gray-900 overflow-hidden">
        <Image
          src="https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=1200&q=90"
          alt="Riyadh Skyline"
          fill
          className="object-cover opacity-50"
          priority
          unoptimized
        />
        <div className="absolute inset-0 bg-gradient-to-tr from-primary-900/80 via-transparent to-transparent" />
        <div className="absolute bottom-16 left-16 right-16 z-10">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1 }}
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/20 mb-8">
              <Sparkles className="w-3.5 h-3.5 text-gold" />
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-white">{t('premiumChoice')}</span>
            </div>
            <h2 className="text-5xl xl:text-6xl font-playfair font-bold text-white leading-tight mb-8">
              {t('registerBrandingTitle')}
            </h2>
            <div className="space-y-6">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20">
                  <Verified className="w-5 h-5 text-gold" />
                </div>
                <div>
                  <h4 className="text-white font-bold text-lg mb-1">{t('directOwners')}</h4>
                  <p className="text-white/60 text-xs max-w-sm">{t('directOwnersDesc')}</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20">
                  <Building2 className="w-5 h-5 text-gold" />
                </div>
                <div>
                  <h4 className="text-white font-bold text-lg mb-1">{t('professionalExcellence')}</h4>
                  <p className="text-white/60 text-xs max-w-sm">{t('professionalExcellenceDesc')}</p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* ── Right Side: Register Form ── */}
      <div className="w-full lg:w-1/2 flex flex-col p-6 sm:p-12 lg:p-20 relative overflow-y-auto">
        <Link
          href={`/${locale}`}
          className="absolute top-6 left-6 sm:top-10 sm:left-10 flex items-center gap-2 text-gray-400 hover:text-primary-600 transition-colors font-bold text-xs group z-10"
        >
          <ArrowLeft className={`w-4 h-4 transition-transform group-hover:-translate-x-1 ${locale === 'ar' ? 'rotate-180' : ''}`} />
          {tCommon('back')}
        </Link>

        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="max-w-[480px] w-full mx-auto my-auto pt-16 sm:pt-8 lg:pt-0 pb-8"
        >
          <div className="mb-10 text-center lg:text-start">
            <h1 className="text-3xl md:text-4xl font-playfair font-bold text-gray-900 mb-2">{t('registerTitle')}</h1>
            <p className="text-gray-500 font-medium text-sm">{t('registerSubtitle')}</p>
          </div>

          {error && (
            <motion.div
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              className="mb-6 p-4 bg-red-50 text-red-600 rounded-xl text-xs font-bold border border-red-100 flex items-center gap-3"
            >
              <div className="w-1.5 h-1.5 rounded-full bg-red-600 animate-pulse shrink-0" />
              {error}
            </motion.div>
          )}

          <AnimatePresence mode="wait">
            {!showEmailForm ? (
              <motion.div
                key="social"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="grid grid-cols-1 sm:grid-cols-2 gap-4"
              >
                <button
                  onClick={handleGoogleLogin}
                  className="flex items-center justify-center gap-3 px-6 py-4 border border-gray-100 rounded-2xl bg-white hover:bg-gray-50 transition-all font-bold text-gray-700 shadow-sm"
                >
                  <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                    <path d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l3.66-2.84z" fill="#FBBC05" />
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335" />
                  </svg>
                  Google
                </button>
                <button
                  className="flex items-center justify-center gap-3 px-6 py-4 border border-gray-100 rounded-2xl bg-white hover:bg-gray-50 transition-all font-bold text-gray-700 shadow-sm"
                >
                  <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" fill="#1877F2" aria-hidden="true">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                  </svg>
                  Facebook
                </button>
                <button
                  onClick={() => setShowEmailForm(true)}
                  className="sm:col-span-2 flex items-center justify-center gap-4 px-8 py-4 rounded-2xl bg-gray-900 text-white hover:bg-black transition-all font-bold shadow-xl shadow-gray-900/10 mt-2"
                >
                  <Mail className="w-5 h-5 opacity-70" />
                  {t('continueWithEmail')}
                </button>
              </motion.div>
            ) : (
              <motion.div
                key="email-form"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* Name */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-extrabold uppercase tracking-widest text-gray-400 ml-1">{t('name')}</label>
                    <div className="relative">
                      <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
                      <input
                        type="text"
                        required
                        className="w-full pl-11 pr-4 py-3.5 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none transition-all font-bold text-sm placeholder:text-gray-300"
                        placeholder="John Doe"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      />
                    </div>
                  </div>

                  {/* Phone Number */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-extrabold uppercase tracking-widest text-gray-400 ml-1">{t('phone')}</label>
                    <PhoneSelector
                      country={phoneCountry}
                      phoneNumber={rawPhone}
                      onCountryChange={setPhoneCountry}
                      onPhoneChange={setRawPhone}
                      placeholder={`+${getCountryCallingCode(phoneCountry)} 50 123 4567`}
                    />
                  </div>

                  {/* Email */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-extrabold uppercase tracking-widest text-gray-400 ml-1">{t('email')}</label>
                    <div className="relative">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
                      <input
                        type="email"
                        required
                        className="w-full pl-11 pr-4 py-3.5 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none transition-all font-bold text-sm placeholder:text-gray-300"
                        placeholder="you@example.com"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      />
                    </div>
                  </div>

                  {/* Password */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-extrabold uppercase tracking-widest text-gray-400 ml-1">{t('password')}</label>
                    <div className="relative">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
                      <input
                        type="password"
                        required
                        minLength={8}
                        className="w-full pl-11 pr-4 py-3.5 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none transition-all font-bold text-sm placeholder:text-gray-300"
                        placeholder="Min. 8 characters"
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      />
                    </div>
                  </div>

                  {/* Submit */}
                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full bg-primary-600 hover:bg-primary-500 text-white font-bold py-4 rounded-2xl shadow-xl shadow-primary-600/20 active:scale-[0.98] transition-all flex items-center justify-center gap-3"
                    >
                      {loading ? (
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      ) : t('signUp')}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowEmailForm(false)}
                      className="w-full text-center text-gray-400 hover:text-gray-600 transition-colors text-xs font-bold pt-4"
                    >
                      {t('backToOptions')}
                    </button>
                  </div>
                </form>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="mt-8 pt-6 border-t border-gray-50 flex flex-col items-center gap-4">
            <p className="text-center text-sm text-gray-500 font-medium">
              {t('hasAccount')}{' '}
              <Link href={`/${locale}/auth/login`} className="text-primary-700 font-extrabold hover:underline">
                {t('signIn')}
              </Link>
            </p>
            <div className="text-center text-[10px] text-gray-400 uppercase tracking-[0.2em] leading-loose max-w-[320px]">
              {t('terms')} &amp; {t('privacy')}
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
