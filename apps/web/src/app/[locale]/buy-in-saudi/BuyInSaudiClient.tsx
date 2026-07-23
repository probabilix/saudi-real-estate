'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useLocale } from 'next-intl';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Globe, Home, IdCard, CheckCircle, ArrowRight, ChevronDown,
  Search, X, ExternalLink, RotateCcw, Shield, ArrowLeft
} from 'lucide-react';
import { parsePhoneNumberFromString, CountryCode } from 'libphonenumber-js';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

// ── Full list of countries for dial code picker & citizenship ────────────────────────
const GCC_COUNTRIES = [
  { code: 'SA', name: 'Saudi Arabia', nameAr: 'المملكة العربية السعودية', dial: '+966', flag: '🇸🇦' },
  { code: 'AE', name: 'United Arab Emirates', nameAr: 'الإمارات العربية المتحدة', dial: '+971', flag: '🇦🇪' },
  { code: 'KW', name: 'Kuwait', nameAr: 'الكويت', dial: '+965', flag: '🇰🇼' },
  { code: 'QA', name: 'Qatar', nameAr: 'قطر', dial: '+974', flag: '🇶🇦' },
  { code: 'BH', name: 'Bahrain', nameAr: 'البحرين', dial: '+973', flag: '🇧🇭' },
  { code: 'OM', name: 'Oman', nameAr: 'عمان', dial: '+968', flag: '🇴🇲' },
];

const OTHER_COUNTRIES = [
  { code: 'US', name: 'United States', nameAr: 'الولايات المتحدة', dial: '+1', flag: '🇺🇸' },
  { code: 'GB', name: 'United Kingdom', nameAr: 'المملكة المتحدة', dial: '+44', flag: '🇬🇧' },
  { code: 'EG', name: 'Egypt', nameAr: 'مصر', dial: '+20', flag: '🇪🇬' },
  { code: 'JO', name: 'Jordan', nameAr: 'الأردن', dial: '+962', flag: '🇯🇴' },
  { code: 'LB', name: 'Lebanon', nameAr: 'لبنان', dial: '+961', flag: '🇱🇧' },
  { code: 'SY', name: 'Syria', nameAr: 'سوريا', dial: '+963', flag: '🇸🇾' },
  { code: 'IQ', name: 'Iraq', nameAr: 'العراق', dial: '+964', flag: '🇮🇶' },
  { code: 'YE', name: 'Yemen', nameAr: 'اليمن', dial: '+967', flag: '🇾🇪' },
  { code: 'SD', name: 'Sudan', nameAr: 'السودان', dial: '+249', flag: '🇸🇩' },
  { code: 'MA', name: 'Morocco', nameAr: 'المغرب', dial: '+212', flag: '🇲🇦' },
  { code: 'DZ', name: 'Algeria', nameAr: 'الجزائر', dial: '+213', flag: '🇩🇿' },
  { code: 'TN', name: 'Tunisia', nameAr: 'تونس', dial: '+216', flag: '🇹🇳' },
  { code: 'LY', name: 'Libya', nameAr: 'ليبيا', dial: '+218', flag: '🇱🇾' },
  { code: 'PS', name: 'Palestine', nameAr: 'فلسطين', dial: '+970', flag: '🇵🇸' },
  { code: 'PK', name: 'Pakistan', nameAr: 'باكستان', dial: '+92', flag: '🇵🇰' },
  { code: 'IN', name: 'India', nameAr: 'الهند', dial: '+91', flag: '🇮🇳' },
  { code: 'TR', name: 'Turkey', nameAr: 'تركيا', dial: '+90', flag: '🇹🇷' },
  { code: 'CA', name: 'Canada', nameAr: 'كندا', dial: '+1', flag: '🇨🇦' },
  { code: 'AU', name: 'Australia', nameAr: 'أستراليا', dial: '+61', flag: '🇦🇺' },
  { code: 'DE', name: 'Germany', nameAr: 'ألمانيا', dial: '+49', flag: 'ألمانيا' },
  { code: 'FR', name: 'France', nameAr: 'فرنسا', dial: '+33', flag: '🇫🇷' },
  { code: 'IE', name: 'Ireland', nameAr: 'أيرلندا', dial: '+353', flag: '🇮🇪' },
  { code: 'NL', name: 'Netherlands', nameAr: 'هولندا', dial: '+31', flag: '🇳🇱' },
  { code: 'CH', name: 'Switzerland', nameAr: 'سويسرا', dial: '+41', flag: '🇨🇭' },
  { code: 'SE', name: 'Sweden', nameAr: 'السويد', dial: '+46', flag: '🇸🇪' },
  { code: 'MY', name: 'Malaysia', nameAr: 'ماليزيا', dial: '+60', flag: '🇲🇾' },
  { code: 'SG', name: 'Singapore', nameAr: 'سنغافورة', dial: '+65', flag: '🇸🇬' },
];

const ALL_CITIZENSHIP = [
  ...GCC_COUNTRIES,
  ...OTHER_COUNTRIES,
  { code: 'OTHER', name: 'Other Country', nameAr: 'دولة أخرى', dial: '', flag: '🌐' }
];

const ALL_DIAL_CODES = [
  ...GCC_COUNTRIES,
  ...OTHER_COUNTRIES,
  { code: 'OTHER', name: 'Other (Enter Code)', nameAr: 'رمز آخر', dial: '+', flag: '🌐' }
];

// ── Types ─────────────────────────────────────────────────────────
type WizardStep = 'contact' | 'residency' | 'digitalId' | 'result';
type ResultKey = 'resident' | 'nonresident-id' | 'nonresident-noid';

interface ContactData {
  fullName: string;
  email: string;
  dialCode: string;
  manualDialCode: string;
  phoneNumber: string;
  citizenship: string;
  manualCitizenship: string;
  consent: boolean;
}

