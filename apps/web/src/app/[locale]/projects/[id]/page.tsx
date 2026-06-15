'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { notFound, useRouter, usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Building, MapPin, CheckCircle, Clock, Construction,
  Square, Bed, Bath, ArrowLeft, ShieldCheck, Star,
  Sparkles, Loader2, ChevronRight, Lock, Mail, Phone,
  MessageSquare, BookOpen, ExternalLink, Zap, Map as MapIcon,
  ChevronLeft, Share2, Heart, X
} from 'lucide-react';
import BrochureModal from '@/components/listings/BrochureModal';
import MediaModal from '@/components/listings/MediaModal';
import ChatWidget from '@/components/chat/ChatWidget';
import ListingCard from '@/components/listings/ListingCard';
import { formatPriceCompact } from '@saudi-re/shared';
import { api, API_BASE_URL } from '@/lib/api';
import { useAuth } from '@/hooks/use-auth';
import { Listing } from '@saudi-re/shared';
import clsx from 'clsx';

interface ProjectUnit {
  id: string;
  projectId: string;
  listingId: string | null;
  unitNumber: string;
  floor: number;
  type: string;
  status: 'AVAILABLE' | 'RESERVED' | 'SOLD';
  price: number | null;
}

interface LayoutItem {
  id: string;
  shortId: string;
  titleEn: string | null;
  titleAr: string;
  price: number;
  areaSqm: string | null;
  bedrooms: number | null;
  bathrooms: number | null;
  completionStatus: 'READY' | 'OFF_PLAN' | 'UNDER_CONSTRUCTION' | null;
  photos: string[];
  descriptionEn?: string | null;
  descriptionAr?: string | null;
  type?: string;
  units?: ProjectUnit[];
}

interface ProjectData {
  id: string;
  nameEn: string;
  nameAr: string;
  descriptionEn: string | null;
  descriptionAr: string | null;
  city: string;
  district: string | null;
  brochureUrl: string | null;
  regaFalLicense: string | null;
  amenities: Record<string, boolean> | null;
  photos: string[] | null;
  completionStatus: 'READY' | 'OFF_PLAN' | 'UNDER_CONSTRUCTION' | null;
  expectedDelivery: string | null;
  totalUnits: number | null;
  mapEmbedUrl: string | null;
  createdAt: string;
}

const AMENITY_METADATA: Record<string, { labelEn: string; labelAr: string }> = {
  swimming_pool: { labelEn: 'Swimming Pool', labelAr: 'مسبح' },
  gym: { labelEn: 'Gym / Fitness Center', labelAr: 'صالة رياضية' },
  parking: { labelEn: 'Covered Parking', labelAr: 'موقف سيارات' },
  wifi: { labelEn: 'WiFi', labelAr: 'إنترنت لاسلكي' },
  private_garden: { labelEn: 'Private Garden', labelAr: 'حديقة خاصة' },
  maid_room: { labelEn: 'Maid Room', labelAr: 'غرفة خادمة' },
  smart_home: { labelEn: 'Smart Home', labelAr: 'منزل ذكي' },
  elevator: { labelEn: 'Elevator', labelAr: 'مصعد' },
  security: { labelEn: '24/7 Security', labelAr: 'حراسة وأمن' },
  central_ac: { labelEn: 'Central AC', labelAr: 'تكييف مركزي' },
  laundry: { labelEn: 'Laundry Room', labelAr: 'غرفة غسيل' },
  pets_allowed: { labelEn: 'Pets Allowed', labelAr: 'مسموح بالحيوانات' },
  basement: { labelEn: 'Basement', labelAr: 'قبو' },
  balcony: { labelEn: 'Balcony', labelAr: 'شرفة / بلكونة' },
  power: { labelEn: 'Power Backup', labelAr: 'مولد كهرباء' },
  gas: { labelEn: 'Central Gas', labelAr: 'غاز مركزي' },
  tv_room: { labelEn: 'TV Room', labelAr: 'غرفة تلفزيون' },
  lounge: { labelEn: 'Lounge', labelAr: 'صالة استقبال' },
  kitchen_plus: { labelEn: 'Equipped Kitchen', labelAr: 'مطبخ مجهز' },
  driver_room: { labelEn: 'Driver Room', labelAr: 'غرفة سائق' },
  concierge: { labelEn: 'Concierge Service', labelAr: 'خدمة بواب' },
  study_room: { labelEn: 'Study Room', labelAr: 'غرفة دراسة' },
  view_of_landmark: { labelEn: 'Landmark View', labelAr: 'إطلالة على معلم' },
  walk_in_closet: { labelEn: 'Walk-in Closet', labelAr: 'غرفة ملابس' },
  waste_disposal: { labelEn: 'Waste Disposal', labelAr: 'التخلص من النفايات' },
  built_in_wardrobes: { labelEn: 'Built-in Wardrobes', labelAr: 'خزائن مدمجة' },
  kitchen_appliances: { labelEn: 'Kitchen Appliances', labelAr: 'أجهزة مطبخ' },
  barbecue_area: { labelEn: 'Barbecue Area', labelAr: 'منطقة شواء' },
};

function getAmenityLabel(key: string, locale: string): string {
  const normalizedKey = key.toLowerCase().replace(/[\s_-]+/g, '_');

  const commonMap: Record<string, { labelEn: string; labelAr: string }> = {
    cctv: { labelEn: 'CCTV Security', labelAr: 'كاميرات مراقبة' },
    pool: { labelEn: 'Swimming Pool', labelAr: 'مسبح' },
    mosque: { labelEn: 'Mosque', labelAr: 'مسجد' },
    playarea: { labelEn: 'Kids Play Area', labelAr: 'منطقة ألعاب أطفال' },
    play_area: { labelEn: 'Kids Play Area', labelAr: 'منطقة ألعاب أطفال' },
    kids_play_area: { labelEn: 'Kids Play Area', labelAr: 'منطقة ألعاب أطفال' },
    parking: { labelEn: 'Covered Parking', labelAr: 'موقف سيارات' },
    security: { labelEn: '24/7 Security', labelAr: 'حراسة وأمن' },
    elevator: { labelEn: 'Elevator', labelAr: 'مصعد' },
    gym: { labelEn: 'Gym / Fitness Center', labelAr: 'صالة رياضية' },
  };

  const metadata = AMENITY_METADATA[normalizedKey] || AMENITY_METADATA[key] || commonMap[normalizedKey] || commonMap[key];
  if (metadata) {
    return locale === 'ar' ? metadata.labelAr : metadata.labelEn;
  }

  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/[_-]+/g, ' ')
    .trim()
    .split(/\s+/)
    .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

