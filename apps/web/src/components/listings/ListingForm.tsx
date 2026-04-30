/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useForm, FormProvider, Controller, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createListingSchema, updateListingSchema, LISTING_TYPES } from '@saudi-re/shared';
import { api } from '@/lib/api';
import { useAuth } from '@/hooks/use-auth';
import {
  Building2, MapPin, Ruler, Banknote, ShieldCheck,
  Image as ImageIcon, Loader2, Save, Send, AlertCircle,
  Bed, Bath, Sofa, Lamp, Layout, ArrowRight, ChevronRight,
  Wifi, Car, Waves, Dumbbell, Trees, UserCheck,
  DoorOpen, Warehouse, CheckCircle2, ChevronLeft,
  Video, Youtube, History, Building, Shield, Wind,
  WashingMachine, Dog, Box, ChevronDown, Sparkles,
  Zap, Flame, Tv, Coffee, Utensils, AlignLeft,
  Plus, Users, Briefcase, Glasses, Trash2, Home,
  Refrigerator, Shirt, Calendar, TrendingUp, X,
  Building2 as AgencyIcon
} from 'lucide-react';
import { useRouter, useParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { MediaUpload } from './MediaUpload';

interface ListingFormProps {
  initialData?: any;
  isEdit?: boolean;
  isStandalone?: boolean;
}

const AMENITIES_CATALOG = [
  { id: 'swimming_pool', label: 'Swimming Pool', icon: Waves },
  { id: 'gym', label: 'Gym', icon: Dumbbell },
  { id: 'parking', label: 'Parking', icon: Car },
  { id: 'wifi', label: 'WiFi', icon: Wifi },
  { id: 'private_garden', label: 'Private Garden', icon: Trees },
  { id: 'maid_room', label: 'Maid Room', icon: UserCheck },
  { id: 'smart_home', label: 'Smart Home', icon: Lamp },
  { id: 'elevator', label: 'Elevator', icon: Building },
  { id: 'security', label: 'Security', icon: Shield },
  { id: 'central_ac', label: 'Central AC', icon: Wind },
  { id: 'laundry', label: 'Laundry', icon: WashingMachine },
  { id: 'pets_allowed', label: 'Pets Allowed', icon: Dog },
  { id: 'basement', label: 'Basement', icon: Box },
  { id: 'balcony', label: 'Balcony', icon: Layout },
  { id: 'power', label: 'Power', icon: Zap },
  { id: 'gas', label: 'Gas', icon: Flame },
  { id: 'tv_room', label: 'TV Room', icon: Tv },
  { id: 'lounge', label: 'Lounge', icon: Coffee },
  { id: 'kitchen_plus', label: 'Kitchen+', icon: Utensils },
  { id: 'driver_room', label: 'Driver Room', icon: Car },
  { id: 'concierge', label: 'Concierge', icon: Users },
  { id: 'study_room', label: 'Study Room', icon: Briefcase },
  { id: 'view_of_landmark', label: 'View Of Landmark', icon: Glasses },
  { id: 'walk_in_closet', label: 'Walk In Closet', icon: Shirt },
  { id: 'waste_disposal', label: 'Waste Disposal', icon: Trash2 },
  { id: 'built_in_wardrobes', label: 'Built In Wardrobes', icon: Home },
  { id: 'kitchen_appliances', label: 'Kitchen Appliances', icon: Refrigerator },
  { id: 'barbecue_area', label: 'Barbecue Area', icon: Flame },
];

const MAIN_TYPES = ['APARTMENT', 'VILLA', 'RESIDENTIAL_LAND', 'OFFICE'];

// Reusable Elite Select Component for custom feel
const EliteSelect = ({ label, value, onChange, options, dark = false, icon: Icon }: { label: string, value: string, onChange: (v: string) => void, options: { value: string, label: string }[], dark?: boolean, icon?: React.ElementType }) => {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setIsOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="space-y-3" ref={ref}>
      <div className="flex items-center gap-2 ml-4">
        {Icon && <Icon className={`w-3.5 h-3.5 ${dark ? 'text-emerald-500' : 'text-emerald-900'}`} />}
        <label className={`text-[10px] font-black uppercase tracking-[0.2em] ${dark ? 'text-white/40' : 'text-slate-500'}`}>{label}</label>
      </div>
      <div className="relative">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className={`w-full flex items-center justify-between transition-all rounded-[1.5rem] border-2 shadow-sm p-4 md:p-6 ${dark
            ? 'bg-white/5 border-white/20 hover:bg-white/10 text-white'
            : 'bg-white border-slate-300 hover:border-emerald-950 text-slate-900'
            }`}
        >
          <span className="font-black text-sm uppercase">{options.find(o => o.value === value)?.label || value}</span>
          <ChevronDown className={`w-5 h-5 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 5 }}
              className={`absolute z-[100] mt-2 w-full shadow-2xl rounded-2xl overflow-hidden py-2 border-2 ${
                dark ? 'bg-[#0f172a] border-white/20' : 'bg-white border-slate-950'
              }`}
            >
              {options.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => { onChange(opt.value); setIsOpen(false); }}
                  className={`w-full text-left px-6 py-4 text-xs font-black uppercase tracking-widest transition-all ${value === opt.value ? 'bg-emerald-900 text-white' : 'text-slate-900 hover:bg-emerald-50'
                    }`}
                >
                  {opt.label}
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

const InputField = ({ label, children, dir = 'ltr', error, icon: Icon, dark = false }: { label: string, children: React.ReactNode, dir?: 'ltr' | 'rtl', error?: { message?: string }, icon?: React.ElementType, dark?: boolean }) => (
  <div className="space-y-3">
    <div className={`flex items-center gap-2 ml-4 ${dir === 'rtl' ? 'flex-row-reverse mr-4 ml-0' : ''}`}>
      {Icon && <Icon className={`w-3.5 h-3.5 ${dark ? 'text-emerald-500' : 'text-emerald-900'}`} />}
      <label className={`text-[10px] font-black uppercase tracking-[0.2em] ${dark ? 'text-white/40' : 'text-slate-500'}`}>{label}</label>
    </div>
    <div className={`group transition-all rounded-[1.5rem] border-2 shadow-sm ${dark
      ? 'bg-white/5 border-white/20 focus-within:border-emerald-500 focus-within:bg-white/10'
      : 'bg-white border-slate-300 focus-within:border-emerald-950 focus-within:shadow-md'
      } p-4 md:p-6 ${error ? 'border-rose-500' : ''}`}>
      {children}
    </div>
    {error && <p className="text-[10px] font-bold text-rose-500 ml-4 uppercase tracking-widest">{error.message}</p>}
  </div>
);

export const ListingForm: React.FC<ListingFormProps> = ({ initialData, isEdit, isStandalone = false }) => {
  const { user } = useAuth();
  const router = useRouter();
  const params = useParams();
  const locale = params.locale as string || 'en';
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [listingCost, setListingCost] = useState(10);
  const [brokerDropdownOpen, setBrokerDropdownOpen] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [showOtherTypes, setShowOtherTypes] = useState(false);
  const [customAmenity, setCustomAmenity] = useState('');
  const [dynamicAmenities, setDynamicAmenities] = useState<string[]>([]);
  const [firmBrokers, setFirmBrokers] = useState<{ id: string; name?: string; email: string }[]>([]);
  const dropdownRef = useRef<HTMLDivElement>(null);

    const formattedInitialData = initialData ? {
      ...initialData,
      amenities: initialData.amenities || {},
      photos: initialData.photos || [],
      history: ((initialData.history as any) || []).map((h: any) => ({
        ...h,
        year: h.year || new Date().getFullYear(),
        price: h.price || 0,
        dateDisplay: h.dateDisplay || h.date || new Date().toISOString().split('T')[0],
        photosCount: h.photosCount ?? (h.thumbnailUrl ? 1 : 0),
        floorplansCount: h.floorplansCount ?? 0,
        agencyName: h.agencyName || ''
      }))
    } : undefined;

  // Local state for Area inputs to allow erasing and typing freely
  const [sqmDisplay, setSqmDisplay] = useState<string>(initialData?.areaSqm?.toString() || '0');
  const [sqftDisplay, setSqftDisplay] = useState<string>(initialData?.areaSqm ? ((initialData.areaSqm as number) * 10.7639).toFixed(2) : '0');

  const methods = useForm({
    resolver: async (data: any, context: any, options: any) => {
      // Pre-process form data BEFORE Zod validation
      const processed = {
        ...data,
        youtubeUrl: typeof data.youtubeUrl === 'string' && data.youtubeUrl.trim() === '' ? undefined : data.youtubeUrl ?? undefined,
        videoUrl: typeof data.videoUrl === 'string' && data.videoUrl.trim() === '' ? undefined : data.videoUrl ?? undefined,
        lat: data.lat === null || data.lat === '' ? undefined : data.lat,
        lng: data.lng === null || data.lng === '' ? undefined : data.lng,
        locationDescriptionDeedAr: data.locationDescriptionDeedAr === null || data.locationDescriptionDeedAr === '' ? undefined : data.locationDescriptionDeedAr,
        completionStatus: data.completionStatus === null ? undefined : data.completionStatus,
        ownerId: data.ownerId === '' ? undefined : data.ownerId,
        amenities: Object.fromEntries(
          Object.entries(data.amenities || {}).map(([k, v]) => [
            k,
            v === true ? true : (typeof v === 'object' && v !== null ? false : Boolean(v))
          ])
        ),
        // CRITICAL: Normalize history to satisfy schema
        history: ((data.history as any) || []).map((h: any) => ({
          ...h,
          year: h.year ? Number(h.year) : new Date().getFullYear(),
          price: h.price ? Number(h.price) : 0,
          dateDisplay: h.dateDisplay || h.date || new Date().toISOString().split('T')[0],
          photosCount: h.photosCount ? Number(h.photosCount) : (h.thumbnailUrl ? 1 : 0),
          floorplansCount: h.floorplansCount ? Number(h.floorplansCount) : 0,
          agencyName: h.agencyName || null
        }))
      };
      const schema = isEdit ? updateListingSchema : createListingSchema;
      return zodResolver(schema)(processed, context, options);
    },
    defaultValues: formattedInitialData || {
      type: 'APARTMENT',
      purpose: 'SALE',
      status: 'DRAFT',
      city: 'Riyadh',
      arCity: 'الرياض',
      district: '',
      arDistrict: '',
      price: 0,
      areaSqm: 0,
      photos: [],
      amenities: {},
      bedrooms: 0,
      bathrooms: 0,
      livingRooms: 0,
      kitchens: 0,
      propertyAge: 0,
      floor: 0,
      furnishingStatus: 'UNFURNISHED',
      arTitle: '',
      enTitle: '',
      arDescription: '',
      enDescription: '',
      history: []
    }
  });

  const { watch, handleSubmit, control, setValue, reset, formState: { errors } } = methods;

  // Single authoritative sync when data loads from DB
  useEffect(() => {
    if (!initialData) return;

    const areaNum = initialData.areaSqm ? parseFloat(initialData.areaSqm.toString()) : 0;

    // Normalize amenities: DB may send {wifi: true} or {wifi: {}} — always convert to boolean
    const rawAmenities: Record<string, any> = initialData.amenities || {};
    const normalizedAmenities: Record<string, boolean> = {};
    for (const key of Object.keys(rawAmenities)) {
      const val = rawAmenities[key];
      normalizedAmenities[key] = val === true || (typeof val === 'object' && val !== null && Object.keys(val).length === 0 ? false : typeof val === 'object' && val !== null);
    }
    // Detect custom amenity keys for display
    const knownIds = AMENITIES_CATALOG.map(a => a.id);
    const unknown = Object.keys(normalizedAmenities).filter(k => normalizedAmenities[k] && !knownIds.includes(k));
    setDynamicAmenities(unknown);

    // Map history: DB may not have 'event' or 'dateDisplay' fields
    const mappedHistory = (initialData.history || []).map((h: any) => ({
      year: h.year || new Date(h.dateDisplay || h.date || Date.now()).getFullYear() || new Date().getFullYear(),
      event: h.event || 'LISTED',
      price: h.price || 0,
      dateDisplay: h.dateDisplay || h.date || new Date().toISOString().split('T')[0],
      agencyName: h.agencyName || '',
      photosCount: h.photosCount ?? (h.thumbnailUrl ? 1 : 0),
      floorplansCount: h.floorplansCount ?? 0,
      thumbnailUrl: h.thumbnailUrl || null,
    }));


    // Build amenities: init ALL catalog items to false, then override with DB values
    // This ensures checkboxes always get boolean (not undefined/{}) preventing schema failures
    const allAmenities: Record<string, boolean> = {};
    AMENITIES_CATALOG.forEach(a => { allAmenities[a.id] = false; });
    Object.assign(allAmenities, normalizedAmenities);

    // Build clean form data: convert DB nulls to undefined (schema uses .optional(), not .nullable())
    const cleanData: any = {
      type: initialData.type || 'APARTMENT',
      purpose: initialData.purpose || 'SALE',
      arTitle: initialData.arTitle || initialData.enTitle || '',
      enTitle: initialData.enTitle || initialData.arTitle || '',
      arDescription: initialData.arDescription || initialData.enDescription || '',
      enDescription: initialData.enDescription || initialData.arDescription || '',
      city: initialData.city || initialData.arCity || 'Riyadh',
      arCity: initialData.arCity || initialData.city || 'الرياض',
      district: initialData.district || initialData.arDistrict || '',
      arDistrict: initialData.arDistrict || initialData.district || '',
      price: initialData.price ?? 0,
      areaSqm: areaNum,
      bedrooms: initialData.bedrooms ?? 0,
      bathrooms: initialData.bathrooms ?? 0,
      livingRooms: (initialData as any).livingRooms ?? 0,
      kitchens: (initialData as any).kitchens ?? 0,
      propertyAge: initialData.propertyAge ?? 0,
      floor: initialData.floor ?? 0,
      photos: initialData.photos || [],
      amenities: allAmenities,
      history: mappedHistory,
      furnishingStatus: initialData.furnishingStatus ?? undefined,
      completionStatus: initialData.completionStatus ?? undefined,
      residenceType: initialData.residenceType ?? undefined,
      lat: initialData.lat != null ? initialData.lat : undefined,
      lng: initialData.lng != null ? initialData.lng : undefined,
      regaAdvertisingLicense: initialData.regaAdvertisingLicense ?? undefined,
      regaFalLicense: initialData.regaFalLicense ?? undefined,
      locationDescriptionDeedAr: initialData.locationDescriptionDeedAr ?? undefined,
      youtubeUrl: initialData.youtubeUrl ?? undefined,
      videoUrl: initialData.videoUrl ?? undefined,
    };

    reset(cleanData);
    if (areaNum > 0) {
      setSqmDisplay(areaNum.toString());
      setSqftDisplay((areaNum * 10.7639).toFixed(2));
    }
  }, [initialData, reset]);
  const { fields: historyFields, append: appendHistory, remove: removeHistory } = useFieldArray({
    control,
    name: "history"
  });

  const userCredits = user?.creditsBalance ?? 0;
  const hasInsufficientCredits = userCredits < listingCost && !isEdit;
  const currentType = watch('type');
  const currentPurpose = watch('purpose');

  const preventNegative = (e: React.KeyboardEvent) => {
    if (e.key === '-' || e.key === 'e') {
      e.preventDefault();
    }
  };

  // Improved Area Handlers that allow full erasing and typing
  const handleSqmChange = (val: string) => {
    if (val === '') {
      setSqmDisplay('');
      setSqftDisplay('');
      setValue('areaSqm', 0);
      return;
    }
    const num = Math.max(0, parseFloat(val) || 0);
    setSqmDisplay(val);
    setValue('areaSqm', num, { shouldDirty: true, shouldValidate: true });
    setSqftDisplay((num * 10.7639).toFixed(2));
  };

  const handleSqftChange = (val: string) => {
    if (val === '') {
      setSqftDisplay('');
      setSqmDisplay('');
      setValue('areaSqm', 0, { shouldDirty: true, shouldValidate: true });
      return;
    }
    const num = Math.max(0, parseFloat(val) || 0);
    setSqftDisplay(val);
    const converted = parseFloat((num / 10.7639).toFixed(2));
    setSqmDisplay(converted.toString());
    setValue('areaSqm', converted, { shouldDirty: true, shouldValidate: true });
  };

  useEffect(() => {
    if (showOtherTypes) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => { document.body.style.overflow = 'unset'; };
  }, [showOtherTypes]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowOtherTypes(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    api.getListingCost().then(setListingCost);

    if (user?.role === 'FIRM') {
      api.getFirmBrokers().then(res => {
        if (res.success && res.data) {
          setFirmBrokers(res.data);
        }
      });
    }
  }, [user]);

  const addCustomAmenity = () => {
    if (!customAmenity.trim()) return;
    const id = customAmenity.toLowerCase().replace(/\s+/g, '_');
    setDynamicAmenities(prev => [...new Set([...prev, id])]);
    setValue(`amenities.${id}` as `amenities.${string}`, true);
    setCustomAmenity('');
  };

  // Build server payload: only editable fields, exclude null-problematic fields
  const preparePayload = (data: Record<string, unknown>) => {
    const payload: Record<string, unknown> = {
      type: data.type,
      purpose: data.purpose,
      city: data.city,
      arCity: data.arCity || undefined,
      district: data.district || undefined,
      arDistrict: data.arDistrict || undefined,
      price: data.price,
      areaSqm: data.areaSqm || undefined,
      bedrooms: data.bedrooms ?? undefined,
      bathrooms: data.bathrooms ?? undefined,
      livingRooms: data.livingRooms ?? undefined,
      kitchens: data.kitchens ?? undefined,
      arTitle: data.arTitle,
      enTitle: data.enTitle || undefined,
      arDescription: data.arDescription || undefined,
      enDescription: data.enDescription || undefined,
      photos: data.photos,
      propertyAge: data.propertyAge ?? undefined,
      furnishingStatus: data.furnishingStatus ?? undefined,
      residenceType: data.residenceType ?? undefined,
      regaAdvertisingLicense: data.regaAdvertisingLicense ?? undefined,
      regaFalLicense: data.regaFalLicense ?? undefined,
      youtubeUrl: data.youtubeUrl ?? undefined,
      videoUrl: data.videoUrl ?? undefined,
      history: ((data.history as any) || []).map((h: any) => ({
        year: h.year,
        event: h.event || 'LISTED',
        price: h.price,
        date: h.date || h.dateDisplay || new Date().toISOString(),
        dateDisplay: h.dateDisplay || h.date || '',
        agencyName: h.agencyName || null,
        photosCount: h.photosCount || 0,
        floorplansCount: h.floorplansCount || 0,
        thumbnailUrl: h.thumbnailUrl || null,
      })),
      ownerId: data.ownerId || undefined,
    };

    // Clean amenities: only send keys with boolean true
    if (data.amenities && typeof data.amenities === 'object') {
      const cleanAmenities: Record<string, boolean> = {};
      for (const key of Object.keys(data.amenities)) {
        const val = (data.amenities as any)[key];
        if (val === true) cleanAmenities[key] = true;
        else if (typeof val === 'object' && val !== null) cleanAmenities[key] = false;
        else cleanAmenities[key] = Boolean(val);
      }
      payload.amenities = cleanAmenities;
    }

    // Remove undefined keys to keep payload lean
    Object.keys(payload).forEach(k => payload[k] === undefined && delete payload[k]);

    return payload;
  };

  const onSaveDraft = async (data: any) => {
    setIsSubmitting(true);
    setServerError(null);
    const payload = preparePayload(data);
    console.log('Saving Draft Payload:', payload);
    try {
      if (isEdit && initialData?.id) {
        await api.updateListing(initialData.id, { ...payload, status: 'DRAFT' });
      } else {
        await api.createListing({ ...payload, status: 'DRAFT' });
      }
      router.push(`/${locale}/dashboard/listings`);
      router.refresh();
    } catch (err: unknown) {
      setServerError(err instanceof Error ? err.message : 'Failed to save draft');
    } finally {
      setIsSubmitting(false);
    }
  };

  const onPublish = async (data: any) => {
    if (hasInsufficientCredits && !isEdit) return;
    setIsSubmitting(true);
    setServerError(null);
    const payload = preparePayload(data);
    console.log('Publishing/Updating Payload:', payload);
    try {
      let listingId = initialData?.id;
      if (isEdit && listingId) {
        const updateRes = await api.updateListing(listingId, payload);
        if (!updateRes.success) throw new Error(updateRes.error || 'Failed to update listing');

        // Transition to Pending (FLAGGED) only if it's currently a draft
        if (initialData?.status === 'DRAFT') {
          const publishRes = await api.publishListing(listingId);
          if (!publishRes.success) throw new Error(publishRes.error || 'Failed to publish listing');
        }
      } else {
        const createRes = await api.createListing({ ...payload, status: 'DRAFT' });
        if (!createRes.success) throw new Error(createRes.error || 'Failed to create listing');

        listingId = createRes.data?.id;
        if (listingId) {
          const publishRes = await api.publishListing(listingId);
          if (!publishRes.success) throw new Error(publishRes.error || 'Failed to publish listing');
        }
      }

      setIsSuccess(true);
      router.refresh();

      // Short delay before redirect to show success
      setTimeout(() => {
        router.push(`/${locale}/dashboard/listings`);
      }, 2000);

    } catch (err: unknown) {
      setServerError(err instanceof Error ? err.message : 'Failed to process request');
      setTimeout(() => setServerError(null), 5000);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Log validation errors for easier debugging
  useEffect(() => {
    if (Object.keys(errors).length > 0) {
      console.log('Form Validation Errors:', errors);
    }
  }, [errors]);

  return (
    <FormProvider {...methods}>
      <div className={`mx-auto w-full overflow-x-hidden pb-64 ${isStandalone ? 'max-w-6xl pt-8' : 'max-w-5xl pt-8'}`}>

        {isStandalone && (
          <div className="text-center mb-10 space-y-2 px-4">
            <h1 className="text-4xl md:text-5xl font-black text-emerald-950 tracking-tighter uppercase">
              {isEdit ? 'Refine Listing' : 'List Property'}
            </h1>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.4em]">Saudi Premium Asset Portal</p>
          </div>
        )}

        {/* Stepper */}
        <div className="flex items-center justify-between mb-12 bg-white/90 backdrop-blur-xl p-2 rounded-full border border-slate-100 shadow-lg sticky top-6 z-40 mx-4">
          {[1, 2, 3, 4].map((s) => (
            <div
              key={s}
              onClick={() => s < step && setStep(s)}
              className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-full transition-all ${step === s
                ? 'bg-emerald-900 text-white shadow-xl scale-[1.02]'
                : s < step ? 'text-emerald-900 cursor-pointer hover:bg-emerald-50' : 'text-slate-400'
                }`}
            >
              <div className={`w-5 h-5 md:w-6 md:h-6 rounded-full flex items-center justify-center text-[10px] font-black border-2 ${step === s ? 'border-white bg-white text-emerald-900' : 'border-current'
                }`}>
                {s < step ? <CheckCircle2 className="w-3 h-3 md:w-4 md:h-4" /> : s}
              </div>
              <span className="text-[8px] md:text-[10px] font-black uppercase tracking-widest hidden sm:block">
                {s === 1 ? 'Basis' : s === 2 ? 'Place' : s === 3 ? 'Specs' : 'Media'}
              </span>
            </div>
          ))}
        </div>

      {serverError && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="fixed bottom-12 left-1/2 -translate-x-1/2 z-[100] bg-rose-600 text-white px-10 py-5 rounded-3xl shadow-2xl flex items-center gap-4 border border-rose-400/30 backdrop-blur-xl">
          <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
            <X className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="font-black uppercase tracking-widest text-[10px]">Error</p>
            <p className="font-bold text-sm">{serverError}</p>
          </div>
          <button onClick={() => setServerError(null)} className="ml-4 p-1 hover:bg-white/10 rounded-full transition-all">
            <X className="w-4 h-4" />
          </button>
        </motion.div>
      )}

        <form className="space-y-12 px-4">
          <AnimatePresence mode="wait">
            {/* STEP 1: BASIS */}
            {step === 1 && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-12">
                <section className="bg-white p-6 md:p-10 rounded-[2.5rem] border border-slate-100 shadow-xl">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-10">
                    {[
                      { id: 'SALE', label: 'Sell', icon: Banknote },
                      { id: 'RENT', label: 'Rent', icon: ArrowRight }
                    ].map((p) => (
                      <label key={p.id} className={`p-6 md:p-8 rounded-[2rem] border-2 transition-all cursor-pointer group flex items-center gap-6 ${currentPurpose === p.id ? 'border-emerald-900 bg-emerald-900/5' : 'border-slate-50 bg-slate-50 hover:border-emerald-900/30'
                        }`}>
                        <input type="radio" value={p.id} {...methods.register('purpose')} className="sr-only" />
                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all ${currentPurpose === p.id ? 'bg-emerald-900 text-white shadow-lg' : 'bg-white text-slate-300'
                          }`}>
                          <p.icon className="w-7 h-7" />
                        </div>
                        <div>
                          <p className="font-black text-xl text-slate-900 uppercase tracking-tight">{p.label}</p>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Listing Goal</p>
                        </div>
                        {currentPurpose === p.id && <CheckCircle2 className="w-6 h-6 text-emerald-900 ml-auto" />}
                      </label>
                    ))}
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                    {[
                      { id: 'APARTMENT', label: 'Apartment', icon: Building2 },
                      { id: 'VILLA', label: 'Villa', icon: Warehouse },
                      { id: 'RESIDENTIAL_LAND', label: 'Land', icon: Layout },
                      { id: 'OFFICE', label: 'Office', icon: Building2 },
                    ].map((t) => (
                      <label key={t.id} className={`p-5 rounded-[1.5rem] border-2 text-center transition-all cursor-pointer group ${currentType === t.id ? 'border-emerald-900 bg-emerald-900/5' : 'border-slate-50 bg-white'
                        }`}>
                        <input type="radio" value={t.id} {...methods.register('type')} className="sr-only" />
                        <t.icon className={`w-8 h-8 mx-auto mb-4 transition-all ${currentType === t.id ? 'text-emerald-900 scale-110' : 'text-slate-200 group-hover:text-emerald-900'
                          }`} />
                        <p className={`font-black text-[10px] uppercase tracking-widest ${currentType === t.id ? 'text-slate-900' : 'text-slate-400'}`}>{t.label}</p>
                      </label>
                    ))}
                  </div>

                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setShowOtherTypes(true)}
                      className="w-full py-5 border-2 border-dashed border-slate-300 rounded-[2rem] text-[11px] font-black text-slate-500 uppercase tracking-[0.2em] hover:bg-slate-50 hover:border-emerald-900 transition-all flex items-center justify-center gap-2"
                    >
                      <Sparkles className="w-4 h-4 text-emerald-500" />
                      {MAIN_TYPES.includes(currentType) ? 'Other Property Types' : `Active: ${currentType.replace(/_/g, ' ')}`}
                      <ChevronDown className="w-4 h-4" />
                    </button>

                    {user?.role === 'FIRM' && firmBrokers.length > 0 && (
                      <div className="mt-10">
                        <InputField label="Assign to Broker (Optional)" icon={AgencyIcon}>
                          <Controller
                            name="ownerId"
                            control={control}
                            render={({ field }) => {
                              const selectedBroker = firmBrokers.find(b => b.id === field.value);
                              
                              return (
                                <div className="relative">
                                  <button
                                    type="button"
                                    onClick={() => setBrokerDropdownOpen(!brokerDropdownOpen)}
                                    className="w-full flex items-center justify-between bg-transparent font-black text-sm uppercase tracking-widest outline-none appearance-none cursor-pointer"
                                  >
                                    <span className={field.value ? 'text-slate-900' : 'text-slate-400'}>
                                      {selectedBroker ? (selectedBroker.name || selectedBroker.email) : 'Post as Me (Firm Owner)'}
                                    </span>
                                    <ChevronDown className={`w-4 h-4 transition-transform ${brokerDropdownOpen ? 'rotate-180' : ''}`} />
                                  </button>

                                  <AnimatePresence>
                                    {brokerDropdownOpen && (
                                      <>
                                        <div className="fixed inset-0 z-[110]" onClick={() => setBrokerDropdownOpen(false)} />
                                        <motion.div
                                          initial={{ opacity: 0, y: 10 }}
                                          animate={{ opacity: 1, y: 0 }}
                                          exit={{ opacity: 0, y: 10 }}
                                          className="absolute left-0 right-0 top-full mt-4 z-[120] bg-white border-2 border-emerald-950 rounded-2xl shadow-2xl overflow-hidden py-2 max-h-60 overflow-y-auto"
                                        >
                                          <button
                                            type="button"
                                            onClick={() => { field.onChange(''); setBrokerDropdownOpen(false); }}
                                            className="w-full text-left px-6 py-4 text-[10px] font-black uppercase tracking-widest hover:bg-emerald-50 transition-all border-b border-slate-50"
                                          >
                                            Post as Me (Firm Owner)
                                          </button>
                                          {firmBrokers.map(broker => (
                                            <button
                                              key={broker.id}
                                              type="button"
                                              onClick={() => { field.onChange(broker.id); setBrokerDropdownOpen(false); }}
                                              className={`w-full text-left px-6 py-4 text-[10px] font-black uppercase tracking-widest transition-all ${
                                                field.value === broker.id ? 'bg-emerald-900 text-white' : 'hover:bg-emerald-50 text-slate-900'
                                              }`}
                                            >
                                              {broker.name || broker.email}
                                            </button>
                                          ))}
                                        </motion.div>
                                      </>
                                    )}
                                  </AnimatePresence>
                                </div>
                              );
                            }}
                          />
                        </InputField>
                      </div>
                    )}

                    <AnimatePresence>
                      {showOtherTypes && (
                        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-2 md:p-4">
                          <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setShowOtherTypes(false)}
                            className="absolute inset-0 bg-slate-950/60 backdrop-blur-md"
                          />
                          <motion.div
                            initial={{ scale: 0.95, opacity: 0, y: 30 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.95, opacity: 0, y: 30 }}
                            className="relative bg-white w-full max-w-4xl rounded-[2.5rem] md:rounded-[3.5rem] shadow-[0_50px_100px_rgba(0,0,0,0.5)] overflow-hidden flex flex-col border-2 border-slate-100 max-h-[90vh]"
                          >
                            {/* Sticky Header */}
                            <div className="flex items-center justify-between p-6 md:p-10 border-b border-slate-100 bg-white z-10">
                              <h3 className="text-xl md:text-2xl font-black text-slate-900 uppercase tracking-tighter">Property Category</h3>
                              <button
                                type="button"
                                onClick={() => setShowOtherTypes(false)}
                                className="w-10 h-10 md:w-12 md:h-12 bg-slate-100 rounded-full flex items-center justify-center text-slate-900 hover:bg-rose-500 hover:text-white transition-all shadow-sm"
                              >
                                <X className="w-5 h-5 md:w-6 md:h-6" />
                              </button>
                            </div>

                            {/* Scrollable Content */}
                            <div className="flex-1 overflow-y-auto p-6 md:p-10 scrollbar-hide">
                              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 pb-4">
                                {LISTING_TYPES.filter(t => !MAIN_TYPES.includes(t)).map(t => (
                                  <button
                                    key={t}
                                    type="button"
                                    onClick={() => { setValue('type', t); setShowOtherTypes(false); }}
                                    className={`p-6 md:p-8 text-[10px] md:text-[11px] font-black uppercase tracking-widest rounded-[1.5rem] md:rounded-[2rem] transition-all text-center border-2 ${currentType === t ? 'bg-emerald-900 text-white border-emerald-900 shadow-xl scale-[0.98]' : 'bg-slate-50 text-slate-900 border-transparent hover:border-emerald-900/30'
                                      }`}
                                  >
                                    {t.replace(/_/g, ' ')}
                                  </button>
                                ))}
                              </div>
                            </div>
                          </motion.div>
                        </div>
                      )}
                    </AnimatePresence>
                  </div>
                </section>

                <section className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <InputField label="Arabic Title" dir="rtl" error={errors.arTitle}>
                    <input {...methods.register('arTitle')} dir="rtl" placeholder="عنوان العقار..." className="w-full bg-transparent text-xl font-bold text-slate-900 text-right outline-none" />
                  </InputField>
                  <InputField label="English Title" error={errors.enTitle}>
                    <input {...methods.register('enTitle')} placeholder="Property Title..." className="w-full bg-transparent text-xl font-bold text-slate-900 outline-none" />
                  </InputField>
                </section>

                <section className="bg-white p-6 md:p-10 rounded-[2.5rem] border border-slate-100 shadow-xl space-y-6">
                  <div className="flex items-center gap-3 mb-2">
                    <AlignLeft className="w-5 h-5 text-emerald-900" />
                    <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">Asset Narrative</h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <InputField label="Arabic Description (Required)" dir="rtl" error={errors.arDescription}>
                      <textarea {...methods.register('arDescription')} dir="rtl" rows={5} placeholder="وصف تفصيلي للعقار..." className="w-full bg-transparent text-base font-bold text-slate-900 text-right outline-none resize-none" />
                    </InputField>
                    <InputField label="English Description (Required)" error={errors.enDescription}>
                      <textarea {...methods.register('enDescription')} rows={5} placeholder="Detailed property description..." className="w-full bg-transparent text-base font-bold text-slate-900 outline-none resize-none" />
                    </InputField>
                  </div>
                </section>
              </motion.div>
            )}

            {/* STEP 2: PLACE */}
            {step === 2 && (
              <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-12">
                <section className="bg-white p-8 md:p-12 rounded-[3.5rem] border border-slate-100 shadow-xl">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                    <div className="space-y-8">
                      <InputField label="City (Arabic)" dir="rtl" error={errors.arCity}>
                        <input {...methods.register('arCity')} dir="rtl" className="w-full bg-transparent text-2xl font-black text-slate-900 text-right outline-none" />
                      </InputField>
                      <InputField label="District (Arabic)" dir="rtl" error={errors.arDistrict}>
                        <input {...methods.register('arDistrict')} dir="rtl" className="w-full bg-transparent text-2xl font-black text-slate-900 text-right outline-none" />
                      </InputField>
                    </div>
                    <div className="bg-emerald-900/5 rounded-[3.5rem] flex flex-col items-center justify-center text-center p-8 border-2 border-dashed border-emerald-900/10">
                      <div className="w-20 h-20 bg-white rounded-[2rem] flex items-center justify-center shadow-lg border-2 border-slate-100 mb-6">
                        <MapPin className="w-10 h-10 text-emerald-900" />
                      </div>
                      <p className="text-sm font-black text-slate-900 mb-2 uppercase tracking-widest">Pin on Map</p>
                      <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest max-w-[200px]">Map precision enables neighborhood analysis.</p>
                    </div>
                  </div>
                </section>
              </motion.div>
            )}

            {/* STEP 3: SPECS */}
            {step === 3 && (
              <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-12">

                {/* Ownership Legacy Section */}
                <section className="bg-white p-8 md:p-10 rounded-[3rem] border border-slate-100 shadow-xl">
                  <div className="flex items-center justify-between mb-10">
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 bg-emerald-900/10 rounded-[1.5rem] flex items-center justify-center text-emerald-900 border-2 border-emerald-900/5">
                        <TrendingUp className="w-7 h-7" />
                      </div>
                      <div>
                        <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">Ownership Legacy</h3>
                        <p className="text-[10px] font-black text-emerald-900 uppercase tracking-widest">Asset Lifecycle & Data Parity</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => appendHistory({ 
                        year: new Date().getFullYear(), 
                        event: 'SOLD', 
                        price: 0, 
                        dateDisplay: new Date().toISOString().split('T')[0], 
                        thumbnailUrl: '',
                        agencyName: '',
                        photosCount: 0,
                        floorplansCount: 0
                      })}
                      className="flex items-center gap-2 bg-emerald-900 text-white px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:scale-105 transition-all shadow-lg"
                    >
                      <Plus className="w-4 h-4" /> Add Event
                    </button>
                  </div>

                  <div className="space-y-8">
                    {historyFields.map((field, index) => (
                      <motion.div
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        key={field.id}
                        className="relative bg-slate-50 p-8 rounded-[2.5rem] border-2 border-slate-200"
                      >
                        <button
                          type="button"
                          onClick={() => removeHistory(index)}
                          className="absolute -top-3 -right-3 w-8 h-8 bg-rose-500 text-white rounded-full flex items-center justify-center shadow-lg hover:scale-110 active:scale-95 transition-all z-10"
                        >
                          <X className="w-4 h-4" />
                        </button>

                        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
                          <div className="md:col-span-3 space-y-4">
                            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest ml-4">Event Photo</label>
                            <div className="mt-2">
                              <Controller
                                name={`history.${index}.thumbnailUrl`}
                                control={control}
                                render={({ field }) => (
                                  <MediaUpload 
                                    images={field.value ? [field.value] : []} 
                                    onChange={(urls) => {
                                      const url = urls[0] || '';
                                      field.onChange(url);
                                      // Sync counts
                                      setValue(`history.${index}.photosCount` as const, url ? 1 : 0);
                                      setValue(`history.${index}.floorplansCount` as const, 0);
                                    }}
                                    maxFiles={1}
                                  />
                                )}
                              />
                            </div>
                          </div>

                          <div className="md:col-span-9 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            <EliteSelect
                              label="Event Type"
                              icon={History}
                              value={watch(`history.${index}.event`)}
                              onChange={(v) => setValue(`history.${index}.event` as const, v as "SOLD" | "LISTED" | "PRICE_DROP" | "RENTED")}
                              options={[
                                { value: 'SOLD', label: 'Property Sold' },
                                { value: 'LISTED', label: 'Listed On Portal' },
                                { value: 'PRICE_DROP', label: 'Price Correction' },
                                { value: 'RENTED', label: 'Lease Signed' }
                              ]}
                            />
                            <InputField label="Price (SAR)" icon={Banknote}>
                              <div className="flex items-center gap-2">
                                <input
                                  type="number"
                                  min="0"
                                  onKeyDown={preventNegative}
                                  {...methods.register(`history.${index}.price`, { valueAsNumber: true })}
                                  className="w-full bg-transparent font-black text-slate-900 outline-none text-lg"
                                />
                                <span className="text-[10px] font-black text-slate-400">SAR</span>
                              </div>
                            </InputField>
                            <InputField label="Timeline / Date" icon={Calendar}>
                              <input 
                                type="date" 
                                {...methods.register(`history.${index}.dateDisplay`, {
                                  onChange: (e) => {
                                    const date = new Date(e.target.value);
                                    if (!isNaN(date.getTime())) {
                                      setValue(`history.${index}.year` as const, date.getFullYear());
                                    }
                                  }
                                })} 
                                className="w-full bg-transparent font-black text-slate-900 outline-none text-sm uppercase" 
                              />
                            </InputField>
                            <InputField label="Agency / Proof" icon={AgencyIcon}>
                              <input {...methods.register(`history.${index}.agencyName`)} placeholder="Brokerage Name..." className="w-full bg-transparent font-black text-slate-900 outline-none text-xs" />
                            </InputField>

                            {/* Hidden fields to satisfy schema requirements */}
                            <input type="hidden" {...methods.register(`history.${index}.year`, { valueAsNumber: true })} />
                            <input type="hidden" {...methods.register(`history.${index}.photosCount`, { valueAsNumber: true })} />
                            <input type="hidden" {...methods.register(`history.${index}.floorplansCount`, { valueAsNumber: true })} />
                          </div>
                        </div>
                      </motion.div>
                    ))}

                    {historyFields.length === 0 && (
                      <div className="py-12 border-2 border-dashed border-slate-200 rounded-[2.5rem] text-center bg-slate-50/50">
                        <TrendingUp className="w-10 h-10 text-slate-300 mx-auto mb-4" />
                        <p className="text-xs font-black text-slate-400 uppercase tracking-widest">No transaction legacy recorded yet.</p>
                      </div>
                    )}
                  </div>
                </section>

                <section className="bg-white p-8 md:p-12 rounded-[3rem] border border-slate-100 shadow-xl">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-10 mb-10 text-center">
                    {[
                      { id: 'bedrooms', label: 'Beds', icon: Bed },
                      { id: 'bathrooms', label: 'Baths', icon: Bath },
                      { id: 'livingRooms', label: 'Halls', icon: Sofa },
                      { id: 'kitchens', label: 'Kitchen', icon: DoorOpen },
                    ].map((field) => {
                      const val = (watch(field.id as any) as number) ?? 0;
                      return (
                        <div key={field.id} className="group">
                          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4 transition-all border-2 ${val > 0 ? 'bg-emerald-900 text-white border-emerald-900' : 'bg-emerald-50 text-emerald-900 border-emerald-900/10'}`}>
                            <field.icon className="w-6 h-6" />
                          </div>
                          <label className="block text-[10px] font-black text-slate-900 uppercase mb-3 tracking-widest">{field.label}</label>
                          <div className="flex items-center justify-center gap-4">
                            <button type="button" onClick={() => setValue(field.id as any, Math.max(0, ((watch(field.id as any) as number) || 0) - 1), { shouldDirty: true, shouldValidate: true })} className="w-9 h-9 rounded-full bg-white flex items-center justify-center text-emerald-900 font-black border-2 border-emerald-900/20 hover:bg-emerald-900 hover:text-white transition-all shadow-sm">-</button>
                            <span className="w-8 text-center text-xl font-black text-slate-900">{val}</span>
                            <button type="button" onClick={() => setValue(field.id as any, ((watch(field.id as any) as number) || 0) + 1, { shouldDirty: true, shouldValidate: true })} className="w-9 h-9 rounded-full bg-white flex items-center justify-center text-emerald-900 font-black border-2 border-emerald-900/20 hover:bg-emerald-900 hover:text-white transition-all shadow-sm">+</button>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-10 mt-10 border-t border-slate-50">
                    <InputField label="Age (Y)">
                      <input type="number" min="0" onKeyDown={preventNegative} {...methods.register('propertyAge', { valueAsNumber: true, min: 0 })} className="w-full bg-transparent font-black text-slate-900 outline-none" />
                    </InputField>
                    <InputField label="Floor">
                      <input type="number" min="0" onKeyDown={preventNegative} {...methods.register('floor', { valueAsNumber: true, min: 0 })} className="w-full bg-transparent font-black text-slate-900 outline-none" />
                    </InputField>
                    <EliteSelect
                      label="Furnishing"
                      value={watch('furnishingStatus')}
                      onChange={(v) => setValue('furnishingStatus', v as "UNFURNISHED" | "PARTLY_FURNISHED" | "FULLY_FURNISHED", { shouldDirty: true, shouldValidate: true })}
                      options={[
                        { value: 'UNFURNISHED', label: 'Unfurnished' },
                        { value: 'PARTLY_FURNISHED', label: 'Partly Furnished' },
                        { value: 'FULLY_FURNISHED', label: 'Fully Furnished' }
                      ]}
                    />
                  </div>
                </section>

                <section className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="bg-[#064e4b] p-8 md:p-12 rounded-[3.5rem] text-white shadow-xl relative overflow-hidden group border-4 border-white/5">
                    <Banknote className="absolute -bottom-5 -right-5 w-32 h-32 text-white/5 group-hover:scale-110 transition-transform duration-1000" />
                    <div className="relative z-10">
                      <span className="text-[10px] font-black uppercase tracking-[0.3em] text-emerald-400 block mb-8">Valuation</span>
                      <label className="block text-[10px] font-bold mb-4 uppercase tracking-widest opacity-60">Asking Price (SAR)</label>
                      <div className="flex items-end gap-3 border-b-4 border-white/20 focus-within:border-white transition-all pb-2">
                        <input
                          type="number"
                          min="0"
                          onKeyDown={preventNegative}
                          {...methods.register('price', { valueAsNumber: true, min: 0 })}
                          className="bg-transparent text-3xl md:text-5xl font-black text-white outline-none flex-1"
                        />
                        <span className="text-sm font-black text-white/40 mb-2">SAR</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-slate-950 p-8 md:p-12 rounded-[3.5rem] text-white shadow-xl relative overflow-hidden group border-4 border-white/5">
                    <Ruler className="absolute -bottom-5 -right-5 w-32 h-32 text-white/5 group-hover:scale-110 transition-transform duration-1000" />
                    <div className="relative z-10">
                      <span className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 block mb-8">Area Basis</span>

                      <div className="grid grid-cols-2 gap-10">
                        <div className="space-y-4">
                          <label className="block text-[10px] font-bold uppercase tracking-widest opacity-60">Area (M²)</label>
                          <div className="flex items-end gap-3 border-b-4 border-white/20 focus-within:border-white transition-all pb-2">
                            <input
                              type="number"
                              min="0"
                              onKeyDown={preventNegative}
                              value={sqmDisplay === '' ? '' : sqmDisplay}
                              onChange={(e) => handleSqmChange(e.target.value)}
                              className="bg-transparent text-3xl font-black text-white outline-none w-full"
                            />
                            <span className="text-xs font-black text-white/30 mb-2">M²</span>
                          </div>
                        </div>
                        <div className="space-y-4">
                          <label className="block text-[10px] font-bold uppercase tracking-widest opacity-60">Area (Sq.Ft)</label>
                          <div className="flex items-end gap-3 border-b-4 border-white/20 focus-within:border-white transition-all pb-2">
                            <input
                              type="number"
                              min="0"
                              onKeyDown={preventNegative}
                              value={sqftDisplay === '' ? '' : sqftDisplay}
                              onChange={(e) => handleSqftChange(e.target.value)}
                              className="bg-transparent text-3xl font-black text-white outline-none w-full"
                            />
                            <span className="text-xs font-black text-white/30 mb-2">Ft²</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </section>

                <section>
                  <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-10 text-center">Elite Amenities</h3>
                  <div className="grid grid-cols-3 md:grid-cols-6 lg:grid-cols-7 gap-4 mb-10">
                    {AMENITIES_CATALOG.map((amenity) => (
                      <Controller
                        key={amenity.id}
                        name={`amenities.${amenity.id}` as const}
                        control={control}
                        render={({ field }) => (
                          <button
                            type="button"
                            onClick={() => field.onChange(!field.value)}
                            className={`flex flex-col items-center justify-center p-6 rounded-[2rem] border-2 transition-all ${field.value
                              ? 'border-emerald-900 bg-emerald-900 text-white shadow-lg'
                              : 'border-slate-200 bg-white text-slate-900 hover:border-emerald-900/10'
                              }`}
                          >
                            <amenity.icon className={`w-6 h-6 mb-4 ${field.value ? 'text-white' : 'text-emerald-900'}`} />
                            <span className="text-[9px] font-black uppercase tracking-tighter text-center leading-none">{amenity.label}</span>
                          </button>
                        )}
                      />
                    ))}
                    {/* Dynamic Amenities */}
                    {dynamicAmenities.filter(id => !AMENITIES_CATALOG.some(a => a.id === id)).map((id) => (
                      <Controller
                        key={id}
                        name={`amenities.${id}` as const}
                        control={control}
                        render={({ field }) => (
                          <div className="relative group">
                            <button
                              type="button"
                              onClick={() => field.onChange(!field.value)}
                              className={`w-full flex flex-col items-center justify-center p-6 rounded-[2rem] border-2 transition-all ${field.value
                                ? 'border-emerald-900 bg-emerald-900 text-white shadow-lg'
                                : 'border-slate-200 bg-white text-slate-900 hover:border-emerald-900/10'
                                }`}
                            >
                              <Sparkles className={`w-6 h-6 mb-4 ${field.value ? 'text-white' : 'text-emerald-900'}`} />
                              <span className="text-[9px] font-black uppercase tracking-tighter text-center leading-none">{id.replace(/_/g, ' ')}</span>
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setDynamicAmenities(prev => prev.filter(p => p !== id));
                                setValue(`amenities.${id}` as const, false);
                              }}
                              className="absolute -top-2 -right-2 w-7 h-7 bg-rose-500 text-white rounded-full flex items-center justify-center shadow-lg opacity-0 group-hover:opacity-100 transition-opacity z-10"
                            >
                              <Plus className="w-5 h-5 rotate-45" />
                            </button>
                          </div>
                        )}
                      />
                    ))}
                  </div>

                  <div className="max-w-md mx-auto bg-white border-2 border-slate-300 p-5 rounded-[2.5rem] flex items-center gap-4 focus-within:border-emerald-950 transition-all shadow-sm">
                    <input
                      value={customAmenity}
                      onChange={(e) => setCustomAmenity(e.target.value)}
                      placeholder="Add Custom Amenity..."
                      className="bg-transparent flex-1 text-xs font-black text-slate-900 outline-none px-4"
                    />
                    <button
                      type="button"
                      onClick={addCustomAmenity}
                      className="w-12 h-12 bg-emerald-900 text-white rounded-[1.5rem] flex items-center justify-center shadow-lg hover:scale-105 active:scale-95 transition-all"
                    >
                      <Plus className="w-6 h-6" />
                    </button>
                  </div>
                </section>
              </motion.div>
            )}

            {/* STEP 4: VISUALS */}
            {step === 4 && (
              <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="space-y-12">
                <section className="bg-white p-8 md:p-12 rounded-[3.5rem] border border-slate-100 shadow-xl">
                  <div className="flex items-center gap-6 mb-12">
                    <ShieldCheck className="w-12 h-12 text-emerald-900" />
                    <div>
                      <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">REGA Authorization</h3>
                      <p className="text-[10px] font-black text-emerald-900 uppercase tracking-widest">Compliance Hub</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                    <InputField label="AD Permit #" error={errors.regaAdvertisingLicense}>
                      <input {...methods.register('regaAdvertisingLicense')} className="w-full bg-transparent text-3xl font-black text-slate-900 outline-none font-mono tracking-widest" />
                    </InputField>
                    <div className="p-10 bg-slate-50 rounded-[2.5rem] flex items-center justify-between border-2 border-slate-300 shadow-sm">
                      <span className="text-[10px] font-black uppercase text-slate-500 block">Verified FAL: {user?.regaLicence || 'N/A'}</span>
                      <CheckCircle2 className="w-10 h-10 text-emerald-500" />
                    </div>
                  </div>
                </section>

                <section className="bg-slate-950 p-10 md:p-14 rounded-[4rem] text-white shadow-2xl relative overflow-hidden border-4 border-white/5">
                  <div className="flex items-center gap-4 mb-12 relative z-10">
                    <ImageIcon className="w-8 h-8 text-emerald-500" />
                    <h3 className="text-2xl font-black uppercase tracking-widest">Media Hub</h3>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-10 mb-12 relative z-10">
                    <InputField label="YouTube Tour" dark>
                      <div className="flex items-center gap-4">
                        <Youtube className="w-6 h-6 text-rose-500" />
                        <input {...methods.register('youtubeUrl')} placeholder="https://youtube.com/..." className="w-full bg-transparent py-2 text-white font-bold outline-none placeholder:text-white/10" />
                      </div>
                    </InputField>
                    <InputField label="Video Hub" dark>
                      <div className="flex items-center gap-4">
                        <Video className="w-6 h-6 text-emerald-500" />
                        <input {...methods.register('videoUrl')} placeholder="https://..." className="w-full bg-transparent py-2 text-white font-bold outline-none placeholder:text-white/10" />
                      </div>
                    </InputField>
                  </div>

                  <div className="relative z-10">
                    <Controller
                      name="photos"
                      control={control}
                      render={({ field, fieldState }) => (
                        <MediaUpload 
                          images={field.value || []} 
                          onChange={(urls) => field.onChange(urls)} 
                          error={fieldState.error?.message}
                        />
                      )}
                    />
                  </div>
                </section>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Success Overlay */}
          <AnimatePresence>
            {isSuccess && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="fixed inset-0 z-[2000] flex items-center justify-center bg-emerald-950/90 backdrop-blur-xl p-6"
              >
                <motion.div
                  initial={{ scale: 0.9, opacity: 0, y: 20 }}
                  animate={{ scale: 1, opacity: 1, y: 0 }}
                  className="bg-white p-12 rounded-[4rem] text-center max-w-md shadow-[0_50px_100px_rgba(0,0,0,0.5)] border-4 border-emerald-900/10"
                >
                  <div className="w-24 h-24 bg-emerald-900 text-white rounded-full flex items-center justify-center mx-auto mb-8 shadow-2xl">
                    <CheckCircle2 className="w-12 h-12" />
                  </div>
                  <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tighter mb-4">Done & Dusted!</h2>
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-10 leading-loose">
                    Your property listing has been successfully {isEdit ? 'refined' : 'submitted'}. Redirecting you to the portal...
                  </p>
                  <button
                    type="button"
                    onClick={() => router.push(`/${locale}/dashboard/listings`)}
                    className="w-full py-5 bg-emerald-900 text-white rounded-[2rem] font-black uppercase text-xs tracking-[0.3em] hover:scale-[1.02] transition-all shadow-xl"
                  >
                    Go to Portal
                  </button>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Global Error Feedback - Lists specific fields */}
          {Object.keys(errors).length > 0 && (
            <div className="mx-4 mb-6 p-6 bg-rose-50 border-2 border-rose-200 rounded-[2rem] space-y-4">
              <div className="flex items-center gap-4">
                <AlertCircle className="w-6 h-6 text-rose-500 animate-pulse" />
                <div>
                  <p className="text-[10px] font-black text-rose-500 uppercase tracking-widest">Mandatory Check Failed</p>
                  <p className="text-xs font-bold text-slate-900">The following fields require attention before you can proceed:</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 ml-10">
                {Object.keys(errors).map((key) => (
                  <span key={key} className="px-3 py-1 bg-white border border-rose-100 rounded-full text-[9px] font-black text-rose-500 uppercase tracking-tighter shadow-sm">
                    {key.replace(/([A-Z])/g, ' $1').replace(/_/g, ' ')}
                  </span>
                ))}
              </div>
            </div>
          )}

          {serverError && (
            <div className="mx-4 mb-6 p-6 bg-rose-50 border-2 border-rose-500 rounded-[2rem] flex items-center gap-4">
              <AlertCircle className="w-6 h-6 text-rose-500" />
              <p className="text-xs font-bold text-rose-500">{serverError}</p>
            </div>
          )}

          {/* Action Bar */}
          <div className="fixed bottom-10 left-1/2 -translate-x-1/2 w-full max-w-4xl px-4 z-[40]">
            <div className="bg-white/95 backdrop-blur-3xl p-4 md:p-6 rounded-[2.5rem] border border-slate-100 shadow-[0_30px_60px_rgba(0,0,0,0.2)] flex items-center justify-between gap-6">

              {!isEdit && (
                <div className="flex items-center gap-4 px-6 border-r border-slate-100 hidden sm:flex">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${hasInsufficientCredits ? 'bg-rose-50 text-rose-500' : 'bg-emerald-50 text-emerald-500'} shadow-inner border-2 border-slate-50`}>
                    <AlertCircle className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Fee</p>
                    <p className={`font-black text-xl ${hasInsufficientCredits ? 'text-rose-500' : 'text-slate-900'}`}>{listingCost} Credits</p>
                  </div>
                </div>
              )}

              <div className="flex-1 flex justify-between sm:justify-end items-center gap-4">
                <button
                  type="button"
                  onClick={() => step > 1 && setStep(step - 1)}
                  className={`w-14 h-14 bg-slate-50 border-2 border-slate-200 rounded-2xl flex items-center justify-center text-slate-900 hover:bg-emerald-900 hover:text-white transition-all shadow-sm ${step === 1 ? 'invisible' : ''}`}
                >
                  <ChevronLeft className="w-7 h-7" />
                </button>
                <div className="flex gap-4">
                  {!isEdit && (
                    <button type="button" onClick={handleSubmit(onSaveDraft)} className="px-6 py-4 font-black text-slate-400 hover:text-emerald-900 flex items-center gap-2 group transition-all">
                      <Save className="w-5 h-5" />
                      <span className="uppercase text-[10px] tracking-widest hidden md:block">Draft</span>
                    </button>
                  )}
                  {step < 4 ? (
                    <button type="button" onClick={() => setStep(step + 1)} className="bg-emerald-900 text-white px-10 md:px-14 py-4 rounded-2xl font-black uppercase text-[10px] md:text-xs tracking-widest shadow-xl hover:scale-[1.03] active:scale-95 transition-all flex items-center gap-3">
                      Continue <ChevronRight className="w-5 h-5" />
                    </button>
                  ) : (
                    <button 
                      type="button" 
                      disabled={isSubmitting || (hasInsufficientCredits && (!isEdit || initialData?.status === 'DRAFT'))} 
                      onClick={handleSubmit(onPublish)} 
                      className={`px-10 md:px-14 py-4 rounded-2xl font-black uppercase text-[10px] md:text-xs tracking-widest flex items-center gap-3 transition-all shadow-xl ${
                        (hasInsufficientCredits && (!isEdit || initialData?.status === 'DRAFT')) 
                          ? 'bg-slate-200 text-slate-400 cursor-not-allowed' 
                          : 'bg-emerald-900 text-white'
                      }`}
                    >
                      {isSubmitting ? <Loader2 className="animate-spin" /> : <Send className="w-5 h-5" />}
                      {isEdit ? (initialData?.status === 'DRAFT' ? 'Publish' : 'Update') : 'Publish'}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </form>
      </div>
    </FormProvider>
  );
};