// ── Dictionary for complete Bilingual Support ─────────────────────────
const dict = {
  ar: {
    eyebrow: 'الأهلية والخطوات التالية',
    title: 'اكتشف مسارك نحو التملك',
    subhead: '3 أسئلة سريعة · حوالي دقيقتين · روابط رسمية حكومية مدرجة',
    footerDisclaimer: 'هذا الدليل مقدم لمساعدتك في فهم عملية التملك. يتم تشغيل الخطوات الرسمية من قبل الهيئة العامة للعقار عبر بوابة العقارات السعودية.',
    trustLabel: 'الخدمات الحكومية السعودية الرسمية',
    stepLabels: ['بياناتك الشخصية', 'موقعك الحالي', 'حالة الهوية الرقمية'],
    yourNextSteps: 'خطواتك التالية',
    back: 'السابق',
    startOver: 'البدء من جديد',
    consentText: 'أوافق على الاتصال بي من قبل فريق العمل بشأن تملك العقارات في المملكة العربية السعودية، وأقبل الشروط والأحكام وسياسة الخصوصية لمعالجة بياناتي الشخصية.',
    fullName: 'الاسم الكامل',
    fullNamePlaceholder: 'مثال: خالد منصور',
    emailLabel: 'البريد الإلكتروني',
    phoneLabel: 'الهاتف / واتساب',
    citizenshipLabel: 'الجنسية / المواطنة',
    citizenshipSelect: 'اختر بلد الجنسية',
    otherCitizenshipLabel: 'يرجى تحديد بلد الجنسية',
    otherDialCodeLabel: 'رمز الدولة (مثال: +353)',
    continue: 'متابعة',
    step1Title: 'لنبدأ ببياناتك الشخصية',
    step1Subtitle: 'حتى يتمكن فريقنا من متابعتك بتوجيهات مخصصة لحالتك. يستغرق الأمر لحظة فقط.',
    validationName: 'الرجاء إدخال الاسم الكامل (ثلاثة أحرف على الأقل)',
    validationEmail: 'الرجاء إدخال بريد إلكتروني صحيح',
    validationPhone: 'الرجاء إدخال رقم هاتف صحيح',
    validationCitizenship: 'الرجاء اختيار الجنسية',
    validationConsent: 'يجب الموافقة على الشروط للمتابعة',
    validationOtherCitizenship: 'يرجى كتابة اسم بلد الجنسية',
    validationOtherDialCode: 'يرجى إدخال رمز اتصال دولي صالح يبدأ بـ +',
    step2Title: 'أين تقيم حالياً؟',
    step2Subtitle: 'يحدد هذا كيفية التحقق من هويتك لدى السلطات السعودية.',
    resOutsideLabel: 'خارج المملكة',
    resOutsideBody: 'غير سعودي يقيم في الخارج، بدون إقامة حالية داخل المملكة العربية السعودية.',
    resInsideLabel: 'داخل المملكة العربية السعودية',
    resInsideBody: 'غير سعودي يحمل إقامة عادية أو مميزة، أو مواطن خليجي أو دبلوماسي داخل المملكة.',
    step3Title: 'هل لديك هوية رقمية سعودية بالفعل؟',
    step3Subtitle: 'الهوية الرقمية (الصادرة عبر نفاذ / أبشر) هي ما يتيح لك تسجيل الدخول وإتمام عملية الشراء عبر الإنترنت.',
    idYesLabel: 'نعم، لدي واحدة',
    idYesBody: 'تم إصدار رقم هوية رقمية سعودية لي بالفعل.',
    idNoLabel: 'ليس بعد',
    idNoBody: 'لا زلت بحاجة للتقدم بطلب للحصول على هوية رقمية سعودية.',
    resultResidentHeadline: 'التسجيل في بوابة العقار السعودية',
    resultResidentSubtext: 'بصفتك مقيماً داخل المملكة، يمكنك التسجيل والتحقق فوراً باستخدام رقم الإقامة الخاص بك من خلال نفاذ.',
    resultResidentSteps: [
      'افتح صفحة "تسجيل حساب جديد".',
      'اختر "فرد"، ثم "مستفيد فرد". قم بتسجيل الدخول عبر نفاذ باستخدام رقم الإقامة الخاص بك.',
      'تصفح مشاريعنا وحدد العقارات المفضلة التي تبحث عنها.',
      'اتصل بنا — نرافقك من الخطوة الأولى وحتى إتمام الصفقة.'
    ],
    resultResidentTags: ['فرد', 'مقيم'],
    resultResidentCtaTagline: 'هنا في قلب المملكة',
    resultNonResIdHeadline: 'التسجيل في بوابة العقار السعودية',
    resultNonResIdSubtext: 'لديك هوية رقمية بالفعل، لذا فأنت مستعد لإعداد حسابك والبدء في عرض العقارات من خلال القنوات المرخصة.',
    resultNonResIdSteps: [
      'قم بتثبيت تطبيق نفاذ على هاتفك وسجل الدخول باستخدام هويتك الرقمية الحالية.',
      'افتح صفحة "تسجيل حساب جديد"، واختر "فرد" ثم "مستفيد فرد"، وأدخل رقم هويتك الرقمية.',
      'تصفح مشاريعنا وحدد العقارات المفضلة التي تبحث عنها.',
      'اتصل بنا — نرافقك من الخطوة الأولى وحتى إتمام الصفقة.'
    ],
    resultNonResIdTags: ['فرد', 'غير مقيم', 'هوية رقمية جاهزة'],
    resultNonResIdCtaTagline: 'معك في كل خطوة',
    resultNonResNoIdHeadline: 'إصدار هويتك الرقمية السعودية',
    resultNonResNoIdSubtext: 'قبل أن تتمكن من التسجيل في البوابة، ستقوم بإعداد هوية رقمية سعودية من الخارج. إليك التسلسل الكامل مع الروابط الرسمية لكل مرحلة.',
    resultNonResNoIdSteps: [
      'أنشئ حساباً على بوابة وزارة الخارجية، وأدخل بياناتك ومستنداتك واحجز موعداً في البعثة السعودية القريبة منك.',
      'احضر موعدك في الممثلية السعودية بالخارج، وقدم المستندات المطلوبة وأكمل تسجيل بياناتك الحيوية.',
      'بمجرد مراجعة طلبك والموافقة عليه، سيتم إخطارك بإصدار هويتك الرقمية.',
      'اطلب شريحة eSIM من أحد مقدمي خدمات الاتصالات السعوديين المعتمدين لتكون بحوزتك رقم سعودي أثناء وجودك في الخارج.',
      'افتح تطبيق نفاذ واستخدمه لتفعيل شريحة eSIM التي أصدرتها للتو.',
      'سجل الدخول إلى منصة أبشر لتشغيل هويتك الرقمية. بمجرد تنشيطها، تصبح جاهزاً للتسجيل في بوابة العقارات.'
    ],
    resultNonResNoIdTags: ['فرد', 'غير مقيم', 'بحاجة لهوية رقمية'],
    resultNonResNoIdCtaTagline: 'سنقوم بإرشادك طوال العملية',
    heavyLiftingTitle: 'دعنا نقوم بالعمل الشاق بالنيابة عنك',
    heavyLiftingBody: 'يمكن لفريقنا إعداد القوائم المختصرة للعقارات، والتنسيق مع الوسطاء المرخصين، ومرافقتك في كل خطوة حكومية.',
    talkToSpecialist: 'تحدث مع مستشارنا'
  },
  en: {
    eyebrow: 'Eligibility & Next Steps',
    title: 'Find your path to ownership',
    subhead: '3 quick questions · about 2 minutes · official government links included',
    footerDisclaimer: 'This guide is provided to help you understand the ownership process. Official steps are operated by the Real Estate General Authority (REGA) via the Saudi Properties portal.',
    trustLabel: 'Official Saudi Government Services',
    stepLabels: ['YOUR DETAILS', 'YOUR LOCATION', 'IDENTITY STATUS'],
    yourNextSteps: 'YOUR NEXT STEPS',
    back: 'Back',
    startOver: 'Start Over',
    consentText: 'I agree to be contacted by our team about property ownership in Saudi Arabia, and I accept the Terms & Conditions and Privacy Policy for processing my personal data.',
    fullName: 'Full Name',
    fullNamePlaceholder: 'e.g. Khalid Mansour',
    emailLabel: 'Email Address',
    phoneLabel: 'Phone / WhatsApp',
    citizenshipLabel: 'Citizenship',
    citizenshipSelect: 'Select your country of citizenship',
    otherCitizenshipLabel: 'Please specify citizenship',
    otherDialCodeLabel: 'Dial code (e.g. +353)',
    continue: 'Continue',
    step1Title: "Let's start with your details",
    step1Subtitle: 'So our team can follow up with guidance tailored to your situation. It only takes a moment.',
    validationName: 'Please enter your full name (at least 3 characters)',
    validationEmail: 'Please enter a valid email address',
    validationPhone: 'Please enter a valid phone number',
    validationCitizenship: 'Please select your citizenship',
    validationConsent: 'You must accept to continue',
    validationOtherCitizenship: 'Please enter your country of citizenship',
    validationOtherDialCode: 'Please enter a valid dial code starting with +',
    step2Title: 'Where are you based right now?',
    step2Subtitle: 'This determines how you\'ll verify your identity with the Saudi authorities.',
    resOutsideLabel: 'Outside the Kingdom',
    resOutsideBody: 'A non-Saudi living abroad, with no current residency inside Saudi Arabia.',
    resInsideLabel: 'Inside Saudi Arabia',
    resInsideBody: 'A non-Saudi holding standard or premium residency, or a Gulf national or diplomat inside the Kingdom.',
    step3Title: 'Do you already have a Saudi digital identity?',
    step3Subtitle: 'A digital identity (issued via Nafath / Absher) is what lets you sign in and complete the purchase online.',
    idYesLabel: 'Yes, I have one',
    idYesBody: 'I\'ve already been issued a Saudi digital identity number.',
    idNoLabel: 'Not yet',
    idNoBody: 'I still need to apply for a Saudi digital identity.',
    resultResidentHeadline: 'Register on the Saudi Real Estate Portal',
    resultResidentSubtext: 'As a resident inside the Kingdom, you can register and verify straight away using your residency number through Nafath.',
    resultResidentSteps: [
      'Open Register New Account.',
      'Select Individual, then Individual Beneficiary. Sign in through Nafath using your residency (Iqama) number.',
      'Browse our project listings and shortlist what you\'re looking for.',
      'Contact us — we take it from step 1 all the way to closing the deal.'
    ],
    resultResidentTags: ['Individual', 'Resident'],
    resultResidentCtaTagline: 'Right here in the Kingdom',
    resultNonResIdHeadline: 'Register on the Saudi Real Estate Portal',
    resultNonResIdSubtext: 'You already have a digital identity, so you\'re ready to set up your account and start viewing properties through licensed channels.',
    resultNonResIdSteps: [
      'Install the Nafath app on your phone and sign in with your existing digital identity.',
      'Open Register New Account, select Individual then Individual Beneficiary, and enter your digital identity number.',
      'Browse our project listings and shortlist what you\'re looking for.',
      'Contact us — we take it from step 1 all the way to closing the deal.'
    ],
    resultNonResIdTags: ['Individual', 'Non-resident', 'Digital ID ready'],
    resultNonResIdCtaTagline: 'With you every step',
    resultNonResNoIdHeadline: 'Issue your Saudi digital identity',
    resultNonResNoIdSubtext: 'Before you can register on the portal, you\'ll set up a Saudi digital identity from abroad. Here\'s the full sequence, with the official guides for each stage.',
    resultNonResNoIdSteps: [
      'Create an account on the Ministry of Foreign Affairs portal, enter your details and documents, and book an appointment at a Saudi mission near you.',
      'Attend your appointment at the Saudi representation abroad, hand in the required documents, and complete your biometric registration.',
      'Once your application is reviewed and approved, you\'ll be notified that your digital identity has been issued.',
      'Order an eSIM from one of the approved Saudi telecom providers so you have a Saudi number while still abroad.',
      'Open the Nafath app and use it to activate the eSIM you just issued.',
      'Sign in to the Absher platform to switch on your digital identity. Once active, you\'re ready to register on the Real Estate Portal.'
    ],
    resultNonResNoIdTags: ['Individual', 'Non-resident', 'Needs digital ID'],
    resultNonResNoIdCtaTagline: 'We\'ll guide you through it',
    heavyLiftingTitle: 'Let us handle the heavy lifting',
    heavyLiftingBody: 'Our team can shortlist properties, coordinate with licensed brokers, and walk you through every government step.',
    talkToSpecialist: 'Talk to a specialist'
  }
};

