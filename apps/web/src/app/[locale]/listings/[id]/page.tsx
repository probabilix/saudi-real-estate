'use client';
import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { notFound, useRouter, usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/hooks/use-auth';
import { MANAGED_MODE } from '@/lib/config';
import {
  Bed, Bath, Square, MapPin, Eye,
  Heart, Share2, ChevronRight, X,
  CheckCircle, Phone, MessageSquare, ArrowLeft,
  ShieldCheck,
  Maximize2, Zap,
  Info, Calculator, Map as MapIcon,
  Mail, Loader2, BookOpen
} from 'lucide-react';
import { formatPrice, formatPriceCompact, ListingWithOwner, Listing, PropertyHistoryEvent } from '@saudi-re/shared';
import { api, API_BASE_URL } from '@/lib/api';
import ListingCard from '@/components/listings/ListingCard';
import MediaModal from '@/components/listings/MediaModal';
import BrochureModal from '@/components/listings/BrochureModal';
import ChatWidget from '@/components/chat/ChatWidget';

export default function ListingDetailPage({ params: { id, locale } }: { params: { id: string; locale: string } }) {
  const t = useTranslations('listing');
  const tCommon = useTranslations('common');
  const tNav = useTranslations('navigation');
  const { isAuthenticated } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const [listing, setListing] = useState<ListingWithOwner | null>(null);
  const [loading, setLoading] = useState(true);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxTab, setLightboxTab] = useState<'photos' | 'video' | 'location'>('photos');
  const [brochureModalOpen, setBrochureModalOpen] = useState(false);
  const [shortlisted, setShortlisted] = useState(false);
  const [descLang, setDescLang] = useState<'ar' | 'en'>(locale as 'ar' | 'en');
  const [activeTab, setActiveTab] = useState('overview');
  const [mortgageType, setMortgageType] = useState<'resident' | 'expat'>('resident');
  const [amenitiesModalOpen, setAmenitiesModalOpen] = useState(false);
  const [isQualified, setIsQualified] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [revealedContact, setRevealedContact] = useState<{ phone?: string; email?: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [sidebarAdImage, setSidebarAdImage] = useState<string>('');
  const [sidebarAdLink, setSidebarAdLink] = useState<string>('');
  const [sidebarAdAspectRatio, setSidebarAdAspectRatio] = useState<string>('auto');

  // Fetch live sidebar ad from DB settings
  useEffect(() => {
    fetch(`${API_BASE_URL}/system/settings`, { cache: 'no-store' })
      .then(r => r.ok ? r.json() : null)
      .then(json => {
        const adImage = json?.data?.sidebar_ad_image;
        const adLink = json?.data?.sidebar_ad_link;
        const adAspect = json?.data?.sidebar_ad_aspect_ratio;
        if (adImage) setSidebarAdImage(adImage);
        if (adLink) setSidebarAdLink(adLink);
        if (adAspect) setSidebarAdAspectRatio(adAspect);
      })
      .catch(() => {});
  }, []);

  const handleShare = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const shareData = {
      title: title,
      text: `Check out this property listing on Saudi Real Estate: ${title}`,
      url: typeof window !== 'undefined' ? window.location.href : '',
    };

    if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
      try {
        await navigator.share(shareData);
      } catch (err) {
        console.error('Error sharing:', err);
      }
    } else {
      try {
        await navigator.clipboard.writeText(window.location.href);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (err) {
        console.error('Failed to copy text:', err);
      }
    }
  };

  // Additional State & Refs
  const [similarListings, setSimilarListings] = useState<Listing[]>([]);
  const [loanAmount, setLoanAmount] = useState(0);
  const [loanPeriod, setLoanPeriod] = useState(15);
  const [isToggling, setIsToggling] = useState(false);

  const sectionRefs = {
    overview: useRef<HTMLDivElement>(null),
    rega: useRef<HTMLDivElement>(null),
    calculator: useRef<HTMLDivElement>(null),
    location: useRef<HTMLDivElement>(null),
  };

  const handleContactAttempt = (type: 'phone' | 'email' | 'whatsapp') => {
    setLightboxOpen(false);
    if (isQualified && revealedContact) {
      if (type === 'phone') window.location.href = `tel:${revealedContact.phone || '+966538498580'}`;
      if (type === 'email') window.location.href = `mailto:${revealedContact.email || 'info@saudire.com'}?subject=Inquiry: ${title}`;
      if (type === 'whatsapp') window.open(`https://wa.me/${revealedContact.phone?.replace(/[+\s\-]/g, '') || '966538498580'}?text=I am interested in: ${title}`, '_blank');
    } else {
      setChatOpen(true);
    }
  };

  const handleQualificationSuccess = async () => {
    try {
      const res = await api.revealListingContact(id);
      if (res.success && res.data) {
        setRevealedContact(res.data);
        setIsQualified(true);
        setChatOpen(false); // Auto-close chat if qualified
      }
    } catch (err) {
      console.error('Failed to reveal contact info', err);
    }
  };

  useEffect(() => {
    async function fetchDetail() {
      // ... existing fetchDetail logic ...
      setLoading(true);
      try {
        const res = await api.getListingById(id);
        if (res.success && res.data) {
          const l = res.data as ListingWithOwner & { isFavorited?: boolean; isQualified?: boolean };
          setListing(l);
          setShortlisted(!!l.isFavorited);

          // Auto-reveal if already qualified in DB
          if (l.isQualified) {
            handleQualificationSuccess();
          }
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

  const handleToggleFavorite = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!isAuthenticated) {
      router.push(`/${locale}/auth/login?returnTo=${pathname}`);
      return;
    }

    if (isToggling) return;

    setIsToggling(true);
    // Optimistic update
    const prev = shortlisted;
    setShortlisted(!prev);

    try {
      const res = await api.toggleFavorite(id);
      if (!res.success) {
        setShortlisted(prev);
      } else {
        setShortlisted(!!res.data?.isFavorited);
      }
    } catch {
      setShortlisted(prev);
    } finally {
      setIsToggling(false);
    }
  };

  useEffect(() => {
    if (!listing) return;
    const currentListing = listing;
    async function fetchSimilar() {
      try {
        // Tier 1: same city, same type
        let query = `city=${currentListing.city}&type=${currentListing.type}&limit=4`;
        let res = await api.getListings(query);
        let items = res.success && res.data ? (res.data.items || []) : [];
        let filtered = items.filter((item: any) => item.id !== currentListing.id);

        // Tier 2: same type in any city if not enough results
        if (filtered.length === 0) {
          query = `type=${currentListing.type}&limit=4`;
          res = await api.getListings(query);
          items = res.success && res.data ? (res.data.items || []) : [];
          filtered = items.filter((item: any) => item.id !== currentListing.id);
        }

        // Tier 3: any active properties if still no results
        if (filtered.length === 0) {
          query = `limit=4`;
          res = await api.getListings(query);
          items = res.success && res.data ? (res.data.items || []) : [];
          filtered = items.filter((item: any) => item.id !== currentListing.id);
        }

        setSimilarListings(filtered.slice(0, 3));
      } catch {
        console.log('Similar fetch failed silently');
      }
    }
    fetchSimilar();
  }, [listing]);


  useEffect(() => {
    if (listing?.price) {
      setLoanAmount(listing.price * 0.9);
    }
  }, [listing?.price]);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-white">
        <Loader2 className="w-16 h-16 text-primary-600 animate-spin mb-4" />
        <p className="text-charcoal-muted font-bold font-serif uppercase tracking-widest">{tCommon('loading')}</p>
      </div>
    );
  }

  if (!listing) notFound();
  const l = listing;

  const title = locale === 'ar' ? l.arTitle : (l.enTitle ?? l.arTitle);
  const description = descLang === 'ar' ? l.arDescription : (l.enDescription || l.arDescription);

  const scrollToSection = (sectionId: keyof typeof sectionRefs) => {
    sectionRefs[sectionId].current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setActiveTab(sectionId);
  };

  const areaSqFt = l.areaSqm ? Math.round(Number(l.areaSqm) * 10.764) : null;
  const rate = mortgageType === 'resident' ? 4.5 : 5.5;
  const maxTerm = mortgageType === 'resident' ? 35 : 25;
  const monthlyPayment = (loanAmount * (rate / 100 / 12)) / (1 - Math.pow(1 + (rate / 100 / 12), -loanPeriod * 12));

  return (
    <div className="min-h-screen bg-white text-charcoal pb-32">

      {/* MOBILE-ONLY MINIMAL HEADER: Back Arrow | Save & Share */}
      <div className="md:hidden sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-surface-100 px-4 py-3 flex items-center justify-between">
        <Link href={`/${locale}/listings`} className="p-2 rounded-full hover:bg-surface-50 transition-colors">
          <ArrowLeft className={`w-5 h-5 text-charcoal ${locale === 'ar' ? 'rotate-180' : ''}`} />
        </Link>
        <div className="flex items-center gap-2">
          <button
            onClick={handleToggleFavorite}
            className={`p-2 rounded-full border transition-all ${shortlisted ? 'bg-red-50 text-red-500 border-red-200' : 'border-surface-200 hover:bg-surface-50'}`}
          >
            <Heart className={`w-5 h-5 ${shortlisted ? 'fill-current' : ''}`} />
          </button>
          <button onClick={handleShare} className="p-2 rounded-full border border-surface-200 hover:bg-surface-50 transition-all">
            <Share2 className="w-5 h-5 text-charcoal-muted" />
          </button>
        </div>
      </div>

      {/* DESKTOP HEADER: Full breadcrumb + save/share */}
      <div className="hidden md:block bg-white/95 backdrop-blur-md border-b border-surface-200 py-4 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href={`/${locale}/listings`} className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-charcoal-muted hover:text-primary-600 transition-colors">
              <ArrowLeft className={`w-4 h-4 ${locale === 'ar' ? 'rotate-180' : ''}`} />
              {t('backToListings')}
            </Link>
            <div className="h-4 w-px bg-surface-200" />
            <div className="flex items-center gap-2 text-[10px] font-bold text-charcoal-muted uppercase tracking-widest">
              <span>{tCommon('cities.' + listing.city)}</span>
              {(listing.arDistrict || listing.district) && (
                <>
                  <ChevronRight className={`w-3 h-3 ${locale === 'ar' ? 'rotate-180' : ''}`} />
                  <span>{locale === 'ar' ? (listing.arDistrict || listing.district) : (listing.district || listing.arDistrict)}</span>
                </>
              )}
              <ChevronRight className={`w-3 h-3 ${locale === 'ar' ? 'rotate-180' : ''}`} />
              <span className="text-primary-600 truncate max-w-[200px]">{title}</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={handleToggleFavorite} className={`p-2.5 rounded-xl border transition-all ${shortlisted ? 'bg-red-50 text-red-500 border-red-200' : 'border-surface-200 hover:bg-surface-50'}`}>
              <Heart className={`w-5 h-5 ${shortlisted ? 'fill-current' : ''}`} />
            </button>
            <button onClick={handleShare} className="p-2.5 rounded-xl border border-surface-200 hover:bg-surface-50 transition-all">
              <Share2 className="w-5 h-5 text-charcoal-muted" />
            </button>
          </div>
        </div>
      </div>

      {/* PHOTO GRID */}
      <div className="max-w-7xl mx-auto px-4 md:px-6 py-4 md:py-6">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 h-auto md:h-[550px] overflow-hidden rounded-2xl">
          {/* Main Feature Photo */}
          <div className="col-span-1 md:col-span-8 relative aspect-[4/3] md:aspect-auto group overflow-hidden rounded-xl border border-surface-100 shadow-sm cursor-pointer" onClick={() => { setLightboxTab('photos'); setLightboxOpen(true); }}>
            {l?.photos?.[0] && <Image src={l.photos[0]} alt={title} fill className="object-cover group-hover:scale-105 transition-transform duration-700" priority unoptimized />}
            <div className="absolute top-4 left-4 flex gap-2">
              {l?.truCheckVerified && (
                <span className="bg-white/95 backdrop-blur-md text-charcoal text-[10px] font-black uppercase tracking-[0.1em] px-3 py-1.5 flex items-center gap-1.5 rounded-lg border border-surface-200 shadow-xl">
                  <ShieldCheck className="w-3.5 h-3.5 text-primary-500" />
                  TruCheck™
                </span>
              )}
            </div>
            <div className="absolute bottom-4 left-4 flex flex-wrap gap-2 z-10">
              {l.brochureUrl && (
                <button onClick={(e) => { e.stopPropagation(); setBrochureModalOpen(true); }} className="bg-primary-600/90 backdrop-blur-md text-white text-[10px] font-black uppercase tracking-widest px-4 py-2.5 rounded-full border border-primary-500 flex items-center gap-2 hover:bg-primary-700 transition-all shadow-lg shadow-primary-500/20">
                  <BookOpen className="w-3.5 h-3.5" />{t('brochure') || 'Brochure'}
                </button>
              )}
              <button onClick={(e) => { e.stopPropagation(); setLightboxTab('video'); setLightboxOpen(true); }} className="bg-charcoal/50 backdrop-blur-md text-white text-[10px] font-black uppercase tracking-widest px-4 py-2.5 rounded-full border border-white/20 flex items-center gap-2 hover:bg-charcoal/70 transition-all">
                <Zap className="w-3.5 h-3.5" />{t('seeVideo')}
              </button>
              <button onClick={(e) => { e.stopPropagation(); setLightboxTab('location'); setLightboxOpen(true); }} className="bg-charcoal/50 backdrop-blur-md text-white text-[10px] font-black uppercase tracking-widest px-4 py-2.5 rounded-full border border-white/20 flex items-center gap-2 hover:bg-charcoal/70 transition-all">
                <MapIcon className="w-3.5 h-3.5" />{t('map')}
              </button>
            </div>
          </div>
          {/* Secondary Photo Stack: exactly 2 photos stacked */}
          <div className="hidden md:flex md:col-span-4 flex-col gap-3 h-full">
            <button className="relative group overflow-hidden rounded-xl border border-surface-100 shadow-sm flex-1" onClick={() => { setLightboxTab('photos'); setLightboxOpen(true); }}>
              {l?.photos?.[1] && <Image src={l.photos[1]} alt="" fill className="object-cover group-hover:scale-105 transition-transform duration-500" unoptimized />}
            </button>
            <button className="relative group overflow-hidden bg-charcoal rounded-xl border border-surface-100 shadow-sm flex-1" onClick={() => { setLightboxTab('photos'); setLightboxOpen(true); }}>
              {l?.photos?.[2] && <Image src={l.photos[2]} alt="" fill className="object-cover opacity-50" unoptimized />}
              <div className="absolute inset-0 flex flex-col items-center justify-center text-white">
                <span className="text-2xl font-black">+{Math.max(0, (l?.photos?.length || 0) - 2)}</span>
                <span className="text-[10px] font-bold uppercase tracking-widest opacity-70">Photos</span>
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* DESKTOP SECTION NAV */}
      <div className="hidden md:block sticky top-[73px] z-30 bg-white/90 backdrop-blur-xl border-y border-surface-200">
        <div className="max-w-7xl mx-auto px-6 h-14 flex items-center gap-10 overflow-x-auto no-scrollbar">
          {[
            { id: 'overview', label: t('tabOverview'), icon: Info },
            ...(!MANAGED_MODE ? [
              { id: 'rega', label: t('tabCompliance'), icon: ShieldCheck },
              { id: 'calculator', label: t('tabMortgage'), icon: Calculator },
            ] : []),
            { id: 'location', label: t('tabLocation'), icon: MapIcon },
          ].map((tab) => (
            <button key={tab.id} onClick={() => scrollToSection(tab.id as keyof typeof sectionRefs)}
              className={`flex items-center gap-2 text-[10px] font-black uppercase tracking-widest h-full border-b-2 transition-all whitespace-nowrap ${activeTab === tab.id ? 'border-primary-600 text-primary-700' : 'border-transparent text-charcoal-muted hover:text-charcoal'}`}>
              <tab.icon className="w-3.5 h-3.5" />{tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 md:px-6 py-8 md:py-16">
        <div className="grid lg:grid-cols-3 gap-8 lg:gap-12">
          <div className="lg:col-span-2 space-y-12 md:space-y-24">
            {/* ── SECTION 1: Primary Details ── */}
            <div ref={sectionRefs.overview} className="space-y-6 scroll-mt-40">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-3 flex-1">
                  <span className={`text-4xl md:text-5xl font-black text-charcoal tracking-tight ${locale === 'ar' ? 'font-arabic' : ''}`}>
                    {formatPriceCompact(listing.price, locale as 'en' | 'ar')}
                  </span>
                  <div className="flex items-center gap-2 text-charcoal-muted font-bold text-sm pt-1">
                    <MapPin className="w-4 h-4 text-primary-500 shrink-0" />
                    <span className={locale === 'ar' ? 'font-arabic' : ''}>
                      {(() => {
                        const dist = listing.arDistrict || listing.district || '';
                        const city = listing.arCity || listing.city || '';
                        return dist ? `${dist}، ${city}` : city;
                      })()}
                    </span>
                  </div>
                </div>
                {/* Desktop-only save/share here; mobile has them in header */}
                <div className="hidden md:flex items-center gap-3">
                  <button onClick={handleToggleFavorite} className={`flex items-center gap-2 px-5 py-2.5 rounded-xl border-2 font-bold text-sm transition-all ${shortlisted ? 'bg-red-50 text-red-500 border-red-200' : 'border-surface-200 hover:bg-surface-50 text-charcoal-muted'}`}>
                    <Heart className={`w-4 h-4 ${shortlisted ? 'fill-current' : ''}`} />{shortlisted ? t('saved') : t('save')}
                  </button>
                  <button onClick={handleShare} className="flex items-center gap-2 px-5 py-2.5 rounded-xl border-2 border-surface-200 hover:bg-surface-50 text-charcoal-muted font-bold text-sm transition-all">
                    <Share2 className="w-4 h-4" />{t('share')}
                  </button>
                </div>
              </div>
              <h1 className={`text-2xl lg:text-3xl font-bold text-charcoal leading-tight ${locale === 'ar' ? 'font-arabic' : 'font-serif'}`}>
                {title}
              </h1>

              {/* Stats bar: Property ID only (Views removed as per request) */}
              <div className="flex items-center gap-4 text-[11px] font-bold text-charcoal-muted uppercase tracking-widest">
                <span>{t('propertyId')}: <span className="text-primary-600 font-black">{l.shortId || l.id.slice(0, 8).toUpperCase()}</span></span>
              </div>

              {/* Beds / Baths / Area stats */}
              <div className="flex flex-wrap gap-4 pt-2">
                {l.bedrooms != null && (
                  <div className="flex items-center gap-3 bg-primary-50 rounded-2xl px-5 py-3 border border-primary-100">
                    <Bed className="w-5 h-5 text-primary-600" />
                    <div>
                      <p className="text-xl font-black text-charcoal leading-none">{l.bedrooms}</p>
                      <p className="text-[10px] font-bold text-charcoal-muted uppercase tracking-widest mt-0.5">{t('beds')}</p>
                    </div>
                  </div>
                )}
                {l.bathrooms != null && (
                  <div className="flex items-center gap-3 bg-primary-50 rounded-2xl px-5 py-3 border border-primary-100">
                    <Bath className="w-5 h-5 text-primary-600" />
                    <div>
                      <p className="text-xl font-black text-charcoal leading-none">{l.bathrooms}</p>
                      <p className="text-[10px] font-bold text-charcoal-muted uppercase tracking-widest mt-0.5">{t('baths')}</p>
                    </div>
                  </div>
                )}
                {l.areaSqm != null && (
                  <div className="flex items-center gap-3 bg-primary-50 rounded-2xl px-5 py-3 border border-primary-100">
                    <Square className="w-5 h-5 text-primary-600" />
                    <div>
                      <p className="text-xl font-black text-charcoal leading-none">{Number(l.areaSqm).toFixed(0)}</p>
                      <p className="text-[10px] font-bold text-charcoal-muted uppercase tracking-widest mt-0.5">{tCommon('sqm')}</p>
                    </div>
                  </div>
                )}
                {areaSqFt != null && (
                  <div className="flex items-center gap-3 bg-primary-50 rounded-2xl px-5 py-3 border border-primary-100">
                    <Maximize2 className="w-5 h-5 text-primary-600" />
                    <div>
                      <p className="text-xl font-black text-charcoal leading-none">{areaSqFt.toLocaleString()}</p>
                      <p className="text-[10px] font-bold text-charcoal-muted uppercase tracking-widest mt-0.5">{tCommon('sqft')}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* ── SECTION 2: Narrative (Description) ── */}
            <div className="space-y-6 bg-surface-50 rounded-3xl p-6 md:p-10 border border-surface-100">
              <div className="flex items-center justify-between flex-wrap gap-4 pb-5 border-b border-surface-200/60">
                <h3 className="text-xl md:text-2xl font-bold font-serif text-charcoal">{t('narrative')}</h3>
                <div className="flex bg-white p-1 rounded-full shadow-sm border border-surface-200">
                  <button onClick={() => setDescLang('en')} className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${descLang === 'en' ? 'bg-primary-600 text-white shadow-md' : 'text-charcoal-muted hover:text-charcoal'}`}>{tNav('switchToEnglish')}</button>
                  <button onClick={() => setDescLang('ar')} className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${descLang === 'ar' ? 'bg-primary-600 text-white shadow-md' : 'text-charcoal-muted hover:text-charcoal'}`}>{tNav('switchToArabic')}</button>
                </div>
              </div>
              <p className={`text-charcoal-muted leading-relaxed text-base md:text-lg font-medium ${descLang === 'ar' ? 'font-arabic text-right' : ''}`} dir={descLang === 'ar' ? 'rtl' : 'ltr'}>
                {description}
              </p>
            </div>

            {/* ── SECTION 3: Amenities ── */}
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-charcoal">{t('amenities')}</h3>
                {Object.values(l.amenities || {}).filter(Boolean).length > 8 && (
                  <button onClick={() => setAmenitiesModalOpen(true)} className="text-[10px] font-black text-primary-600 uppercase tracking-widest hover:underline">
                    {t('viewAllAmenities')}
                  </button>
                )}
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {Object.entries(l.amenities || {}).filter(([, val]) => val).slice(0, 8).map(([key], idx) => (
                  <div key={idx} className="bg-surface-50 p-3 md:p-4 rounded-xl border border-surface-200 flex items-center gap-2.5 group hover:bg-white hover:shadow-md transition-all">
                    <CheckCircle className="w-4 h-4 text-primary-500 shrink-0" />
                    <span className="text-[10px] md:text-xs font-bold uppercase tracking-wide text-charcoal-muted leading-tight">{key.replace(/_/g, ' ')}</span>
                  </div>
                ))}
              </div>
              {Object.values(l.amenities || {}).filter(Boolean).length > 8 && (
                <button
                  onClick={() => setAmenitiesModalOpen(true)}
                  className="w-full py-3 rounded-xl border-2 border-dashed border-primary-200 text-primary-600 font-bold text-sm hover:bg-primary-50 transition-all flex items-center justify-center gap-2"
                >
                  <span>+{Object.values(l.amenities || {}).filter(Boolean).length - 8} {t('amenities')}</span>
                  <span className="text-[10px] uppercase tracking-widest">— {t('viewAllAmenities')}</span>
                </button>
              )}
            </div>

            {/* ── SECTION 4: Property Information Table ── */}
            <div className="space-y-6">
              <h3 className="text-xl font-bold text-charcoal">{t('propertyDetails')}</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-2">
                {[
                  { label: t('type'), value: l.type ? (l.type.charAt(0) + l.type.slice(1).toLowerCase()) : 'N/A' },
                  { label: t('purpose'), value: l.purpose === 'SALE' ? t('purposeSALE') : t('purposeRENT') },
                  { label: t('propertyId'), value: l.shortId || l.id.slice(0, 8).toUpperCase(), highlight: true },
                  { label: t('residenceType'), value: l.residenceType ? (l.residenceType.charAt(0) + l.residenceType.slice(1).toLowerCase()) : 'N/A' },
                  { label: t('completion'), value: l.completionStatus ? l.completionStatus.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase()) : 'N/A' },
                  { label: t('furnishing'), value: l.furnishingStatus ? l.furnishingStatus.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase()) : 'N/A' },
                  { label: t('addedOn'), value: new Date(l.createdAt).toLocaleDateString(locale === 'ar' ? 'ar-SA' : 'en-US', { day: 'numeric', month: 'long', year: 'numeric' }) },
                  { label: t('propertyAge'), value: l.propertyAge ? `${l.propertyAge} ${t('years')}` : t('new') },
                ].map((spec, idx) => (
                  <div key={idx} className="flex items-center justify-between py-3 border-b border-surface-100 last:border-0">
                    <span className="text-xs font-bold text-charcoal-muted uppercase tracking-widest">{spec.label}</span>
                    <span className={`text-sm font-bold ${spec.highlight ? 'text-primary-600 bg-primary-50 px-2 py-0.5 rounded' : 'text-charcoal'}`}>{spec.value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* ── MOBILE ONLY: Agent Card after Property Info ── */}
            <div className="lg:hidden space-y-6">
              {l.brochureUrl && (
                <div className="relative overflow-hidden rounded-2xl p-6 border border-primary-500/20 bg-gradient-to-br from-primary-500/5 via-surface-50 to-primary-500/10 shadow-md space-y-4">
                  <div className="absolute top-0 right-0 transform translate-x-4 -translate-y-4 opacity-5">
                    <BookOpen className="w-32 h-32 text-primary-500" />
                  </div>
                  <div className="space-y-1 relative z-10">
                    <span className="text-[9px] font-black text-primary-600 uppercase tracking-widest block">{t('brochurePremiumMaterial')}</span>
                    <h4 className="text-lg font-serif font-bold text-charcoal">{t('brochureTitle')}</h4>
                    <p className="text-xs text-charcoal-muted leading-relaxed">
                      {t('brochureDesc')}
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setBrochureModalOpen(true);
                    }}
                    className="w-full py-3 px-4 rounded-xl flex items-center justify-center gap-2.5 font-bold text-sm bg-gradient-to-r from-primary-600 to-primary-700 hover:from-primary-700 hover:to-primary-800 text-white transition-all shadow-lg shadow-primary-600/15 group active:scale-[0.98]"
                  >
                    <BookOpen className="w-4 h-4 group-hover:scale-110 transition-transform" />
                    {t('brochureCta')}
                  </button>
                </div>
              )}
              <AgentContactCard l={l} t={t} locale={locale} handleContactAttempt={handleContactAttempt} isQualified={isQualified} revealedContact={revealedContact} />
            </div>

            {/* REGA Compliance Card */}
            {!MANAGED_MODE && (
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
                  </div>
                </div>
              </div>
            )}

            {/* Sold History Timeline */}
            {l?.history && l.history.length > 0 && (
              <div className="space-y-12">
                <div className="flex items-center gap-6">
                  <h3 className="text-3xl font-bold text-charcoal font-serif whitespace-nowrap">{t('ownershipLegacy')}</h3>
                  <div className="h-px flex-1 bg-surface-200" />
                </div>
                <div className="relative pl-12 space-y-16 before:absolute before:left-[15px] before:top-4 before:bottom-4 before:w-0.5 before:bg-surface-100">
                  {l.history.map((event: PropertyHistoryEvent, idx: number) => (
                    <div key={idx} className="relative group">
                      <div className="absolute -left-[45px] top-1.5 w-6 h-6 rounded-full border-4 border-white bg-primary-600 shadow-lg group-hover:scale-125 transition-transform duration-300 z-10" />
                      <div className="flex flex-col md:flex-row md:items-start justify-between gap-10 pb-16 last:pb-0">
                        <div className="space-y-6 flex-1">
                          <div className="flex items-center gap-6 flex-wrap">
                            <span className="text-4xl font-bold text-charcoal/20 font-serif italic leading-none">{event.year.toLocaleString(locale === 'ar' ? 'ar-SA' : 'en-US', { useGrouping: false })}</span>
                            <span className="bg-primary-50 text-primary-700 text-[10px] font-black px-4 py-1.5 rounded-full uppercase tracking-widest border border-primary-100 shadow-sm">{t('transaction')}</span>
                            <span className="text-3xl font-bold text-charcoal leading-none ml-auto">{formatPrice(event.price, locale as 'en' | 'ar')}</span>
                          </div>
                          <p className="text-lg text-charcoal-muted font-medium">
                            {t('recordedOn', { date: new Date(event.dateDisplay || event.date).toLocaleDateString(locale === 'ar' ? 'ar-SA' : 'en-US', { day: 'numeric', month: 'long', year: 'numeric' }) })} {event.agencyName ? t('brokeredBy', { agency: event.agencyName }) : ''}
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
            )}

            {/* Loan Calculator */}
            {!MANAGED_MODE && (
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

                  <div className="grid lg:grid-cols-2 gap-12 items-center">
                    <div className="space-y-10">
                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <label className="text-[10px] font-black uppercase tracking-widest text-charcoal-muted">{t('loanPrincipal')}</label>
                          <span className="text-lg font-bold text-charcoal">{loanAmount.toLocaleString(locale === 'ar' ? 'ar-SA' : 'en-US')} {tCommon('sar')}</span>
                        </div>
                        <div className="relative h-2">
                          <div className="absolute inset-0 bg-surface-200 rounded-full" />
                          <div className="absolute left-0 top-0 h-full bg-primary-600 rounded-full transition-all" style={{ width: `${listing.price > 0 ? (loanAmount / listing.price) * 100 : 0}%` }} />
                          <input type="range" min="0" max={listing.price} value={loanAmount} onChange={(e) => setLoanAmount(Number(e.target.value))} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                        </div>
                      </div>
                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <label className="text-[10px] font-black uppercase tracking-widest text-charcoal-muted">{t('tenurePeriod')}</label>
                          <span className="text-lg font-bold text-charcoal">{loanPeriod} {t('years')}</span>
                        </div>
                        <div className="relative h-2">
                          <div className="absolute inset-0 bg-surface-200 rounded-full" />
                          <div className="absolute left-0 top-0 h-full bg-primary-600 rounded-full transition-all" style={{ width: `${((loanPeriod - 5) / (maxTerm - 5)) * 100}%` }} />
                          <input type="range" min="5" max={maxTerm} value={loanPeriod} onChange={(e) => setLoanPeriod(Number(e.target.value))} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                        </div>
                      </div>
                      <p className="text-[11px] font-bold text-charcoal-muted uppercase tracking-widest">
                        {t('fixedRate', { rate: rate })}
                      </p>
                    </div>
                    <div className="bg-white rounded-3xl p-8 text-center space-y-3 shadow-xl border border-surface-100">
                      <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-charcoal-muted">{t('monthlyInstallment')}</p>
                      <h4 className="text-4xl font-bold text-primary-600 tracking-tight font-serif">{tCommon('sar')} {Math.round(monthlyPayment).toLocaleString(locale === 'ar' ? 'ar-SA' : 'en-US')}</h4>
                      <p className="text-xs text-charcoal-muted font-bold">{rate}% APR • {loanPeriod} {t('years')}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Related Properties */}
            {similarListings.length > 0 && (
              <div className="space-y-12 pt-12 border-t border-surface-200">
                <div className="flex items-center justify-between">
                  <h3 className="text-3xl font-bold text-charcoal font-serif">{t('eliteNeighborhood')}</h3>
                </div>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {similarListings.map((item, idx) => (
                    <ListingCard key={item.id} listing={item as Listing} index={idx} />
                  ))}
                </div>
              </div>
            )}

            {/* MOBILE ONLY: Links after Similar Properties */}
            <div className="lg:hidden space-y-4 pt-4">
              <div className="bg-white border border-surface-200 p-5 space-y-4 shadow-sm rounded-2xl">
                <h4 className="text-[11px] font-black uppercase tracking-[0.2em] text-charcoal-muted">{t('popularAreas')}</h4>
                <div className="grid gap-3">
                  {[`Rentals in ${listing.district}`, `Villas for sale in ${listing.city}`, `New Projects in ${listing.city}`, `Commercial Spaces`].map((item, idx) => (
                    <Link key={idx} href="#" className="flex items-center justify-between group">
                      <span className="text-sm font-bold text-charcoal-muted group-hover:text-primary-600 transition-colors">{item}</span>
                      <ChevronRight className="w-4 h-4 text-surface-300 group-hover:translate-x-1 transition-transform" />
                    </Link>
                  ))}
                </div>
              </div>
              <div className="bg-white border border-surface-200 p-5 space-y-4 shadow-sm rounded-2xl">
                <h4 className="text-[11px] font-black uppercase tracking-[0.2em] text-charcoal-muted">{t('relatedCollections')}</h4>
                <div className="grid gap-3">
                  {['Luxury Penthouses', 'Family Sized Apartments', 'REGA Verified Projects', 'Near KAFD Financial District'].map((item, idx) => (
                    <Link key={idx} href="#" className="flex items-center justify-between group">
                      <span className="text-sm font-bold text-charcoal-muted group-hover:text-primary-600 transition-colors">{item}</span>
                      <ChevronRight className="w-4 h-4 text-surface-300 group-hover:translate-x-1 transition-transform" />
                    </Link>
                  ))}
                </div>
              </div>
              <div className="bg-white border border-surface-200 p-5 space-y-4 shadow-sm rounded-2xl">
                <h4 className="text-[11px] font-black uppercase tracking-[0.2em] text-charcoal-muted">{t('investmentInsights')}</h4>
                <div className="grid gap-3">
                  {[
                    { label: t('marketGuide'), slug: 'market-valuation-guide' },
                    { label: t('roiProjections'), slug: 'roi-projections-2026' },
                    { label: t('legalChecklist'), slug: 'legal-handover-checklist' },
                    { label: t('taxExplained'), slug: 'ownership-taxes-explained' }
                  ].map((item, idx) => (
                    <Link key={idx} href={`/${locale}/news/${item.slug}`} className="flex items-center justify-between group">
                      <span className="text-sm font-bold text-charcoal-muted group-hover:text-primary-600 transition-colors">{item.label}</span>
                      <ChevronRight className={`w-4 h-4 text-surface-300 transition-transform ${locale === 'ar' ? 'rotate-180 group-hover:-translate-x-1' : 'group-hover:translate-x-1'}`} />
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* ── RIGHT SIDEBAR (Desktop only) ── */}
          <div className="hidden lg:block space-y-6">
            {l.brochureUrl && (
              <div className="relative overflow-hidden rounded-2xl p-6 border border-primary-500/20 bg-gradient-to-br from-primary-500/5 via-surface-50 to-primary-500/10 shadow-md space-y-4">
                <div className="absolute top-0 right-0 transform translate-x-4 -translate-y-4 opacity-5">
                  <BookOpen className="w-32 h-32 text-primary-500" />
                </div>
                <div className="space-y-1 relative z-10">
                  <span className="text-[9px] font-black text-primary-600 uppercase tracking-widest block">{t('brochurePremiumMaterial')}</span>
                  <h4 className="text-lg font-serif font-bold text-charcoal">{t('brochureTitle')}</h4>
                  <p className="text-xs text-charcoal-muted leading-relaxed">
                    {t('brochureDesc')}
                  </p>
                </div>
                <button
                  onClick={() => {
                    setBrochureModalOpen(true);
                  }}
                  className="w-full py-3 px-4 rounded-xl flex items-center justify-center gap-2.5 font-bold text-sm bg-gradient-to-r from-primary-600 to-primary-700 hover:from-primary-700 hover:to-primary-800 text-white transition-all shadow-lg shadow-primary-600/15 group active:scale-[0.98]"
                >
                  <BookOpen className="w-4 h-4 group-hover:scale-110 transition-transform" />
                  {t('brochureCta')}
                </button>
              </div>
            )}
            <AgentContactCard l={l} t={t} locale={locale} handleContactAttempt={handleContactAttempt} isQualified={isQualified} revealedContact={revealedContact} />

            {/* Direct WhatsApp Specialist Concierge */}
            <div className="relative overflow-hidden rounded-2xl p-6 border border-primary-500/20 bg-gradient-to-br from-primary-500/5 via-surface-50 to-primary-500/10 shadow-md space-y-4">
              <div className="space-y-1">
                <span className="text-[8px] font-black text-primary-600 uppercase tracking-widest block">{t('sidebarConciergePill')}</span>
                <h4 className="text-base font-serif font-bold text-charcoal">{t('sidebarConciergeTitle')}</h4>
                <p className="text-xs text-charcoal-muted leading-relaxed">
                  {t('sidebarConciergeDesc')}
                </p>
              </div>
              <a
                href={`https://wa.me/966538498580?text=${encodeURIComponent(
                  locale === 'ar'
                    ? `مرحباً، أنا مهتم بعقار: ${title}`
                    : `Hello, I am interested in: ${title}`
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-3 px-4 rounded-xl flex items-center justify-center gap-2.5 font-bold text-sm bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white transition-all shadow-lg shadow-emerald-600/15 group active:scale-[0.98]"
              >
                <MessageSquare className="w-4 h-4 group-hover:scale-110 transition-transform" />
                {t('sidebarConciergeCta')}
              </a>
            </div>

            {/* Dynamic Custom Ad Banner */}
            <div className="relative overflow-hidden rounded-2xl border border-surface-200 bg-white shadow-sm hover:shadow-md transition-all group">
              <span className="absolute top-3 right-3 bg-slate-950/40 backdrop-blur-md text-[8px] font-black text-white px-2.5 py-1 rounded-full uppercase tracking-widest z-10">
                {locale === 'ar' ? 'إعلان موثق' : 'PROMOTION'}
              </span>
              <Link 
                href={sidebarAdLink || `/${locale}/contact`}
                target={sidebarAdLink?.startsWith('http') ? '_blank' : undefined}
                rel={sidebarAdLink?.startsWith('http') ? 'noopener noreferrer' : undefined}
                className="block w-full overflow-hidden"
              >
                <img 
                  src={sidebarAdImage || 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80'} 
                  alt="Saudi Real Estate Dynamic Banner Advertisement"
                  className={`w-full object-cover group-hover:scale-105 transition-transform duration-500 ${
                    sidebarAdAspectRatio === '16_9' ? 'aspect-[16/9] max-h-[320px]' :
                    sidebarAdAspectRatio === '1_1' ? 'aspect-[1/1] max-h-[400px]' :
                    sidebarAdAspectRatio === '3_4' ? 'aspect-[3/4] max-h-[450px]' :
                    'h-auto max-h-[450px]'
                  }`} 
                />
              </Link>
            </div>

            {/* Investment Insights */}
            <div className="bg-white border border-surface-200 p-6 space-y-4 shadow-sm rounded-2xl">
              <h4 className="text-[11px] font-black uppercase tracking-[0.2em] text-charcoal-muted">{t('investmentInsights')}</h4>
              <div className="grid gap-3">
                {[
                  { label: t('marketGuide'), slug: 'market-valuation-guide' },
                  { label: t('roiProjections'), slug: 'roi-projections-2026' },
                  { label: t('legalChecklist'), slug: 'legal-handover-checklist' },
                  { label: t('taxExplained'), slug: 'ownership-taxes-explained' }
                ].map((item, idx) => (
                  <Link key={idx} href={`/${locale}/news/${item.slug}`} className="flex items-center justify-between group">
                    <span className="text-sm font-bold text-charcoal-muted group-hover:text-primary-600 transition-colors">{item.label}</span>
                    <ChevronRight className={`w-4 h-4 text-surface-300 transition-all ${locale === 'ar' ? 'rotate-180 group-hover:-translate-x-2' : 'group-hover:translate-x-2'}`} />
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Amenities Modal */}
      {amenitiesModalOpen && (
        <div className="fixed inset-0 z-[200] flex items-end md:items-center justify-center" onClick={() => setAmenitiesModalOpen(false)}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div className="relative bg-white rounded-t-3xl md:rounded-3xl p-6 md:p-10 w-full md:max-w-2xl max-h-[80vh] overflow-y-auto shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-charcoal">{t('allAmenities')}</h3>
              <button onClick={() => setAmenitiesModalOpen(false)} className="p-2 rounded-full hover:bg-surface-100 transition-colors">
                <X className="w-5 h-5 text-charcoal-muted" />
              </button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {Object.entries(l.amenities || {}).filter(([, val]) => val).map(([key], idx) => (
                <div key={idx} className="flex items-center gap-2.5 p-3 bg-surface-50 rounded-xl border border-surface-100">
                  <CheckCircle className="w-4 h-4 text-primary-500 shrink-0" />
                  <span className="text-xs font-bold text-charcoal capitalize">{key.replace(/_/g, ' ')}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Unified Media Modal */}
      <MediaModal
        isOpen={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
        photos={l.photos}
        youtubeUrl={l.youtubeUrl}
        mapEmbedUrl={l.mapEmbedUrl}
        initialTab={lightboxTab}
        isQualified={isQualified}
        onContactAttempt={handleContactAttempt}
        agent={{
          name: l.owner.name || '',
          avatarUrl: l.owner.avatarUrl,
          role: l.owner.role,
          phone: revealedContact?.phone
        }}
      />

      {/* Dedicated Fullscreen Brochure Modal */}
      {l.brochureUrl && (
        <BrochureModal
          isOpen={brochureModalOpen}
          onClose={() => setBrochureModalOpen(false)}
          brochureUrl={l.brochureUrl}
        />
      )}

      {/* MOBILE STICKY CONTACT BAR */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-surface-200 px-6 py-4 md:hidden shadow-[0_-10px_30px_rgba(0,0,0,0.1)] flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="relative w-10 h-10 rounded-full overflow-hidden border-2 border-primary-100 bg-primary-50 flex items-center justify-center shrink-0">
            {l.owner?.avatarUrl ? (
              <Image src={l.owner.avatarUrl} alt={l.owner.name || 'Broker'} fill className="object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-primary-600 text-white text-sm font-bold">
                {(l.owner?.name || 'B').charAt(0)}
              </div>
            )}
          </div>
          <div className="min-w-0">
            <p className="text-[9px] font-black text-primary-600 uppercase tracking-widest leading-none">
              {l.owner?.role === 'FIRM' ? 'Licensed Firm' : 'Professional Broker'}
            </p>
            <p className="text-sm font-bold text-charcoal truncate max-w-[120px]">{l.owner?.name || 'Authorized Broker'}</p>
          </div>
        </div>
        <div className="flex gap-2 flex-1 justify-end shrink-0">
          <button
            onClick={() => handleContactAttempt('phone')}
            className="p-3 bg-primary-600 text-white rounded-xl shadow-lg shadow-primary-600/20"
          >
            <Phone className="w-5 h-5" />
          </button>
          <button
            onClick={() => handleContactAttempt('whatsapp')}
            className="px-5 py-3 bg-emerald-500 text-white rounded-xl font-bold text-xs shadow-lg shadow-emerald-500/20 flex items-center gap-2"
          >
            <MessageSquare className="w-4 h-4" />
            WhatsApp
          </button>
        </div>
      </div>

      <ChatWidget
        floating
        showBubble={true}
        open={chatOpen}
        setOpen={setChatOpen}
        mode="qualification"
        context={{ id: l.id, title: title }}
        onQualified={handleQualificationSuccess}
      />

      <AnimatePresence>
        {copied && (
          <motion.div
            initial={{ opacity: 0, y: -20, x: '-50%' }}
            animate={{ opacity: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, y: -20, x: '-50%' }}
            className="fixed top-24 left-1/2 z-[100] bg-charcoal text-white px-6 py-3 rounded-2xl shadow-2xl border border-white/10 flex items-center gap-2"
          >
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-black uppercase tracking-wider font-sans">
              {locale === 'ar' ? 'تم نسخ الرابط بنجاح!' : 'Link Copied Successfully!'}
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function AgentContactCard({ l, t, locale, handleContactAttempt, isQualified, revealedContact }: { l: ListingWithOwner; t: any; locale: string; handleContactAttempt: (type: any) => void; isQualified: boolean; revealedContact: any }) {
  const brokerName = l.owner?.name || 'Authorized Broker';
  const avatarUrl = (l.owner as any)?.avatarUrl;

  const profilePath = l.owner?.role === 'FIRM' ? 'firms' : 'brokers';

  return (
    <div className="bg-white border border-surface-200 rounded-2xl p-6 space-y-6 shadow-sm">
      <Link href={`/${locale}/${profilePath}/${l.owner.id}`} className="flex items-center gap-4 group hover:opacity-90 transition-all">
        <div className="relative w-16 h-16 rounded-full border-2 border-primary-100 overflow-hidden shadow-lg bg-primary-50 flex items-center justify-center shrink-0">
          {avatarUrl ? (
            <Image src={avatarUrl} alt={brokerName} fill className="object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-primary-600 text-white text-xl font-bold">
              {brokerName.charAt(0)}
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <span className="text-[10px] font-black text-primary-600 uppercase tracking-widest">{t('verifiedBroker') || 'Verified Broker'}</span>
          <h5 className="text-base font-bold text-charcoal leading-tight truncate group-hover:text-primary-600 transition-colors">{brokerName}</h5>
          <p className="text-xs text-charcoal-muted font-medium mt-0.5">
            {l.owner?.role === 'FIRM' ? 'Licensed Real Estate Firm' : 'Professional Broker'}
          </p>
        </div>
        <ChevronRight className="w-4 h-4 text-surface-300 group-hover:translate-x-1 transition-transform" />
      </Link>

      <div className="bg-emerald-50 rounded-xl p-3 border border-emerald-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-xs font-bold text-emerald-700">{t('agentOnline')}</span>
        </div>
        <ShieldCheck className="w-4 h-4 text-emerald-500" />
      </div>

      <div className="space-y-2.5">
        <button
          onClick={() => handleContactAttempt('email')}
          className="w-full py-3 rounded-xl flex items-center justify-center gap-2.5 font-bold text-sm transition-all shadow-sm bg-primary-600 text-white hover:bg-primary-700 active:scale-95"
        >
          <Mail className="w-4 h-4" />
          {isQualified && revealedContact ? revealedContact.email : t('emailAgent')}
        </button>
        <button
          onClick={() => handleContactAttempt('phone')}
          className="w-full py-3 rounded-xl border-2 flex items-center justify-center gap-2.5 font-bold text-sm transition-all shadow-sm border-charcoal text-charcoal hover:bg-surface-50 active:scale-95"
        >
          <Phone className="w-4 h-4" />
          {isQualified && revealedContact ? revealedContact.phone : t('callPrivate')}
        </button>
        <button
          onClick={() => handleContactAttempt('whatsapp')}
          className="w-full py-3 rounded-xl flex items-center justify-center gap-2.5 font-bold text-sm transition-all shadow-sm bg-emerald-500 text-white hover:bg-emerald-600 active:scale-95"
        >
          <MessageSquare className="w-4 h-4" />
          {t('whatsappContact')}
        </button>
      </div>

      <div className="pt-3 border-t border-surface-100">
        <div className="flex items-center justify-between group">
          <span className="text-xs font-bold text-charcoal-muted">
            Direct Platform Listing
          </span>
          <CheckCircle className="w-4 h-4 text-emerald-500" />
        </div>
      </div>
    </div>
  );
}
