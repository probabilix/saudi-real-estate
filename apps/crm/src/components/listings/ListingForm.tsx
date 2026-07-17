'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { CldUploadWidget } from 'next-cloudinary';
import { useJsApiLoader, GoogleMap, MarkerF, Autocomplete } from '@react-google-maps/api';
import { extractLatLng, isShortGoogleMapsUrl } from '@saudi-re/shared';
import {
  Building2, MapPin, Ruler, Banknote, ShieldCheck,
  Image as ImageIcon, Loader2, Save, Send, AlertCircle,
  Bed, Bath, Sofa, Layout, ArrowLeft, ArrowRight, ChevronRight, Star,
  Wifi, Car, Waves, Dumbbell, Trees, UserCheck,
  DoorOpen, Warehouse, CheckCircle2, ChevronLeft,
  Video, Youtube, History, Building, Shield, Wind,
  WashingMachine, Dog, Box, ChevronDown, Sparkles,
  Zap, Flame, Tv, Coffee, Utensils, AlignLeft,
  Plus, Users, Briefcase, Glasses, Trash2, Home,
  Refrigerator, Shirt, Calendar, X, Eye, TrendingUp
} from 'lucide-react';
import clsx from 'clsx';
import { crmApi } from '@/lib/api';

const GOOGLE_MAPS_LIBRARIES: ("places")[] = ['places'];

interface ListingFormProps {
  initialData?: any;
  isEdit?: boolean;
}

const AMENITIES_CATALOG = [
  { id: 'swimming_pool', label: 'Swimming Pool', icon: Waves },
  { id: 'gym', label: 'Gym', icon: Dumbbell },
  { id: 'parking', label: 'Parking', icon: Car },
  { id: 'wifi', label: 'WiFi', icon: Wifi },
  { id: 'private_garden', label: 'Private Garden', icon: Trees },
  { id: 'maid_room', label: 'Maid Room', icon: UserCheck },
  { id: 'smart_home', label: 'Smart Home', icon: Sparkles },
  { id: 'elevator', label: 'Elevator', icon: Building },
  { id: 'security', label: 'Security', icon: Shield },
  { id: 'central_ac', label: 'Central AC', icon: Wind },
  { id: 'laundry', label: 'Laundry', icon: WashingMachine },
  { id: 'pets_allowed', label: 'Pets Allowed', icon: Dog },
  { id: 'basement', label: 'Basement', icon: Box },
  { id: 'balcony', label: 'Balcony', icon: Layout },
  { id: 'power', label: 'Power Backup', icon: Zap },
  { id: 'gas', label: 'Central Gas', icon: Flame },
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

const PROPERTY_TYPES = [
  { value: 'APARTMENT', label: 'Apartment', labelAr: 'شقة' },
  { value: 'VILLA', label: 'Villa', labelAr: 'فيلا' },
  { value: 'RESIDENTIAL_LAND', label: 'Residential Land', labelAr: 'أرض سكنية' },
  { value: 'OFFICE', label: 'Office', labelAr: 'مكتب' },
  { value: 'FLOOR', label: 'Floor', labelAr: 'دور' },
  { value: 'RESIDENTIAL_BUILDING', label: 'Residential Building', labelAr: 'عمارة سكنية' },
  { value: 'REST_HOUSE', label: 'Rest House', labelAr: 'استراحة' },
  { value: 'CHALET', label: 'Chalet', labelAr: 'شاليه' },
  { value: 'ROOM', label: 'Room', labelAr: 'غرفة' },
  { value: 'TOWNHOUSE', label: 'Townhouse', labelAr: 'تاون هاوس' },
  { value: 'DUPLEX', label: 'Duplex', labelAr: 'دوبلكس' },
  { value: 'COMMERCIAL_BUILDING', label: 'Commercial Building', labelAr: 'عمارة تجارية' },
  { value: 'WAREHOUSE', label: 'Warehouse', labelAr: 'مستودع' },
  { value: 'COMMERCIAL_LAND', label: 'Commercial Land', labelAr: 'أرض تجارية' },
  { value: 'INDUSTRIAL_LAND', label: 'Industrial Land', labelAr: 'أرض صناعية' },
  { value: 'FARM', label: 'Farm', labelAr: 'مزرعة' },
  { value: 'AGRICULTURE_PLOT', label: 'Agriculture Plot', labelAr: 'أرض زراعية' },
  { value: 'COMPLEX', label: 'Complex', labelAr: 'مجمع' },
  { value: 'HOTEL', label: 'Hotel', labelAr: 'فندق' },
  { value: 'WORKSHOP', label: 'Workshop', labelAr: 'ورشة' },
  { value: 'FACTORY', label: 'Factory', labelAr: 'مصنع' },
  { value: 'SCHOOL', label: 'School', labelAr: 'مدرسة' },
  { value: 'HEALTH_CENTER', label: 'Health Center', labelAr: 'مركز صحي' },
  { value: 'GAS_STATION', label: 'Gas Station', labelAr: 'محطة وقود' },
  { value: 'SHOWROOM', label: 'Showroom', labelAr: 'معرض' }
];

const CITIES = [
  { value: 'Riyadh', label: 'Riyadh', labelAr: 'الرياض' },
  { value: 'Jeddah', label: 'Jeddah', labelAr: 'جدة' },
  { value: 'Mecca', label: 'Mecca', labelAr: 'مكة المكرمة' },
  { value: 'Madinah', label: 'Madinah', labelAr: 'المدينة المنورة' },
  { value: 'Dammam', label: 'Dammam', labelAr: 'الدمام' },
  { value: 'Khobar', label: 'Khobar', labelAr: 'الخبر' },
  { value: 'Al-Ahsa', label: 'Al-Ahsa', labelAr: 'الأحساء' },
  { value: 'Tabuk', label: 'Tabuk', labelAr: 'تبوك' },
  { value: 'Buraidah', label: 'Buraidah', labelAr: 'بريدة' },
  { value: 'Abha', label: 'Abha', labelAr: 'أبها' }
];

interface LegacyEvent {
  year: number;
  event: 'SOLD' | 'LISTED' | 'PRICE_DROP' | 'RENTED';
  price: number;
  dateDisplay: string;
  agencyName: string;
  thumbnailUrl: string;
  photosCount: number;
  floorplansCount: number;
}

interface CommuteMapPreviewProps {
  googleMapsKey: string;
  lat: string;
  lng: string;
  handleMapClick: (e: google.maps.MapMouseEvent) => void;
  handleMarkerDragEnd: (e: google.maps.MapMouseEvent) => void;
  onAutocompleteLoad: (autoC: google.maps.places.Autocomplete) => void;
  onPlaceChanged: () => void;
}

function CommuteMapPreview({
  googleMapsKey,
  lat,
  lng,
  handleMapClick,
  handleMarkerDragEnd,
  onAutocompleteLoad,
  onPlaceChanged
}: CommuteMapPreviewProps) {
  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: googleMapsKey,
    libraries: GOOGLE_MAPS_LIBRARIES
  });

  if (!isLoaded) {
    return (
      <div className="flex flex-col items-center justify-center h-64 bg-slate-50 border border-slate-200 rounded-2xl gap-2 text-slate-400">
        <Loader2 className="w-8 h-8 animate-spin text-[#064e4b]" />
        <span className="text-[10px] font-black uppercase tracking-wider">Loading Map modules...</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Places Autocomplete Input */}
      <div className="relative">
        <Autocomplete
          onLoad={onAutocompleteLoad}
          onPlaceChanged={onPlaceChanged}
        >
          <input
            type="text"
            placeholder="Search neighborhood, landmark, or street to pinpoint..."
            className="w-full border border-slate-200 rounded-xl px-4 py-3 text-xs font-bold text-slate-900 outline-none"
            onKeyDown={(e) => { if (e.key === 'Enter') e.preventDefault(); }}
          />
        </Autocomplete>
      </div>

      <div className="relative h-64 rounded-2xl overflow-hidden border border-slate-200">
        <GoogleMap
          id="commute-preview-map"
          mapContainerStyle={{ width: '100%', height: '100%' }}
          center={lat && lng ? { lat: parseFloat(lat), lng: parseFloat(lng) } : { lat: 24.774265, lng: 46.738586 }}
          zoom={13}
          onClick={handleMapClick}
          options={{
            disableDefaultUI: false,
            zoomControl: true,
          }}
        >
          {lat && lng && (
            <MarkerF
              position={{ lat: parseFloat(lat), lng: parseFloat(lng) }}
              draggable={true}
              onDragEnd={handleMarkerDragEnd}
            />
          )}
        </GoogleMap>
      </div>
    </div>
  );
}

