'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bed, Bath, Square, MapPin, Eye, Shield, Globe, Star,
  Heart, Share2, ChevronLeft, ChevronRight, X, ChevronUp,
  CheckCircle, Phone, MessageSquare, ArrowLeft,
  Calendar, Building2, ShieldCheck, ClipboardCheck,
  Maximize2, Zap, Droplets, Car, Smartphone, Fingerprint,
  Info, History, Calculator, Map as MapIcon, ChevronDown,
  ExternalLink, Check, Mail, Sparkles, TrendingUp
} from 'lucide-react';
import { formatPrice, formatPriceCompact, ListingWithOwner } from '@saudi-re/shared';
import { api } from '@/lib/api';
import ListingCard from '@/components/listings/ListingCard';
import ChatWidget from '@/components/chat/ChatWidget';

export default function ListingDetailPage({ params: { id, locale } }: { params: { id: string; locale: string } }) {
  const t = useTranslations('listing');
  const tCommon = useTranslations('common');
  const tNav = useTranslations('navigation');
  const tTypes = useTranslations('propertyTypes');

  const [listing, setListing] = useState<ListingWithOwner | null>(null);
  const [loading, setLoading] = useState(true);
  const [activePhoto, setActivePhoto] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [shortlisted, setShortlisted] = useState(false);
  const [descLang, setDescLang] = useState<'ar' | 'en'>(locale as 'ar' | 'en');
  const [activeTab, setActiveTab] = useState('overview');
  const [mortgageType, setMortgageType] = useState<'resident' | 'expat'>('resident');
  const [isQualified, setIsQualified] = useState(false);

  // Additional State & Refs (Must be at the top)
  const [similarListings, setSimilarListings] = useState<any[]>([]);
  const [loanAmount, setLoanAmount] = useState(0);
  const [loanPeriod, setLoanPeriod] = useState(15);
  
  const sectionRefs = {
    overview: useRef<HTMLDivElement>(null),
    rega: useRef<HTMLDivElement>(null),
    calculator: useRef<HTMLDivElement>(null),
    location: useRef<HTMLDivElement>(null),
  };

  useEffect(() => {
    async function fetchDetail() {
      setLoading(true);
      try {
        const res = await api.getListingById(id);
        if (res.success && res.data) {
          setListing(res.data);
        } else {
          setListing(null);
        }
      } catch (err) {
        console.error('Failed to fetch listing detail:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchDetail();
  }, [id]);

  useEffect(() => {
    if (!listing) return;
    async function fetchSimilar() {
      try {
        const query = `city=${listing?.city}&type=${listing?.type}&limit=3`;
        const res = await api.getListings(query);
        if (res.success && res.data) {
          setSimilarListings((res.data as any).items?.filter((item: any) => item.id !== listing?.id) || []);
        }
      } catch (err) {
        console.log('Similar fetch failed silently');
      }
    }
    fetchSimilar();
  }, [listing]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!lightboxOpen || !listing?.photos) return;
      if (e.key === 'ArrowRight') setActivePhoto((p) => (p + 1) % listing.photos.length);
      if (e.key === 'ArrowLeft') setActivePhoto((p) => (p - 1 + listing.photos.length) % listing.photos.length);
      if (e.key === 'Escape') setLightboxOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [lightboxOpen, listing?.photos?.length]);

  useEffect(() => {
    if (listing?.price) {
      setLoanAmount(listing.price * 0.9);
    }
  }, [listing?.price]);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-white">
        <div className="w-16 h-16 border-4 border-primary-100 border-t-primary-600 rounded-full animate-spin mb-4" />
        <p className="text-charcoal-muted font-bold font-serif uppercase tracking-widest">{tCommon('loading') || 'Loading Property...'}</p>
      </div>
    );
  }

  if (!listing) notFound();
  const l = listing as ListingWithOwner;

  const title = locale === 'ar' ? l.arTitle : (l.enTitle ?? l.arTitle);
  const description = descLang === 'ar' ? l.arDescription : (l.enDescription || l.arDescription);

  const scrollToSection = (id: keyof typeof sectionRefs) => {
    sectionRefs[id].current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setActiveTab(id);
  };

  const areaSqFt = l.areaSqm ? Math.round(Number(l.areaSqm) * 10.764) : null;
  const rate = mortgageType === 'resident' ? 4.5 : 5.5;
  const maxTerm = mortgageType === 'resident' ? 35 : 25;
  const monthlyPayment = (loanAmount * (rate / 100 / 12)) / (1 - Math.pow(1 + (rate / 100 / 12), -loanPeriod * 12));

  return (
    <div className="min-h-screen bg-white text-charcoal pb-32">
      {/* 1. Sub-Header Toolbar */}
      <div className="bg-white/95 backdrop-blur-md border-b border-surface-200 py-4 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href={`/${locale}/listings`} className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-charcoal-muted hover:text-primary-600 transition-colors">
              <ArrowLeft className={`w-4 h-4 ${locale === 'ar' ? 'rotate-180' : ''}`} />
              {t('backToListings')}
            </Link>
            <div className="h-4 w-px bg-surface-200 hidden sm:block" />
            <div className="hidden sm:flex items-center gap-2 text-[10px] font-bold text-charcoal-muted uppercase tracking-widest">
              <span>{listing.city}</span>
              <ChevronRight className="w-3 h-3" />
              <span>{listing.district}</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShortlisted(!shortlisted)}
              className={`p-2.5 rounded-xl border transition-all ${shortlisted ? 'bg-red-50 text-red-500 border-red-200' : 'border-surface-200 hover:bg-surface-50'}`}
            >
              <Heart className={`w-5 h-5 ${shortlisted ? 'fill-current' : ''}`} />
            </button>
            <button className="p-2.5 rounded-xl border border-surface-200 hover:bg-surface-50 transition-all">
              <Share2 className="w-5 h-5 text-charcoal-muted" />
            </button>
          </div>
        </div>
      </div>

      {/* 2. Hero Image Gallery - NO GAP, NO HOVER */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-0 h-auto md:h-[600px] overflow-hidden rounded-2xl shadow-xl border border-surface-100">
          {/* Main Photo */}
          <button className="col-span-1 md:col-span-8 relative aspect-[4/3] md:aspect-auto group overflow-hidden" onClick={() => setLightboxOpen(true)}>
            {l?.photos?.[0] && <Image src={l.photos[0]} alt={title} fill className="object-cover" priority unoptimized />}
            <div className="absolute inset-0 bg-black/10" />
            <div className="absolute top-6 left-6 flex gap-3 flex-row-reverse md:flex-row">
              <span className="bg-primary-600 text-white text-[10px] font-black uppercase tracking-[0.2em] px-5 py-2.5 rounded-lg shadow-lg">
                {t('premiumProperty')}
              </span>
              {l?.verified && (
                <span className="bg-white/95 backdrop-blur-md text-charcoal text-[10px] font-black uppercase tracking-[0.2em] px-5 py-2.5 flex items-center gap-2 rounded-lg border border-surface-200 shadow-sm">
                  <ShieldCheck className="w-4 h-4 text-emerald-500" />
                  {t('regaOfficial')}
                </span>
              )}
            </div>
          </button>

          {/* Secondary Photos Stack */}
          <div className="col-span-1 md:col-span-4 grid grid-cols-2 md:grid-cols-1 md:grid-rows-2 gap-0 h-40 md:h-full">
            <button className="relative group overflow-hidden border-s border-surface-100" onClick={() => { setActivePhoto(1); setLightboxOpen(true); }}>
              {l?.photos?.[1] && <Image src={l.photos[1]} alt="" fill className="object-cover" unoptimized />}
            </button>
            <button className="relative group overflow-hidden bg-charcoal border-s border-t border-surface-100" onClick={() => { setActivePhoto(2); setLightboxOpen(true); }}>
              {l?.photos && (
                <Image src={l.photos[l.photos.length - 1] || l.photos[0]} alt="" fill className="object-cover opacity-60" unoptimized />
              )}
              <div className="absolute inset-0 flex flex-col items-center justify-center text-white p-4 text-center">
                <span className="text-3xl font-black">{Math.max(0, (l?.photos?.length || 0) - 2)}+</span>
                <span className="text-[10px] font-black uppercase tracking-[0.15em] mt-2 opacity-80">
                  {t('photos')}
                </span>
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* 3. Section Navigation */}
      <div className="sticky top-[73px] z-30 bg-white/90 backdrop-blur-xl border-y border-surface-200">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center gap-10 overflow-x-auto no-scrollbar">
          {[
            { id: 'overview', label: t('tabOverview'), icon: Info },
            { id: 'rega', label: t('tabCompliance'), icon: ShieldCheck },
            { id: 'calculator', label: t('tabMortgage'), icon: Calculator },
            { id: 'location', label: t('tabLocation'), icon: MapIcon },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => scrollToSection(tab.id as any)}
              className={`flex items-center gap-2 text-[10px] font-black uppercase tracking-widest h-full border-b-4 transition-all whitespace-nowrap ${activeTab === tab.id ? 'border-primary-600 text-primary-700' : 'border-transparent text-charcoal-muted hover:text-charcoal'}`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-16">
        <div className="grid lg:grid-cols-3 gap-16">
          {/* MAIN CONTENT AREA */}
          <div className="lg:col-span-2 space-y-24">

            {/* Overview Section */}
            <div ref={sectionRefs.overview} className="space-y-12 scroll-mt-40">
              {/* Primary Details Row */}
              <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
                <div className="space-y-4 flex-1">
                  <div className="flex items-center gap-2 text-charcoal-muted font-medium">
                    <MapPin className="w-4 h-4 text-primary-500" />
                    <span className={locale === 'ar' ? 'font-arabic' : ''}>
                      {locale === 'ar' 
                        ? `${listing.arDistrict ? listing.arDistrict + '، ' : ''}${listing.arCity}`
                        : `${listing.district ? listing.district + ', ' : ''}${listing.city}`
                      }
                    </span>
                  </div>
                  <h1 className={`text-4xl lg:text-5xl font-bold text-charcoal leading-[1.1] ${locale === 'ar' ? 'font-arabic' : 'font-serif'}`}>
                    {locale === 'ar' ? listing.arTitle : (listing.enTitle ?? listing.arTitle)}
                  </h1>
                  
                  {/* Views & ID */}
                  <div className="flex items-center gap-6 text-[10px] uppercase tracking-[0.2em] font-bold text-charcoal-muted">
                    <div className="flex items-center gap-2">
                      <Eye className="w-3.5 h-3.5" />
                      <span>{listing.viewsCount.toLocaleString(locale === 'ar' ? 'ar-SA' : 'en-US')} {t('views')}</span>
                    </div>
                    <div>{t('propertyId')}: {listing.id}</div>
                  </div>
                </div>

                <div className="flex flex-col items-start md:items-end gap-2 bg-white p-6 rounded-2xl border border-surface-200 shadow-sm min-w-[240px]">
                  <div className="flex items-baseline gap-2">
                    <span className={`text-4xl font-bold text-primary-600 tracking-tight ${locale === 'ar' ? 'font-arabic' : ''}`}>
                      {formatPriceCompact(listing.price, locale as any)}
                    </span>
                  </div>
                  <div className="text-xs font-bold uppercase tracking-widest text-charcoal-muted flex items-center gap-2">
                    <TrendingUp className="w-3.5 h-3.5 text-accent-500" />
                    {t('valuationTrending')}
                  </div>
                </div>
              </div>

              {/* Main Stats Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6 py-10 border-y border-surface-100">
                <div className="flex items-center gap-4 group">
                  <div className="w-14 h-14 rounded-2xl bg-primary-50 border border-primary-100 flex items-center justify-center text-primary-600 shadow-sm transition-transform group-hover:-translate-y-1"><Bed className="w-7 h-7" /></div>
                  <div><span className="font-bold text-2xl leading-none block text-charcoal">{listing.bedrooms}</span><span className="text-[10px] font-bold text-charcoal-muted uppercase tracking-[0.1em] mt-1">{t('statsBeds')}</span></div>
                </div>
                <div className="flex items-center gap-4 group">
                  <div className="w-14 h-14 rounded-2xl bg-primary-50 border border-primary-100 flex items-center justify-center text-primary-600 shadow-sm transition-transform group-hover:-translate-y-1"><Bath className="w-7 h-7" /></div>
                  <div><span className="font-bold text-2xl leading-none block text-charcoal">{listing.bathrooms}</span><span className="text-[10px] font-bold text-charcoal-muted uppercase tracking-[0.1em] mt-1">{t('statsBaths')}</span></div>
                </div>
                <div className="flex items-center gap-4 group">
                  <div className="w-14 h-14 rounded-2xl bg-primary-50 border border-primary-100 flex items-center justify-center text-primary-600 shadow-sm transition-transform group-hover:-translate-y-1"><Square className="w-7 h-7" /></div>
                  <div><span className="font-bold text-2xl leading-none block text-charcoal">{listing.areaSqm}</span><span className="text-[10px] font-bold text-charcoal-muted uppercase tracking-[0.1em] mt-1">{t('statsSqm')}</span></div>
                </div>
                <div className="flex items-center gap-4 group">
                  <div className="w-14 h-14 rounded-2xl bg-primary-50 border border-primary-100 flex items-center justify-center text-primary-600 shadow-sm transition-transform group-hover:-translate-y-1"><Maximize2 className="w-7 h-7" /></div>
                  <div><span className="font-bold text-2xl leading-none block text-charcoal">{areaSqFt}</span><span className="text-[10px] font-bold text-charcoal-muted uppercase tracking-[0.1em] mt-1">{t('statsSqft')}</span></div>
                </div>
              </div>

              {/* Narrative Content */}
              <div className="space-y-8 bg-surface-50 rounded-3xl p-8 lg:p-12 border border-surface-100">
                <div className="flex items-center justify-between pb-6 border-b border-surface-200/60 flex-row-reverse md:flex-row">
                  <h3 className="text-2xl font-bold font-serif text-charcoal">{t('narrative')}</h3>
                  <div className="flex bg-white p-1.5 rounded-full shadow-sm border border-surface-200">
                    <button onClick={() => setDescLang('en')} className={`px-5 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${descLang === 'en' ? 'bg-primary-600 text-white shadow-md' : 'text-charcoal-muted hover:text-charcoal'}`}>{tNav('switchToEnglish')}</button>
                    <button onClick={() => setDescLang('ar')} className={`px-5 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${descLang === 'ar' ? 'bg-primary-600 text-white shadow-md' : 'text-charcoal-muted hover:text-charcoal'}`}>{tNav('switchToArabic')}</button>
                  </div>
                </div>
                <p className={`text-charcoal-muted leading-relaxed text-xl font-medium ${descLang === 'ar' ? 'font-arabic text-right' : ''}`} dir={descLang === 'ar' ? 'rtl' : 'ltr'}>
                  {description}
                </p>
              </div>
            </div>

            {/* REGA Compliance Card */}
            <div ref={sectionRefs.rega} className="bg-charcoal text-white rounded-3xl p-10 lg:p-14 space-y-12 shadow-2xl relative overflow-hidden scroll-mt-40">
              <div className="absolute top-0 right-0 w-64 h-64 bg-primary-500/10 rounded-full blur-[80px] pointer-events-none" />
              <div className="flex items-center justify-between relative z-10">
                <div className="space-y-2">
                  <h3 className="text-3xl font-bold font-serif">{t('techCompliance')}</h3>
                  <p className="text-[10px] font-black text-primary-400 uppercase tracking-widest">{t('authRecord')}</p>
                </div>
                <div className="w-16 h-16 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center text-primary-400 border border-white/20">
                  <ShieldCheck className="w-8 h-8" />
                </div>
              </div>
              <div className="grid md:grid-cols-2 gap-12 relative z-10">
                <div className="space-y-10">
                  <div>
                    <div className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-3">{t('falLicense')}</div>
                    <div className="text-2xl font-mono font-bold tracking-widest bg-white/5 py-3 px-4 rounded-xl border border-white/10">{listing.regaFalLicense}</div>
                  </div>
                  <div>
                    <div className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-3">{t('adPermit')}</div>
                    <div className="text-2xl font-mono font-bold tracking-widest bg-white/5 py-3 px-4 rounded-xl border border-white/10">{listing.regaAdvertisingLicense}</div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-8 md:border-l border-white/10 md:pl-12">
                  <div className="space-y-1">
                    <div className="text-[10px] font-black text-white/30 uppercase tracking-widest">{t('issueDate')}</div>
                    <p className="text-base font-bold">{listing.regaLicenseIssueDate ? new Date(listing.regaLicenseIssueDate).toLocaleDateString(locale === 'ar' ? 'ar-SA' : 'en-US', { day: 'numeric', month: 'long', year: 'numeric' }) : 'N/A'}</p>
                  </div>
                  <div className="space-y-1">
                    <div className="text-[10px] font-black text-white/30 uppercase tracking-widest">{t('expiryDate')}</div>
                    <p className="text-base font-bold">{listing.regaLicenseExpiryDate ? new Date(listing.regaLicenseExpiryDate).toLocaleDateString(locale === 'ar' ? 'ar-SA' : 'en-US', { day: 'numeric', month: 'long', year: 'numeric' }) : 'N/A'}</p>
                  </div>
                  <div className="col-span-2 pt-6">
                    <div className="text-[10px] font-black text-white/30 uppercase tracking-widest mb-2">{t('recordIntegrity')}</div>
                    <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold bg-emerald-400/10 w-fit px-3 py-1.5 rounded-full border border-emerald-400/20">
                      <CheckCircle className="w-3.5 h-3.5" />
                      {t('verifiedActive')}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Sold History Timeline */}
            <div className="space-y-12">
              <div className="flex items-center gap-6">
                <h3 className="text-3xl font-bold text-charcoal font-serif whitespace-nowrap">{t('ownershipLegacy')}</h3>
                <div className="h-px flex-1 bg-surface-200" />
              </div>
              <div className="relative pl-12 space-y-16 before:absolute before:left-[15px] before:top-4 before:bottom-4 before:w-0.5 before:bg-surface-100">
                {l?.history?.map((event, idx: number) => (
                  <div key={idx} className="relative group">
                    <div className="absolute -left-[45px] top-1.5 w-6 h-6 rounded-full border-4 border-white bg-primary-600 shadow-lg group-hover:scale-125 transition-transform duration-300 z-10" />
                    <div className="flex flex-col md:flex-row md:items-start justify-between gap-10 pb-16 last:pb-0">
                      <div className="space-y-6 flex-1">
                        <div className="flex items-center gap-6 flex-wrap">
                          <span className="text-4xl font-bold text-charcoal/20 font-serif italic leading-none">{event.year.toLocaleString(locale === 'ar' ? 'ar-SA' : 'en-US', { useGrouping: false })}</span>
                          <span className="bg-primary-50 text-primary-700 text-[10px] font-black px-4 py-1.5 rounded-full uppercase tracking-widest border border-primary-100 shadow-sm">{t('transaction')}</span>
                          <span className="text-3xl font-bold text-charcoal leading-none ml-auto">{formatPrice(event.price, locale as any)}</span>
                        </div>
                        <p className="text-lg text-charcoal-muted font-medium">
                          {t('recordedOn', { date: new Date(event.date).toLocaleDateString(locale === 'ar' ? 'ar-SA' : 'en-US', { day: 'numeric', month: 'long', year: 'numeric' }) })} {event.agencyName ? t('brokeredBy', { agency: event.agencyName }) : ''}
                        </p>
                      </div>
                      {event.thumbnailUrl && (
                        <div className="relative w-56 h-32 rounded-2xl overflow-hidden shadow-xl border border-surface-200">
                          <Image src={event.thumbnailUrl} alt="" fill className="object-cover" unoptimized />
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Loan Calculator */}
            <div ref={sectionRefs.calculator} className="scroll-mt-40">
              <div className="bg-surface-50 border border-surface-200 rounded-3xl p-10 lg:p-14 space-y-12">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
                  <div>
                    <h3 className="text-3xl font-bold font-serif text-charcoal mb-2">{t('financeCalculator')}</h3>
                    <p className="text-charcoal-muted font-medium">{t('financeSubtitle')}</p>
                  </div>
                  <div className="flex gap-2 p-1.5 bg-white border border-surface-200 rounded-full shadow-sm">
                    <button onClick={() => setMortgageType('resident')} className={`px-6 py-2.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${mortgageType === 'resident' ? 'bg-primary-600 text-white shadow-lg' : 'text-charcoal-muted hover:text-charcoal'}`}>{t('saudiResident')}</button>
                    <button onClick={() => setMortgageType('expat')} className={`px-6 py-2.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${mortgageType === 'expat' ? 'bg-primary-600 text-white shadow-lg' : 'text-charcoal-muted hover:text-charcoal'}`}>{t('nonResident')}</button>
                  </div>
                </div>

                <div className="grid lg:grid-cols-2 gap-16 items-center">
                  <div className="space-y-12">
                    <div className="space-y-6">
                      <div className="flex justify-between items-center px-1"><label className="text-[10px] font-black uppercase tracking-widest text-charcoal-muted">{t('loanPrincipal')}</label><span className="text-xl font-bold text-charcoal">{loanAmount.toLocaleString(locale === 'ar' ? 'ar-SA' : 'en-US')} {tCommon('sar')}</span></div>
                      <input type="range" min="0" max={listing.price} value={loanAmount} onChange={(e) => setLoanAmount(Number(e.target.value))} className="w-full h-2 bg-surface-200 rounded-full appearance-none cursor-pointer accent-primary-600" />
                    </div>
                    <div className="space-y-6">
                      <div className="flex justify-between items-center px-1"><label className="text-[10px] font-black uppercase tracking-widest text-charcoal-muted">{t('tenurePeriod')}</label><span className="text-xl font-bold text-charcoal">{loanPeriod.toLocaleString(locale === 'ar' ? 'ar-SA' : 'en-US')} {t('years')}</span></div>
                      <input
                        type="range"
                        min="5"
                        max={maxTerm}
                        value={loanPeriod}
                        onChange={(e) => setLoanPeriod(Number(e.target.value))}
                        className="w-full h-2 bg-surface-200 rounded-full appearance-none cursor-pointer accent-primary-600"
                      />
                      <p className="text-[10px] text-charcoal-muted italic">{t('maxTermFor', { type: mortgageType === 'resident' ? t('saudiResident') : t('nonResident'), years: maxTerm })}</p>
                    </div>
                  </div>
                  <div className="bg-white rounded-3xl p-10 text-center space-y-8 shadow-xl border border-surface-100">
                    <div className="space-y-2">
                      <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-charcoal-muted">{t('monthlyInstallment')}</p>
                      <h4 className="text-5xl font-bold text-primary-600 tracking-tight font-serif">{tCommon('sar')} {Math.round(monthlyPayment).toLocaleString(locale === 'ar' ? 'ar-SA' : 'en-US')}</h4>
                      <p className="text-xs font-semibold text-emerald-600 bg-emerald-50 w-fit mx-auto px-3 py-1 rounded-full border border-emerald-100">
                        {t('fixedRate', { rate })}
                      </p>
                    </div>
                    <button className="w-full py-5 rounded-xl bg-charcoal text-white font-bold text-sm shadow-xl hover:bg-black transition-all active:scale-[0.98]">{t('requestQuote')}</button>
                  </div>
                </div>
              </div>
            </div>

            {/* Related Properties */}
            <div className="space-y-12 pt-12 border-t border-surface-200">
              <div className="flex items-center justify-between">
                <h3 className="text-3xl font-bold text-charcoal font-serif">{t('eliteNeighborhood')}</h3>
                <Link href={`/${locale}/listings`} className="text-sm font-bold text-primary-600 hover:underline">{t('viewAllMatches')}</Link>
              </div>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                {similarListings.map((item: any, idx: number) => (
                  <ListingCard key={item.id} listing={item} index={idx} />
                ))}
              </div>
            </div>
          </div>

          {/* SIDEBAR ACTION PANEL */}
          <div className="space-y-8">
            <div className="bg-white border border-surface-200 rounded-3xl p-10 space-y-10 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.08)]">
              <div className="flex items-center gap-5">
                <Link href={`/${locale}/${l.owner.role === 'FIRM' ? 'firms' : 'brokers'}/${l.owner.id}`} className="relative w-20 h-20 rounded-2xl border border-surface-100 overflow-hidden shadow-md bg-surface-50 flex items-center justify-center hover:scale-105 transition-transform group">
                  {l.owner.avatarUrl ? (
                    <Image src={l.owner.avatarUrl} alt="" fill className="object-cover" unoptimized />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-primary-600 text-white text-2xl font-bold">
                      {l.owner.name?.charAt(0)}
                    </div>
                  )}
                </Link>
                <div>
                  <Link href={`/${locale}/${l.owner.role === 'FIRM' ? 'firms' : 'brokers'}/${l.owner.id}`} className="hover:text-primary-600 transition-colors">
                    <h5 className="text-xl font-bold text-charcoal leading-tight font-serif">{l.owner.name}</h5>
                  </Link>
                  <p className="text-[10px] font-black text-primary-600 uppercase tracking-widest mt-1.5 flex items-center gap-1.5">
                    <ShieldCheck className="w-3 h-3" />
                    {t('authorizedBroker')}
                  </p>
                </div>
              </div>

              {/* AI Qualification Logic */}
              <div className="bg-surface-50 rounded-2xl p-8 space-y-6 relative border border-surface-100">
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <div className="w-10 h-10 rounded-xl bg-primary-600 flex items-center justify-center shadow-lg shadow-primary-600/20"><Sparkles className="w-5 h-5 text-white" /></div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-primary-700">{t('digitalHandshake')}</span>
                  </div>
                  <h4 className="text-xl font-bold text-charcoal font-serif">{t('buyerVerification')}</h4>
                  <p className="text-sm font-medium text-charcoal-muted leading-relaxed">{t('verifySubtitle')}</p>
                </div>
                <button
                  onClick={() => setIsQualified(true)}
                  className={`w-full py-5 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-3 active:scale-95 shadow-lg ${isQualified ? 'bg-surface-200 text-charcoal-muted cursor-default' : 'bg-primary-600 text-white hover:bg-primary-700 hover:shadow-primary-600/30'}`}
                >
                  {isQualified ? <CheckCircle className="w-5 h-5" /> : <Zap className="w-5 h-5" />}
                  {isQualified ? t('identityConfirmed') : t('unlockAccess')}
                </button>
              </div>

              {/* Contact Actions */}
              <div className="space-y-4">
                <button
                  disabled={!isQualified}
                  className={`w-full py-4 rounded-xl border-2 flex items-center justify-center gap-3 font-bold text-sm transition-all shadow-sm ${isQualified ? 'border-emerald-500 text-emerald-600 hover:bg-emerald-50 active:scale-95' : 'border-surface-100 text-surface-200 cursor-not-allowed'}`}
                >
                  <MessageSquare className="w-5 h-5" />
                  {t('whatsappContact')}
                </button>
                <button
                  disabled={!isQualified}
                  className={`w-full py-4 rounded-xl border-2 flex items-center justify-center gap-3 font-bold text-sm transition-all shadow-sm ${isQualified ? 'border-charcoal text-charcoal hover:bg-surface-50 active:scale-95' : 'border-surface-100 text-surface-200 cursor-not-allowed'}`}
                >
                  <Phone className="w-5 h-5" />
                  {isQualified ? ((listing.owner as any).phone || '+966 50 XXX XXXX') : t('callPrivate')}
                </button>
              </div>

              {/* Safety Footer */}
              <div className="pt-8 border-t border-surface-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-glow-accent" />
                  <span className="text-[10px] font-black text-charcoal-muted uppercase tracking-widest">{t('safetyShield')}</span>
                </div>
                <ShieldCheck className="w-5 h-5 text-emerald-500" />
              </div>
            </div>

            {/* Recommendations Block 1: Popular Areas */}
            <div className="bg-white border border-surface-200 p-8 space-y-6 shadow-sm rounded-3xl">
              <h4 className="text-[11px] font-black uppercase tracking-[0.2em] text-charcoal-muted">{t('popularAreas')}</h4>
              <div className="grid gap-4">
                {[`Rentals in ${listing.district}`, `Villas for sale in ${listing.city}`, `New Projects in ${listing.city}`, `Commercial Spaces`].map((item, idx) => (
                  <Link key={idx} href="#" className="flex items-center justify-between group">
                    <span className="text-sm font-bold text-charcoal-muted group-hover:text-primary-600 transition-colors">{item}</span>
                    <ChevronRight className="w-4 h-4 text-surface-300 group-hover:translate-x-1 transition-transform" />
                  </Link>
                ))}
              </div>
            </div>

            {/* Recommendations Block 2: Related Collections */}
            <div className="bg-white border border-surface-200 p-8 space-y-6 shadow-sm rounded-3xl">
              <h4 className="text-[11px] font-black uppercase tracking-[0.2em] text-charcoal-muted">{t('relatedCollections')}</h4>
              <div className="grid gap-4">
                {['Luxury Penthouses', 'Family Sized Apartments', 'REGA Verified Projects', 'Near KAFD Financial District'].map((item, idx) => (
                  <Link key={idx} href="#" className="flex items-center justify-between group">
                    <span className="text-sm font-bold text-charcoal-muted group-hover:text-primary-600 transition-colors">{item}</span>
                    <ChevronRight className="w-4 h-4 text-surface-300 group-hover:translate-x-1 transition-transform" />
                  </Link>
                ))}
              </div>
            </div>

            {/* Recommendations Block 3: Investment Insights */}
            <div className="bg-white border border-surface-200 p-8 space-y-6 shadow-sm rounded-3xl">
              <h4 className="text-[11px] font-black uppercase tracking-[0.2em] text-charcoal-muted">{t('investmentInsights')}</h4>
              <div className="grid gap-5">
                {[
                  { label: t('marketGuide'), key: 'marketGuide' },
                  { label: t('roiProjections'), key: 'roiProjections' },
                  { label: t('legalChecklist'), key: 'legalChecklist' },
                  { label: t('taxExplained'), key: 'taxExplained' }
                ].map((item, idx) => (
                  <Link key={idx} href="#" className="flex items-center justify-between group">
                    <span className="text-sm font-bold text-charcoal-muted group-hover:text-primary-600 transition-colors">{item.label}</span>
                    <ChevronRight className={`w-4 h-4 text-surface-300 transition-all ${locale === 'ar' ? 'rotate-180 group-hover:-translate-x-2' : 'group-hover:translate-x-2'}`} />
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Lightbox Gallery */}
      <AnimatePresence>
        {lightboxOpen && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[110] bg-black/95 flex flex-col backdrop-blur-xl"
            onClick={() => setLightboxOpen(false)}
          >
            {/* 1. Header Area (Close Button) */}
            <div className="flex-shrink-0 flex justify-end p-6 md:p-10">
              <button
                className="p-4 rounded-full bg-white/10 text-white hover:bg-white/20 transition-all z-[60] backdrop-blur-md border border-white/10"
                onClick={() => setLightboxOpen(false)}
              >
                <X className="w-8 h-8" />
              </button>
            </div>

            {/* 2. Main Content Area (Image + Sidebar Navigation Overlays) */}
            <div className="flex-1 relative flex items-center justify-center min-h-0 px-4 group" onClick={(e) => e.stopPropagation()}>
              {/* Prev Button - Absolute Overlay */}
              <button
                className="absolute left-4 md:left-10 p-4 md:p-6 rounded-full bg-black/40 text-white hover:bg-black/60 transition-all z-20 backdrop-blur-sm border border-white/5 opacity-40 group-hover:opacity-100"
                onClick={() => listing?.photos && setActivePhoto((p) => (p - 1 + listing.photos.length) % listing.photos.length)}
              >
                <ChevronLeft className="w-8 h-8 md:w-10 md:h-10" />
              </button>

              {/* Central Viewing Window */}
              <motion.div
                key={activePhoto}
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                className="w-full h-full flex items-center justify-center pointer-events-none"
              >
                <div className="relative w-full h-full max-h-[75vh] flex items-center justify-center">
                   {listing?.photos?.[activePhoto] && (
                     <Image src={listing.photos[activePhoto]} alt="" fill className="object-contain pointer-events-auto" unoptimized />
                   )}
                </div>
              </motion.div>

              {/* Next Button - Absolute Overlay */}
              <button
                className="absolute right-4 md:right-10 p-4 md:p-6 rounded-full bg-black/40 text-white hover:bg-black/60 transition-all z-20 backdrop-blur-sm border border-white/5 opacity-40 group-hover:opacity-100"
                onClick={() => listing?.photos && setActivePhoto((p) => (p + 1) % listing.photos.length)}
              >
                <ChevronRight className="w-8 h-8 md:w-10 md:h-10" />
              </button>
            </div>

            {/* 3. Bottom Thumbnail Strip (Panel) */}
            <div className="flex-shrink-0 w-full bg-black/40 backdrop-blur-2xl border-t border-white/10 py-6 md:py-8" onClick={(e) => e.stopPropagation()}>
               <div className="max-w-screen-xl mx-auto px-6">
                  <div className="flex items-center justify-center gap-4 overflow-x-auto no-scrollbar pb-2">
                    {l?.photos?.map((photo: string, i: number) => (
                      <button
                        key={i}
                        onClick={() => setActivePhoto(i)}
                        className={`relative w-20 h-14 md:w-28 md:h-20 shrink-0 rounded-xl overflow-hidden transition-all border-2 ${i === activePhoto ? 'border-primary-500 scale-110 shadow-[0_0_20px_rgba(13,115,119,0.5)] z-10' : 'border-white/10 opacity-40 hover:opacity-100'}`}
                      >
                        <Image src={photo} alt="" fill className="object-cover" unoptimized />
                      </button>
                    ))}
                  </div>
                  <div className="text-center mt-4">
                    <span className="text-[10px] font-black uppercase tracking-[0.3em] text-white/40">
                      {activePhoto + 1} / {l?.photos?.length || 0}
                    </span>
                  </div>
               </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <ChatWidget floating />
    </div>
  );
}
