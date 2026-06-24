'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Loader2, Sparkles, X, CheckCircle2, Coins, AlertCircle, Check, ChevronLeft, ChevronRight, Globe, Search, ChevronDown } from 'lucide-react';
import clsx from 'clsx';
import { motion, AnimatePresence } from 'framer-motion';
import { getCountryCallingCode } from 'react-phone-number-input';
import type { CountryCode } from 'libphonenumber-js';

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

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

interface MortgageCalculatorProps {
  price: number;
  propertyExternalId: string;
  locale: string;
  maxPriceAllowed?: number;
}

interface BankRate {
  years: number;
  ratePct: number;
}

interface MortgageBank {
  slug: string;
  externalId: string;
  nameEn: string;
  nameAr: string;
  interestDetails: BankRate[] | null;
}

interface CalculatorConfig {
  minDownPaymentPctFirstHomeCitizen: number;
  minDownPaymentPctDefault: number;
  maxDownPaymentPct: number;
  minLoanPeriodYears: number;
  maxLoanPeriodYears: number;
  defaultLoanPeriodYears: number;
  maxPriceBufferPct: number;
}

const TRANSLATIONS: Record<string, Record<string, string>> = {
  en: {
    title: 'Loan Calculator',
    saudi: "I'm a Saudi",
    nonSaudi: "I'm a Non-Saudi",
    firstHome: 'Is this your first home?',
    yes: 'Yes',
    no: 'No',
    bank: 'Bank',
    totalPrice: 'Total Price',
    downPayment: 'Down Payment',
    loanPeriod: 'Loan Period',
    years: 'Years',
    monthlyInstallment: 'Monthly Installment',
    totalLoanAmount: 'Total Loan Amount',
    totalPayable: 'Total Payable',
    bankProfit: 'Bank Profit',
    principal: 'Principal',
    submitRequest: 'Submit request',
    disclaimer: 'Disclaimer: Rates may vary from the value shown here. Actual rates prevalent as per bank\'s policy will be applicable at the time of application.',
    fullName: 'Full Name *',
    fullNamePlaceholder: 'Enter your full name',
    phoneNumber: 'Phone Number *',
    monthlyIncome: 'Monthly Income',
    monthlyIncomePlaceholder: 'Enter your monthly income',
    redfSupported: 'REDF Supported',
    monthlyObligations: 'Monthly Obligations',
    monthlyObligationsPlaceholder: 'Enter your monthly obligations',
    submitting: 'Submitting...',
    termsText: 'By clicking the \'Submit Request\' button you are agreeing to Tamleeq\'s ',
    termsLink: 'Terms & Conditions',
    successTitle: 'Request Submitted!',
    successDesc: 'Thank you for your interest. A bank consultant or one of our property specialists will contact you shortly.',
    errorPrefix: 'Error: ',
    requiredField: 'This field is required',
    invalidPhone: 'Please enter a valid phone number'
  },
  ar: {
    title: 'حاسبة التمويل العقاري',
    saudi: 'أنا مواطن سعودي',
    nonSaudi: 'أنا غير سعودي',
    firstHome: 'هل هذا هو منزلك الأول؟',
    yes: 'نعم',
    no: 'لا',
    bank: 'البنك',
    totalPrice: 'السعر الإجمالي',
    downPayment: 'الدفعة الأولى',
    loanPeriod: 'فترة التمويل',
    years: 'سنة',
    monthlyInstallment: 'القسط الشهري',
    totalLoanAmount: 'إجمالي مبلغ التمويل',
    totalPayable: 'إجمالي المبلغ المستحق',
    bankProfit: 'أرباح البنك',
    principal: 'مبلغ التمويل الأصلي',
    submitRequest: 'إرسال الطلب',
    disclaimer: 'إخلاء مسؤولية: قد تختلف الأسعار عن القيمة الموضحة هنا. سيتم تطبيق الأسعار الفعلية السائدة حسب سياسة البنك في وقت تقديم الطلب.',
    fullName: 'الاسم الكامل *',
    fullNamePlaceholder: 'أدخل اسمك الكامل',
    phoneNumber: 'رقم الهاتف *',
    monthlyIncome: 'الدخل الشهري',
    monthlyIncomePlaceholder: 'أدخل دخلك الشهري',
    redfSupported: 'دعم صندوق التنمية العقارية (REDF)',
    monthlyObligations: 'الالتزامات الشهرية',
    monthlyObligationsPlaceholder: 'أدخل التزاماتك الشهرية',
    submitting: 'جاري الإرسال...',
    termsText: 'بالنقر فوق الزر "إرسال الطلب" فإنك توافق على الشروط والأحكام الخاصة بـ تمليك ',
    termsLink: 'الشروط والأحكام',
    successTitle: 'تم إرسال الطلب بنجاح!',
    successDesc: 'شكراً لاهتمامك. سيتصل بك مستشار البنك أو أحد أخصائيي العقارات لدينا في أقرب وقت ممكن.',
    errorPrefix: 'خطأ: ',
    requiredField: 'هذا الحقل مطلوب',
    invalidPhone: 'يرجى إدخال رقم هاتف صحيح'
  }
};