// ── Dial Code Picker ───────────────────────────────────────────────
function DialCodePicker({
  value,
  onChange,
  manualValue,
  onManualChange,
  isAr
}: {
  value: string;
  onChange: (v: string) => void;
  manualValue: string;
  onManualChange: (v: string) => void;
  isAr: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const filtered = search
    ? ALL_DIAL_CODES.filter(c =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.nameAr.includes(search) ||
      c.dial.includes(search)
    )
    : null;

  const selected = ALL_DIAL_CODES.find(c => c.dial === value) || ALL_DIAL_CODES[0];

  return (
    <div ref={ref} className="relative flex">
      {value === '+' ? (
        <div className="flex gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => { onChange('+966'); setOpen(false); }}
            className="flex items-center justify-center w-12 h-12 border border-[#d4c5a9] rounded-l-xl bg-[#faf8f4] hover:bg-[#f5f0e8] transition-colors"
          >
            <RotateCcw className="w-4 h-4 text-[#8a6d4b]" />
          </button>
          <input
            type="text"
            placeholder="+353"
            value={manualValue}
            onChange={e => onManualChange(e.target.value.replace(/[^0-9+]/g, ''))}
            className="w-20 h-12 px-2 border-y border-r border-[#d4c5a9] bg-[#faf8f4] text-sm text-[#3d2c1e] text-center font-bold focus:outline-none focus:border-[#b8975a]"
          />
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(o => !o)}
          className="flex items-center gap-1.5 h-12 px-3 border border-[#d4c5a9] rounded-l-xl bg-[#faf8f4] hover:bg-[#f5f0e8] transition-colors text-sm font-medium text-[#3d2c1e] whitespace-nowrap"
        >
          <span className="text-base">{selected.flag}</span>
          <span className="text-[#8a6d4b]">{selected.dial}</span>
          <ChevronDown className="w-3.5 h-3.5 text-[#8a6d4b]" />
        </button>
      )}

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.97 }}
            transition={{ duration: 0.15 }}
            className="absolute top-full left-0 z-50 mt-1 w-72 bg-white border border-[#e8ddd0] rounded-2xl shadow-2xl overflow-hidden"
          >
            <div className="p-2 border-b border-[#e8ddd0]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#8a6d4b]" />
                <input
                  autoFocus
                  type="text"
                  placeholder={isAr ? 'البحث عن دولة…' : 'Search country…'}
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 text-sm bg-[#faf8f4] border border-[#d4c5a9] rounded-xl outline-none focus:border-[#b8975a]"
                />
              </div>
            </div>
            <div className="max-h-56 overflow-y-auto">
              {!filtered && (
                <>
                  <div className="px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-[#8a6d4b]">GCC</div>
                  {GCC_COUNTRIES.map(c => (
                    <button key={c.code} type="button"
                      onClick={() => { onChange(c.dial); setOpen(false); setSearch(''); }}
                      className={`w-full flex items-center gap-3 px-3 py-2 text-sm hover:bg-[#faf8f4] transition-colors text-left ${c.dial === value ? 'bg-[#fdf6ec]' : ''}`}
                    >
                      <span className="text-base">{c.flag}</span>
                      <span className="flex-1 truncate">{isAr ? c.nameAr : c.name}</span>
                      <span className="text-[#8a6d4b] font-medium">{c.dial}</span>
                    </button>
                  ))}
                  <div className="border-t border-[#e8ddd0] my-1" />
                  {OTHER_COUNTRIES.map(c => (
                    <button key={c.code} type="button"
                      onClick={() => { onChange(c.dial); setOpen(false); setSearch(''); }}
                      className={`w-full flex items-center gap-3 px-3 py-2 text-sm hover:bg-[#faf8f4] transition-colors text-left ${c.dial === value ? 'bg-[#fdf6ec]' : ''}`}
                    >
                      <span className="text-base">{c.flag}</span>
                      <span className="flex-1 truncate">{isAr ? c.nameAr : c.name}</span>
                      <span className="text-[#8a6d4b] font-medium">{c.dial}</span>
                    </button>
                  ))}
                  <div className="border-t border-[#e8ddd0] my-1" />
                  <button type="button"
                    onClick={() => { onChange('+'); setOpen(false); setSearch(''); }}
                    className="w-full flex items-center gap-3 px-3 py-2.5 text-sm font-bold hover:bg-[#faf8f4] text-left transition-colors text-[#b8975a]"
                  >
                    <span className="text-base">🌐</span>
                    <span className="flex-1">{isAr ? 'أخرى (إدخال يدوي للرمز)' : 'Other (Enter code manually)'}</span>
                  </button>
                </>
              )}
              {filtered && filtered.map(c => (
                <button key={c.code} type="button"
                  onClick={() => { onChange(c.dial); setOpen(false); setSearch(''); }}
                  className={`w-full flex items-center gap-3 px-3 py-2 text-sm hover:bg-[#faf8f4] transition-colors text-left ${c.dial === value ? 'bg-[#fdf6ec]' : ''}`}
                >
                  <span className="text-base">{c.flag}</span>
                  <span className="flex-1 truncate">{isAr ? c.nameAr : c.name}</span>
                  <span className="text-[#8a6d4b] font-medium">{c.dial}</span>
                </button>
              ))}
              {filtered && filtered.length === 0 && (
                <p className="text-center py-6 text-sm text-[#8a6d4b]">No results</p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Progress Stepper ───────────────────────────────────────────────
function ProgressStepper({ currentStep, hasResult, isAr }: { currentStep: number; hasResult: boolean; isAr: boolean }) {
  const steps = dict[isAr ? 'ar' : 'en'].stepLabels;
  return (
    <div className="px-6 pt-8 pb-0">
      <div className={`flex items-center justify-center gap-0 max-w-xs mx-auto ${isAr ? 'flex-row-reverse' : ''}`}>
        {[1, 2, 3].map((n, i) => {
          const done = n < currentStep || hasResult;
          const active = n === currentStep && !hasResult;
          return (
            <div key={n} className={`flex items-center ${isAr ? 'flex-row-reverse' : ''}`}>
              <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-all duration-500 ${done ? 'bg-[#b8975a] border-[#b8975a] text-white' :
                  active ? 'bg-[#1a1a1a] border-[#1a1a1a] text-white' :
                    'bg-white border-[#d4c5a9] text-[#a0887a]'
                }`}>
                {done ? <CheckCircle className="w-4.5 h-4.5" /> : n}
              </div>
              {i < 2 && (
                <div className={`h-0.5 w-14 sm:w-20 transition-all duration-700 ${n < currentStep || (hasResult && n < 3) ? 'bg-[#b8975a]' : 'bg-[#d4c5a9]'}`} />
              )}
            </div>
          );
        })}
      </div>
      <p className="text-center text-[10px] font-black uppercase tracking-[0.18em] text-[#8a6d4b] mt-3 pb-6">
        {hasResult ? dict[isAr ? 'ar' : 'en'].yourNextSteps : steps[currentStep - 1] || ''}
      </p>
    </div>
  );
}

// ── Step 1: Contact Form ───────────────────────────────────────────
function ContactStep({
  onNext, loading, initialData, isAr
}: {
  onNext: (data: ContactData) => Promise<void>;
  loading: boolean;
  initialData?: ContactData;
  isAr: boolean;
}) {
  const t = dict[isAr ? 'ar' : 'en'];
  const locale = useLocale();
  const [form, setForm] = useState<ContactData>(initialData || {
    fullName: '', email: '', dialCode: '+966', manualDialCode: '', phoneNumber: '', citizenship: '', manualCitizenship: '', consent: false,
  });
  const [errors, setErrors] = useState<Partial<Record<keyof ContactData, string>>>({});
  const [citizenshipSearch, setCitizenshipSearch] = useState('');
  const [citizenshipOpen, setCitizenshipOpen] = useState(false);
  const citizenRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (citizenRef.current && !citizenRef.current.contains(e.target as Node)) setCitizenshipOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  function validate(): boolean {
    const e: Partial<Record<keyof ContactData, string>> = {};
    if (!form.fullName.trim() || form.fullName.trim().length < 3) e.fullName = t.validationName;
    if (!form.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = t.validationEmail;

    // Phone validation using libphonenumber-js
    const phoneVal = form.phoneNumber.trim();
    if (!phoneVal) {
      e.phoneNumber = t.validationPhone;
    } else if (form.dialCode === '+') {
      // Manual mode validation
      const manualPrefix = form.manualDialCode.trim();
      if (!manualPrefix.startsWith('+') || manualPrefix.length < 2) {
        e.manualDialCode = t.validationOtherDialCode;
      }
      if (phoneVal.length < 5) {
        e.phoneNumber = t.validationPhone;
      }
    } else {
      // Standard picker validation
      const activeCountry = ALL_DIAL_CODES.find(c => c.dial === form.dialCode);
      if (activeCountry) {
        const parsed = parsePhoneNumberFromString(phoneVal, activeCountry.code as CountryCode);
        if (!parsed || !parsed.isValid()) {
          e.phoneNumber = isAr
            ? `رقم الهاتف غير صالح لـ ${activeCountry.nameAr}`
            : `Invalid phone number for ${activeCountry.name}`;
        }
      }
    }

    if (!form.citizenship) {
      e.citizenship = t.validationCitizenship;
    } else if (form.citizenship === 'OTHER' && !form.manualCitizenship.trim()) {
      e.manualCitizenship = t.validationOtherCitizenship;
    }

    if (!form.consent) e.consent = t.validationConsent;

    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    await onNext(form);
  }

  const filteredCitizenship = citizenshipSearch
    ? ALL_CITIZENSHIP.filter(c => c.name.toLowerCase().includes(citizenshipSearch.toLowerCase()) || c.nameAr.includes(citizenshipSearch))
    : ALL_CITIZENSHIP;

  const selectedCitizenship = ALL_CITIZENSHIP.find(c => c.code === form.citizenship);

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }} transition={{ duration: 0.35 }}>
      <form onSubmit={handleSubmit} className="px-6 sm:px-10 pb-10 pt-8 space-y-5" dir={isAr ? 'rtl' : 'ltr'}>
        <div className="text-center space-y-2 mb-8">
          <h2 className="text-2xl sm:text-3xl font-bold text-[#1a1209]" style={{ fontFamily: 'var(--font-playfair, Georgia, serif)' }}>
            {t.step1Title}
          </h2>
          <p className="text-[#6b5744] text-sm sm:text-base max-w-sm mx-auto">
            {t.step1Subtitle}
          </p>
        </div>

        {/* Full Name */}
        <div className="text-right sm:text-left">
          <label className="block text-[11px] font-black uppercase tracking-widest text-[#3d2c1e] mb-2 text-inherit">
            {t.fullName} <span className="text-[#b8975a]">*</span>
          </label>
          <input
            type="text"
            placeholder={t.fullNamePlaceholder}
            value={form.fullName}
            onChange={e => setForm(f => ({ ...f, fullName: e.target.value }))}
            className={`w-full h-12 px-4 rounded-xl border ${errors.fullName ? 'border-red-400 bg-red-50' : 'border-[#d4c5a9] bg-[#faf8f4]'} text-[#1a1209] placeholder:text-[#b0997e] focus:outline-none focus:border-[#b8975a] focus:ring-2 focus:ring-[#b8975a]/15 transition-all ${isAr ? 'text-right' : 'text-left'}`}
            id="wizard-full-name"
          />
          {errors.fullName && <p className="text-red-500 text-xs mt-1">{errors.fullName}</p>}
        </div>

        {/* Email */}
        <div className="text-right sm:text-left">
          <label className="block text-[11px] font-black uppercase tracking-widest text-[#3d2c1e] mb-2 text-inherit">
            {t.emailLabel} <span className="text-[#b8975a]">*</span>
          </label>
          <input
            type="email"
            placeholder="you@example.com"
            value={form.email}
            onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
            className={`w-full h-12 px-4 rounded-xl border ${errors.email ? 'border-red-400 bg-red-50' : 'border-[#d4c5a9] bg-[#faf8f4]'} text-[#1a1209] placeholder:text-[#b0997e] focus:outline-none focus:border-[#b8975a] focus:ring-2 focus:ring-[#b8975a]/15 transition-all text-left dir-ltr`}
            id="wizard-email"
          />
          {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
        </div>

        {/* Phone */}
        <div className="text-right sm:text-left">
          <label className="block text-[11px] font-black uppercase tracking-widest text-[#3d2c1e] mb-2 text-inherit">
            {t.phoneLabel} <span className="text-[#b8975a]">*</span>
          </label>
          <div className={`flex ${isAr ? 'flex-row-reverse' : 'flex-row'}`}>
            <DialCodePicker
              value={form.dialCode}
              onChange={v => setForm(f => ({ ...f, dialCode: v }))}
              manualValue={form.manualDialCode}
              onManualChange={v => setForm(f => ({ ...f, manualDialCode: v }))}
              isAr={isAr}
            />
            <input
              type="tel"
              placeholder="5X XXX XXXX"
              value={form.phoneNumber}
              onChange={e => setForm(f => ({ ...f, phoneNumber: e.target.value.replace(/[^0-9]/g, '') }))}
              className={`flex-1 h-12 px-4 border-y border-[#d4c5a9] ${isAr ? 'rounded-l-xl border-l' : 'rounded-r-xl border-r'} ${errors.phoneNumber ? 'border-red-400 bg-red-50' : 'bg-[#faf8f4]'} text-[#1a1209] placeholder:text-[#b0997e] focus:outline-none focus:border-[#b8975a] focus:ring-2 focus:ring-[#b8975a]/15 transition-all text-left dir-ltr`}
              id="wizard-phone"
            />
          </div>
          {errors.manualDialCode && <p className="text-red-500 text-xs mt-1">{errors.manualDialCode}</p>}
          {errors.phoneNumber && <p className="text-red-500 text-xs mt-1">{errors.phoneNumber}</p>}
        </div>

        {/* Citizenship */}
        <div ref={citizenRef} className="text-right sm:text-left">
          <label className="block text-[11px] font-black uppercase tracking-widest text-[#3d2c1e] mb-2 text-inherit">
            {t.citizenshipLabel} <span className="text-[#b8975a]">*</span>
          </label>
          <div className="relative">
            <button
              type="button"
              onClick={() => setCitizenshipOpen(o => !o)}
              className={`w-full h-12 px-4 rounded-xl border ${errors.citizenship ? 'border-red-400 bg-red-50' : 'border-[#d4c5a9] bg-[#faf8f4]'} text-sm flex items-center justify-between gap-2 focus:outline-none focus:border-[#b8975a] focus:ring-2 focus:ring-[#b8975a]/15 transition-all ${isAr ? 'flex-row-reverse text-right' : 'text-left'}`}
              id="wizard-citizenship"
            >
              <span className={selectedCitizenship ? 'text-[#1a1209]' : 'text-[#b0997e]'}>
                {selectedCitizenship ? `${selectedCitizenship.flag} ${isAr ? selectedCitizenship.nameAr : selectedCitizenship.name}` : t.citizenshipSelect}
              </span>
              <ChevronDown className={`w-4 h-4 text-[#8a6d4b] transition-transform ${citizenshipOpen ? 'rotate-180' : ''}`} />
            </button>

            <AnimatePresence>
              {citizenshipOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 6 }}
                  className="absolute top-full left-0 right-0 z-50 mt-1 bg-white border border-[#e8ddd0] rounded-2xl shadow-2xl overflow-hidden"
                >
                  <div className="p-2 border-b border-[#e8ddd0]">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#8a6d4b]" />
                      <input autoFocus type="text" placeholder={isAr ? 'البحث عن بلد…' : 'Search country…'} value={citizenshipSearch}
                        onChange={e => setCitizenshipSearch(e.target.value)}
                        className="w-full pl-8 pr-3 py-2 text-sm bg-[#faf8f4] border border-[#d4c5a9] rounded-xl outline-none focus:border-[#b8975a]"
                      />
                    </div>
                  </div>
                  <div className="max-h-52 overflow-y-auto">
                    {!citizenshipSearch && <div className="px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-[#8a6d4b]">{isAr ? 'دول الخليج' : 'GCC'}</div>}
                    {filteredCitizenship.map(c => (
                      <button key={c.code} type="button"
                        onClick={() => { setForm(f => ({ ...f, citizenship: c.code })); setCitizenshipOpen(false); setCitizenshipSearch(''); }}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm hover:bg-[#faf8f4] transition-colors ${isAr ? 'flex-row-reverse text-right' : 'text-left'} ${form.citizenship === c.code ? 'bg-[#fdf6ec]' : ''}`}
                      >
                        <span className="text-base">{c.flag}</span>
                        <span>{isAr ? c.nameAr : c.name}</span>
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          {errors.citizenship && <p className="text-red-500 text-xs mt-1">{errors.citizenship}</p>}
        </div>

        {/* Custom Citizenship Input */}
        {form.citizenship === 'OTHER' && (
          <div className="text-right sm:text-left">
            <label className="block text-[11px] font-black uppercase tracking-widest text-[#3d2c1e] mb-2 text-inherit">
              {t.otherCitizenshipLabel} <span className="text-[#b8975a]">*</span>
            </label>
            <input
              type="text"
              placeholder={isAr ? 'مثال: أيرلندا' : 'e.g. Ireland'}
              value={form.manualCitizenship}
              onChange={e => setForm(f => ({ ...f, manualCitizenship: e.target.value }))}
              className={`w-full h-12 px-4 rounded-xl border ${errors.manualCitizenship ? 'border-red-400 bg-red-50' : 'border-[#d4c5a9] bg-[#faf8f4]'} text-[#1a1209] focus:outline-none focus:border-[#b8975a] focus:ring-2 focus:ring-[#b8975a]/15 transition-all ${isAr ? 'text-right' : 'text-left'}`}
            />
            {errors.manualCitizenship && <p className="text-red-500 text-xs mt-1">{errors.manualCitizenship}</p>}
          </div>
        )}

        {/* Consent */}
        <div>
          <label className={`flex items-start gap-3 cursor-pointer group ${isAr ? 'flex-row-reverse text-right' : 'text-left'} ${errors.consent ? 'text-red-500' : ''}`}>
            <div className="relative mt-0.5 shrink-0">
              <input
                type="checkbox"
                checked={form.consent}
                onChange={e => setForm(f => ({ ...f, consent: e.target.checked }))}
                className="sr-only"
                id="wizard-consent"
              />
              <div
                onClick={() => setForm(f => ({ ...f, consent: !f.consent }))}
                className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${form.consent ? 'bg-[#b8975a] border-[#b8975a]' : errors.consent ? 'border-red-400' : 'border-[#d4c5a9] group-hover:border-[#b8975a]'}`}
              >
                {form.consent && <CheckCircle className="w-3 h-3 text-white" />}
              </div>
            </div>
            <span className="text-xs text-[#6b5744] leading-relaxed">
              {isAr ? (
                <>
                  أوافق على الاتصال بي من قبل فريق العمل بشأن تملك العقارات في المملكة العربية السعودية، وأقبل{' '}
                  <Link href={`/${locale}/legal/terms-conditions`} className="text-[#b8975a] underline hover:text-[#c9a96a]">الشروط والأحكام</Link>{' '}
                  و{' '}
                  <Link href={`/${locale}/legal/privacy-policy`} className="text-[#b8975a] underline hover:text-[#c9a96a]">سياسة الخصوصية</Link>{' '}
                  لمعالجة بياناتي الشخصية.
                </>
              ) : (
                <>
                  I agree to be contacted by our team about property ownership in Saudi Arabia, and I accept the{' '}
                  <Link href={`/${locale}/legal/terms-conditions`} className="text-[#b8975a] underline hover:text-[#c9a96a]">Terms &amp; Conditions</Link>{' '}
                  and{' '}
                  <Link href={`/${locale}/legal/privacy-policy`} className="text-[#b8975a] underline hover:text-[#c9a96a]">Privacy Policy</Link>{' '}
                  for processing my personal data.
                </>
              )}
            </span>
          </label>
          {errors.consent && <p className="text-red-500 text-xs mt-1">{errors.consent}</p>}
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full h-13 py-3.5 rounded-xl bg-[#1a1209] text-white font-bold text-sm tracking-wide hover:bg-[#2d1f10] disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-300 flex items-center justify-center gap-2 group shadow-lg"
          id="wizard-continue-btn"
        >
          {loading ? (
            <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <div className={`flex items-center gap-2 ${isAr ? 'flex-row-reverse' : ''}`}>
              <span>{t.continue}</span>
              <ArrowRight className={`w-4 h-4 transition-transform ${isAr ? 'rotate-180 group-hover:-translate-x-1' : 'group-hover:translate-x-1'}`} />
            </div>
          )}
        </button>
      </form>
    </motion.div>
  );
}

// ── Step 2: Residency ──────────────────────────────────────────────
function ResidencyStep({
  onSelect, onBack, isAr
}: {
  onSelect: (v: 'outside' | 'inside') => void;
  onBack: () => void;
  isAr: boolean;
}) {
  const t = dict[isAr ? 'ar' : 'en'];
  const [selected, setSelected] = useState<string | null>(null);

  function handleSelect(v: 'outside' | 'inside') {
    setSelected(v);
    setTimeout(() => onSelect(v), 220);
  }

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }} transition={{ duration: 0.35 }}>
      <div className="px-6 sm:px-10 pb-10 pt-8 space-y-8" dir={isAr ? 'rtl' : 'ltr'}>
        <div className="text-center space-y-2">
          <h2 className="text-2xl sm:text-3xl font-bold text-[#1a1209]" style={{ fontFamily: 'var(--font-playfair, Georgia, serif)' }}>
            {t.step2Title}
          </h2>
          <p className="text-[#6b5744] text-sm sm:text-base max-w-sm mx-auto">
            {t.step2Subtitle}
          </p>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          {[
            { value: 'outside' as const, label: t.resOutsideLabel, body: t.resOutsideBody, icon: Globe },
            { value: 'inside' as const, label: t.resInsideLabel, body: t.resInsideBody, icon: Home },
          ].map(card => {
            const Icon = card.icon;
            const isSelected = selected === card.value;
            return (
              <button
                key={card.value}
                type="button"
                onClick={() => handleSelect(card.value)}
                className={`group text-right p-6 rounded-2xl border-2 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg focus:outline-none ${isAr ? 'text-right' : 'text-left'} ${isSelected
                    ? 'border-[#b8975a] bg-[#fdf6ec] shadow-lg shadow-[#b8975a]/10'
                    : 'border-[#d4c5a9] bg-[#faf8f4] hover:border-[#b8975a]/60 hover:bg-[#fdf8f2]'
                  }`}
                id={`wizard-residency-${card.value}`}
              >
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 transition-colors ${isAr ? 'mr-0 ml-auto' : 'ml-0 mr-auto'} ${isSelected ? 'bg-[#b8975a]/20' : 'bg-white group-hover:bg-[#b8975a]/10'}`}>
                  <Icon className={`w-5 h-5 ${isSelected ? 'text-[#b8975a]' : 'text-[#8a6d4b] group-hover:text-[#b8975a]'}`} />
                </div>
                <h3 className="font-bold text-[#1a1209] text-base mb-2">{card.label}</h3>
                <p className="text-[#6b5744] text-sm leading-relaxed">{card.body}</p>
              </button>
            );
          })}
        </div>

        <button onClick={onBack} className={`flex items-center gap-2 text-sm text-[#8a6d4b] hover:text-[#b8975a] transition-colors font-medium ${isAr ? 'flex-row-reverse' : ''}`}>
          <ArrowLeft className={`w-3.5 h-3.5 ${isAr ? 'rotate-180' : ''}`} />
          {t.back}
        </button>
      </div>
    </motion.div>
  );
}

// ── Step 3: Digital ID ─────────────────────────────────────────────
function DigitalIdStep({
  onSelect, onBack, isAr
}: {
  onSelect: (v: 'yes' | 'no') => void;
  onBack: () => void;
  isAr: boolean;
}) {
  const t = dict[isAr ? 'ar' : 'en'];
  const [selected, setSelected] = useState<string | null>(null);

  function handleSelect(v: 'yes' | 'no') {
    setSelected(v);
    setTimeout(() => onSelect(v), 220);
  }

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }} transition={{ duration: 0.35 }}>
      <div className="px-6 sm:px-10 pb-10 pt-8 space-y-8" dir={isAr ? 'rtl' : 'ltr'}>
        <div className="text-center space-y-2">
          <h2 className="text-2xl sm:text-3xl font-bold text-[#1a1209]" style={{ fontFamily: 'var(--font-playfair, Georgia, serif)' }}>
            {t.step3Title}
          </h2>
          <p className="text-[#6b5744] text-sm sm:text-base max-w-sm mx-auto">
            {t.step3Subtitle}
          </p>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          {[
            { value: 'yes' as const, label: t.idYesLabel, body: t.idYesBody },
            { value: 'no' as const, label: t.idNoLabel, body: t.idNoBody },
          ].map(card => {
            const isSelected = selected === card.value;
            return (
              <button
                key={card.value}
                type="button"
                onClick={() => handleSelect(card.value)}
                className={`group text-right p-6 rounded-2xl border-2 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg focus:outline-none ${isAr ? 'text-right' : 'text-left'} ${isSelected
                    ? 'border-[#b8975a] bg-[#fdf6ec] shadow-lg shadow-[#b8975a]/10'
                    : 'border-[#d4c5a9] bg-[#faf8f4] hover:border-[#b8975a]/60 hover:bg-[#fdf8f2]'
                  }`}
                id={`wizard-digital-id-${card.value}`}
              >
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 transition-colors ${isAr ? 'mr-0 ml-auto' : 'ml-0 mr-auto'} ${isSelected ? 'bg-[#b8975a]/20' : 'bg-white group-hover:bg-[#b8975a]/10'}`}>
                  <IdCard className={`w-5 h-5 ${isSelected ? 'text-[#b8975a]' : 'text-[#8a6d4b] group-hover:text-[#b8975a]'}`} />
                </div>
                <h3 className="font-bold text-[#1a1209] text-base mb-2">{card.label}</h3>
                <p className="text-[#6b5744] text-sm leading-relaxed">{card.body}</p>
              </button>
            );
          })}
        </div>

        <button onClick={onBack} className={`flex items-center gap-2 text-sm text-[#8a6d4b] hover:text-[#b8975a] transition-colors font-medium ${isAr ? 'flex-row-reverse' : ''}`}>
          <ArrowLeft className={`w-3.5 h-3.5 ${isAr ? 'rotate-180' : ''}`} />
          {t.back}
        </button>
      </div>
    </motion.div>
  );
}

// ── Result Panel ───────────────────────────────────────────────────
function ResultPanel({
  resultKey, locale, onStartOver, onBack, isAr
}: {
  resultKey: ResultKey;
  locale: string;
  onStartOver: () => void;
  onBack: () => void;
  isAr: boolean;
}) {
  const t = dict[isAr ? 'ar' : 'en'];

  const config = {
    resident: {
      headline: t.resultResidentHeadline,
      subtext: t.resultResidentSubtext,
      tags: t.resultResidentTags,
      steps: [
        { text: t.resultResidentSteps[0], link: 'https://saudiproperties.rega.gov.sa/auth/user-type', linkLabel: isAr ? 'تسجيل حساب جديد' : 'Register New Account' },
        { text: t.resultResidentSteps[1] },
        { text: t.resultResidentSteps[2], link: `/${locale}/projects`, linkLabel: isAr ? 'صفحة المشاريع' : 'projects page' },
        { text: t.resultResidentSteps[3] },
      ],
      ctaTagline: t.resultResidentCtaTagline,
    },
    'nonresident-id': {
      headline: t.resultNonResIdHeadline,
      subtext: t.resultNonResIdSubtext,
      tags: t.resultNonResIdTags,
      steps: [
        { text: t.resultNonResIdSteps[0] },
        { text: t.resultNonResIdSteps[1], link: 'https://saudiproperties.rega.gov.sa/auth/user-type', linkLabel: isAr ? 'تسجيل حساب جديد' : 'Register New Account' },
        { text: t.resultNonResIdSteps[2], link: `/${locale}/projects`, linkLabel: isAr ? 'صفحة المشاريع' : 'projects page' },
        { text: t.resultNonResIdSteps[3] },
      ],
      ctaTagline: t.resultNonResIdCtaTagline,
    },
    'nonresident-noid': {
      headline: t.resultNonResNoIdHeadline,
      subtext: t.resultNonResNoIdSubtext,
      tags: t.resultNonResNoIdTags,
      steps: [
        { text: t.resultNonResNoIdSteps[0], link: 'https://verify.mofa.gov.sa/', linkLabel: isAr ? 'بوابة وزارة الخارجية' : 'Ministry of Foreign Affairs portal' },
        { text: t.resultNonResNoIdSteps[1] },
        { text: t.resultNonResNoIdSteps[2] },
        { text: t.resultNonResNoIdSteps[3], link: 'https://www.cst.gov.sa/en/', linkLabel: isAr ? 'مقدمي خدمات الاتصالات السعوديين' : 'Saudi telecom providers' },
        { text: t.resultNonResNoIdSteps[4] },
        { text: t.resultNonResNoIdSteps[5], link: 'https://www.absher.sa/', linkLabel: isAr ? 'منصة أبشر' : 'Absher platform' },
      ],
      ctaTagline: t.resultNonResNoIdCtaTagline,
    },
  }[resultKey];

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.4 }}>
      <div className="px-6 sm:px-10 pb-10 pt-8 space-y-8" dir={isAr ? 'rtl' : 'ltr'}>
        {/* Header */}
        <div className="text-center space-y-3">
          <div className={`w-14 h-14 mx-auto rounded-2xl flex items-center justify-center ${resultKey === 'resident' || resultKey === 'nonresident-id' ? 'bg-emerald-100' : 'bg-[#b8975a]/15'}`}>
            {resultKey === 'resident' || resultKey === 'nonresident-id'
              ? <CheckCircle className="w-7 h-7 text-emerald-600" />
              : <IdCard className="w-7 h-7 text-[#b8975a]" />
            }
          </div>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#b8975a]">{t.yourNextSteps}</p>
          <h2 className="text-2xl sm:text-3xl font-bold text-[#1a1209] leading-tight font-serif" style={{ fontFamily: 'var(--font-playfair, Georgia, serif)' }}>
            {config.headline}
          </h2>
          <p className="text-[#6b5744] text-sm sm:text-base max-w-md mx-auto">{config.subtext}</p>
          {/* Tags */}
          <div className="flex flex-wrap justify-center gap-2 pt-1">
            {config.tags.map(tag => (
              <span key={tag} className="px-3 py-1 rounded-full border border-[#d4c5a9] text-[11px] font-bold text-[#6b5744] bg-[#faf8f4] uppercase tracking-wide">
                {tag}
              </span>
            ))}
          </div>
        </div>

        {/* Steps */}
        <div className="space-y-0">
          {config.steps.map((step, i) => (
            <div key={i} className={`flex gap-4 ${isAr ? 'flex-row-reverse' : ''}`}>
              <div className="flex flex-col items-center shrink-0">
                <div className="w-8 h-8 rounded-full bg-[#b8975a] flex items-center justify-center text-white text-xs font-black shrink-0">
                  {i + 1}
                </div>
                {i < config.steps.length - 1 && <div className="w-0.5 flex-1 bg-[#d4c5a9] my-1 min-h-[24px]" />}
              </div>
              <div className={`pb-6 ${isAr ? 'text-right' : 'text-left'}`}>
                <p className="text-[#3d2c1e] text-sm leading-relaxed pt-1">
                  {step.link ? (
                    <>
                      {step.text.split(step.linkLabel || '')[0]}
                      <a
                        href={step.link}
                        target={step.link.startsWith('http') ? '_blank' : '_self'}
                        rel={step.link.startsWith('http') ? 'noopener noreferrer' : undefined}
                        className="text-[#b8975a] font-semibold hover:underline inline-flex items-center gap-1"
                      >
                        {step.linkLabel || step.link}
                        {step.link.startsWith('http') && <ExternalLink className="w-3 h-3" />}
                      </a>
                      {step.text.split(step.linkLabel || '').slice(1).join(step.linkLabel || '')}
                    </>
                  ) : step.text}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Navigation */}
        <div className={`flex items-center gap-6 ${isAr ? 'flex-row-reverse' : ''}`}>
          <button onClick={onBack} className={`flex items-center gap-2 text-sm text-[#8a6d4b] hover:text-[#b8975a] transition-colors font-medium ${isAr ? 'flex-row-reverse' : ''}`}>
            <ArrowLeft className={`w-3.5 h-3.5 ${isAr ? 'rotate-180' : ''}`} /> {t.back}
          </button>
          <button onClick={onStartOver} className={`flex items-center gap-2 text-sm text-[#8a6d4b] hover:text-[#b8975a] transition-colors font-medium ${isAr ? 'flex-row-reverse' : ''}`}>
            <RotateCcw className="w-3.5 h-3.5" /> {t.startOver}
          </button>
        </div>
      </div>

      {/* CTA block */}
      <div className="mx-4 sm:mx-8 mb-8 rounded-2xl overflow-hidden bg-[#1a1209]">
        <div className="px-8 py-8 text-center space-y-4">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#b8975a]">
            {config.ctaTagline}
          </p>
          <h3 className="text-xl sm:text-2xl font-bold text-white font-serif" style={{ fontFamily: 'var(--font-playfair, Georgia, serif)' }}>
            {t.heavyLiftingTitle}
          </h3>
          <p className="text-white/65 text-sm max-w-xs mx-auto">
            {t.heavyLiftingBody}
          </p>
          <Link
            href={`/${locale}/contact`}
            className="inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl bg-[#b8975a] text-white font-bold text-sm hover:bg-[#c9a96a] transition-all duration-300 hover:-translate-y-0.5 shadow-lg shadow-[#b8975a]/25 group"
            id="wizard-cta-specialist"
          >
            <div className={`flex items-center gap-2 ${isAr ? 'flex-row-reverse' : ''}`}>
              <span>{t.talkToSpecialist}</span>
              <ArrowRight className={`w-4 h-4 transition-transform ${isAr ? 'rotate-180 group-hover:-translate-x-1' : 'group-hover:translate-x-1'}`} />
            </div>
          </Link>
        </div>
      </div>
    </motion.div>
  );
}

// ── Trust Strip ────────────────────────────────────────────────────
function TrustStrip({ isAr }: { isAr: boolean }) {
  return (
    <div className="border-t border-[#e8ddd0] bg-[#faf8f4] px-6 py-5 rounded-b-3xl">
      <div className={`flex flex-wrap items-center justify-center gap-x-6 gap-y-3 ${isAr ? 'flex-row-reverse' : ''}`}>
        <div className={`flex items-center gap-1.5 text-[#8a6d4b] ${isAr ? 'flex-row-reverse' : ''}`}>
          <Shield className="w-3.5 h-3.5" />
          <span className="text-[10px] font-black uppercase tracking-[0.15em]">{dict[isAr ? 'ar' : 'en'].trustLabel}</span>
        </div>
        <div className="hidden sm:block w-px h-4 bg-[#d4c5a9]" />
        {isAr ? (
          ['وزارة الخارجية', 'نظام عقاري · عقارات السعودية', 'منصة أبشر', 'نظام نفاذ الوطني'].map(name => (
            <span key={name} className="text-[11px] font-bold text-[#6b5744]">{name}</span>
          ))
        ) : (
          ['Nafath', 'Absher', 'REGA · Saudi Properties', 'Ministry of Foreign Affairs'].map(name => (
            <span key={name} className="text-[11px] font-bold text-[#6b5744]">{name}</span>
          ))
        )}
      </div>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────
export default function BuyInSaudiClient() {
  const locale = useLocale();
  const isAr = locale === 'ar';
  const t = dict[isAr ? 'ar' : 'en'];

  const [step, setStep] = useState<WizardStep>('contact');
  const [stepNum, setStepNum] = useState(1);
  const [contact, setContact] = useState<ContactData | undefined>(undefined);
  const [leadId, setLeadId] = useState<string | null>(null);
  const [result, setResult] = useState<ResultKey | null>(null);
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const wizardRef = useRef<HTMLDivElement>(null);

  function scrollToWizard() {
    wizardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  async function handleContactSubmit(data: ContactData) {
    setLoading(true);
    setApiError(null);

    const prefix = data.dialCode === '+' ? data.manualDialCode : data.dialCode;
    const phoneFull = `${prefix}${data.phoneNumber}`;

    const finalCitizenship = data.citizenship === 'OTHER' ? data.manualCitizenship : data.citizenship;

    try {
      const res = await fetch(`${API_BASE}/wizard/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: data.fullName,
          email: data.email,
          phone: phoneFull,
          citizenship: finalCitizenship,
          consent: data.consent,
        }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.message || 'Failed');
      setLeadId(json.data.leadId);
      setContact(data);
      setStep('residency');
      setStepNum(2);
      setTimeout(scrollToWizard, 50);
    } catch (err: any) {
      setApiError(err.message || (isAr ? 'حدث خطأ ما. يرجى المحاولة مرة أخرى.' : 'Something went wrong. Please try again.'));
    } finally {
      setLoading(false);
    }
  }

  async function patchAnswer(stepId: string, value: string) {
    if (!leadId) return;
    fetch(`${API_BASE}/wizard/${leadId}/answer`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stepId, value }),
    }).catch(() => { });
  }

  async function completeWizard(resultKey: ResultKey) {
    if (!leadId) return;
    fetch(`${API_BASE}/wizard/${leadId}/complete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ resultKey }),
    }).catch(() => { });
  }

  function handleResidency(v: 'outside' | 'inside') {
    patchAnswer('residency', v);
    if (v === 'inside') {
      const rk: ResultKey = 'resident';
      setResult(rk);
      completeWizard(rk);
      setStep('result');
      setStepNum(3);
    } else {
      setStep('digitalId');
      setStepNum(3);
    }
    setTimeout(scrollToWizard, 50);
  }

  function handleDigitalId(v: 'yes' | 'no') {
    patchAnswer('digitalId', v);
    const rk: ResultKey = v === 'yes' ? 'nonresident-id' : 'nonresident-noid';
    setResult(rk);
    completeWizard(rk);
    setStep('result');
    setTimeout(scrollToWizard, 50);
  }

  function handleBack() {
    if (step === 'residency') { setStep('contact'); setStepNum(1); }
    else if (step === 'digitalId') { setStep('residency'); setStepNum(2); }
    else if (step === 'result') {
      if (result === 'resident') { setStep('residency'); setStepNum(2); }
      else { setStep('digitalId'); setStepNum(3); }
      setResult(null);
    }
    setTimeout(scrollToWizard, 50);
  }

  function handleStartOver() {
    setStep('residency');
    setStepNum(2);
    setResult(null);
    setTimeout(scrollToWizard, 50);
  }

  const hasResult = step === 'result';

  return (
    <div className="bg-[#f5f0e8] min-h-screen">
      {/* ── Hero Section (Light Mode High Class UI - Issue 1 Fix) ── */}
      <section className="relative overflow-hidden bg-[#faf8f4] pt-20 pb-16 border-b border-[#e8ddd0]">
        <div className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='60' height='60'%3E%3Ccircle cx='30' cy='30' r='20' fill='none' stroke='%23b8975a' stroke-width='0.8'/%3E%3Cline x1='0' y1='30' x2='60' y2='30' stroke='%23b8975a' stroke-width='0.3'/%3E%3Cline x1='30' y1='0' x2='30' y2='60' stroke='%23b8975a' stroke-width='0.3'/%3E%3C/svg%3E")`,
            backgroundSize: '60px 60px',
          }}
        />
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[600px] h-[400px] rounded-full bg-[#b8975a]/8 blur-[120px] pointer-events-none" />

        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 text-center pt-8">
          <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }}>
            <p className="text-[11px] font-black uppercase tracking-[0.25em] text-[#b8975a] mb-5">
              {t.eyebrow}
            </p>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-[#1a1209] leading-tight mb-6 font-serif"
              style={{ fontFamily: 'var(--font-playfair, Georgia, serif)' }}>
              {t.title}
            </h1>
            <p className="text-[#6b5744] text-base sm:text-lg max-w-xl mx-auto">
              {t.subhead}
            </p>
          </motion.div>
        </div>
      </section>

      {/* ── Wizard Card Container (Issue 2 Fix with Explicit relative z-10 stack) ── */}
      <section className="relative z-10 pb-20">
        <div ref={wizardRef} className="max-w-2xl mx-auto px-4 sm:px-6 -mt-10 relative z-20">
          {/* Note: overflow-visible replaces overflow-hidden to fix dropdown clipping - Issue 5 Fix */}
          <motion.div
            className="bg-white rounded-3xl shadow-2xl shadow-[#1a1209]/10 border border-[#e8ddd0] relative z-30"
            layout
          >
            {/* Progress stepper header */}
            <div className="border-b border-[#e8ddd0] bg-white rounded-t-3xl">
              <ProgressStepper currentStep={stepNum} hasResult={hasResult} isAr={isAr} />
            </div>

            {/* Step Content */}
            {apiError && (
              <div className="mx-6 mt-6 p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2">
                <X className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
                <p className="text-red-600 text-sm">{apiError}</p>
              </div>
            )}

            <AnimatePresence mode="wait">
              {step === 'contact' && (
                <ContactStep key="contact" onNext={handleContactSubmit} loading={loading} initialData={contact} isAr={isAr} />
              )}
              {step === 'residency' && (
                <ResidencyStep key="residency" onSelect={handleResidency} onBack={handleBack} isAr={isAr} />
              )}
              {step === 'digitalId' && (
                <DigitalIdStep key="digitalId" onSelect={handleDigitalId} onBack={handleBack} isAr={isAr} />
              )}
              {step === 'result' && result && (
                <ResultPanel key="result" resultKey={result} locale={locale} onStartOver={handleStartOver} onBack={handleBack} isAr={isAr} />
              )}
            </AnimatePresence>

            <TrustStrip isAr={isAr} />
          </motion.div>

          {/* Footer disclaimer */}
          <p className="text-center text-[11px] text-[#8a6d4b] mt-8 px-4 leading-relaxed max-w-lg mx-auto">
            {isAr ? (
              <>
                هذا الدليل مقدم من تمليك لمساعدتك في فهم عملية التملك. يتم تشغيل الخطوات والاستمارات الرسمية من قبل الهيئة العامة للعقار (REGA) والجهات الحكومية السعودية ذات الصلة عبر{' '}
                <a href="https://saudiproperties.rega.gov.sa/" target="_blank" rel="noopener noreferrer" className="text-[#b8975a] hover:underline font-semibold">
                  بوابة العقارات السعودية
                </a>. قد تختلف الأهلية لعقارات ومناطق معينة؛ تحدث مع فريقنا للحصول على المشورة بشأن وضعك الخاص.
              </>
            ) : (
              <>
                This guide is provided by Tamleeq to help you understand the ownership process. The official steps and forms are operated by the Real Estate General Authority (REGA) and related Saudi government bodies via the{' '}
                <a href="https://saudiproperties.rega.gov.sa/" target="_blank" rel="noopener noreferrer" className="text-[#b8975a] hover:underline font-semibold">
                  Saudi Properties portal
                </a>. Eligibility for specific properties and zones may vary; speak to our team for advice on your situation.
              </>
            )}
          </p>
        </div>
      </section>
    </div>
  );
}