export default function ListingForm({ initialData, isEdit = false }: ListingFormProps) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Credit Balance State
  const [balance, setBalance] = useState<number>(0);
  const [listingCost] = useState<number>(10);
  const [isAdmin, setIsAdmin] = useState(false);

  // Form Fields State
  const [type, setType] = useState('APARTMENT');
  const [purpose, setPurpose] = useState('SALE');
  const [status, setStatus] = useState('DRAFT');
  const [price, setPrice] = useState('');

  // Dynamic Area Conversion Fields
  const [sqmDisplay, setSqmDisplay] = useState('');
  const [sqftDisplay, setSqftDisplay] = useState('');
  const [areaSqm, setAreaSqm] = useState('');

  const [enTitle, setEnTitle] = useState('');
  const [arTitle, setArTitle] = useState('');
  const [enDescription, setEnDescription] = useState('');
  const [arDescription, setArDescription] = useState('');

  // City Selectors & District Text inputs
  const [city, setCity] = useState('Riyadh');
  const [arCity, setArCity] = useState('الرياض');
  const [district, setDistrict] = useState('');
  const [arDistrict, setArDistrict] = useState('');

  const [mapEmbedUrl, setMapEmbedUrl] = useState('');
  const [parsingCoords, setParsingCoords] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);

  const [lat, setLat] = useState('24.774265');
  const [lng, setLng] = useState('46.738586');
  const [bedrooms, setBedrooms] = useState('0');
  const [bathrooms, setBathrooms] = useState('0');
  const [floor, setFloor] = useState('0');
  const [propertyAge, setPropertyAge] = useState('0');

  // Residence Type & Furnishing Status
  const [residenceType, setResidenceType] = useState('FAMILY');
  const [furnishingStatus, setFurnishingStatus] = useState('UNFURNISHED');

  const [completionStatus, setCompletionStatus] = useState('READY');
  const [regaAdvertisingLicense, setRegaAdvertisingLicense] = useState('');

  // FAL License - auto-populated & read-only
  const [regaFalLicense, setRegaFalLicense] = useState('');

  // Eligibility Toggles
  const [foreignerEligible, setForeignerEligible] = useState(false);
  const [muslimOnly, setMuslimOnly] = useState(false);

  const [photos, setPhotos] = useState<string[]>([]);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [isOverIndex, setIsOverIndex] = useState<number | null>(null);

  const handleDragStart = (e: React.DragEvent, index: number) => {
    e.dataTransfer.setData('text/plain', index.toString());
    e.dataTransfer.effectAllowed = 'move';
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex !== index) {
      setIsOverIndex(index);
    }
  };

  const handleDragLeave = () => {
    setIsOverIndex(null);
  };

  const handleDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    const sourceIndex = parseInt(e.dataTransfer.getData('text/plain'), 10);
    setDraggedIndex(null);
    setIsOverIndex(null);
    if (isNaN(sourceIndex) || sourceIndex === targetIndex) return;

    setPhotos(prev => {
      const updated = [...prev];
      const [moved] = updated.splice(sourceIndex, 1);
      updated.splice(targetIndex, 0, moved);
      return updated;
    });
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setIsOverIndex(null);
  };
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [videoUrl, setVideoUrl] = useState('');

  // Amenities Catalog & Custom Amenities
  const [amenities, setAmenities] = useState<Record<string, boolean>>({});
  const [customAmenityInput, setCustomAmenityInput] = useState('');
  const [customAmenitiesList, setCustomAmenitiesList] = useState<string[]>([]);

  // Ownership Legacy History
  const [historyEvents, setHistoryEvents] = useState<LegacyEvent[]>([]);

  const hasInsufficientCredits = !isAdmin && balance < listingCost && (!isEdit || initialData?.status === 'DRAFT');

  // Google Maps Load Config
  const [googleMapsKey, setGoogleMapsKey] = useState<string>('');
  const [autocomplete, setAutocomplete] = useState<google.maps.places.Autocomplete | null>(null);

  // Load Google Maps API Key
  useEffect(() => {
    if (process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY) {
      setGoogleMapsKey(process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY);
      return;
    }
    const fetchConfig = async () => {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || '/api/v1'}/listings/maps-config`);
        const json = await res.json();
        if (json.success && json.googleMapsKey) {
          setGoogleMapsKey(json.googleMapsKey);
        }
      } catch (err) {
        console.error('Failed to load Google Maps key dynamically', err);
      }
    };
    fetchConfig();
  }, []);

  // Handle Autocomplete Load
  const onAutocompleteLoad = (autoC: google.maps.places.Autocomplete) => {
    setAutocomplete(autoC);
  };

  // Handle Place Selection (DO NOT touch district fields as requested)
  const onPlaceChanged = () => {
    if (autocomplete !== null) {
      const place = autocomplete.getPlace();
      const latVal = place.geometry?.location?.lat();
      const lngVal = place.geometry?.location?.lng();
      if (latVal && lngVal) {
        setLat(String(latVal));
        setLng(String(lngVal));

        let cityVal = '';
        place.address_components?.forEach(c => {
          if (c.types.includes('locality')) cityVal = c.long_name;
        });

        if (cityVal) {
          const matchedCity = CITIES.find(c => c.value.toLowerCase() === cityVal.toLowerCase() || c.labelAr === cityVal);
          if (matchedCity) {
            setCity(matchedCity.value);
            setArCity(matchedCity.labelAr);
          }
        }

        setMapEmbedUrl(`https://www.google.com/maps/place/${latVal},${lngVal}/@${latVal},${lngVal},17z`);
      }
    }
  };

  const handleMapClick = (e: google.maps.MapMouseEvent) => {
    const latVal = e.latLng?.lat();
    const lngVal = e.latLng?.lng();
    if (latVal && lngVal) {
      setLat(String(latVal));
      setLng(String(lngVal));
      setMapEmbedUrl(`https://www.google.com/maps/place/${latVal},${lngVal}/@${latVal},${lngVal},17z`);
    }
  };

  const handleMarkerDragEnd = (e: google.maps.MapMouseEvent) => {
    const latVal = e.latLng?.lat();
    const lngVal = e.latLng?.lng();
    if (latVal && lngVal) {
      setLat(String(latVal));
      setLng(String(lngVal));
      setMapEmbedUrl(`https://www.google.com/maps/place/${latVal},${lngVal}/@${latVal},${lngVal},17z`);
    }
  };

  // Google Maps URL paste auto parsing (resolves short URL too)
  const handleMapUrlChange = async (url: string) => {
    setMapEmbedUrl(url);
    if (!url || url.trim() === '') {
      setParseError(null);
      return;
    }

    setParsingCoords(true);
    setParseError(null);

    try {
      let finalUrl = url;
      if (isShortGoogleMapsUrl(url)) {
        const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';
        const response = await fetch(`${apiBase}/listings/expand-url?url=${encodeURIComponent(url)}`);
        const json = await response.json();
        if (json.success && json.url) {
          finalUrl = json.url;
        }
      }

      const parsed = extractLatLng(finalUrl);
      if (parsed) {
        setLat(String(parsed.lat));
        setLng(String(parsed.lng));
        setParseError(null);
      } else {
        setParseError('Failed to parse coordinates from the URL automatically. Drag the pin or search down on the map below.');
      }
    } catch (err: any) {
      setParseError('Error resolving coordinates from Google Maps Link. Drop pin manually below.');
    } finally {
      setParsingCoords(false);
    }
  };

  // Area conversions
  const handleSqmChange = (val: string) => {
    if (val === '') {
      setSqmDisplay('');
      setSqftDisplay('');
      setAreaSqm('');
      return;
    }
    const num = Math.max(0, parseFloat(val) || 0);
    setSqmDisplay(val);
    setAreaSqm(String(num));
    setSqftDisplay((num * 10.7639).toFixed(2));
  };

  const handleSqftChange = (val: string) => {
    if (val === '') {
      setSqftDisplay('');
      setSqmDisplay('');
      setAreaSqm('');
      return;
    }
    const num = Math.max(0, parseFloat(val) || 0);
    setSqftDisplay(val);
    const converted = parseFloat((num / 10.7639).toFixed(2));
    setSqmDisplay(converted.toString());
    setAreaSqm(String(converted));
  };

  // Fetch Broker Profile on Mount to populate FAL License Number & Credit Balance
  useEffect(() => {
    async function fetchBrokerProfile() {
      try {
        const res = await crmApi.getProfile();
        if (res.success) {
          if (res.data?.profile?.regaLicenseNumber) {
            setRegaFalLicense(res.data.profile.regaLicenseNumber);
          }
          if (res.data?.user?.creditsBalance !== undefined) {
            setBalance(res.data.user.creditsBalance);
          }
          if (res.data?.user?.role) {
            setIsAdmin(res.data.user.role === 'ADMIN');
          }
        }
      } catch (err) {
        console.error('Failed to fetch broker profile', err);
      }
    }
    fetchBrokerProfile();
  }, []);

  // Populate data on edit mode
  useEffect(() => {
    if (initialData) {
      setType(initialData.type || 'APARTMENT');
      setPurpose(initialData.purpose || 'SALE');
      setStatus(initialData.status || 'DRAFT');
      setPrice(initialData.price ? String(initialData.price) : '');

      const sqm = initialData.areaSqm ? parseFloat(initialData.areaSqm.toString()) : 0;
      if (sqm > 0) {
        setSqmDisplay(sqm.toString());
        setAreaSqm(sqm.toString());
        setSqftDisplay((sqm * 10.7639).toFixed(2));
      }

      setEnTitle(initialData.enTitle || '');
      setArTitle(initialData.arTitle || '');
      setEnDescription(initialData.enDescription || '');
      setArDescription(initialData.arDescription || '');

      const matchedCity = CITIES.find(c => c.value.toLowerCase() === (initialData.city || '').toLowerCase());
      if (matchedCity) {
        setCity(matchedCity.value);
        setArCity(matchedCity.labelAr);
      } else {
        setCity(initialData.city || 'Riyadh');
        setArCity(initialData.arCity || 'الرياض');
      }

      setDistrict(initialData.district || '');
      setArDistrict(initialData.arDistrict || '');
      setMapEmbedUrl(initialData.mapEmbedUrl || '');
      setLat(initialData.lat ? String(initialData.lat) : '24.774265');
      setLng(initialData.lng ? String(initialData.lng) : '46.738586');
      setBedrooms(initialData.bedrooms !== undefined ? String(initialData.bedrooms) : '0');
      setBathrooms(initialData.bathrooms !== undefined ? String(initialData.bathrooms) : '0');
      setFloor(initialData.floor !== undefined ? String(initialData.floor) : '0');
      setPropertyAge(initialData.propertyAge !== undefined ? String(initialData.propertyAge) : '0');
      setFurnishingStatus(initialData.furnishingStatus || 'UNFURNISHED');
      setResidenceType(initialData.residenceType || 'FAMILY');
      setCompletionStatus(initialData.completionStatus || 'READY');
      setRegaAdvertisingLicense(initialData.regaAdvertisingLicense || '');
      if (initialData.regaFalLicense) {
        setRegaFalLicense(initialData.regaFalLicense);
      }
      setForeignerEligible(!!initialData.foreignerEligible);
      setMuslimOnly(!!initialData.muslimOnly);
      setPhotos(initialData.photos || []);
      setYoutubeUrl(initialData.youtubeUrl || '');
      setVideoUrl(initialData.videoUrl || '');

      // Parse amenities
      const rawAmenities = initialData.amenities || {};
      setAmenities(rawAmenities);

      const knownIds = AMENITIES_CATALOG.map(a => a.id);
      const unknown = Object.keys(rawAmenities).filter(k => rawAmenities[k] && !knownIds.includes(k));
      setCustomAmenitiesList(unknown);

      // Parse legacy events history
      setHistoryEvents(initialData.history || []);
    }
  }, [initialData]);

  const handleAmenityToggle = (id: string) => {
    setAmenities(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const handleAddCustomAmenity = () => {
    if (!customAmenityInput.trim()) return;
    const cleanKey = customAmenityInput.trim().toLowerCase().replace(/\s+/g, '_');
    if (!customAmenitiesList.includes(cleanKey)) {
      setCustomAmenitiesList(prev => [...prev, cleanKey]);
      setAmenities(prev => ({
        ...prev,
        [cleanKey]: true
      }));
    }
    setCustomAmenityInput('');
  };

  const handleRemovePhoto = (idx: number) => {
    setPhotos(prev => prev.filter((_, i) => i !== idx));
  };

  const handleAddLegacyEvent = () => {
    const newEvent: LegacyEvent = {
      year: new Date().getFullYear(),
      event: 'SOLD',
      price: 0,
      dateDisplay: new Date().toISOString().split('T')[0],
      agencyName: '',
      thumbnailUrl: '',
      photosCount: 0,
      floorplansCount: 0
    };
    setHistoryEvents(prev => [...prev, newEvent]);
  };

  const handleRemoveLegacyEvent = (idx: number) => {
    setHistoryEvents(prev => prev.filter((_, i) => i !== idx));
  };

  const handleUpdateLegacyEvent = (idx: number, fields: Partial<LegacyEvent>) => {
    setHistoryEvents(prev => prev.map((item, i) => i === idx ? { ...item, ...fields } : item));
  };

  const handleSubmitForm = async (targetStatus?: string) => {
    setError(null);
    setSaving(true);

    // Build specific list of error messages to show exact issues
    const validationErrors: string[] = [];

    if (hasInsufficientCredits) {
      validationErrors.push(`Insufficient credits. You need ${listingCost} credits to publish this property (Current Balance: ${balance} Credits).`);
    }

    if (!arTitle.trim()) {
      validationErrors.push('Arabic Title is required.');
    }
    if (!price || parseFloat(price) <= 0) {
      validationErrors.push('Asking Price must be a positive number.');
    }
    if (!areaSqm || parseFloat(areaSqm) <= 0) {
      validationErrors.push('Area (M²) must be a positive number.');
    }
    if (!city) {
      validationErrors.push('City is required.');
    }
    if (!district.trim()) {
      validationErrors.push('District (English) is required.');
    }
    if (!arDistrict.trim()) {
      validationErrors.push('District (Arabic) is required.');
    }
    if (photos.length < 3) {
      validationErrors.push(`At least 3 property photos are required. You have currently uploaded ${photos.length}.`);
    }

    if (validationErrors.length > 0) {
      setError(validationErrors.join(' | '));
      setSaving(false);
      // Scroll to top to see validation errors clearly
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    const payload = {
      type,
      purpose,
      status: targetStatus || status,
      price: parseFloat(price),
      areaSqm: areaSqm ? parseFloat(areaSqm) : null,
      enTitle: enTitle || arTitle,
      arTitle,
      enDescription,
      arDescription,
      city,
      district,
      arCity,
      arDistrict,
      mapEmbedUrl: mapEmbedUrl || null,
      lat: lat ? parseFloat(lat) : null,
      lng: lng ? parseFloat(lng) : null,
      bedrooms: parseInt(bedrooms, 10),
      bathrooms: parseInt(bathrooms, 10),
      floor: parseInt(floor, 10),
      propertyAge: parseInt(propertyAge, 10),
      furnishingStatus,
      residenceType,
      completionStatus,
      regaAdvertisingLicense: regaAdvertisingLicense || null,
      regaFalLicense: regaFalLicense || null,
      foreignerEligible,
      muslimOnly: foreignerEligible ? muslimOnly : false,
      isFreehold: true,
      photos,
      youtubeUrl: youtubeUrl || null,
      videoUrl: videoUrl || null,
      amenities,
      history: historyEvents.map(h => ({
        year: h.year,
        event: h.event,
        price: Number(h.price),
        dateDisplay: h.dateDisplay,
        agencyName: h.agencyName || null,
        thumbnailUrl: h.thumbnailUrl || null,
        photosCount: h.thumbnailUrl ? 1 : 0,
        floorplansCount: 0
      }))
    };

    try {
      let res: any;
      if (isEdit && initialData?.id) {
        if (initialData.status === 'DRAFT') {
          res = await crmApi.updateListing(initialData.id, { ...payload, status: 'DRAFT' });
          if (res.success) {
            const pubRes = await crmApi.publishListing(initialData.id);
            if (!pubRes.success) throw new Error(pubRes.error || pubRes.message || 'Failed to request approval.');
          }
        } else {
          res = await crmApi.updateListing(initialData.id, { ...payload, status: 'FLAGGED' });
        }
      } else {
        res = await crmApi.createListing({ ...payload, status: 'DRAFT' });
        if (res.success) {
          const newId = res.data?.id;
          if (newId) {
            const pubRes = await crmApi.publishListing(newId);
            if (!pubRes.success) throw new Error(pubRes.error || pubRes.message || 'Failed to request approval.');
          }
        }
      }

      if (res.success) {
        router.push(`/my-listings?success=${isEdit ? 'updated' : 'created'}&shortId=${(res.data as any)?.shortId || ''}`);
      } else {
        if (res && res.errors) {
          const errorMsgs = Object.entries(res.errors)
            .filter(([key]) => key !== '_errors')
            .map(([key, val]: [string, any]) => `${key}: ${val._errors?.join(', ') || 'Invalid value'}`);
          setError(`Validation errors: ${errorMsgs.join(' | ')}`);
        } else {
          setError(res.error || res.message || 'An error occurred while saving the listing.');
        }
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    } catch (err: any) {
      setError(err?.message || 'A network error occurred.');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto pb-20 px-4 md:px-0">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900 font-serif">
            {isEdit ? 'Edit Property Listing' : 'Post New Property Listing'}
          </h1>
          <p className="text-xs md:text-sm text-slate-500 mt-1">
            Provide the details to advertise this property. Regulatory and location details are required in Saudi Arabia.
          </p>
        </div>
        <button
          type="button"
          onClick={() => router.push('/my-listings')}
          className="flex items-center justify-center gap-1.5 px-4 py-2 border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 transition-all font-semibold text-sm self-start sm:self-center"
        >
          <ChevronLeft className="w-4 h-4" />
          Cancel
        </button>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-2xl flex items-start gap-3 shadow-sm animate-in fade-in">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <div className="text-xs md:text-sm font-semibold whitespace-pre-line leading-relaxed">
            {error.replace(/ \| /g, '\n')}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Form Details */}
        <div className="lg:col-span-2 space-y-8">

          {/* Card 1: Basic Information */}
          <div className="bg-white border border-slate-200 rounded-3xl p-5 md:p-8 shadow-sm space-y-6">
            <div className="flex items-center gap-2.5 pb-4 border-b border-slate-100">
              <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-800 flex items-center justify-center">
                <Building2 className="w-4 h-4" />
              </div>
              <h2 className="text-lg font-bold text-slate-800">Basic Property Information</h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-500">Property Purpose</label>
                <div className="grid grid-cols-2 gap-2">
                  {['SALE', 'RENT'].map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setPurpose(p)}
                      className={clsx(
                        "py-3 rounded-xl border text-xs font-bold uppercase transition-all shadow-sm",
                        purpose === p
                          ? "border-[#064e4b] bg-emerald-50 text-[#064e4b]"
                          : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                      )}
                    >
                      For {p === 'SALE' ? 'Sale' : 'Rent'}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-500">Property Type</label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                  className="w-full p-3 rounded-xl border border-slate-200 bg-white text-sm font-semibold outline-none focus:border-[#064e4b]"
                >
                  {PROPERTY_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>{t.label} ({t.labelAr})</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Asking Price & Dual Area Inputs */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-500">Price (SAR) *</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">SAR</span>
                  <input
                    type="number"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    placeholder="e.g. 1500000"
                    className="w-full pl-12 pr-4 py-3 rounded-xl border border-slate-200 bg-white text-sm font-semibold outline-none focus:border-[#064e4b]"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-500">Area (M²) *</label>
                <div className="relative">
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">M²</span>
                  <input
                    type="number"
                    value={sqmDisplay}
                    onChange={(e) => handleSqmChange(e.target.value)}
                    placeholder="e.g. 350"
                    className="w-full pl-4 pr-12 py-3 rounded-xl border border-slate-200 bg-white text-sm font-semibold outline-none focus:border-[#064e4b]"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-500">Area (Sq.Ft)</label>
                <div className="relative">
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">Ft²</span>
                  <input
                    type="number"
                    value={sqftDisplay}
                    onChange={(e) => handleSqftChange(e.target.value)}
                    placeholder="e.g. 3767"
                    className="w-full pl-4 pr-12 py-3 rounded-xl border border-slate-200 bg-white text-sm font-semibold outline-none focus:border-[#064e4b]"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-500">Property Title (English)</label>
                <input
                  type="text"
                  value={enTitle}
                  onChange={(e) => setEnTitle(e.target.value)}
                  placeholder="e.g. Modern 3 Bedroom Apartment in Al Malqa"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-sm font-semibold outline-none focus:border-[#064e4b]"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 block text-left">Property Title (Arabic) *</label>
                <input
                  type="text"
                  dir="rtl"
                  value={arTitle}
                  onChange={(e) => setArTitle(e.target.value)}
                  placeholder="مثال: شقة مودرن ٣ غرف في حي الملقا"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-sm font-semibold outline-none focus:border-[#064e4b] text-right font-arabic"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-500">Description (English)</label>
                <textarea
                  rows={4}
                  value={enDescription}
                  onChange={(e) => setEnDescription(e.target.value)}
                  placeholder="Provide details about rooms, neighborhood, finishes..."
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-sm font-semibold outline-none resize-none focus:border-[#064e4b]"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-500">Description (Arabic)</label>
                <textarea
                  rows={4}
                  dir="rtl"
                  value={arDescription}
                  onChange={(e) => setArDescription(e.target.value)}
                  placeholder="تفاصيل العقار باللغة العربية..."
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-sm font-semibold outline-none resize-none text-right font-arabic focus:border-[#064e4b]"
                />
              </div>
            </div>
          </div>

          {/* Card 2: Location & Google Map Selector */}
          <div className="bg-white border border-slate-200 rounded-3xl p-5 md:p-8 shadow-sm space-y-6">
            <div className="flex items-center gap-2.5 pb-4 border-b border-slate-100">
              <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-800 flex items-center justify-center">
                <MapPin className="w-4 h-4" />
              </div>
              <h2 className="text-lg font-bold text-slate-800">Location & Coordinates</h2>
            </div>

            {/* City Selectors (Bilingual Dropdowns) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-500">City (English) *</label>
                <select
                  value={city}
                  onChange={(e) => {
                    const val = e.target.value;
                    setCity(val);
                    const matched = CITIES.find(c => c.value === val);
                    if (matched) setArCity(matched.labelAr);
                  }}
                  className="w-full p-3 rounded-xl border border-slate-200 bg-white text-sm font-semibold outline-none focus:border-[#064e4b]"
                >
                  {CITIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-500">City (Arabic)</label>
                <select
                  value={arCity}
                  onChange={(e) => {
                    const val = e.target.value;
                    setArCity(val);
                    const matched = CITIES.find(c => c.labelAr === val);
                    if (matched) setCity(matched.value);
                  }}
                  className="w-full p-3 rounded-xl border border-slate-200 bg-white text-sm font-semibold outline-none focus:border-[#064e4b] text-right font-arabic"
                >
                  {CITIES.map(c => <option key={c.labelAr} value={c.labelAr}>{c.labelAr}</option>)}
                </select>
              </div>
            </div>

            {/* District Bilingual Inputs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-500">District (English) *</label>
                <input
                  type="text"
                  value={district}
                  onChange={(e) => setDistrict(e.target.value)}
                  placeholder="e.g. Al Malqa"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-sm font-semibold outline-none focus:border-[#064e4b]"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-500">District (Arabic) *</label>
                <input
                  type="text"
                  value={arDistrict}
                  onChange={(e) => setArDistrict(e.target.value)}
                  placeholder="مثال: الملقا"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-sm font-semibold outline-none focus:border-[#064e4b] text-right font-arabic"
                />
              </div>
            </div>

            {/* Map Embed Link / URL Picker Section */}
            <div className="space-y-3 pt-2">
              <label className="text-[10px] font-black uppercase tracking-wider text-slate-500">Google Maps Link / Share URL</label>
              <input
                type="text"
                value={mapEmbedUrl}
                onChange={(e) => handleMapUrlChange(e.target.value)}
                placeholder="Paste Google Maps URL here (e.g., https://goo.gl/maps/...)"
                className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-sm font-semibold outline-none focus:border-[#064e4b]"
              />
              {parsingCoords && (
                <div className="flex items-center gap-2 text-xs font-bold text-amber-600 animate-pulse">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Extracting location details...</span>
                </div>
              )}
              {parseError && (
                <p className="text-[10px] font-bold text-red-500 uppercase tracking-wide leading-relaxed">
                  {parseError}
                </p>
              )}
            </div>

            {/* Google Map Section */}
            <div className="space-y-4 pt-2">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-500">Interactive Location Map Pin Selector</label>

                {googleMapsKey ? (
                  <CommuteMapPreview
                    googleMapsKey={googleMapsKey}
                    lat={lat}
                    lng={lng}
                    handleMapClick={handleMapClick}
                    handleMarkerDragEnd={handleMarkerDragEnd}
                    onAutocompleteLoad={onAutocompleteLoad}
                    onPlaceChanged={onPlaceChanged}
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center h-64 bg-slate-50 border border-slate-200 rounded-2xl gap-2 text-slate-400">
                    <Loader2 className="w-8 h-8 animate-spin text-[#064e4b]" />
                    <span className="text-[10px] font-black uppercase tracking-wider">Loading Map modules...</span>
                  </div>
                )}
              </div>

              {/* Coordinates display & manual input fallback */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-500">Latitude</label>
                  <input
                    type="number"
                    step="0.000001"
                    value={lat}
                    onChange={(e) => setLat(e.target.value)}
                    placeholder="e.g. 24.774265"
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-sm font-semibold outline-none focus:border-[#064e4b]"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-500">Longitude</label>
                  <input
                    type="number"
                    step="0.000001"
                    value={lng}
                    onChange={(e) => setLng(e.target.value)}
                    placeholder="e.g. 46.738586"
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-sm font-semibold outline-none focus:border-[#064e4b]"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Card 3: Specifications & Compliance */}
          <div className="bg-white border border-slate-200 rounded-3xl p-5 md:p-8 shadow-sm space-y-6">
            <div className="flex items-center gap-2.5 pb-4 border-b border-slate-100">
              <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-800 flex items-center justify-center">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <h2 className="text-lg font-bold text-slate-800">Specs & REGA Compliance</h2>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-500">Bedrooms</label>
                <input
                  type="number"
                  value={bedrooms}
                  onChange={(e) => setBedrooms(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-sm font-semibold outline-none focus:border-[#064e4b]"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-500">Bathrooms</label>
                <input
                  type="number"
                  value={bathrooms}
                  onChange={(e) => setBathrooms(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-sm font-semibold outline-none focus:border-[#064e4b]"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-500">Floor</label>
                <input
                  type="number"
                  value={floor}
                  onChange={(e) => setFloor(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-sm font-semibold outline-none focus:border-[#064e4b]"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-500">Property Age (Years)</label>
                <input
                  type="number"
                  value={propertyAge}
                  onChange={(e) => setPropertyAge(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-sm font-semibold outline-none focus:border-[#064e4b]"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-500">Furnishing Status</label>
                <select
                  value={furnishingStatus}
                  onChange={(e) => setFurnishingStatus(e.target.value)}
                  className="w-full p-3 rounded-xl border border-slate-200 bg-white text-sm font-semibold outline-none focus:border-[#064e4b]"
                >
                  <option value="UNFURNISHED">Unfurnished (غير مؤثث)</option>
                  <option value="FULLY_FURNISHED">Fully Furnished (مؤثث بالكامل)</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-500">Residence Type</label>
                <select
                  value={residenceType}
                  onChange={(e) => setResidenceType(e.target.value)}
                  className="w-full p-3 rounded-xl border border-slate-200 bg-white text-sm font-semibold outline-none focus:border-[#064e4b]"
                >
                  <option value="FAMILY">Family (عائلات)</option>
                  <option value="BACHELOR">Bachelor (عزاب)</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-500">Completion Status</label>
                <select
                  value={completionStatus}
                  onChange={(e) => setCompletionStatus(e.target.value)}
                  className="w-full p-3 rounded-xl border border-slate-200 bg-white text-sm font-semibold outline-none focus:border-[#064e4b]"
                >
                  <option value="READY">Ready (جاهز)</option>
                  <option value="OFF_PLAN">Off Plan (على الخارطة)</option>
                  <option value="UNDER_CONSTRUCTION">Under Construction (تحت الإنشاء)</option>
                </select>
              </div>
            </div>

            {/* Ownership and Eligibility */}
            <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100 space-y-4">
              <h3 className="text-sm font-bold text-slate-700">Ownership & Eligibility Rules</h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <label className="flex items-center gap-3 bg-white p-3 rounded-xl border border-slate-200 cursor-pointer shadow-sm">
                  <input
                    type="checkbox"
                    checked={foreignerEligible}
                    onChange={(e) => setForeignerEligible(e.target.checked)}
                    className="w-4.5 h-4.5 text-[#064e4b] focus:ring-[#064e4b] border-slate-300 rounded"
                  />
                  <div>
                    <div className="text-xs font-bold text-slate-800">Foreigner Eligible</div>
                    <div className="text-[9px] text-slate-400">Available for expats</div>
                  </div>
                </label>

                {foreignerEligible && (
                  <label className="flex items-center gap-3 bg-white p-3 rounded-xl border border-slate-200 cursor-pointer shadow-sm animate-in fade-in duration-200">
                    <input
                      type="checkbox"
                      checked={muslimOnly}
                      onChange={(e) => setMuslimOnly(e.target.checked)}
                      className="w-4.5 h-4.5 text-[#064e4b] focus:ring-[#064e4b] border-slate-300 rounded"
                    />
                    <div>
                      <div className="text-xs font-bold text-slate-800">Muslims Only Restriction</div>
                      <div className="text-[9px] text-slate-400">Restricted zone restriction</div>
                    </div>
                  </label>
                )}
              </div>
            </div>

            {/* REGA Compliance Fields */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-500">REGA Advertising License Number</label>
                <input
                  type="text"
                  value={regaAdvertisingLicense}
                  onChange={(e) => setRegaAdvertisingLicense(e.target.value)}
                  placeholder="e.g. 1200001234"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-sm font-semibold outline-none focus:border-[#064e4b]"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-500">REGA FAL License Number (Read-Only)</label>
                <input
                  type="text"
                  disabled
                  value={regaFalLicense}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-100 text-slate-500 text-sm font-semibold outline-none cursor-not-allowed"
                />
              </div>
            </div>
          </div>

          {/* Card 4: Amenities Catalog */}
          <div className="bg-white border border-slate-200 rounded-3xl p-5 md:p-8 shadow-sm space-y-6">
            <div className="flex items-center gap-2.5 pb-4 border-b border-slate-100">
              <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-800 flex items-center justify-center">
                <Sparkles className="w-4 h-4" />
              </div>
              <h2 className="text-lg font-bold text-slate-800">Amenities & Shared Facilities</h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {AMENITIES_CATALOG.map((item) => {
                const IconComponent = item.icon;
                const isSelected = !!amenities[item.id];
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleAmenityToggle(item.id)}
                    className={clsx(
                      "flex items-center gap-2.5 p-3 rounded-xl border text-xs font-bold transition-all text-left",
                      isSelected
                        ? "border-[#064e4b] bg-emerald-50 text-[#064e4b]"
                        : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                    )}
                  >
                    <IconComponent className={clsx("w-4 h-4", isSelected ? "text-[#064e4b]" : "text-slate-400")} />
                    <span>{item.label}</span>
                  </button>
                );
              })}

              {/* Render Custom Amenities added so far */}
              {customAmenitiesList.map((key) => {
                const isSelected = !!amenities[key];
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => handleAmenityToggle(key)}
                    className={clsx(
                      "flex items-center gap-2.5 p-3 rounded-xl border text-xs font-bold transition-all text-left",
                      isSelected
                        ? "border-[#064e4b] bg-emerald-50 text-[#064e4b]"
                        : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                    )}
                  >
                    <Sparkles className={clsx("w-4 h-4", isSelected ? "text-[#064e4b]" : "text-slate-400")} />
                    <span className="capitalize">{key.replace(/_/g, ' ')}</span>
                  </button>
                );
              })}
            </div>

            {/* Custom Amenity Adder */}
            <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center pt-4 border-t border-slate-100">
              <input
                type="text"
                placeholder="Type custom amenity (e.g. Roof Garden)..."
                value={customAmenityInput}
                onChange={(e) => setCustomAmenityInput(e.target.value)}
                className="flex-1 px-4 py-2.5 border border-slate-200 rounded-xl text-sm font-semibold outline-none focus:border-[#064e4b]"
              />
              <button
                type="button"
                onClick={handleAddCustomAmenity}
                className="flex items-center justify-center gap-1.5 px-5 py-2.5 bg-[#064e4b] text-white rounded-xl hover:bg-[#043a37] transition-all font-bold text-xs uppercase shadow-sm"
              >
                <Plus className="w-4 h-4" />
                Add Facility
              </button>
            </div>
          </div>

          {/* Card 5: Ownership Legacy Section */}
          <div className="bg-white border border-slate-200 rounded-3xl p-5 md:p-8 shadow-sm space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-800 flex items-center justify-center">
                  <TrendingUp className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-800">Ownership Legacy</h2>
                  <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Asset Lifecycle & Data Parity</p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleAddLegacyEvent}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-[#064e4b] hover:bg-[#043a37] text-white rounded-xl transition-all font-bold text-xs uppercase"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Event
              </button>
            </div>

            <div className="space-y-6">
              {historyEvents.map((item, idx) => (
                <div key={idx} className="relative bg-slate-50 p-5 md:p-6 rounded-2xl border border-slate-200 space-y-4 shadow-inner">
                  <button
                    type="button"
                    onClick={() => handleRemoveLegacyEvent(idx)}
                    className="absolute top-3 right-3 p-1 bg-red-100 hover:bg-red-200 text-red-600 rounded-lg transition-all z-10"
                  >
                    <X className="w-4 h-4" />
                  </button>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Event Photo Upload */}
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-wider text-slate-500">Event Photo Proof</label>
                      {item.thumbnailUrl ? (
                        <div className="relative rounded-xl overflow-hidden aspect-video border border-slate-300">
                          <img src={item.thumbnailUrl} alt="Event proof" className="w-full h-full object-cover" />
                          <button
                            type="button"
                            onClick={() => handleUpdateLegacyEvent(idx, { thumbnailUrl: '' })}
                            className="absolute top-2 right-2 p-1.5 bg-black/50 hover:bg-black/70 text-white rounded-lg transition-all"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <CldUploadWidget
                          uploadPreset="saudi_re_listing"
                          onSuccess={(result: any) => {
                            if (result.info?.secure_url) {
                              handleUpdateLegacyEvent(idx, { thumbnailUrl: result.info.secure_url });
                            }
                          }}
                        >
                          {({ open }) => (
                            <button
                              type="button"
                              onClick={() => open()}
                              className="w-full flex items-center justify-center py-8 border border-dashed border-slate-300 rounded-xl bg-white hover:bg-slate-50/50 cursor-pointer"
                            >
                              <Plus className="w-4 h-4 text-slate-400 mr-2" />
                              <span className="text-xs font-bold text-slate-600">Add Photo Proof</span>
                            </button>
                          )}
                        </CldUploadWidget>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Event Type */}
                      <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase tracking-wider text-slate-500">Event Type</label>
                        <select
                          value={item.event}
                          onChange={(e) => handleUpdateLegacyEvent(idx, { event: e.target.value as any })}
                          className="w-full p-2.5 rounded-xl border border-slate-200 bg-white text-sm font-semibold outline-none focus:border-[#064e4b]"
                        >
                          <option value="SOLD">Property Sold</option>
                          <option value="LISTED">Listed On Portal</option>
                          <option value="PRICE_DROP">Price Correction</option>
                          <option value="RENTED">Lease Signed</option>
                        </select>
                      </div>

                      {/* Event Price */}
                      <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase tracking-wider text-slate-500">Price (SAR)</label>
                        <input
                          type="number"
                          value={item.price}
                          onChange={(e) => handleUpdateLegacyEvent(idx, { price: parseFloat(e.target.value) || 0 })}
                          className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-sm font-semibold outline-none focus:border-[#064e4b]"
                        />
                      </div>

                      {/* Event Date (Max today to prevent future dates) */}
                      <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase tracking-wider text-slate-500">Timeline / Date</label>
                        <input
                          type="date"
                          max={new Date().toISOString().split('T')[0]}
                          value={item.dateDisplay}
                          onChange={(e) => {
                            const val = e.target.value;
                            const d = new Date(val);
                            handleUpdateLegacyEvent(idx, {
                              dateDisplay: val,
                              year: isNaN(d.getTime()) ? new Date().getFullYear() : d.getFullYear()
                            });
                          }}
                          className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-sm font-semibold outline-none focus:border-[#064e4b]"
                        />
                      </div>

                      {/* Event Agency */}
                      <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase tracking-wider text-slate-500">Agency Name</label>
                        <input
                          type="text"
                          placeholder="Brokerage Name..."
                          value={item.agencyName}
                          onChange={(e) => handleUpdateLegacyEvent(idx, { agencyName: e.target.value })}
                          className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-sm font-semibold outline-none focus:border-[#064e4b]"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              {historyEvents.length === 0 && (
                <div className="py-12 border-2 border-dashed border-slate-200 rounded-3xl text-center bg-slate-50/50">
                  <TrendingUp className="w-10 h-10 text-slate-300 mx-auto mb-4" />
                  <p className="text-xs font-black text-slate-400 uppercase tracking-widest">No transaction legacy recorded yet.</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Media, Links & Save */}
        <div className="space-y-8">

          {/* Card 6: Media Upload */}
          <div className="bg-white border border-slate-200 rounded-3xl p-5 md:p-6 shadow-sm space-y-6">
            <div className="flex items-center gap-2.5 pb-4 border-b border-slate-100">
              <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-800 flex items-center justify-center">
                <ImageIcon className="w-4 h-4" />
              </div>
              <h2 className="text-lg font-bold text-slate-800">Media Attachments</h2>
            </div>

            {/* Cloudinary Widget Button */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-500">Property Photos *</label>
                <span className="text-[9px] font-bold uppercase tracking-wider text-rose-500 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-100">
                  Minimum 3 Required
                </span>
              </div>
              <CldUploadWidget
                uploadPreset="saudi_re_listing"
                onSuccess={(result: any) => {
                  if (result.info?.secure_url) {
                    setPhotos(prev => [...prev, result.info.secure_url]);
                  }
                }}
              >
                {({ open }) => (
                  <button
                    type="button"
                    onClick={() => open()}
                    className="w-full flex flex-col items-center justify-center py-10 border-2 border-dashed border-slate-200 rounded-2xl hover:border-[#064e4b] transition-all bg-slate-50/50 hover:bg-slate-50 cursor-pointer shadow-inner"
                  >
                    <Plus className="w-6 h-6 text-slate-400 mb-1.5" />
                    <span className="text-xs font-bold text-slate-700">Upload Property Photo</span>
                    <span className="text-[9px] text-slate-400 mt-0.5">JPG, PNG up to 10MB</span>
                  </button>
                )}
              </CldUploadWidget>
            </div>

            {/* Photo List */}
            {photos.length > 0 && (
              <div className="space-y-3">
                <div className="flex justify-between items-center text-[10px] font-black uppercase text-slate-400 tracking-wider">
                  <span className="flex items-center gap-1.5">
                    Uploaded Photos ({photos.length})
                    <span className="text-[9px] text-slate-400 font-normal lowercase normal-case">
                      (drag to reorder)
                    </span>
                  </span>
                  {photos.length < 3 && (
                    <span className="text-rose-500 animate-pulse">Need {3 - photos.length} more</span>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3 mt-4">
                  {photos.map((url, idx) => (
                    <div
                      key={idx}
                      draggable
                      onDragStart={(e) => handleDragStart(e, idx)}
                      onDragOver={(e) => handleDragOver(e, idx)}
                      onDragLeave={handleDragLeave}
                      onDrop={(e) => handleDrop(e, idx)}
                      onDragEnd={handleDragEnd}
                      className={clsx(
                        "relative group rounded-xl overflow-hidden aspect-video border transition-all duration-200 cursor-grab active:cursor-grabbing bg-slate-100",
                        draggedIndex === idx ? "opacity-40 border-emerald-500 scale-95" : "border-slate-200 shadow-sm",
                        isOverIndex === idx ? "border-dashed border-2 border-emerald-500 scale-105" : ""
                      )}
                    >
                      <img src={url} alt={`Listing photo ${idx + 1}`} className="w-full h-full object-cover select-none pointer-events-none" />
                      
                      {/* Main Cover Badge (always visible on first image) */}
                      {idx === 0 && (
                        <span className="absolute top-2 left-2 bg-emerald-600 text-white text-[8px] font-black uppercase px-1.5 py-0.5 rounded shadow z-10 select-none">
                          Main
                        </span>
                      )}

                      {/* Control Overlays */}
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 z-20">
                        {idx > 0 && (
                          <button
                            type="button"
                            onClick={() => {
                              setPhotos(prev => {
                                const updated = [...prev];
                                const [item] = updated.splice(idx, 1);
                                updated.unshift(item);
                                return updated;
                              });
                            }}
                            className="p-1.5 bg-white/20 hover:bg-white/40 text-amber-300 rounded-lg transition-all shadow-md"
                            title="Set as main photo"
                          >
                            <Star className="w-3.5 h-3.5 fill-amber-300" />
                          </button>
                        )}
                        <button
                          type="button"
                          disabled={idx === 0}
                          onClick={() => {
                            setPhotos(prev => {
                              const updated = [...prev];
                              const [item] = updated.splice(idx, 1);
                              updated.splice(idx - 1, 0, item);
                              return updated;
                            });
                          }}
                          className={clsx(
                            "p-1.5 bg-white/20 text-white rounded-lg transition-all shadow-md",
                            idx === 0 ? "opacity-30 cursor-not-allowed" : "hover:bg-white/40"
                          )}
                          title="Move left"
                        >
                          <ArrowLeft className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          disabled={idx === photos.length - 1}
                          onClick={() => {
                            setPhotos(prev => {
                              const updated = [...prev];
                              const [item] = updated.splice(idx, 1);
                              updated.splice(idx + 1, 0, item);
                              return updated;
                            });
                          }}
                          className={clsx(
                            "p-1.5 bg-white/20 text-white rounded-lg transition-all shadow-md",
                            idx === photos.length - 1 ? "opacity-30 cursor-not-allowed" : "hover:bg-white/40"
                          )}
                          title="Move right"
                        >
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemovePhoto(idx)}
                          className="p-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-all shadow-md"
                          title="Remove photo"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-4 pt-4 border-t border-slate-100">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-500">YouTube Video URL</label>
                <div className="relative">
                  <Youtube className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-red-500" />
                  <input
                    type="text"
                    value={youtubeUrl}
                    onChange={(e) => setYoutubeUrl(e.target.value)}
                    placeholder="https://youtube.com/watch?v=..."
                    className="w-full pl-11 pr-4 py-3 rounded-xl border border-slate-200 bg-white text-sm font-semibold outline-none focus:border-[#064e4b]"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-500">Direct Video URL (mp4/m3u8)</label>
                <div className="relative">
                  <Video className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-500" />
                  <input
                    type="text"
                    value={videoUrl}
                    onChange={(e) => setVideoUrl(e.target.value)}
                    placeholder="Direct link to hosted mp4 video"
                    className="w-full pl-11 pr-4 py-3 rounded-xl border border-slate-200 bg-white text-sm font-semibold outline-none focus:border-[#064e4b]"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Actions Card */}
          <div className="bg-white border border-slate-200 rounded-3xl p-5 md:p-6 shadow-sm space-y-4">
            {(!isEdit || initialData?.status === 'DRAFT') && (
              <div className="space-y-2 border-b border-slate-100 pb-4">
                <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider">
                  <span className="text-slate-500 flex items-center gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5 text-[#064e4b]" />
                    Listing Fee
                  </span>
                  <span className={clsx(hasInsufficientCredits ? "text-rose-500" : "text-slate-900")}>
                    {listingCost} Credits
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider">
                  <span className="text-slate-500">Your Balance</span>
                  <span className={clsx(hasInsufficientCredits ? "text-rose-600 animate-pulse font-black" : "text-emerald-700")}>
                    {balance} Credits
                  </span>
                </div>
              </div>
            )}

            <button
              type="button"
              disabled={saving || hasInsufficientCredits}
              onClick={() => handleSubmitForm('FLAGGED')}
              className={clsx(
                "w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl text-sm font-black uppercase tracking-widest transition-all shadow-lg",
                hasInsufficientCredits
                  ? "bg-slate-200 text-slate-400 cursor-not-allowed shadow-none"
                  : "bg-[#064e4b] hover:bg-[#043a37] text-white shadow-[#064e4b]/10"
              )}
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              <span>{isEdit && initialData?.status !== 'DRAFT' ? 'Save Changes' : 'Publish Property'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