export default function MortgageCalculator({
  price: basePropertyPrice,
  propertyExternalId,
  locale = 'en',
  maxPriceAllowed: maxPriceAllowedProp
}: MortgageCalculatorProps) {
  const isAr = locale === 'ar';
  const t = TRANSLATIONS[isAr ? 'ar' : 'en'];

  // Config & Dataset states
  const [config, setConfig] = useState<CalculatorConfig | null>(null);
  const [banks, setBanks] = useState<MortgageBank[]>([]);
  const [loading, setLoading] = useState(true);

  // Form State
  const [price, setPrice] = useState(basePropertyPrice);
  const [isCitizen, setIsCitizen] = useState(true);
  const [isFirstHome, setIsFirstHome] = useState(true);
  const [downPaymentAmount, setDownPaymentAmount] = useState(0);
  const [loanPeriodYears, setLoanPeriodYears] = useState(15);
  const [selectedBankSlug, setSelectedBankSlug] = useState('');

  // Local string states for freeform keyboard typing (allows erasing/clearing fields)
  const [priceInput, setPriceInput] = useState('');
  const [downPaymentInput, setDownPaymentInput] = useState('');
  const [loanPeriodInput, setLoanPeriodInput] = useState('');

  const [isPriceFocused, setIsPriceFocused] = useState(false);
  const [isDownFocused, setIsDownFocused] = useState(false);
  const [isPeriodFocused, setIsPeriodFocused] = useState(false);

  // Synchronize string inputs when numeric state changes from sliders or toggles,
  // but suspend synchronization while the user is actively focused/typing.
  useEffect(() => {
    if (!isPriceFocused) {
      setPriceInput(price > 0 ? price.toLocaleString() : '');
    }
  }, [price, isPriceFocused]);

  useEffect(() => {
    if (!isDownFocused) {
      setDownPaymentInput(downPaymentAmount > 0 ? downPaymentAmount.toLocaleString() : '');
    }
  }, [downPaymentAmount, isDownFocused]);

  useEffect(() => {
    if (!isPeriodFocused) {
      setLoanPeriodInput(loanPeriodYears > 0 ? loanPeriodYears.toString() : '');
    }
  }, [loanPeriodYears, isPeriodFocused]);



  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [submittingLead, setSubmittingLead] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Lead inputs
  const [fullName, setFullName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [monthlyIncome, setMonthlyIncome] = useState('');
  const [redfSupported, setRedfSupported] = useState(true);
  const [monthlyObligations, setMonthlyObligations] = useState('');

  // Country Selector States
  const [country, setCountry] = useState<CountryCode | 'CUSTOM'>('SA');
  const [customDialCode, setCustomDialCode] = useState('');
  const [isOpenDropdown, setIsOpenDropdown] = useState(false);
  const [search, setSearch] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  // Scroll Drag reference for bank selector
  const bankRowRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);

  // Close phone country dropdown on clicking outside
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

  // Focus country search box when dropdown opens
  useEffect(() => {
    if (isOpenDropdown) {
      setTimeout(() => searchRef.current?.focus(), 50);
    }
  }, [isOpenDropdown]);

  // Load config & banks on mount
  useEffect(() => {
    async function fetchData() {
      try {
        const [configRes, banksRes] = await Promise.all([
          fetch(`${API_BASE_URL}/mortgage/config`),
          fetch(`${API_BASE_URL}/mortgage/banks`)
        ]);

        const configJson = await configRes.json();
        const banksJson = await banksRes.json();

        if (configJson.success && configJson.data) {
          setConfig(configJson.data);
          setLoanPeriodYears(configJson.data.defaultLoanPeriodYears);
        }
        if (banksJson.success && banksJson.data) {
          setBanks(banksJson.data);
          if (banksJson.data.length > 0) {
            setSelectedBankSlug(banksJson.data[0].slug);
          }
        }
      } catch (err) {
        console.error('Failed to load mortgage config/banks data:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  // Update default downpayment based on citizen toggle or price change
  useEffect(() => {
    if (!config) return;
    const minPct = (isCitizen && isFirstHome) ? 10 : 30;
    const defaultDown = Math.round(price * (minPct / 100));
    setDownPaymentAmount(defaultDown);
  }, [price, isCitizen, isFirstHome, config]);

  // Perform client-side calculations in real-time
  const calculated = React.useMemo(() => {
    if (loading || !config || !selectedBankSlug || price <= 0 || downPaymentAmount <= 0) return null;

    const selectedBank = banks.find((b) => b.slug === selectedBankSlug);
    let appliedRatePct = 4.30; // Fallback rate (FALLBACK_RATE_PCT)
    if (selectedBank && selectedBank.interestDetails) {
      const entry = selectedBank.interestDetails.find((d) => d.years === loanPeriodYears);
      if (entry) {
        appliedRatePct = entry.ratePct;
      }
    }

    const loanAmount = price - downPaymentAmount;
    const interestRateUnits = appliedRatePct * 100;
    const totalPayableValue = loanAmount + (interestRateUnits / 10000) * loanAmount * loanPeriodYears;
    const monthlyInstalment = totalPayableValue / (12 * loanPeriodYears);
    const bankProfitPercentage = 100 - (100 * loanAmount) / totalPayableValue;

    return {
      totalLoanAmount: loanAmount,
      totalPayableValue,
      monthlyInstalment,
      bankProfitPercentage,
      appliedRatePct
    };
  }, [price, downPaymentAmount, loanPeriodYears, selectedBankSlug, banks, config, loading]);

  // Handle slide/drag scroll for banks list
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!bankRowRef.current) return;
    setIsDragging(true);
    setStartX(e.pageX - bankRowRef.current.offsetLeft);
    setScrollLeft(bankRowRef.current.scrollLeft);
  };

  const handleMouseLeave = () => {
    setIsDragging(false);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !bankRowRef.current) return;
    e.preventDefault();
    const x = e.pageX - bankRowRef.current.offsetLeft;
    const walk = (x - startX) * 2; // scroll speed multiplier
    bankRowRef.current.scrollLeft = scrollLeft - walk;
  };

  const handleScrollBanks = (direction: 'left' | 'right') => {
    if (bankRowRef.current) {
      const scrollAmount = 180;
      bankRowRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  };



  // Submit Lead request
  const handleSubmitLead = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName || !phoneNumber) {
      setFormError(t.requiredField);
      return;
    }

    const callingCode = country === 'CUSTOM' ? customDialCode.replace(/\D/g, '') : getCountryCallingCode(country);
    if (!callingCode) {
      setFormError(isAr ? 'يرجى اختيار رمز الدولة' : 'Please select a country code');
      return;
    }
    const digits = phoneNumber.replace(/\D/g, '');
    const fullPhoneFormatted = `+${callingCode}${digits}`;

    // Standard phone number format regex verification (7 to 16 digits)
    const isValid = /^\+?[0-9]{7,16}$/.test(fullPhoneFormatted);
    if (!isValid) {
      setFormError(t.invalidPhone);
      return;
    }

    setSubmittingLead(true);
    setFormError(null);

    try {
      const res = await fetch(`${API_BASE_URL}/mortgage/leads`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName,
          phoneNumber: fullPhoneFormatted,
          monthlyIncome: monthlyIncome ? parseFloat(monthlyIncome) : null,
          redfSupported,
          monthlyObligations: monthlyObligations ? parseFloat(monthlyObligations) : null,
          propertyExternalId,
          price,
          isCitizen,
          isFirstHome: isCitizen ? isFirstHome : null,
          downPaymentAmount,
          loanPeriodYears,
          bankSlug: selectedBankSlug
        })
      });

      const json = await res.json();
      if (json.success) {
        setSubmitSuccess(true);
      } else {
        setFormError(json.message || 'Failed to submit request');
      }
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : 'Unexpected server error.');
    } finally {
      setSubmittingLead(false);
    }
  };

  if (loading || !config) {
    return (
      <div className="w-full py-16 flex flex-col items-center justify-center bg-surface-50/50 border border-surface-200/50 rounded-3xl">
        <Loader2 className="w-10 h-10 animate-spin text-[#006169] mb-3" />
        <span className="text-xs text-charcoal-muted font-bold font-serif uppercase tracking-widest">
          {isAr ? 'جاري تحميل تفاصيل التمويل...' : 'Initializing Loan Metrics...'}
        </span>
      </div>
    );
  }

  // Derived limits
  const maxPriceAllowed = maxPriceAllowedProp !== undefined
    ? maxPriceAllowedProp
    : Math.round(basePropertyPrice * (1 + config.maxPriceBufferPct / 100));
  const minDownPaymentPct = (isCitizen && isFirstHome) ? config.minDownPaymentPctFirstHomeCitizen : config.minDownPaymentPctDefault;
  
  const minDownAllowed = price > 0
    ? Math.round(price * (minDownPaymentPct / 100))
    : Math.round(basePropertyPrice * (minDownPaymentPct / 100));

  const maxDownAllowed = price > 0
    ? Math.round(price * (config.maxDownPaymentPct / 100))
    : Math.round(maxPriceAllowed * (config.maxDownPaymentPct / 100));

  // Donut chart calculations
  const bankProfitPercentage = calculated?.bankProfitPercentage ?? 0;
  const principalPercentage = Math.max(0, 100 - bankProfitPercentage);
  const radius = 58;
  const stroke = 10;
  const circumference = 2 * Math.PI * radius;
  // Calculate offset. Arc is bankProfit. Remaining is principal
  const strokeDashoffset = circumference - (bankProfitPercentage / 100) * circumference;

  return (
    <div className="w-full bg-white border border-surface-200/80 rounded-3xl p-6 lg:p-10 shadow-xl space-y-8 scroll-mt-24" id="loan-calculator">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-surface-100 pb-5">
        <h3 className="text-2xl font-black text-charcoal font-serif tracking-tight flex items-center gap-2">
          <Coins className="w-6 h-6 text-[#006169]" />
          {t.title}
        </h3>
        <span className="text-[10px] font-black uppercase bg-[#006169]/10 text-[#006169] px-3.5 py-1.5 rounded-full tracking-wider self-start sm:self-auto font-sans">
          {isAr ? 'احسب تمويلك' : 'Estimate Payments'}
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Side: Inputs */}
        <div className="col-span-1 lg:col-span-7 space-y-8">
          
          {/* Nationality & First Home Toggle Blocks (Stacked Vertically) */}
          <div className="flex flex-col gap-6">
            {/* Saudi / Non-Saudi Toggle */}
            <div className="space-y-2">
              <div className="inline-flex p-1 bg-surface-50 border border-surface-200 rounded-xl">
                <button
                  type="button"
                  onClick={() => {
                    setIsCitizen(true);
                    setIsFirstHome(true);
                  }}
                  className={clsx(
                    'px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all',
                    isCitizen ? 'bg-[#006169] text-white shadow-md' : 'text-charcoal-muted hover:text-charcoal'
                  )}
                >
                  {t.saudi}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsCitizen(false);
                    setIsFirstHome(false);
                  }}
                  className={clsx(
                    'px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all',
                    !isCitizen ? 'bg-[#006169] text-white shadow-md' : 'text-charcoal-muted hover:text-charcoal'
                  )}
                >
                  {t.nonSaudi}
                </button>
              </div>
            </div>

            {/* First Home Toggle (Citizen Only - on Second Line) */}
            {isCitizen && (
              <div className="space-y-2.5 animate-fade-in">
                <label className="text-[10px] font-black text-charcoal-muted uppercase tracking-widest block">
                  {t.firstHome}
                </label>
                <div className="inline-flex p-1 bg-surface-50 border border-surface-200 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setIsFirstHome(true)}
                    className={clsx(
                      'px-5 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all',
                      isFirstHome ? 'bg-white text-[#006169] shadow-sm border border-surface-200/50 font-black' : 'text-charcoal-muted hover:text-charcoal'
                    )}
                  >
                    {t.yes}
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsFirstHome(false)}
                    className={clsx(
                      'px-5 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all',
                      !isFirstHome ? 'bg-white text-[#006169] shadow-sm border border-surface-200/50 font-black' : 'text-charcoal-muted hover:text-charcoal'
                    )}
                  >
                    {t.no}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Banks Row Select */}
          <div className="space-y-3">
            <label className="text-[10px] font-black uppercase tracking-widest text-[#006169] block">
              {t.bank}
            </label>
            <div className="relative select-none px-4">
              {/* Left Scroll Chevron */}
              <button
                type="button"
                onClick={() => handleScrollBanks('left')}
                className="absolute -left-3 top-1/2 -translate-y-1/2 z-10 p-2.5 rounded-full border border-surface-200 bg-white shadow-lg text-[#006169] hover:bg-slate-50 hover:text-[#004e54] transition-all active:scale-95 flex items-center justify-center shrink-0"
                aria-label="Scroll banks left"
              >
                <ChevronLeft className="w-4 h-4 stroke-[3]" />
              </button>

              {/* Scroll Container */}
              <div
                ref={bankRowRef}
                onMouseDown={handleMouseDown}
                onMouseLeave={handleMouseLeave}
                onMouseUp={handleMouseUp}
                onMouseMove={handleMouseMove}
                style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                className="flex gap-3 overflow-x-auto pt-4 pb-5 cursor-grab select-none [&::-webkit-scrollbar]:hidden w-full px-1"
              >
                {banks.map((b) => (
                  <button
                    key={b.slug}
                    type="button"
                    onClick={() => setSelectedBankSlug(b.slug)}
                    className={clsx(
                      'px-5 py-4 rounded-xl border font-bold text-xs shrink-0 transition-all flex flex-col items-center justify-center min-w-[120px]',
                      selectedBankSlug === b.slug
                        ? 'border-[#006169] bg-[#006169]/5 text-[#006169] shadow-sm font-black scale-[1.02]'
                        : 'border-surface-200 bg-white hover:border-surface-300 text-charcoal'
                    )}
                  >
                    <span className="uppercase tracking-wider">{isAr ? b.nameAr : b.nameEn}</span>
                  </button>
                ))}
              </div>

              {/* Right Scroll Chevron */}
              <button
                type="button"
                onClick={() => handleScrollBanks('right')}
                className="absolute -right-3 top-1/2 -translate-y-1/2 z-10 p-2.5 rounded-full border border-surface-200 bg-white shadow-lg text-[#006169] hover:bg-slate-50 hover:text-[#004e54] transition-all active:scale-95 flex items-center justify-center shrink-0"
                aria-label="Scroll banks right"
              >
                <ChevronRight className="w-4 h-4 stroke-[3]" />
              </button>
            </div>
          </div>

          {/* Linked Inputs & Sliders */}
          <div className="space-y-6 pt-2">
            
            {/* Input 1: Total Price */}
            <div className="space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="font-black uppercase tracking-widest text-charcoal-muted">
                  {t.totalPrice}
                </span>
                <div className="flex items-center gap-2 bg-surface-50 border border-surface-200 rounded-xl px-3 py-1.5 focus-within:border-[#006169] transition-all">
                  <input
                    type="text"
                    value={priceInput}
                    onFocus={() => {
                      setIsPriceFocused(true);
                      setPriceInput(price > 0 ? price.toString() : '');
                    }}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, '');
                      const parsed = parseInt(val, 10);
                      if (!isNaN(parsed)) {
                        if (parsed > maxPriceAllowed) {
                          setPrice(maxPriceAllowed);
                          setPriceInput(maxPriceAllowed.toString());
                        } else {
                          setPrice(parsed);
                          setPriceInput(val);
                        }
                      } else {
                        setPrice(0);
                        setPriceInput('');
                      }
                    }}
                    onBlur={() => {
                      setIsPriceFocused(false);
                      const clamped = Math.min(Math.max(price, basePropertyPrice), maxPriceAllowed);
                      setPrice(clamped);
                      setPriceInput(clamped > 0 ? clamped.toLocaleString() : '');
                    }}
                    className="bg-transparent border-none text-right font-black text-sm text-charcoal outline-none focus:ring-0 w-32 p-0"
                  />
                  <span className="text-[#006169] font-bold">﷼</span>
                </div>
              </div>
              <div className="relative group/price">
                <input
                  type="range"
                  min={basePropertyPrice}
                  max={maxPriceAllowed}
                  step="5000"
                  value={price}
                  onChange={(e) => setPrice(Number(e.target.value))}
                  style={{ background: getSliderBackground(price, basePropertyPrice, maxPriceAllowed) }}
                  className="w-full h-1.5 rounded-lg appearance-none cursor-pointer accent-[#006169]"
                />
              </div>
            </div>

            {/* Input 2: Down Payment */}
            <div className="space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="font-black uppercase tracking-widest text-charcoal-muted">
                  {t.downPayment}
                </span>
                <div className="flex items-center gap-3">
                  {/* Current down payment % badge */}
                  <span className="text-[10px] font-black bg-[#006169]/10 text-[#006169] px-2.5 py-1 rounded-lg">
                    {price > 0 ? Math.round((downPaymentAmount / price) * 100) : 0}%
                  </span>
                  <div className="flex items-center gap-2 bg-surface-50 border border-surface-200 rounded-xl px-3 py-1.5 focus-within:border-[#006169] transition-all">
                    <input
                      type="text"
                      value={downPaymentInput}
                      onFocus={() => {
                        setIsDownFocused(true);
                        setDownPaymentInput(downPaymentAmount > 0 ? downPaymentAmount.toString() : '');
                      }}
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, '');
                        const parsed = parseInt(val, 10);
                        if (!isNaN(parsed)) {
                          if (parsed > maxDownAllowed) {
                            setDownPaymentAmount(maxDownAllowed);
                            setDownPaymentInput(maxDownAllowed.toString());
                          } else {
                            setDownPaymentAmount(parsed);
                            setDownPaymentInput(val);
                          }
                        } else {
                          setDownPaymentAmount(0);
                          setDownPaymentInput('');
                        }
                      }}
                      onBlur={() => {
                        setIsDownFocused(false);
                        const clamped = Math.min(Math.max(downPaymentAmount, minDownAllowed), maxDownAllowed);
                        setDownPaymentAmount(clamped);
                        setDownPaymentInput(clamped > 0 ? clamped.toLocaleString() : '');
                      }}
                      className="bg-transparent border-none text-right font-black text-sm text-charcoal outline-none focus:ring-0 w-32 p-0"
                    />
                    <span className="text-[#006169] font-bold">﷼</span>
                  </div>
                </div>
              </div>
              <div className="relative group/down">
                <input
                  type="range"
                  min={minDownAllowed}
                  max={maxDownAllowed}
                  step="5000"
                  value={downPaymentAmount}
                  onChange={(e) => setDownPaymentAmount(Number(e.target.value))}
                  style={{ background: getSliderBackground(downPaymentAmount, minDownAllowed, maxDownAllowed) }}
                  className="w-full h-1.5 rounded-lg appearance-none cursor-pointer accent-[#006169]"
                />
              </div>
            </div>

            {/* Input 3: Loan Period */}
            <div className="space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="font-black uppercase tracking-widest text-charcoal-muted">
                  {t.loanPeriod}
                </span>
                <div className="flex items-center gap-2 bg-surface-50 border border-surface-200 rounded-xl px-3 py-1.5 focus-within:border-[#006169] transition-all">
                  <input
                    type="text"
                    value={loanPeriodInput}
                    onFocus={() => {
                      setIsPeriodFocused(true);
                      setLoanPeriodInput(loanPeriodYears > 0 ? loanPeriodYears.toString() : '');
                    }}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, '');
                      const parsed = parseInt(val, 10);
                      if (!isNaN(parsed)) {
                        if (parsed > config.maxLoanPeriodYears) {
                          setLoanPeriodYears(config.maxLoanPeriodYears);
                          setLoanPeriodInput(config.maxLoanPeriodYears.toString());
                        } else {
                          setLoanPeriodYears(parsed);
                          setLoanPeriodInput(val);
                        }
                      } else {
                        setLoanPeriodYears(0);
                        setLoanPeriodInput('');
                      }
                    }}
                    onBlur={() => {
                      setIsPeriodFocused(false);
                      const clamped = Math.min(Math.max(loanPeriodYears, config.minLoanPeriodYears), config.maxLoanPeriodYears);
                      setLoanPeriodYears(clamped);
                      setLoanPeriodInput(clamped > 0 ? clamped.toString() : '');
                    }}
                    className="bg-transparent border-none text-right font-black text-sm text-charcoal outline-none focus:ring-0 w-12 p-0"
                  />
                  <span className="text-charcoal-muted font-bold text-xs">{t.years}</span>
                </div>
              </div>
              <div className="relative group/period">
                <input
                  type="range"
                  min={config.minLoanPeriodYears}
                  max={config.maxLoanPeriodYears}
                  step="1"
                  value={loanPeriodYears}
                  onChange={(e) => setLoanPeriodYears(Number(e.target.value))}
                  style={{ background: getSliderBackground(loanPeriodYears, config.minLoanPeriodYears, config.maxLoanPeriodYears) }}
                  className="w-full h-1.5 rounded-lg appearance-none cursor-pointer bg-surface-200 accent-[#006169]"
                />
              </div>
            </div>

          </div>

          <p className="text-[10px] text-slate-400 leading-relaxed bg-slate-50 border border-slate-100 p-3.5 rounded-2xl">
            {t.disclaimer}
          </p>

        </div>

        {/* Right Side: Calculation Breakdown (Interactive Panel) */}
        <div className="col-span-1 lg:col-span-5 bg-gradient-to-br from-surface-50/50 to-white rounded-3xl border border-surface-200 p-6 shadow-sm space-y-6 flex flex-col justify-between h-full min-h-[460px]">
          
          <div className="space-y-6">
            <h4 className="text-xs font-black uppercase tracking-widest text-charcoal-muted text-center border-b border-surface-100 pb-3">
              Payment Breakdown
            </h4>

            {/* SVG Circular Donut Chart */}
            <div className="relative flex items-center justify-center py-2 shrink-0">
              <svg width="150" height="150" className="transform -rotate-90">
                {/* Background Ring (Principal) */}
                <circle
                  cx="75"
                  cy="75"
                  r={radius}
                  stroke="#a2d2c8"
                  strokeWidth={stroke}
                  fill="transparent"
                />
                {/* Foreground Ring (Bank Profit) */}
                <circle
                  cx="75"
                  cy="75"
                  r={radius}
                  stroke="#006169"
                  strokeWidth={stroke}
                  fill="transparent"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="round"
                  className="transition-all duration-300"
                />
              </svg>
              {/* Centered text in ring */}
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-2">
                <span className="text-[9px] font-black uppercase tracking-wider text-charcoal-muted">
                  {t.totalPayable}
                </span>
                {(() => {
                  const valText = calculated ? formatCurrency(calculated.totalPayableValue) : '---';
                  const sizeClass = valText.length > 18
                    ? 'text-[8px]'
                    : valText.length > 15
                      ? 'text-[9px]'
                      : valText.length > 12
                        ? 'text-[10px]'
                        : valText.length > 9
                          ? 'text-xs'
                          : 'text-sm';
                  return (
                    <span className={clsx("font-extrabold text-charcoal mt-0.5 whitespace-nowrap", sizeClass)}>
                      {valText}
                    </span>
                  );
                })()}
              </div>
            </div>

            {/* Donut Legend */}
            <div className="flex justify-center gap-6 text-[10px] font-black uppercase tracking-wider">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-[#006169] block" />
                <span className="text-charcoal">{t.bankProfit} ({Math.round(bankProfitPercentage)}%)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-[#a2d2c8] block" />
                <span className="text-charcoal-muted">{t.principal} ({Math.round(principalPercentage)}%)</span>
              </div>
            </div>

            {/* Metric List */}
            <div className="space-y-5 pt-4 border-t border-dashed border-surface-200 text-center">
              {/* Monthly Installment */}
              <div className="flex flex-col items-center">
                <span className="text-[11px] font-black uppercase tracking-wider text-charcoal-muted mb-1">
                  {t.monthlyInstallment}
                </span>
                <span className="text-3xl font-black text-[#006169] tracking-tight">
                  {calculated ? formatCurrency(calculated.monthlyInstalment) : '---'}
                </span>
                <span className="text-[10px] text-slate-400 font-bold mt-1">
                  {calculated ? `${calculated.appliedRatePct}% APR` : '---'}
                </span>
              </div>

              {/* Divider */}
              <div className="border-t border-dashed border-surface-200" />

              {/* Total Loan Amount */}
              <div className="flex flex-col items-center">
                <span className="text-[11px] font-black uppercase tracking-wider text-charcoal-muted mb-1">
                  {t.totalLoanAmount}
                </span>
                <span className="text-2xl font-black text-charcoal tracking-tight">
                  {calculated ? formatCurrency(calculated.totalLoanAmount) : '---'}
                </span>
              </div>
            </div>
          </div>

          {/* Trigger Lead Submission Button */}
          <button
            onClick={() => setModalOpen(true)}
            className="w-full py-4 mt-6 rounded-2xl bg-[#006169] text-white hover:bg-[#004e54] font-black uppercase tracking-[0.1em] text-xs transition-all active:scale-[0.98] shadow-lg shadow-[#006169]/15 flex items-center justify-center gap-2"
          >
            {t.submitRequest}
          </button>

        </div>

      </div>

      {/* Lead Submission Modal Dialog */}
      <AnimatePresence>
        {modalOpen && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            {/* Backdrop (Dark dimmed viewport-wide shade) */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 bg-slate-950/60 backdrop-blur-[2px]"
              onClick={() => {
                if (!submittingLead) {
                  setIsOpenDropdown(false);
                  setModalOpen(false);
                }
              }}
            />

            {/* Dialog Container */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ type: 'spring', damping: 25, stiffness: 350 }}
              className="relative w-full max-w-md bg-white rounded-3xl p-6 lg:p-8 shadow-2xl border border-slate-100 transform z-10"
            >
              
              {/* Close action */}
              <button
                onClick={() => {
                  setIsOpenDropdown(false);
                  setModalOpen(false);
                }}
                disabled={submittingLead}
                className="absolute top-4 right-4 p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors disabled:opacity-50"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Success state */}
              {submitSuccess ? (
                <div className="text-center py-6 space-y-4">
                  <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto border border-emerald-100 shadow-md">
                    <CheckCircle2 className="w-8 h-8 text-emerald-600 animate-bounce" />
                  </div>
                  <h3 className="text-lg font-black text-slate-800">{t.successTitle}</h3>
                  <p className="text-xs text-slate-500 font-semibold leading-relaxed max-w-[280px] mx-auto">
                    {t.successDesc}
                  </p>
                  <button
                    onClick={() => {
                      setModalOpen(false);
                      setSubmitSuccess(false);
                      setFullName('');
                      setPhoneNumber('');
                      setMonthlyIncome('');
                      setMonthlyObligations('');
                    }}
                    className="mt-6 px-6 py-2.5 rounded-xl bg-[#006169] text-white hover:bg-[#004e54] text-xs font-black uppercase tracking-wider transition-all"
                  >
                    {isAr ? 'إغلاق' : 'Close'}
                  </button>
                </div>
              ) : (
                // Form Layout
                <form onSubmit={handleSubmitLead} className="space-y-5">
                  <div>
                    <h3 className="text-lg font-black text-slate-800 flex items-center gap-2">
                      <Sparkles className="w-5 h-5 text-[#006169] animate-pulse" />
                      {isAr ? 'تقديم طلب التمويل' : 'Mortgage Quote Request'}
                    </h3>
                    <p className="text-[10px] text-slate-400 font-semibold mt-0.5">
                      {isAr ? 'سيتواصل معك خبير عقاري فوراً' : 'Our mortgage partners will contact you shortly'}
                    </p>
                  </div>

                  {formError && (
                    <div className="flex items-center gap-2 p-3 bg-rose-50 border border-rose-100 text-rose-600 text-xs font-semibold rounded-xl">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>{formError}</span>
                    </div>
                  )}

                  {/* Input: Full Name */}
                  <div className="space-y-1" onClick={() => setIsOpenDropdown(false)}>
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block">
                      {t.fullName}
                    </label>
                    <input
                      type="text"
                      required
                      disabled={submittingLead}
                      placeholder={t.fullNamePlaceholder}
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-700 placeholder-slate-400 outline-none focus:border-[#006169] transition-all"
                    />
                  </div>

                  {/* Input: Phone Number with Country Dropdown */}
                  <div className="space-y-1 relative" ref={dropdownRef}>
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block">
                      {t.phoneNumber}
                    </label>
                    <div className="flex items-center w-full rounded-xl border border-slate-200 bg-slate-50 focus-within:bg-white focus-within:border-[#006169] transition-all duration-200 relative">
                      {/* Country Trigger */}
                      <button
                        type="button"
                        disabled={submittingLead}
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setIsOpenDropdown(!isOpenDropdown);
                        }}
                        className="flex items-center gap-1.5 px-3 py-2.5 hover:bg-slate-100 transition-colors border-r border-slate-200 rounded-l-xl shrink-0"
                      >
                        {country === 'CUSTOM' ? (
                          <Globe className="w-4 h-4 text-slate-400 object-cover" />
                        ) : (
                          <img
                            src={flagUrl(country)}
                            alt={country}
                            style={{ width: '16px', height: '12px' }}
                            className="rounded-sm object-cover shadow-sm"
                          />
                        )}
                        <span className="text-xs font-bold text-slate-700">
                          {country === 'CUSTOM' ? 'Custom' : `+${getCountryCallingCode(country)}`}
                        </span>
                        <ChevronDown className="w-3 h-3 text-slate-400" />
                      </button>

                      {/* Custom Dial Code Input */}
                      {country === 'CUSTOM' && (
                        <div className="flex items-center px-2 self-stretch border-r border-slate-200 bg-slate-100 shrink-0">
                          <span className="text-xs font-bold text-slate-500 select-none">+</span>
                          <input
                            type="tel"
                            required
                            disabled={submittingLead}
                            value={customDialCode}
                            onChange={(e) => {
                              const val = e.target.value;
                              if (/[^\d]/.test(val)) return;
                              if (val.length > 4) return;
                              setCustomDialCode(val);
                            }}
                            placeholder="966"
                            className="w-10 bg-transparent text-xs font-bold text-slate-800 outline-none pl-1 text-center"
                          />
                        </div>
                      )}

                      <input
                        type="tel"
                        required
                        disabled={submittingLead}
                        value={phoneNumber}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (/[^\d\s+]/.test(val)) return;
                          if (val.replace(/\D/g, '').length > 15) return;
                          setPhoneNumber(val);
                        }}
                        placeholder="50 123 4567"
                        className="flex-1 bg-transparent px-4 py-2.5 outline-none text-xs font-bold text-slate-700 placeholder:text-slate-300 min-w-0"
                      />

                      {/* Dropdown search panel */}
                      {isOpenDropdown && (
                        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-50 overflow-hidden">
                          {/* Search Input */}
                          <div className="p-2 border-b border-slate-50">
                            <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-50 rounded-lg">
                              <Search className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                              <input
                                ref={searchRef}
                                type="text"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Search country or code..."
                                className="flex-1 bg-transparent text-xs outline-none text-slate-700 placeholder:text-slate-300"
                              />
                            </div>
                          </div>

                          {/* Dropdown Scrollable List */}
                          <div className="max-h-40 overflow-y-auto py-1 scrollbar-thin">
                            {(!search || 'custom'.includes(search.toLowerCase())) && (
                              <button
                                type="button"
                                onClick={() => {
                                  setCountry('CUSTOM');
                                  setIsOpenDropdown(false);
                                  setSearch('');
                                }}
                                className={`w-full flex items-center gap-2 px-3 py-2 text-left text-xs font-bold transition-colors hover:bg-slate-50 ${country === 'CUSTOM' ? 'text-[#006169] bg-[#006169]/5' : 'text-slate-700'}`}
                              >
                                <Globe className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                                <span className="flex-1 truncate">Custom Country Code (+...)</span>
                                {country === 'CUSTOM' && <Check className="w-3 h-3 text-[#006169] shrink-0" />}
                              </button>
                            )}

                            {(() => {
                              const filtered = ALL_COUNTRIES.filter(c => {
                                const name = COUNTRY_NAMES[c] ?? c;
                                const code = `+${getCountryCallingCode(c)}`;
                                return (
                                  name.toLowerCase().includes(search.toLowerCase()) ||
                                  code.includes(search) ||
                                  c.toLowerCase().includes(search.toLowerCase())
                                );
                              });

                              if (filtered.length === 0 && search && !'custom'.includes(search.toLowerCase())) {
                                return <div className="px-3 py-4 text-center text-xs text-slate-400">No countries found</div>;
                              }

                              return filtered.map((c, i) => {
                                const isAll = !search && i === TOP_COUNTRIES.length;
                                return (
                                  <React.Fragment key={c}>
                                    {isAll && (
                                      <div className="px-3 pt-2 pb-1 border-t border-slate-50 mt-1">
                                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">All Countries</span>
                                      </div>
                                    )}
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setCountry(c);
                                        setIsOpenDropdown(false);
                                        setSearch('');
                                      }}
                                      className={`w-full flex items-center gap-2 px-3 py-2 text-left text-xs font-bold transition-colors hover:bg-slate-50 ${country === c ? 'text-[#006169] bg-[#006169]/5' : 'text-slate-700'}`}
                                    >
                                      <img
                                        src={flagUrl(c)}
                                        alt={c}
                                        style={{ width: '16px', height: '11px' }}
                                        className="rounded-sm object-cover shadow-sm shrink-0"
                                      />
                                      <span className="text-[10px] font-semibold text-slate-400 shrink-0">(+{getCountryCallingCode(c)})</span>
                                      <span className="flex-1 truncate text-slate-700">{COUNTRY_NAMES[c] ?? c}</span>
                                      {country === c && <Check className="w-3 h-3 text-[#006169] shrink-0" />}
                                    </button>
                                  </React.Fragment>
                                );
                              });
                            })()}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Input: Monthly Income */}
                  <div className="space-y-1" onClick={() => setIsOpenDropdown(false)}>
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block">
                      {t.monthlyIncome}
                    </label>
                    <input
                      type="number"
                      disabled={submittingLead}
                      placeholder={t.monthlyIncomePlaceholder}
                      value={monthlyIncome}
                      onChange={(e) => setMonthlyIncome(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-700 placeholder-slate-400 outline-none focus:border-[#006169] transition-all"
                    />
                  </div>

                  {/* Switch Toggle: REDF Supported */}
                  <div className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-2xl p-3 text-xs" onClick={() => setIsOpenDropdown(false)}>
                    <span className="font-bold text-slate-500 uppercase tracking-wider text-[10px]">
                      {t.redfSupported}
                    </span>
                    <div className="flex p-0.5 bg-white border border-slate-200 rounded-lg">
                      <button
                        type="button"
                        disabled={submittingLead}
                        onClick={() => setRedfSupported(true)}
                        className={clsx(
                          'px-3 py-1 rounded text-[10px] font-bold tracking-wider transition-all',
                          redfSupported ? 'bg-[#006169]/10 text-[#006169] font-black' : 'text-slate-400'
                        )}
                      >
                        {t.yes}
                      </button>
                      <button
                        type="button"
                        disabled={submittingLead}
                        onClick={() => setRedfSupported(false)}
                        className={clsx(
                          'px-3 py-1 rounded text-[10px] font-bold tracking-wider transition-all',
                          !redfSupported ? 'bg-[#006169]/10 text-[#006169] font-black' : 'text-slate-400'
                        )}
                      >
                        {t.no}
                      </button>
                    </div>
                  </div>

                  {/* Input: Monthly Obligations */}
                  <div className="space-y-1" onClick={() => setIsOpenDropdown(false)}>
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block">
                      {t.monthlyObligations}
                    </label>
                    <input
                      type="number"
                      disabled={submittingLead}
                      placeholder={t.monthlyObligationsPlaceholder}
                      value={monthlyObligations}
                      onChange={(e) => setMonthlyObligations(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-700 placeholder-slate-400 outline-none focus:border-[#006169] transition-all"
                    />
                  </div>

                  {/* Submit button & terms */}
                  <div className="pt-2" onClick={() => setIsOpenDropdown(false)}>
                    <button
                      type="submit"
                      disabled={submittingLead}
                      className="w-full py-3.5 bg-[#006169] hover:bg-[#004e54] text-white font-black uppercase tracking-widest text-xs rounded-xl shadow-lg shadow-[#006169]/15 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {submittingLead ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin text-white" />
                          {t.submitting}
                        </>
                      ) : (
                        <>
                          <Check className="w-4 h-4 text-white" />
                          {t.submitRequest}
                        </>
                      )}
                    </button>
                    <p className="text-[9px] text-slate-400 leading-normal mt-3 text-center">
                      {t.termsText}
                      <a href="#" className="text-[#006169] font-black hover:underline">
                        {t.termsLink}
                      </a>
                    </p>
                  </div>
                </form>
              )}

            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}

// Utility to output display values
function formatCurrency(num: number) {
  return `${Math.round(num).toLocaleString()} ﷼`;
}

// Utility to generate custom range inputs track highlight color
function getSliderBackground(value: number, min: number, max: number) {
  const percentage = max > min ? ((value - min) / (max - min)) * 100 : 0;
  return `linear-gradient(to right, #006169 ${percentage}%, #e2e8f0 ${percentage}%)`;
}