export default function ProjectDetailPage({ params: { id, locale } }: { params: { id: string; locale: string } }) {
  const tCommon = useTranslations('common');
  const tListing = useTranslations('listing');
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated } = useAuth();

  interface ProjectOwner {
    id: string;
    name: string | null;
    avatarUrl: string | null;
    role: string;
  }

  const [project, setProject] = useState<ProjectData | null>(null);
  const [layouts, setLayouts] = useState<LayoutItem[]>([]);
  const [owner, setOwner] = useState<ProjectOwner | null>(null);
  const [projectUnits, setProjectUnits] = useState<ProjectUnit[]>([]);
  const [similarListings, setSimilarListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [descExpanded, setDescExpanded] = useState(false);
  const [brochureModalOpen, setBrochureModalOpen] = useState(false);
  const [activePhotoIdx, setActivePhotoIdx] = useState(0);

  // Custom states for qualification/reveal
  const [isQualified, setIsQualified] = useState(false);
  const [revealedContact, setRevealedContact] = useState<{ phone?: string; email?: string } | null>(null);
  const [chatOpen, setChatOpen] = useState(false);
  const [targetLayoutId, setTargetLayoutId] = useState<string | undefined>(undefined);

  // Lightbox and Media States
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxTab, setLightboxTab] = useState<'photos' | 'video' | 'location'>('photos');

  // Tab states
  const [activeTab, setActiveTab] = useState<'description' | 'units' | 'floorplans'>('description');
  const [selectedLayoutId, setSelectedLayoutId] = useState<string>('');

  // Sidebar Advertisement
  const [sidebarAdImage, setSidebarAdImage] = useState<string>('');
  const [sidebarAdLink, setSidebarAdLink] = useState<string>('');
  const [sidebarAdAspectRatio, setSidebarAdAspectRatio] = useState<string>('auto');
  const [copied, setCopied] = useState(false);

  // Favorites States
  const [projectFavorited, setProjectFavorited] = useState(false);
  const [narrativeExpanded, setNarrativeExpanded] = useState(false);
  const [isToggling, setIsToggling] = useState(false);
  const [amenitiesModalOpen, setAmenitiesModalOpen] = useState(false);

  const handleToggleProjectFavorite = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isAuthenticated) {
      router.push(`/${locale}/auth/login?returnTo=${pathname}`);
      return;
    }
    if (isToggling) return;
    setIsToggling(true);
    const prev = projectFavorited;
    setProjectFavorited(!prev);
    try {
      const res = await api.toggleProjectFavorite(id);
      if (!res.success) {
        setProjectFavorited(prev);
      } else {
        setProjectFavorited(!!res.data?.isFavorited);
      }
    } catch {
      setProjectFavorited(prev);
    } finally {
      setIsToggling(false);
    }
  };

  useEffect(() => {
    async function fetchProject() {
      setLoading(true);
      try {
        const res = await api.getProjectById(id);
        if (res.success && res.data) {
          setProject(res.data.project);
          setLayouts(res.data.layouts || []);
          setOwner(res.data.owner);
          setProjectUnits(res.data.projectUnits || []);
          setProjectFavorited(!!res.data.isFavorited);

          if (res.data.isQualified) {
            setIsQualified(true);
            const contactRes = await api.revealProjectContact(id);
            if (contactRes.success && contactRes.data) {
              setRevealedContact(contactRes.data);
            }
          }
        } else {
          setProject(null);
        }
      } catch (err) {
        console.error('Failed to fetch project detail:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchProject();
  }, [id]);

  useEffect(() => {
    if (layouts.length > 0 && !selectedLayoutId) {
      setSelectedLayoutId(layouts[0].id);
    }
  }, [layouts, selectedLayoutId]);

  useEffect(() => {
    if (!project) return;
    const currentProject = project;
    async function fetchSimilar() {
      try {
        const query = `city=${currentProject.city}&limit=4`;
        const res = await api.getListings(query);
        const items = res.success && res.data ? (res.data.items || []) : [];
        const filtered = items.filter((item: any) => item.projectId !== currentProject.id);
        setSimilarListings(filtered.slice(0, 3));
      } catch {
        console.log('Similar fetch failed silently');
      }
    }
    fetchSimilar();
  }, [project]);

  useEffect(() => {
    if (layouts.length > 0) {
      let initialId = layouts[0].id;
      if (typeof window !== 'undefined') {
        const searchParams = new URLSearchParams(window.location.search);
        const layoutParam = searchParams.get('layout');
        if (layoutParam && layouts.some(l => l.id === layoutParam)) {
          initialId = layoutParam;
          
          // Smooth scroll to floor plans layout
          setTimeout(() => {
            const element = document.getElementById('project-floor-plans');
            if (element) {
              element.scrollIntoView({ behavior: 'smooth' });
            }
          }, 400);
        }
      }
      setSelectedLayoutId(initialId);
    }
    setNarrativeExpanded(false);
  }, [layouts]);

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
      .catch(() => { });
  }, []);

  const scrollToLayout = (layoutId: string) => {
    setSelectedLayoutId(layoutId);
    setTimeout(() => {
      const el = document.getElementById('project-floor-plans');
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 50);
  };

  const handleQualificationSuccess = async () => {
    try {
      const res = await api.revealProjectContact(id);
      if (res.success && res.data) {
        setRevealedContact(res.data);
        setIsQualified(true);
        setChatOpen(false); // Auto-close chat on success
      }
    } catch (err) {
      console.error('Failed to reveal project contact info', err);
    }
  };

  const handleContactAttempt = (type: 'phone' | 'email' | 'whatsapp') => {
    if (isQualified && revealedContact) {
      const phoneNo = revealedContact.phone || '+966538498580';
      const emailAddress = revealedContact.email || 'info@saudire.com';
      if (type === 'phone') window.location.href = `tel:${phoneNo}`;
      if (type === 'email') window.location.href = `mailto:${emailAddress}?subject=Project inquiry: ${title}`;
      if (type === 'whatsapp') {
        window.open(`https://wa.me/${phoneNo.replace(/[+\s\-]/g, '')}?text=I am interested in project: ${title}`, '_blank');
      }
    } else {
      setChatOpen(true);
    }
  };

  const handleShare = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const shareData = {
      title: title || 'Saudi Real Estate Project',
      text: `Check out this project on Saudi Real Estate: ${title}`,
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

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-white">
        <Loader2 className="w-16 h-16 text-primary-600 animate-spin mb-4" />
        <p className="text-charcoal-muted font-bold font-serif uppercase tracking-widest">
          {locale === 'ar' ? 'جاري تحميل تفاصيل المجمع السكني...' : 'Loading Project Development Details...'}
        </p>
      </div>
    );
  }

  if (!project) notFound();

  const title = locale === 'ar' ? project.nameAr : project.nameEn;
  const description = locale === 'ar' ? (project.descriptionAr || project.descriptionEn) : (project.descriptionEn || project.descriptionAr);
  const location = [project.district, project.city].filter(Boolean).join(locale === 'ar' ? '، ' : ', ');

  // Find minimum price across all layouts
  const minPrice = layouts.length > 0
    ? Math.min(...layouts.map(l => l.price))
    : 0;

  const maxPrice = layouts.length > 0
    ? Math.max(...layouts.map(l => l.price))
    : 0;

  const selectedLayout = layouts.find(l => l.id === selectedLayoutId) || layouts[0] || null;

  // Find photos list
  const photosList = project.photos && project.photos.length > 0
    ? project.photos
    : ['https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=1200&q=80'];

  const statusBadges = {
    READY: locale === 'ar' ? 'جاهز للسكن' : 'Ready to Move',
    OFF_PLAN: locale === 'ar' ? 'على الخارطة' : 'Off-Plan',
    UNDER_CONSTRUCTION: locale === 'ar' ? 'قيد الإنشاء' : 'Under Construction'
  };

  const statusColors = {
    READY: 'bg-emerald-50 text-emerald-700 border-emerald-100',
    OFF_PLAN: 'bg-amber-50 text-amber-700 border-amber-100',
    UNDER_CONSTRUCTION: 'bg-blue-50 text-blue-700 border-blue-100'
  };

  const getCleanLayoutTitle = (layout: LayoutItem | null) => {
    if (!layout) return '';
    const isUuid = (str: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
    const title = locale === 'ar' ? layout.titleAr : (layout.titleEn || layout.titleAr);
    if (!title || isUuid(title)) {
      const typeKey = (layout.type || 'APARTMENT').toUpperCase();
      const typeEn = typeKey.charAt(0).toUpperCase() + typeKey.slice(1).toLowerCase();
      const typeTranslationsAr: Record<string, string> = {
        APARTMENT: 'شقة سكنية',
        VILLA: 'فيلا فاخرة',
        TOWNHOUSE: 'تاون هاوس',
        DUPLEX: 'دوبلكس',
        PENTHOUSE: 'بنتهاوس فاخر',
        STUDIO: 'استوديو سكني',
        LAND: 'أرض سكنية',
      };
      const typeTranslationsEn: Record<string, string> = {
        APARTMENT: 'Residential Apartment',
        VILLA: 'Luxury Villa',
        TOWNHOUSE: 'Modern Townhouse',
        DUPLEX: 'Duplex Layout',
        PENTHOUSE: 'Elite Penthouse',
        STUDIO: 'Cozy Studio',
        LAND: 'Residential Plot',
      };
      const typeName = locale === 'ar' ? (typeTranslationsAr[typeKey] || 'وحدة سكنية') : (typeTranslationsEn[typeKey] || typeEn);
      const beds = layout.bedrooms ? (locale === 'ar' ? `${layout.bedrooms} غرف` : `${layout.bedrooms} Bed`) : '';
      
      if (locale === 'ar') {
        const parts = [typeName];
        if (beds) parts.push(beds);
        if (layout.areaSqm) parts.push(`${layout.areaSqm} م²`);
        return parts.join(' - ');
      } else {
        const parts = [typeName];
        if (beds) parts.push(beds);
        if (layout.areaSqm) parts.push(`(${layout.areaSqm} sqm)`);
        return parts.join(' - ');
      }
    }
    return title;
  };

  return (
    <div className="min-h-screen bg-white text-charcoal pb-32">
      {/* MOBILE-ONLY MINIMAL HEADER: Back Arrow | Share */}
      <div className="md:hidden sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-surface-100 px-4 py-3 flex items-center justify-between">
        <Link href={`/${locale}/projects`} className="p-2 rounded-full hover:bg-surface-50 transition-colors">
          <ArrowLeft className={`w-5 h-5 text-charcoal ${locale === 'ar' ? 'rotate-180' : ''}`} />
        </Link>
        <div className="flex items-center gap-2">
          <button
            onClick={handleToggleProjectFavorite}
            className={`p-2 rounded-full border transition-all ${projectFavorited ? 'bg-red-50 text-red-500 border-red-200' : 'border-surface-200 hover:bg-surface-50'}`}
          >
            <Heart className={`w-5 h-5 ${projectFavorited ? 'fill-current' : ''}`} />
          </button>
          <button onClick={handleShare} className="p-2 rounded-full border border-surface-200 hover:bg-surface-50 transition-all">
            <Share2 className="w-5 h-5 text-charcoal-muted" />
          </button>
        </div>
      </div>

      {/* DESKTOP HEADER: Full breadcrumb + share */}
      <div className="hidden md:block bg-white/95 backdrop-blur-md border-b border-surface-200 py-4 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href={`/${locale}/projects`} className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-charcoal-muted hover:text-primary-600 transition-colors">
              <ArrowLeft className={`w-4 h-4 ${locale === 'ar' ? 'rotate-180' : ''}`} />
              {locale === 'ar' ? 'العودة للبحث' : 'Back to Search'}
            </Link>
            <div className="h-4 w-px bg-surface-200" />
            <div className="flex items-center gap-2 text-[10px] font-bold text-charcoal-muted uppercase tracking-widest">
              <span>{project.city}</span>
              {project.district && (
                <>
                  <ChevronRight className={`w-3 h-3 ${locale === 'ar' ? 'rotate-180' : ''}`} />
                  <span>{project.district}</span>
                </>
              )}
              <ChevronRight className={`w-3 h-3 ${locale === 'ar' ? 'rotate-180' : ''}`} />
              <span className="text-primary-600 truncate max-w-[200px]">{title}</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleToggleProjectFavorite}
              className={`p-2.5 rounded-xl border transition-all ${projectFavorited ? 'bg-red-50 text-red-500 border-red-200' : 'border-surface-200 hover:bg-surface-50'}`}
            >
              <Heart className={`w-5 h-5 ${projectFavorited ? 'fill-current' : ''}`} />
            </button>
            <button onClick={handleShare} className="p-2.5 rounded-xl border border-surface-200 hover:bg-surface-50 transition-all">
              <Share2 className="w-5 h-5 text-charcoal-muted" />
            </button>
          </div>
        </div>
      </div>

      {/* PHOTO GRID / MEDIA GALLERY (On Top) */}
      <div className="max-w-7xl mx-auto px-4 md:px-6 py-4 md:py-6">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 h-auto md:h-[550px] overflow-hidden rounded-3xl">
          {/* Main Feature Photo */}
          <div
            className="col-span-1 md:col-span-8 relative aspect-[4/3] md:aspect-auto group overflow-hidden rounded-2xl border border-surface-150 shadow-sm cursor-pointer"
            onClick={() => { setLightboxTab('photos'); setLightboxOpen(true); }}
          >
            {photosList[0] && (
              <Image
                src={photosList[0]}
                alt={title}
                fill
                className="object-cover group-hover:scale-105 transition-transform duration-700"
                priority
                unoptimized
              />
            )}

            {project.completionStatus && (
              <div className="absolute top-4 left-4 flex gap-2">
                <span className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border text-[10px] font-black uppercase tracking-wider backdrop-blur-md text-white border-white/10 bg-black/45 shadow-xl`}>
                  {project.completionStatus === 'READY' && <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />}
                  {project.completionStatus === 'OFF_PLAN' && <Clock className="w-3.5 h-3.5 text-amber-400" />}
                  {project.completionStatus === 'UNDER_CONSTRUCTION' && <Construction className="w-3.5 h-3.5 text-blue-400" />}
                  {statusBadges[project.completionStatus]}
                </span>
              </div>
            )}

            <div className="absolute bottom-4 left-4 flex flex-wrap gap-2 z-10">
              {project.brochureUrl && (
                <button
                  onClick={(e) => { e.stopPropagation(); setBrochureModalOpen(true); }}
                  className="bg-primary-600/90 backdrop-blur-md text-white text-[10px] font-black uppercase tracking-widest px-4 py-2.5 rounded-full border border-primary-500 flex items-center gap-2 hover:bg-primary-700 transition-all shadow-lg shadow-primary-500/20"
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  {locale === 'ar' ? 'الكتيب الرقمي' : 'Brochure'}
                </button>
              )}
              <button
                onClick={(e) => { e.stopPropagation(); setLightboxTab('video'); setLightboxOpen(true); }}
                className="bg-charcoal/50 backdrop-blur-md text-white text-[10px] font-black uppercase tracking-widest px-4 py-2.5 rounded-full border border-white/20 flex items-center gap-2 hover:bg-charcoal/70 transition-all"
              >
                <Zap className="w-3.5 h-3.5" />
                {locale === 'ar' ? 'عرض الفيديو' : 'See Video'}
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); setLightboxTab('location'); setLightboxOpen(true); }}
                className="bg-charcoal/50 backdrop-blur-md text-white text-[10px] font-black uppercase tracking-widest px-4 py-2.5 rounded-full border border-white/20 flex items-center gap-2 hover:bg-charcoal/70 transition-all"
              >
                <MapIcon className="w-3.5 h-3.5" />
                {locale === 'ar' ? 'الخريطة' : 'Map'}
              </button>
            </div>
          </div>

          {/* Secondary Photo Stack */}
          <div className="hidden md:flex md:col-span-4 flex-col gap-3 h-full">
            <button
              className="relative group overflow-hidden rounded-2xl border border-surface-150 shadow-sm flex-1"
              onClick={() => { setLightboxTab('photos'); setLightboxOpen(true); }}
            >
              {photosList[1] ? (
                <Image src={photosList[1]} alt="" fill className="object-cover group-hover:scale-105 transition-transform duration-500" unoptimized />
              ) : (
                <div className="w-full h-full bg-surface-50 flex items-center justify-center text-surface-200">
                  <Building className="w-8 h-8" />
                </div>
              )}
            </button>
            <button
              className="relative group overflow-hidden bg-charcoal rounded-2xl border border-surface-150 shadow-sm flex-1"
              onClick={() => { setLightboxTab('photos'); setLightboxOpen(true); }}
            >
              {photosList[2] ? (
                <>
                  <Image src={photosList[2]} alt="" fill className="object-cover opacity-50" unoptimized />
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-white">
                    <span className="text-2xl font-black">+{Math.max(0, photosList.length - 2)}</span>
                    <span className="text-[10px] font-bold uppercase tracking-widest opacity-70">Photos</span>
                  </div>
                </>
              ) : (
                <div className="w-full h-full bg-slate-900 flex items-center justify-center text-white/40">
                  <Building className="w-8 h-8" />
                </div>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Project Primary Info Section (Redesigned with Premium Luxury Aesthetics) */}
      <div className="max-w-7xl mx-auto px-4 md:px-6 py-6">
        <div className="bg-gradient-to-br from-surface-50/50 via-white to-surface-50/30 border border-surface-200 rounded-3xl p-6 md:p-8 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden">
          {/* Decorative subtle background shapes */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary-500/5 rounded-full blur-[40px] pointer-events-none" />
          <div className="absolute -bottom-8 -left-8 w-24 h-24 bg-emerald-500/5 rounded-full blur-[30px] pointer-events-none" />
          <div className="space-y-4 relative z-10 flex-1">
            <div className="flex flex-wrap gap-2.5 items-center">
              {project.completionStatus && (
                <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-[10px] font-black uppercase tracking-wider ${statusColors[project.completionStatus]}`}>
                  <Building className="w-3.5 h-3.5" />
                  {statusBadges[project.completionStatus]}
                </span>
              )}
              {project.expectedDelivery && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-surface-200 bg-white text-xs font-bold text-charcoal-muted">
                  <Clock className="w-3.5 h-3.5 text-primary-500" />
                  {locale === 'ar' ? `التسليم: ${project.expectedDelivery}` : `Delivery: ${project.expectedDelivery}`}
                </span>
              )}
            </div>
            <div className="space-y-2">
              <h1 className="text-3xl md:text-5xl font-serif font-black text-charcoal tracking-tight leading-none">
                {title}
              </h1>
              <div className="flex items-center gap-1.5 text-sm font-bold text-charcoal-muted">
                <MapPin className="w-4 h-4 text-primary-500 shrink-0" />
                <span>{location}</span>
              </div>
            </div>
          </div>
          {/* Premium Price Widget */}
          <div className="relative z-10 flex flex-col md:items-end justify-center bg-white border border-surface-200/80 rounded-2xl p-5 md:min-w-[280px] shadow-sm shrink-0">
            <span className="text-[10px] text-charcoal-muted uppercase font-black tracking-widest block mb-1">
              {locale === 'ar' ? 'تبدأ أسعار الوحدات من' : 'Unit Prices Starting From'}
            </span>
            <span className="text-3xl font-black text-primary-600 block leading-tight">
              {minPrice && maxPrice && minPrice !== maxPrice ? (
                <>
                  {formatPriceCompact(minPrice, locale as any)} - {formatPriceCompact(maxPrice, locale as any)}
                </>
              ) : (
                formatPriceCompact(minPrice, locale as any)
              )}
            </span>
            <span className="text-[10px] text-charcoal-muted font-bold block mt-1">
              {locale === 'ar' ? 'تخضع الأسعار للتوفر الحالي' : 'Prices subject to live availability'}
            </span>
          </div>
        </div>
      </div>

      {/* Main Details & Grid */}
      <div className="max-w-7xl mx-auto px-4 md:px-6 py-8">
        <div className="grid lg:grid-cols-3 gap-8 lg:gap-12">

          {/* Left Column - Scrollable Content */}
          <div className="lg:col-span-2 space-y-12 min-w-0">

            {/* Description Narrative */}
            {description && (
              <div className="space-y-4 border-b border-surface-150 pb-10">
                <h3 className="text-xl font-serif font-bold text-charcoal">
                  {locale === 'ar' ? 'عن المشروع' : 'About the Project'}
                </h3>
                <div className="relative">
                  <p className={clsx(
                    "text-charcoal-muted leading-relaxed text-base transition-all",
                    !descExpanded && "line-clamp-6",
                    locale === 'ar' && "font-arabic text-right"
                  )}>
                    {description}
                  </p>
                  <button
                    onClick={() => setDescExpanded(!descExpanded)}
                    className="text-xs font-black uppercase tracking-wider text-primary-600 hover:underline mt-3 inline-block font-sans"
                  >
                    {descExpanded
                      ? (locale === 'ar' ? 'عرض أقل' : 'Read Less')
                      : (locale === 'ar' ? 'عرض المزيد' : 'Read More')}
                  </button>
                </div>
              </div>
            )}

            {/* Shared Project Amenities */}
            {project.amenities && Object.values(project.amenities).filter(Boolean).length > 0 && (
              <div className="space-y-6 border-b border-surface-150 pb-10">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-serif font-bold text-charcoal">
                    {locale === 'ar' ? 'المرافق المشتركة في المجمع' : 'Compound Shared Amenities'}
                  </h3>
                  {Object.values(project.amenities).filter(Boolean).length > 9 && (
                    <button
                      onClick={() => setAmenitiesModalOpen(true)}
                      className="text-[10px] font-black text-primary-600 uppercase tracking-widest hover:underline font-sans"
                    >
                      {locale === 'ar' ? 'عرض كل المرافق' : 'View All Amenities'}
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3.5">
                  {Object.entries(project.amenities)
                    .filter(([, val]) => val)
                    .slice(0, 9)
                    .map(([key], idx) => {
                      const label = getAmenityLabel(key, locale);
                      return (
                        <div key={idx} className="bg-surface-50 p-3.5 rounded-xl border border-surface-200 flex items-center gap-2.5 hover:border-primary-100 hover:bg-primary-50/10 transition-colors shadow-sm">
                          <CheckCircle className="w-4 h-4 text-primary-500 shrink-0" />
                          <span className={clsx("text-xs font-bold text-charcoal-muted", locale === 'ar' && "font-arabic text-right")}>
                            {label}
                          </span>
                        </div>
                      );
                    })}
                </div>
                {Object.values(project.amenities).filter(Boolean).length > 9 && (
                  <button
                    onClick={() => setAmenitiesModalOpen(true)}
                    className="w-full py-3 rounded-xl border-2 border-dashed border-primary-200 text-primary-600 font-bold text-sm hover:bg-primary-50 transition-all flex items-center justify-center gap-2 font-sans mt-4"
                  >
                    <span>+{Object.values(project.amenities).filter(Boolean).length - 9} {locale === 'ar' ? 'المرافق' : 'Amenities'}</span>
                    <span className="text-[10px] uppercase tracking-widest">— {locale === 'ar' ? 'عرض كل المرافق' : 'View All Amenities'}</span>
                  </button>
                )}
              </div>
            )}

            {/* MOBILE ONLY: Digital Brochure and Broker card */}
            <div className="lg:hidden space-y-6 pb-6 border-b border-surface-150">
              {project.brochureUrl && (
                <div className="relative overflow-hidden rounded-2xl p-6 border border-primary-500/20 bg-gradient-to-br from-primary-500/5 via-surface-50 to-primary-500/10 shadow-md space-y-4 font-sans">
                  <div className="absolute top-0 right-0 transform translate-x-4 -translate-y-4 opacity-5">
                    <BookOpen className="w-32 h-32 text-primary-500" />
                  </div>
                  <div className="space-y-1 relative z-10">
                    <span className="text-[9px] font-black text-primary-600 uppercase tracking-widest block">
                      {locale === 'ar' ? 'محتوى حصري ومميز' : 'PREMIUM MATERIALS'}
                    </span>
                    <h4 className="text-lg font-serif font-bold text-charcoal">
                      {locale === 'ar' ? 'الكتيب الرقمي للمشروع' : 'Official Digital Brochure'}
                    </h4>
                    <p className="text-xs text-charcoal-muted leading-relaxed">
                      {locale === 'ar'
                        ? 'تصفح تفاصيل المساحات، الترخيص القانوني من الهيئة العامة للعقار وتشطيبات الوحدات.'
                        : 'Access premium project floorplans, REGA certificates, and exclusive unit finishes directly from the developer.'}
                    </p>
                  </div>
                  <button
                    onClick={() => setBrochureModalOpen(true)}
                    className="w-full py-3 px-4 rounded-xl flex items-center justify-center gap-2.5 font-bold text-sm bg-gradient-to-r from-primary-600 to-primary-700 hover:from-primary-700 hover:to-primary-800 text-white transition-all shadow-lg shadow-primary-600/15 group active:scale-[0.98]"
                  >
                    <BookOpen className="w-4 h-4 group-hover:scale-110 transition-transform" />
                    {locale === 'ar' ? 'عرض الكتيب التعريفي' : 'View Brochure Booklet'}
                  </button>
                </div>
              )}
              <AgentContactCard
                owner={owner}
                locale={locale}
                handleContactAttempt={handleContactAttempt}
                isQualified={isQualified}
                revealedContact={revealedContact}
                t={tListing}
              />
            </div>

            {/* Property Types & Units Section */}
            {projectUnits.length > 0 && (
              <div className="space-y-8 border-b border-surface-150 pb-10">
                <div className="border-b border-surface-100 pb-4">
                  <h3 className="text-xl font-serif font-bold text-charcoal">
                    {locale === 'ar' ? 'فئات الوحدات والتوفر' : 'Property Types & Units'}
                  </h3>
                  <p className="text-xs text-charcoal-muted mt-1 font-sans">
                    {locale === 'ar' 
                      ? 'حجز وحدة سكنية يؤمن فرصتك الاستثمارية ويضمن لك السعر الحالي قبل أي زيادة.' 
                      : 'Reserving a unit secures your investment opportunity and locks in the current price before it increases.'}
                  </p>
                </div>
                {/* Detailed breakdown grouped by Property Type */}
                {(() => {
                  const layoutsByType = layouts.reduce((acc, layout) => {
                    const typeKey = (layout.type || 'APARTMENT').toUpperCase();
                    if (!acc[typeKey]) acc[typeKey] = [];
                    acc[typeKey].push(layout);
                    return acc;
                  }, {} as Record<string, LayoutItem[]>);
                  const typeTranslationsEn: Record<string, string> = {
                    APARTMENT: 'Apartments',
                    VILLA: 'Villas',
                    TOWNHOUSE: 'Townhouses',
                    DUPLEX: 'Duplexes',
                    PENTHOUSE: 'Penthouses',
                    STUDIO: 'Studios',
                    LAND: 'Land Plots',
                  };
                  
                  const typeTranslationsAr: Record<string, string> = {
                    APARTMENT: 'شقق',
                    VILLA: 'فلل',
                    TOWNHOUSE: 'تاون هاوس',
                    DUPLEX: 'دوبلكس',
                    PENTHOUSE: 'بنتهاوس',
                    STUDIO: 'استوديو',
                    LAND: 'أراضي',
                  };
                  const typeSingularEn: Record<string, string> = {
                    APARTMENT: 'Residential Apartment',
                    VILLA: 'Luxury Villa',
                    TOWNHOUSE: 'Modern Townhouse',
                    DUPLEX: 'Duplex Layout',
                    PENTHOUSE: 'Elite Penthouse',
                    STUDIO: 'Cozy Studio',
                    LAND: 'Residential Plot',
                  };
                  const typeSingularAr: Record<string, string> = {
                    APARTMENT: 'شقة سكنية',
                    VILLA: 'فيلا فاخرة',
                    TOWNHOUSE: 'تاون هاوس',
                    DUPLEX: 'دوبلكس',
                    PENTHOUSE: 'بنتهاوس فاخر',
                    STUDIO: 'استوديو سكني',
                    LAND: 'أرض سكنية',
                  };
                  return (
                    <div className="space-y-4">
                      {Object.entries(layoutsByType).map(([typeKey, typeLayouts]) => {
                        const headingLabel = locale === 'ar' 
                          ? (typeSingularAr[typeKey] || typeKey) 
                          : (typeSingularEn[typeKey] || (typeKey.charAt(0).toUpperCase() + typeKey.slice(1).toLowerCase().replace(/_/g, ' ')));
                        // Calculate aggregates
                        const minPrice = Math.min(...typeLayouts.map(l => l.price));
                        
                        const areas = typeLayouts.map(l => l.areaSqm ? Number(l.areaSqm) : 0).filter(a => a > 0);
                        const minArea = areas.length > 0 ? Math.min(...areas) : 0;
                        const maxArea = areas.length > 0 ? Math.max(...areas) : 0;
                        const areaRange = minArea === maxArea 
                          ? `${minArea} Sq.M.` 
                          : `${minArea} - ${maxArea} Sq.M.`;
                        const areaRangeAr = minArea === maxArea
                          ? `${minArea} م²`
                          : `${minArea} - ${maxArea} م²`;
                        const bedCounts = Array.from(new Set(typeLayouts.map(l => l.bedrooms).filter(b => b !== null && b > 0))) as number[];
                        bedCounts.sort((a, b) => a - b);
                        const bedLabel = bedCounts.length === 0
                          ? ''
                          : bedCounts.length === 1
                            ? (locale === 'ar' ? `${bedCounts[0]} غرف` : `${bedCounts[0]} Beds`)
                            : (locale === 'ar' ? `${bedCounts.join('، ')} غرف` : `${bedCounts.join(', ')} Beds`);
                        // Calculate total available units across this property type layouts
                        let typeAvail = 0;
                        let typeTotal = 0;
                        typeLayouts.forEach(layout => {
                          const layoutUnits = projectUnits.filter(u => u.listingId === layout.id);
                          typeTotal += layoutUnits.length;
                          typeAvail += layoutUnits.filter(u => u.status === 'AVAILABLE').length;
                        });
                        return (
                          <div 
                            key={typeKey}
                            onClick={() => scrollToLayout(typeLayouts[0].id)}
                            className="p-5 rounded-2xl border border-surface-200 bg-white hover:border-primary-500 hover:shadow-md transition-all duration-300 flex justify-between items-center cursor-pointer group font-sans"
                          >
                            <div className="flex items-center gap-4 min-w-0">
                              {/* Icon box */}
                              <div className="w-16 h-16 rounded-2xl border border-surface-150 bg-surface-50 flex items-center justify-center shrink-0">
                                <Building className="w-8 h-8 text-primary-500" />
                              </div>
                              {/* Titles */}
                              <div className="min-w-0 space-y-1 text-left">
                                <h4 className="text-base font-serif font-black text-charcoal truncate group-hover:text-primary-600 transition-colors">
                                  {headingLabel}
                                </h4>
                                <div className="flex flex-wrap items-center gap-x-2 text-xs text-charcoal-muted font-semibold">
                                  <span>{locale === 'ar' ? areaRangeAr : areaRange}</span>
                                  {bedLabel && (
                                    <>
                                      <span>•</span>
                                      <span>{bedLabel}</span>
                                    </>
                                  )}
                                </div>
                                <span className="text-xs text-primary-600 font-extrabold block">
                                  {locale === 'ar' ? 'تبدأ من ' : 'Starting from '} 
                                  {formatPriceCompact(minPrice, locale as 'en' | 'ar')}
                                </span>
                              </div>
                            </div>
                            {/* Right side available stats */}
                            <div className="text-right shrink-0 flex flex-col items-end gap-1">
                              <span className="text-[10px] text-charcoal-muted font-black uppercase tracking-wider block">
                                {locale === 'ar' ? 'الوحدات المتاحة' : 'Available Units'}
                              </span>
                              <span className="text-xl font-black text-charcoal block leading-none mt-1">
                                {typeAvail}/{typeTotal}
                              </span>
                              {typeTotal > 0 && (
                                <span className="text-[9px] text-emerald-600 font-bold block mt-1">
                                  {(() => {
                                    const percent = Math.round(((typeTotal - typeAvail) / typeTotal) * 100);
                                    return locale === 'ar' ? `(تم بيع %${percent})` : `(${percent}% sold)`;
                                  })()}
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>
            )}

            {/* Floor Plans Section */}
            <div id="project-floor-plans" className="space-y-6 border-b border-surface-150 pb-10 scroll-mt-24">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                  <h3 className="text-xl font-serif font-bold text-charcoal">
                    {locale === 'ar' ? 'مخططات طوابق الوحدات السكنية' : 'Interactive Layout & Floor Plans'}
                  </h3>
                  <p className="text-xs text-charcoal-muted mt-1 font-sans">
                    {locale === 'ar' ? 'تصفح النماذج السكنية المتوفرة بمختلف المساحات والتصاميم' : 'Select a layout label to view specific details and floor plan schematics.'}
                  </p>
                </div>
                {layouts.length > 0 && (
                  <div className="text-start md:text-end font-sans">
                    <span className="text-[10px] text-charcoal-muted uppercase font-black tracking-wider block">
                      {locale === 'ar' ? 'المخططات المتوفرة' : 'Available Layouts'}
                    </span>
                    <span className="text-3xl font-black text-charcoal mt-1 block leading-none">
                      {layouts.length}
                    </span>
                  </div>
                )}
              </div>

              {layouts.length === 0 ? (
                <div className="py-16 text-center border-2 border-dashed border-surface-200 rounded-3xl bg-surface-50 text-surface-500 text-sm font-medium">
                  {locale === 'ar' ? 'لم يتم العثور على مخططات وحدات متوفرة حالياً.' : 'No layout catalog available currently.'}
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                  
                  {/* Left Column: Layout selector list (vertical on desktop, horizontal scroll on mobile) */}
                  <div className="lg:col-span-4 lg:sticky lg:top-28 lg:max-h-[620px] lg:overflow-y-auto lg:pr-2 space-y-3 scrollbar-thin scrollbar-thumb-surface-300 scrollbar-track-transparent">
                    
                    {/* Mobile Selector: Horizontal scroll */}
                    <div className="flex lg:hidden gap-2.5 overflow-x-auto pb-3 pt-1 scrollbar-thin no-scrollbar">
                      {layouts.map((layout) => {
                        const layTitle = getCleanLayoutTitle(layout);
                        const isActive = layout.id === selectedLayoutId;
                        const layoutUnits = projectUnits.filter(u => u.listingId === layout.id);
                        const availCount = layoutUnits.filter(u => u.status === 'AVAILABLE').length;
                        return (
                          <button
                            key={layout.id}
                            onClick={() => setSelectedLayoutId(layout.id)}
                            className={clsx(
                              "w-56 px-4 py-3.5 rounded-xl border transition-all flex flex-col gap-1 shrink-0 font-sans text-start relative group",
                              isActive 
                                ? "border-primary-500 bg-primary-50/50 shadow-sm"
                                : "border-surface-200 hover:border-surface-300 hover:bg-surface-50 bg-white"
                            )}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-xs font-black text-primary-600">
                                {formatPriceCompact(layout.price, locale as 'en' | 'ar')}
                              </span>
                              {projectUnits.length > 0 && layoutUnits.length > 0 && (
                                <span className={clsx(
                                  "text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded",
                                  availCount <= 2 ? "bg-rose-50 text-rose-600 border border-rose-100" : "bg-emerald-50 text-emerald-600 border border-emerald-100"
                                )}>
                                  {locale === 'ar' ? `${availCount} متاحة` : `${availCount} left`}
                                </span>
                              )}
                            </div>
                            <span className={clsx("text-xs font-bold text-charcoal truncate mt-1.5", locale === 'ar' && "font-arabic")}>
                              {layTitle}
                            </span>
                            <span className="text-[9px] text-charcoal-muted font-bold uppercase tracking-wider">
                              {layout.bedrooms} {locale === 'ar' ? 'غرف' : 'Beds'} • {layout.areaSqm} sqm
                            </span>
                          </button>
                        );
                      })}
                    </div>
                    {/* Desktop Selector: Sticky vertical list */}
                    <div className="hidden lg:flex flex-col gap-3">
                      <span className="text-[10px] font-black uppercase tracking-widest text-charcoal-muted block px-1">
                        {locale === 'ar' ? 'اختر مخطط طابق' : 'SELECT FLOOR PLAN'}
                      </span>
                      {layouts.map((layout) => {
                        const layTitle = getCleanLayoutTitle(layout);
                        const isActive = layout.id === selectedLayoutId;
                        const layoutUnits = projectUnits.filter(u => u.listingId === layout.id);
                        const availCount = layoutUnits.filter(u => u.status === 'AVAILABLE').length;
                        return (
                          <button
                            key={layout.id}
                            onClick={() => setSelectedLayoutId(layout.id)}
                            className={clsx(
                              "w-full px-5 py-4 rounded-2xl border transition-all flex flex-col gap-1.5 font-sans text-start relative group shadow-sm",
                              isActive 
                                ? "border-primary-500 bg-primary-50/70 ring-1 ring-primary-500/20"
                                : "border-surface-200 hover:border-surface-300 hover:bg-surface-50 bg-white"
                            )}
                          >
                            <div className="flex items-center justify-between gap-2 w-full">
                              <span className="text-sm font-black text-primary-600">
                                {formatPriceCompact(layout.price, locale as 'en' | 'ar')}
                              </span>
                              {projectUnits.length > 0 && layoutUnits.length > 0 && (
                                <span className={clsx(
                                  "text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-lg",
                                  availCount <= 2 ? "bg-rose-50 text-rose-600 border border-rose-100" : "bg-emerald-50 text-emerald-600 border border-emerald-100"
                                )}>
                                  {locale === 'ar' ? `${availCount} متاحة` : `${availCount} left`}
                                </span>
                              )}
                            </div>
                            <span className={clsx("text-sm font-bold text-charcoal mt-1 line-clamp-1 group-hover:text-primary-600 transition-colors", locale === 'ar' && "font-arabic")}>
                              {layTitle}
                            </span>
                            <div className="flex items-center gap-2 text-[10px] text-charcoal-muted font-bold uppercase tracking-wider mt-0.5">
                              <span>{layout.bedrooms} {locale === 'ar' ? 'غرف' : 'Beds'}</span>
                              <span>•</span>
                              <span>{layout.areaSqm} sqm</span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  
                  {/* Selected Layout View */}
                  <div className="lg:col-span-8 w-full">
                    {selectedLayout ? (
                      <div className="flex flex-col gap-6 w-full">
                        {/* Title stretched */}
                        <div className="w-full">
                          <h4 className={clsx("text-2xl font-serif font-black text-charcoal leading-tight", locale === 'ar' && "font-arabic")}>
                            {getCleanLayoutTitle(selectedLayout)}
                          </h4>
                        </div>
                        
                        {/* Symbols Row immediately after title */}
                        <div className="flex flex-wrap items-center gap-x-6 gap-y-3 py-3 border-y border-surface-150 text-xs font-bold text-charcoal-muted font-sans">
                          <span className="text-lg font-black text-primary-600 leading-none">
                            {formatPriceCompact(selectedLayout.price, locale as 'en' | 'ar')}
                          </span>
                          <span className="h-4 w-px bg-surface-200" />
                          <span className="flex items-center gap-1.5">
                            <Bed className="w-4 h-4 text-primary-500" />
                            <span>{selectedLayout.bedrooms} {locale === 'ar' ? 'غرف' : 'Beds'}</span>
                          </span>
                          <span className="h-4 w-px bg-surface-200" />
                          <span className="flex items-center gap-1.5">
                            <Bath className="w-4 h-4 text-primary-500" />
                            <span>{selectedLayout.bathrooms} {locale === 'ar' ? 'حمامات' : 'Baths'}</span>
                          </span>
                          <span className="h-4 w-px bg-surface-200" />
                          <span className="flex items-center gap-1.5">
                            <Square className="w-4 h-4 text-primary-500" />
                            <span>{selectedLayout.areaSqm} {tCommon('sqm')}</span>
                          </span>
                          
                          {(() => {
                            if (projectUnits.length === 0) return null;
                            const selectedLayoutUnits = projectUnits.filter(u => u.listingId === selectedLayout.id);
                            if (selectedLayoutUnits.length === 0) return null;
                            const avail = selectedLayoutUnits.filter(u => u.status === 'AVAILABLE').length;
                            return (
                              <span className="md:ml-auto inline-flex items-center gap-1 px-2.5 py-1 rounded bg-rose-50 text-rose-700 text-[10px] font-black uppercase tracking-wider border border-rose-100">
                                <Clock className="w-3.5 h-3.5 text-rose-500" />
                                {locale === 'ar' ? `متبقي ${avail} وحدات فقط!` : `Only ${avail} units left!`}
                              </span>
                            );
                          })()}
                        </div>
                        {/* Layout Image stretched */}
                        <div className="relative w-full aspect-[16/10] md:aspect-[16/9] max-h-[450px] rounded-2xl overflow-hidden border border-surface-200 bg-surface-50 shadow-inner flex items-center justify-center min-h-[260px] p-2">
                          {selectedLayout.photos && selectedLayout.photos[0] ? (
                            <Image
                              src={selectedLayout.photos[0]}
                              alt={getCleanLayoutTitle(selectedLayout)}
                              fill
                              className="object-contain p-2"
                              unoptimized
                            />
                          ) : (
                            <Building className="w-16 h-16 text-surface-300 animate-pulse" />
                          )}
                        </div>
                        {/* Description Narrative card under image */}
                        {(() => {
                          const narrativeText = locale === 'ar' 
                            ? (selectedLayout.descriptionAr || selectedLayout.descriptionEn) 
                            : (selectedLayout.descriptionEn || selectedLayout.descriptionAr);
                          if (!narrativeText) return null;
                          const shouldShowToggle = narrativeText.length > 200;
                          return (
                            <div className="bg-surface-50 border border-surface-200 p-4 rounded-xl font-sans">
                              <span className="text-[10px] font-black uppercase tracking-widest text-charcoal-muted block mb-1">
                                {locale === 'ar' ? 'تفاصيل المخطط' : 'Layout Narrative'}
                              </span>
                              <p className={clsx(
                                "text-charcoal-muted leading-relaxed text-xs font-semibold transition-all duration-350", 
                                locale === 'ar' && "font-arabic",
                                !narrativeExpanded && shouldShowToggle && "line-clamp-3"
                              )}>
                                {narrativeText}
                              </p>
                              {shouldShowToggle && (
                                <button 
                                  onClick={() => setNarrativeExpanded(!narrativeExpanded)}
                                  className="text-primary-600 hover:text-primary-750 text-xs font-black mt-2 focus:outline-none transition-colors"
                                >
                                  {narrativeExpanded 
                                    ? (locale === 'ar' ? 'عرض أقل' : 'Read Less') 
                                    : (locale === 'ar' ? 'عرض المزيد' : 'Read More')}
                                </button>
                              )}
                            </div>
                          );
                        })()}
                        
                        {/* Physical Unit Matrix */}
                        {projectUnits.length > 0 && (() => {
                          const selectedLayoutUnits = projectUnits.filter(u => u.listingId === selectedLayout.id);
                          if (selectedLayoutUnits.length === 0) return null;
                          
                          const unitsByFloor = selectedLayoutUnits.reduce((acc, unit) => {
                            const floor = unit.floor;
                            if (!acc[floor]) acc[floor] = [];
                            acc[floor].push(unit);
                            return acc;
                          }, {} as Record<number, typeof projectUnits>);

                          return (
                            <div className="mt-8 pt-6 border-t border-surface-150 space-y-6 font-sans">
                              <div>
                                <h5 className="text-sm font-black uppercase tracking-widest text-charcoal">
                                  {locale === 'ar' ? 'جدول الوحدات والتوفر' : 'Physical Unit Matrix'}
                                </h5>
                                <p className="text-xs text-charcoal-muted mt-1">
                                  {locale === 'ar' 
                                    ? 'توزيع الوحدات السكنية وحالة توفرها في طوابق المخطط.' 
                                    : 'Physical unit mapping and live availability layout for this floorplan.'}
                                </p>
                              </div>
                              <div className="space-y-6">
                                {Object.entries(unitsByFloor)
                                  .sort(([f1], [f2]) => Number(f1) - Number(f2))
                                  .map(([floor, units]) => (
                                    <div key={floor} className="space-y-3">
                                      <div className="flex items-center gap-2">
                                        <span className="text-xs font-black uppercase tracking-wider text-charcoal-muted">
                                          {locale === 'ar' ? `الطابق ${floor}` : `Floor ${floor}`}
                                        </span>
                                        <div className="h-px bg-surface-150 flex-1" />
                                      </div>
                                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                                        {units.map((unit) => {
                                          const isAvailable = unit.status === 'AVAILABLE';
                                          const isReserved = unit.status === 'RESERVED';
                                          const isSold = unit.status === 'SOLD';
                                          return (
                                            <div 
                                              key={unit.id} 
                                              className={clsx(
                                                "p-3.5 rounded-xl border flex flex-col gap-1.5 transition-all shadow-sm",
                                                isAvailable && "border-emerald-100 bg-emerald-50/20",
                                                isReserved && "border-amber-100 bg-amber-50/20",
                                                isSold && "border-surface-200 bg-surface-50 opacity-70"
                                              )}
                                            >
                                              <div className="flex items-center justify-between gap-2">
                                                <span className="text-xs font-black text-charcoal">
                                                  {locale === 'ar' ? `وحدة ${unit.unitNumber}` : `Unit ${unit.unitNumber}`}
                                                </span>
                                                <span className={clsx(
                                                  "w-2.5 h-2.5 rounded-full",
                                                  isAvailable && "bg-emerald-500",
                                                  isReserved && "bg-amber-500",
                                                  isSold && "bg-surface-300"
                                                )} />
                                              </div>
                                              <div className="flex items-center justify-between text-[10px] font-bold text-charcoal-muted">
                                                <span>
                                                  {isAvailable && (locale === 'ar' ? 'متاحة' : 'Available')}
                                                  {isReserved && (locale === 'ar' ? 'محجوزة' : 'Reserved')}
                                                  {isSold && (locale === 'ar' ? 'مباعة' : 'Sold')}
                                                </span>
                                                {unit.price && (
                                                  <span>{formatPriceCompact(unit.price, locale as 'en' | 'ar')}</span>
                                                )}
                                              </div>
                                            </div>
                                          );
                                        })}
                                      </div>
                                    </div>
                                  ))}
                              </div>
                            </div>
                          );
                        })()}

                      </div>
                    ) : (
                      <div className="text-center py-20 text-charcoal-muted font-sans border border-surface-200 rounded-2xl bg-surface-50">
                        Select a layout to view details
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Google Map Location */}
            <div id="project-map" className="space-y-4">
              <h3 className="text-xl font-serif font-bold text-charcoal">
                {locale === 'ar' ? 'الموقع الجغرافي للمشروع' : 'Project Geographical Location'}
              </h3>
              <div className="h-[380px] w-full rounded-2xl overflow-hidden border border-surface-200 shadow-sm relative">
                <iframe
                  src={(() => {
                    if (project.mapEmbedUrl) {
                      const match = project.mapEmbedUrl.match(/src="([^"]+)"/);
                      if (match && match[1]) {
                        return match[1];
                      }
                      return project.mapEmbedUrl;
                    }
                    return `https://maps.google.com/maps?q=${encodeURIComponent(location)}&t=&z=13&ie=UTF8&iwloc=&output=embed`;
                  })()}
                  className="w-full h-full border-0"
                  allowFullScreen={false}
                  loading="lazy"
                  title="Google Maps Location"
                />
              </div>
            </div>

            {/* Related Properties / Elite Neighborhood Picks */}
            {similarListings.length > 0 && (
              <div className="space-y-8 pt-12 border-t border-surface-200">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-primary-600 block mb-1">
                    {locale === 'ar' ? 'عقارات مميزة في الجوار' : 'Premium Nearby Properties'}
                  </span>
                  <h3 className="text-3xl font-bold text-charcoal font-serif">
                    {tListing('eliteNeighborhood') || (locale === 'ar' ? 'مخططات سكنية متميزة في الجوار' : 'Elite Neighborhood Picks')}
                  </h3>
                </div>
                <div className="grid md:grid-cols-3 gap-8">
                  {similarListings.map((item, idx) => (
                    <ListingCard key={item.id} listing={item as Listing} index={idx} />
                  ))}
                </div>
              </div>
            )}

          </div>

          {/* Right Column - Common Sidebar Components */}
          <div className="hidden lg:block space-y-6">

            {/* Direct Brochure Card in Desktop Sidebar */}
            {project.brochureUrl && (
              <div className="relative overflow-hidden rounded-2xl p-6 border border-primary-500/20 bg-gradient-to-br from-primary-500/5 via-surface-50 to-primary-500/10 shadow-md space-y-4 font-sans">
                <div className="absolute top-0 right-0 transform translate-x-4 -translate-y-4 opacity-5">
                  <BookOpen className="w-32 h-32 text-primary-500" />
                </div>
                <div className="space-y-1 relative z-10">
                  <span className="text-[9px] font-black text-primary-600 uppercase tracking-widest block">
                    {locale === 'ar' ? 'محتوى حصري ومميز' : 'PREMIUM MATERIALS'}
                  </span>
                  <h4 className="text-base font-serif font-bold text-charcoal">
                    {locale === 'ar' ? 'الكتيب الرقمي للمشروع' : 'Official Digital Brochure'}
                  </h4>
                  <p className="text-xs text-charcoal-muted leading-relaxed">
                    {locale === 'ar'
                      ? 'تصفح تفاصيل المساحات، الترخيص القانوني من الهيئة العامة للعقار وتشطيبات الوحدات.'
                      : 'Access premium project floorplans, REGA certificates, and exclusive unit finishes directly from the developer.'}
                  </p>
                </div>
                <button
                  onClick={() => setBrochureModalOpen(true)}
                  className="w-full py-3 px-4 rounded-xl flex items-center justify-center gap-2.5 font-bold text-sm bg-gradient-to-r from-primary-600 to-primary-700 hover:from-primary-700 hover:to-primary-800 text-white transition-all shadow-lg shadow-primary-600/15 group active:scale-[0.98]"
                >
                  <BookOpen className="w-4 h-4 group-hover:scale-110 transition-transform" />
                  {locale === 'ar' ? 'عرض الكتيب التعريفي' : 'View Brochure Booklet'}
                </button>
              </div>
            )}

            {/* Legal compliance credentials */}
            {project.regaFalLicense && (
              <div className="bg-charcoal text-white rounded-2xl p-6 border border-white/10 shadow-xl space-y-4 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 bg-primary-500/15 rounded-full blur-[30px]" />
                <div className="flex items-center gap-3 relative z-10">
                  <ShieldCheck className="w-7 h-7 text-primary-400 shrink-0" />
                  <div>
                    <h4 className="text-sm font-bold leading-none">REGA Legal Compliance</h4>
                    <p className="text-[9px] uppercase tracking-wider text-white/50 mt-1">Saudi RE Verified Project</p>
                  </div>
                </div>
                <div className="space-y-1 relative z-10">
                  <span className="text-[9px] font-black text-white/45 uppercase tracking-widest block">FAL License Number</span>
                  <span className="font-mono font-bold text-base bg-white/5 px-3 py-1.5 rounded border border-white/10 block text-center tracking-widest">{project.regaFalLicense}</span>
                </div>
              </div>
            )}

            {/* Agent Contact Card (locked/unlocked) */}
            <AgentContactCard
              owner={owner}
              locale={locale}
              handleContactAttempt={handleContactAttempt}
              isQualified={isQualified}
              revealedContact={revealedContact}
              t={tListing}
            />

            {/* Direct WhatsApp Specialist Concierge Card */}
            <div className="relative overflow-hidden rounded-2xl p-6 border border-primary-500/20 bg-gradient-to-br from-primary-500/5 via-surface-50 to-primary-500/10 shadow-md space-y-4">
              <div className="space-y-1">
                <span className="text-[8px] font-black text-primary-600 uppercase tracking-widest block font-sans">
                  {tListing('sidebarConciergePill') || 'VIP CONCIERGE'}
                </span>
                <h4 className="text-base font-serif font-bold text-charcoal">
                  {tListing('sidebarConciergeTitle') || 'Direct Specialist Advice'}
                </h4>
                <p className="text-xs text-charcoal-muted leading-relaxed">
                  {tListing('sidebarConciergeDesc') || 'Looking for something bespoke? Let our licensed Saudi specialists curate a personalized selection of private listings tailored to your exact requirements.'}
                </p>
              </div>
              <a
                href={`https://wa.me/966538498580?text=${encodeURIComponent(
                  locale === 'ar'
                    ? `مرحباً، أنا مهتم بمشروع: ${title}`
                    : `Hello, I am interested in project: ${title}`
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-3 px-4 rounded-xl flex items-center justify-center gap-2.5 font-bold text-sm bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white transition-all shadow-lg shadow-emerald-600/15 group active:scale-[0.98] font-sans"
              >
                <MessageSquare className="w-4 h-4 group-hover:scale-110 transition-transform" />
                {tListing('sidebarConciergeCta') || 'Consult on WhatsApp'}
              </a>
            </div>

            {/* Custom Promotion Banner Ad */}
            <div className="relative overflow-hidden rounded-2xl border border-surface-200 bg-white shadow-sm hover:shadow-md transition-all group">
              <span className="absolute top-3 right-3 bg-slate-950/40 backdrop-blur-md text-[8px] font-black text-white px-2.5 py-1 rounded-full uppercase tracking-widest z-10 font-sans">
                {locale === 'ar' ? 'إعلان موثق' : 'PROMOTION'}
              </span>
              <Link
                href={sidebarAdLink || `/${locale}/contact`}
                target={sidebarAdLink?.startsWith('http') ? '_blank' : undefined}
                rel={sidebarAdLink?.startsWith('http') ? 'noopener noreferrer' : undefined}
                className="block w-full overflow-hidden"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={sidebarAdImage || 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80'}
                  alt="Saudi Real Estate Dynamic Banner Advertisement"
                  className={`w-full object-cover group-hover:scale-105 transition-transform duration-500 ${sidebarAdAspectRatio === '16_9' ? 'aspect-[16/9] max-h-[320px]' :
                      sidebarAdAspectRatio === '1_1' ? 'aspect-[1/1] max-h-[400px]' :
                        sidebarAdAspectRatio === '3_4' ? 'aspect-[3/4] max-h-[450px]' :
                          'h-auto max-h-[450px]'
                    }`}
                />
              </Link>
            </div>

            {/* Investment Insights */}
            <div className="bg-white border border-surface-200 p-6 space-y-4 shadow-sm rounded-2xl font-sans">
              <h4 className="text-[11px] font-black uppercase tracking-[0.2em] text-charcoal-muted">
                {tListing('investmentInsights') || 'Investment Insights'}
              </h4>
              <div className="grid gap-3">
                {[
                  { label: tListing('marketGuide') || 'Market Valuation Guide', slug: 'market-valuation-guide' },
                  { label: tListing('roiProjections') || 'ROI Projections 2026', slug: 'roi-projections-2026' },
                  { label: tListing('legalChecklist') || 'Legal Handover Checklist', slug: 'legal-handover-checklist' },
                  { label: tListing('taxExplained') || 'Ownership Taxes Explained', slug: 'ownership-taxes-explained' }
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

      {project.brochureUrl && (
        <BrochureModal
          isOpen={brochureModalOpen}
          onClose={() => setBrochureModalOpen(false)}
          brochureUrl={project.brochureUrl}
        />
      )}

      {project.photos && (
        <MediaModal
          isOpen={lightboxOpen}
          onClose={() => setLightboxOpen(false)}
          photos={photosList}
          youtubeUrl={layouts.find(l => l.descriptionEn?.includes('youtube.com') || l.descriptionAr?.includes('youtube.com'))?.descriptionEn || null}
          mapEmbedUrl={project.mapEmbedUrl}
          initialTab={lightboxTab}
          isQualified={isQualified}
          onContactAttempt={handleContactAttempt}
          agent={owner ? {
            name: owner.name || 'Authorized Broker',
            avatarUrl: owner.avatarUrl,
            role: owner.role,
            phone: revealedContact?.phone
          } : undefined}
        />
      )}

      {/* Amenities Modal */}
      {amenitiesModalOpen && (
        <div className="fixed inset-0 z-[200] flex items-end md:items-center justify-center font-sans" onClick={() => setAmenitiesModalOpen(false)}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div className="relative bg-white rounded-t-3xl md:rounded-3xl p-6 md:p-10 w-full md:max-w-2xl max-h-[80vh] overflow-y-auto shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-charcoal">
                {locale === 'ar' ? 'جميع المرافق المشتركة' : 'All Shared Amenities'}
              </h3>
              <button onClick={() => setAmenitiesModalOpen(false)} className="p-2 rounded-full hover:bg-surface-100 transition-colors">
                <X className="w-5 h-5 text-charcoal-muted" />
              </button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3.5">
              {project.amenities && Object.entries(project.amenities).filter(([, val]) => val).map(([key], idx) => {
                const label = getAmenityLabel(key, locale);
                return (
                  <div key={idx} className="flex items-center gap-2.5 p-3.5 bg-surface-50 rounded-xl border border-surface-200">
                    <CheckCircle className="w-4 h-4 text-primary-500 shrink-0" />
                    <span className="text-xs font-bold text-charcoal-muted capitalize leading-tight">{label}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Floating Noor AI Agent */}
      <ChatWidget
        floating
        showBubble={true}
        open={chatOpen}
        setOpen={setChatOpen}
        mode="project_qualification"
        context={{ projectId: project.id, id: selectedLayoutId || targetLayoutId }}
        onQualified={handleQualificationSuccess}
      />

      {/* MOBILE STICKY CONTACT BAR */}
      {owner && (
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-surface-200 px-6 py-4 md:hidden shadow-[0_-10px_30px_rgba(0,0,0,0.1)] flex items-center justify-between gap-4 font-sans">
          <div className="flex items-center gap-3 min-w-0">
            <div className="relative w-10 h-10 rounded-full overflow-hidden border-2 border-primary-100 bg-primary-50 flex items-center justify-center shrink-0">
              {owner.avatarUrl ? (
                <Image src={owner.avatarUrl} alt={owner.name || 'Broker'} fill className="object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-primary-600 text-white text-sm font-bold">
                  {(owner.name || 'B').charAt(0)}
                </div>
              )}
            </div>
            <div className="min-w-0">
              <p className="text-[9px] font-black text-primary-600 uppercase tracking-widest leading-none">
                {owner.role === 'FIRM' ? 'Licensed Firm' : 'Professional Broker'}
              </p>
              <p className="text-sm font-bold text-charcoal truncate max-w-[120px]">{owner.name || 'Authorized Broker'}</p>
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
      )}

      <AnimatePresence>
        {copied && (
          <motion.div
            initial={{ opacity: 0, y: -20, x: '-50%' }}
            animate={{ opacity: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, y: -20, x: '-50%' }}
            className="fixed top-24 left-1/2 z-[100] bg-charcoal text-white px-6 py-3 rounded-2xl shadow-2xl border border-white/10 flex items-center gap-2 font-sans"
          >
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-black uppercase tracking-wider">
              {locale === 'ar' ? 'تم نسخ الرابط بنجاح!' : 'Link Copied Successfully!'}
            </span>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}

function AgentContactCard({
  owner,
  locale,
  handleContactAttempt,
  isQualified,
  revealedContact,
  t
}: {
  owner: { id: string; name: string | null; avatarUrl: string | null; role: string } | null;
  locale: string;
  handleContactAttempt: (type: 'phone' | 'email' | 'whatsapp') => void;
  isQualified: boolean;
  revealedContact: { phone?: string; email?: string } | null;
  t: any;
}) {
  if (!owner) return null;

  const brokerName = owner.name || 'Authorized Broker';
  const avatarUrl = owner.avatarUrl;
  const profilePath = owner.role === 'FIRM' ? 'firms' : 'brokers';

  return (
    <div className="bg-white border border-surface-200 rounded-2xl p-6 space-y-6 shadow-sm">
      <Link href={`/${locale}/${profilePath}/${owner.id}`} className="flex items-center gap-4 group hover:opacity-90 transition-all font-sans">
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
          <h5 className="text-base font-bold text-charcoal leading-tight truncate group-hover:text-primary-600 transition-colors">
            {brokerName}
          </h5>
          <p className="text-xs text-charcoal-muted font-medium mt-0.5">
            {owner.role === 'FIRM' ? 'Licensed Real Estate Firm' : 'Professional Broker'}
          </p>
        </div>
        <ChevronRight className={`w-4 h-4 text-surface-300 group-hover:translate-x-1 transition-transform ${locale === 'ar' ? 'rotate-180' : ''}`} />
      </Link>

      <div className="bg-emerald-50 rounded-xl p-3 border border-emerald-100 flex items-center justify-between font-sans">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-xs font-bold text-emerald-700">
            {t('agentOnline')}
          </span>
        </div>
        <ShieldCheck className="w-4 h-4 text-emerald-500" />
      </div>

      <div className="space-y-2.5 font-sans">
        <button
          onClick={() => handleContactAttempt('email')}
          className="w-full py-3 rounded-xl flex items-center justify-center gap-2.5 font-bold text-sm transition-all shadow-sm bg-primary-600 text-white hover:bg-primary-700 active:scale-95"
        >
          <Mail className="w-4 h-4" />
          {isQualified && revealedContact ? (revealedContact.email || 'info@saudire.com') : t('emailAgent')}
        </button>
        <button
          onClick={() => handleContactAttempt('phone')}
          className="w-full py-3 rounded-xl border-2 flex items-center justify-center gap-2.5 font-bold text-sm transition-all shadow-sm border-charcoal text-charcoal hover:bg-surface-50 active:scale-95"
        >
          <Phone className="w-4 h-4" />
          {isQualified && revealedContact ? (revealedContact.phone || '+966 53 849 8580') : t('callPrivate')}
        </button>
        <button
          onClick={() => handleContactAttempt('whatsapp')}
          className="w-full py-3 rounded-xl flex items-center justify-center gap-2.5 font-bold text-sm transition-all shadow-sm bg-emerald-500 text-white hover:bg-emerald-600 active:scale-95"
        >
          <MessageSquare className="w-4 h-4" />
          {t('whatsappContact')}
        </button>
      </div>

      <div className="pt-3 border-t border-surface-100 font-sans">
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
