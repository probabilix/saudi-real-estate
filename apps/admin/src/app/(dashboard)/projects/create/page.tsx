'use client';
export const dynamic = 'force-dynamic';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { AdminTopBar } from '@/components/AdminSidebar';
import { adminApi } from '@/lib/api';
import { CldUploadWidget } from 'next-cloudinary';
import {
  Layers, Plus, Trash2, Save, ArrowLeft, Loader2,
  Upload, Image as ImageIcon, Check, AlertCircle, Building2,
  MapPin, FileText, ShieldCheck, Calendar, Hash, Star
} from 'lucide-react';
import clsx from 'clsx';

const CITIES = ['Riyadh', 'Jeddah', 'Mecca', 'Medina', 'Dammam', 'Khobar', 'Al-Ahsa', 'Tabuk', 'Buraidah', 'Abha'];

const AMENITY_OPTIONS = [
  { key: 'swimming_pool', label: 'Swimming Pool', labelAr: 'مسبح' },
  { key: 'gym', label: 'Gym', labelAr: 'صالة رياضية' },
  { key: 'parking', label: 'Parking', labelAr: 'موقف سيارات' },
  { key: 'wifi', label: 'WiFi', labelAr: 'إنترنت لاسلكي' },
  { key: 'private_garden', label: 'Private Garden', labelAr: 'حديقة خاصة' },
  { key: 'maid_room', label: 'Maid Room', labelAr: 'غرفة خادمة' },
  { key: 'smart_home', label: 'Smart Home', labelAr: 'منزل ذكي' },
  { key: 'elevator', label: 'Elevator', labelAr: 'مصعد' },
  { key: 'security', label: 'Security', labelAr: 'حراسة وأمن' },
  { key: 'central_ac', label: 'Central AC', labelAr: 'تكييف مركزي' },
  { key: 'laundry', label: 'Laundry', labelAr: 'غرفة غسيل' },
  { key: 'pets_allowed', label: 'Pets Allowed', labelAr: 'مسموح بالحيوانات' },
  { key: 'basement', label: 'Basement', labelAr: 'قبو' },
  { key: 'balcony', label: 'Balcony', labelAr: 'شرفة / بلكونة' },
  { key: 'power', label: 'Power Backup', labelAr: 'مولد كهرباء' },
  { key: 'gas', label: 'Central Gas', labelAr: 'غاز مركزي' },
  { key: 'tv_room', label: 'TV Room', labelAr: 'غرفة تلفزيون' },
  { key: 'lounge', label: 'Lounge', labelAr: 'صالة استقبال' },
  { key: 'kitchen_plus', label: 'Kitchen+', labelAr: 'مطبخ مجهز' },
  { key: 'driver_room', label: 'Driver Room', labelAr: 'غرفة سائق' },
  { key: 'concierge', label: 'Concierge', labelAr: 'خدمة بواب' },
  { key: 'study_room', label: 'Study Room', labelAr: 'غرفة دراسة' },
  { key: 'view_of_landmark', label: 'View Of Landmark', labelAr: 'إطلالة على معلم' },
  { key: 'walk_in_closet', label: 'Walk In Closet', labelAr: 'غرفة ملابس' },
  { key: 'waste_disposal', label: 'Waste Disposal', labelAr: 'التخلص من النفايات' },
  { key: 'built_in_wardrobes', label: 'Built-in Wardrobes', labelAr: 'خزائن مدمجة' },
  { key: 'kitchen_appliances', label: 'Kitchen Appliances', labelAr: 'أجهزة مطبخ' },
  { key: 'barbecue_area', label: 'Barbecue Area', labelAr: 'منطقة شواء' },
];

const initialAmenities = Object.fromEntries(AMENITY_OPTIONS.map(a => [a.key, false]));

interface LayoutRow {
  labelEn: string;
  labelAr: string;
  price: string;
  areaSqm: string;
  bedrooms: string;
  bathrooms: string;
  photos: string[];
  completionStatus: '' | 'READY' | 'OFF_PLAN' | 'UNDER_CONSTRUCTION';
  descriptionEn: string;
  descriptionAr: string;
}

export default function CreateProjectPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Section A — Project fields
  const [nameEn, setNameEn] = useState('');
  const [nameAr, setNameAr] = useState('');
  const [city, setCity] = useState('Riyadh');
  const [district, setDistrict] = useState('');
  const [descriptionEn, setDescriptionEn] = useState('');
  const [descriptionAr, setDescriptionAr] = useState('');
  const [brochureUrl, setBrochureUrl] = useState('');
  const [regaFalLicense, setRegaFalLicense] = useState('');
  const [completionStatus, setCompletionStatus] = useState<'READY' | 'OFF_PLAN' | 'UNDER_CONSTRUCTION'>('READY');
  const [expectedDelivery, setExpectedDelivery] = useState('');
  const [totalUnits, setTotalUnits] = useState('');
  const [mapEmbedUrl, setMapEmbedUrl] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [amenities, setAmenities] = useState<Record<string, boolean>>(initialAmenities);
  const [customAmenity, setCustomAmenity] = useState('');
  const [dynamicAmenities, setDynamicAmenities] = useState<string[]>([]);
  const [isFeatured, setIsFeatured] = useState(false);
  const [featuredOrder, setFeaturedOrder] = useState('');

  // Section B — Layouts
  const [layouts, setLayouts] = useState<LayoutRow[]>([
    { labelEn: 'Type A', labelAr: 'نموذج أ', price: '', areaSqm: '', bedrooms: '', bathrooms: '', photos: [], completionStatus: '', descriptionEn: '', descriptionAr: '' }
  ]);

  const addCustomAmenity = () => {
    if (!customAmenity.trim()) return;
    const id = customAmenity.toLowerCase().trim().replace(/\s+/g, '_');
    if (!dynamicAmenities.includes(id)) {
      setDynamicAmenities(prev => [...prev, id]);
      setAmenities(prev => ({ ...prev, [id]: true }));
    }
    setCustomAmenity('');
  };

  const removeCustomAmenity = (id: string) => {
    setDynamicAmenities(prev => prev.filter(a => a !== id));
    setAmenities(prev => { const n = { ...prev }; delete n[id]; return n; });
  };

  const addLayout = () => {
    setLayouts(prev => [...prev, {
      labelEn: `Type ${String.fromCharCode(65 + prev.length)}`,
      labelAr: `نموذج ${String.fromCharCode(65 + prev.length)}`,
      price: '', areaSqm: '', bedrooms: '', bathrooms: '', photos: [], completionStatus: '', descriptionEn: '', descriptionAr: ''
    }]);
  };

  const removeLayout = (i: number) => {
    if (layouts.length === 1) return;
    setLayouts(prev => prev.filter((_, idx) => idx !== i));
  };

  const updateLayout = (i: number, key: keyof LayoutRow, val: any) => {
    setLayouts(prev => prev.map((l, idx) => idx === i ? { ...l, [key]: val } : l));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!nameEn || !nameAr || !city) {
      setError('Project name (English & Arabic) and City are required.');
      return;
    }
    for (let i = 0; i < layouts.length; i++) {
      if (!layouts[i].labelEn || !layouts[i].labelAr || !layouts[i].price) {
        setError(`Layout #${i + 1}: English label, Arabic label and price are required.`);
        return;
      }
      if (isNaN(Number(layouts[i].price)) || Number(layouts[i].price) <= 0) {
        setError(`Layout #${i + 1}: Invalid price.`);
        return;
      }
    }

    setSaving(true);
    try {
      const cleanAmenities: Record<string, boolean> = {};
      Object.entries(amenities).forEach(([k, v]) => { if (v) cleanAmenities[k] = true; });

      const payload = {
        project: {
          nameEn, nameAr, city, district, descriptionEn, descriptionAr,
          brochureUrl, regaFalLicense, completionStatus, expectedDelivery,
          totalUnits: totalUnits ? Number(totalUnits) : undefined,
          mapEmbedUrl, photos, amenities: cleanAmenities,
          isFeatured,
          featuredOrder: featuredOrder ? Number(featuredOrder) : 0,
        },
        layouts: layouts.map(l => ({
          labelEn: l.labelEn,
          labelAr: l.labelAr,
          price: Number(l.price),
          areaSqm: l.areaSqm ? Number(l.areaSqm) : undefined,
          bedrooms: l.bedrooms ? Number(l.bedrooms) : undefined,
          bathrooms: l.bathrooms ? Number(l.bathrooms) : undefined,
          photos: l.photos,
          completionStatus: l.completionStatus || completionStatus,
          descriptionEn: l.descriptionEn || undefined,
          descriptionAr: l.descriptionAr || undefined,
        })),
      };

      const res = await adminApi.createProjectBulk(payload);
      if (res.success) {
        router.push('/projects?success=created');
      } else {
        setError(res.message || 'Failed to create project.');
      }
    } catch (err: any) {
      setError(err.message || 'Unexpected error occurred.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <AdminTopBar title="New Development Project" />

      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-5xl mx-auto space-y-6">

          {/* Back + breadcrumb */}
          <div className="flex items-center gap-3">
            <Link href="/projects" className="btn-ghost text-xs gap-1.5">
              <ArrowLeft className="w-3.5 h-3.5" /> Back to Projects
            </Link>
          </div>

          {error && (
            <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">

            {/* ── SECTION A: PROJECT INFO ── */}
            <div className="admin-card p-6 space-y-6">
              <div className="flex items-center gap-2 pb-3 border-b border-surface-100">
                <Building2 className="w-5 h-5 text-primary-600" />
                <h2 className="text-base font-bold text-surface-900">Section A — Project Information</h2>
              </div>

              {/* Project Names */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="admin-label">Project Name (English) *</label>
                  <input type="text" className="admin-input" placeholder="e.g. Al Rehab Residence" value={nameEn} onChange={e => setNameEn(e.target.value)} required />
                </div>
                <div dir="rtl">
                  <label className="admin-label text-right">اسم المشروع (عربي) *</label>
                  <input type="text" className="admin-input text-right font-arabic" placeholder="مثال: مشروع الرحاب" value={nameAr} onChange={e => setNameAr(e.target.value)} required />
                </div>
              </div>

              {/* Location */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="admin-label flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5" /> City *</label>
                  <select className="admin-input" value={city} onChange={e => setCity(e.target.value)}>
                    {CITIES.map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="admin-label">District / Neighbourhood</label>
                  <input type="text" className="admin-input" placeholder="e.g. Al Malqa" value={district} onChange={e => setDistrict(e.target.value)} />
                </div>
                <div>
                  <label className="admin-label flex items-center gap-1.5"><Hash className="w-3.5 h-3.5" /> Total Units</label>
                  <input type="number" className="admin-input" placeholder="e.g. 48" value={totalUnits} onChange={e => setTotalUnits(e.target.value)} />
                </div>
              </div>

              {/* Completion Status & Delivery */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="admin-label">Completion Status *</label>
                  <select className="admin-input" value={completionStatus} onChange={e => setCompletionStatus(e.target.value as any)}>
                    <option value="READY">Ready to Move In</option>
                    <option value="OFF_PLAN">Off-Plan</option>
                    <option value="UNDER_CONSTRUCTION">Under Construction</option>
                  </select>
                </div>
                <div>
                  <label className="admin-label flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" /> Expected Delivery</label>
                  <input type="text" className="admin-input" placeholder="e.g. Q4 2026 or Dec 2026" value={expectedDelivery} onChange={e => setExpectedDelivery(e.target.value)} />
                </div>
              </div>

              {/* REGA + Brochure */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="admin-label flex items-center gap-1.5"><ShieldCheck className="w-3.5 h-3.5" /> REGA FAL License</label>
                  <input type="text" className="admin-input" placeholder="e.g. 1234567890" value={regaFalLicense} onChange={e => setRegaFalLicense(e.target.value)} />
                </div>
                <div>
                  <label className="admin-label flex items-center gap-1.5"><FileText className="w-3.5 h-3.5" /> Brochure URL (PDF)</label>
                  <input type="url" className="admin-input" placeholder="https://..." value={brochureUrl} onChange={e => setBrochureUrl(e.target.value)} />
                </div>
              </div>

              {/* Descriptions */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="admin-label">Project Description (English)</label>
                  <textarea className="admin-input h-28 resize-none" placeholder="Describe the compound, amenities, access to key roads..." value={descriptionEn} onChange={e => setDescriptionEn(e.target.value)} />
                </div>
                <div dir="rtl">
                  <label className="admin-label text-right">وصف المشروع (عربي)</label>
                  <textarea className="admin-input h-28 resize-none text-right font-arabic" placeholder="اكتب وصفاً للمجمع السكني والمرافق..." value={descriptionAr} onChange={e => setDescriptionAr(e.target.value)} />
                </div>
              </div>

              {/* Map Embed */}
              <div>
                <label className="admin-label">Google Maps Embed URL</label>
                <input type="url" className="admin-input" placeholder="https://www.google.com/maps/embed?pb=..." value={mapEmbedUrl} onChange={e => setMapEmbedUrl(e.target.value)} />
              </div>

              {/* Featured Status (Admin/CRM settings) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 bg-amber-500/5 border border-amber-500/20 rounded-2xl">
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="isFeatured"
                    checked={isFeatured}
                    onChange={(e) => setIsFeatured(e.target.checked)}
                    className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500 border-surface-300"
                  />
                  <div>
                    <label htmlFor="isFeatured" className="text-xs font-bold text-surface-900 cursor-pointer flex items-center gap-1.5">
                      <Star className={clsx("w-4 h-4", isFeatured ? "text-amber-500 fill-amber-500" : "text-surface-400")} />
                      Feature this project
                    </label>
                    <p className="text-[10px] text-surface-500 mt-0.5">Show this project in the featured section of home page and top of project searches.</p>
                  </div>
                </div>
                {isFeatured && (
                  <div>
                    <label className="admin-label">Featured Order (Sorting Rank)</label>
                    <input
                      type="number"
                      min="0"
                      placeholder="e.g. 1"
                      className="admin-input"
                      value={featuredOrder}
                      onChange={(e) => setFeaturedOrder(e.target.value)}
                    />
                    <p className="text-[10px] text-surface-500 mt-1">Lower values rank higher (e.g., 1 is shown before 2).</p>
                  </div>
                )}
              </div>

              {/* Project Photos */}
              <div>
                <label className="admin-label">Project Photos</label>
                <div className="flex flex-wrap items-center gap-3 p-3 bg-surface-50 rounded-xl border border-surface-200">
                  {photos.map((url, i) => (
                    <div key={i} className="relative w-24 h-20 rounded-lg overflow-hidden group">
                      <img src={url} alt="" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => setPhotos(prev => prev.filter((_, idx) => idx !== i))}
                        className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white"
                      >
                        <Trash2 className="w-4 h-4 text-red-400" />
                      </button>
                    </div>
                  ))}
                  <CldUploadWidget uploadPreset="saudi_re_listing" onSuccess={(r: any) => {
                    if (r.event === 'success' && r.info?.secure_url) setPhotos(prev => [...prev, r.info.secure_url]);
                  }}>
                    {({ open }) => (
                      <button type="button" onClick={() => open()} className="w-24 h-20 border-2 border-dashed border-surface-300 rounded-lg hover:bg-white flex flex-col items-center justify-center gap-1 text-surface-400 transition-colors">
                        <Upload className="w-5 h-5" />
                        <span className="text-[10px] font-semibold">Add Photo</span>
                      </button>
                    )}
                  </CldUploadWidget>
                </div>
              </div>

              {/* Amenities */}
              <div>
                <label className="admin-label">Shared Amenities</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 p-4 bg-surface-50 border border-surface-200 rounded-xl">
                  {AMENITY_OPTIONS.map(a => {
                    const checked = amenities[a.key];
                    return (
                      <label key={a.key} className={clsx(
                        'flex items-center gap-2.5 px-3 py-2.5 rounded-xl border text-xs font-semibold cursor-pointer select-none transition-all',
                        checked ? 'bg-primary-600/10 border-primary-500/25 text-primary-700' : 'bg-white border-surface-200 text-surface-600 hover:bg-surface-50'
                      )}>
                        <input type="checkbox" className="hidden" checked={checked || false} onChange={() => setAmenities(prev => ({ ...prev, [a.key]: !prev[a.key] }))} />
                        <div className={clsx('w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors', checked ? 'bg-primary-600 border-primary-600 text-white' : 'border-surface-300 bg-white')}>
                          {checked && <Check className="w-3 h-3" />}
                        </div>
                        <div className="flex flex-col leading-none">
                          <span>{a.label}</span>
                          <span className="text-[9px] text-surface-400 font-arabic mt-0.5" dir="rtl">{a.labelAr}</span>
                        </div>
                      </label>
                    );
                  })}
                </div>

                {/* Custom amenities */}
                <div className="mt-3 space-y-2">
                  {dynamicAmenities.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {dynamicAmenities.map(id => (
                        <div key={id} className="flex items-center gap-1.5 px-3 py-1.5 bg-primary-50 border border-primary-200 rounded-lg text-xs font-semibold text-primary-700">
                          <Check className="w-3 h-3" />
                          <span>{id.replace(/_/g, ' ')}</span>
                          <button type="button" onClick={() => removeCustomAmenity(id)} className="text-primary-400 hover:text-red-500 ml-0.5">×</button>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="flex gap-2">
                    <input
                      type="text"
                      className="admin-input flex-1 max-w-xs"
                      placeholder="Custom amenity (e.g. Tennis Court)"
                      value={customAmenity}
                      onChange={e => setCustomAmenity(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addCustomAmenity())}
                    />
                    <button type="button" onClick={addCustomAmenity} className="btn-secondary py-2">
                      <Plus className="w-4 h-4" /> Add
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* ── SECTION B: LAYOUT TYPES ── */}
            <div className="admin-card p-6 space-y-6">
              <div className="flex items-center justify-between pb-3 border-b border-surface-100">
                <div className="flex items-center gap-2">
                  <Layers className="w-5 h-5 text-primary-600" />
                  <h2 className="text-base font-bold text-surface-900">Section B — Floor Plans & Layout Types ({layouts.length})</h2>
                </div>
                <button type="button" onClick={addLayout} className="btn-secondary py-1.5 text-sm">
                  <Plus className="w-4 h-4" /> Add Layout
                </button>
              </div>

              <div className="space-y-8 divide-y divide-surface-100">
                {layouts.map((layout, i) => (
                  <div key={i} className={clsx('space-y-5', i > 0 && 'pt-6')}>
                    {/* Layout header */}
                    <div className="flex items-center justify-between">
                      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-xl bg-surface-100 text-surface-700 text-xs font-black">
                        Layout #{i + 1}
                      </div>
                      {layouts.length > 1 && (
                        <button type="button" onClick={() => removeLayout(i)} className="btn-ghost text-red-500 hover:text-red-600 hover:bg-red-50 text-xs py-1">
                          <Trash2 className="w-4 h-4" /> Remove
                        </button>
                      )}
                    </div>

                    {/* Labels */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="admin-label">Layout Label (English) *</label>
                        <input type="text" className="admin-input" placeholder="e.g. Type A – 3 Bed Apartment" value={layout.labelEn} onChange={e => updateLayout(i, 'labelEn', e.target.value)} required />
                      </div>
                      <div dir="rtl">
                        <label className="admin-label text-right">تسمية المخطط (عربي) *</label>
                        <input type="text" className="admin-input text-right font-arabic" placeholder="مثال: نموذج أ – ٣ غرف" value={layout.labelAr} onChange={e => updateLayout(i, 'labelAr', e.target.value)} required />
                      </div>
                    </div>

                    {/* Price, Area, Beds, Baths */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                      <div>
                        <label className="admin-label">Price (SAR) *</label>
                        <input type="number" className="admin-input" placeholder="e.g. 750000" value={layout.price} onChange={e => updateLayout(i, 'price', e.target.value)} required />
                      </div>
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <label className="admin-label mb-0">Area (sqm)</label>
                          {layout.areaSqm && !isNaN(Number(layout.areaSqm)) && (
                            <span className="text-[10px] font-bold text-primary-600">
                              ≈ {Math.round(Number(layout.areaSqm) * 10.7639).toLocaleString()} sqft
                            </span>
                          )}
                        </div>
                        <input type="number" className="admin-input" placeholder="e.g. 145" value={layout.areaSqm} onChange={e => updateLayout(i, 'areaSqm', e.target.value)} />
                      </div>
                      <div>
                        <label className="admin-label">Bedrooms</label>
                        <input type="number" className="admin-input" placeholder="e.g. 3" value={layout.bedrooms} onChange={e => updateLayout(i, 'bedrooms', e.target.value)} />
                      </div>
                      <div>
                        <label className="admin-label">Bathrooms</label>
                        <input type="number" className="admin-input" placeholder="e.g. 2" value={layout.bathrooms} onChange={e => updateLayout(i, 'bathrooms', e.target.value)} />
                      </div>
                    </div>

                    {/* Layout Descriptions */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="admin-label">Layout Description (English) — Optional</label>
                        <textarea className="admin-input h-20 resize-none" placeholder="Specific details about this floor plan..." value={layout.descriptionEn} onChange={e => updateLayout(i, 'descriptionEn', e.target.value)} />
                      </div>
                      <div dir="rtl">
                        <label className="admin-label text-right">وصف المخطط (عربي) — اختياري</label>
                        <textarea className="admin-input h-20 resize-none text-right font-arabic" placeholder="تفاصيل خاصة بهذا المخطط..." value={layout.descriptionAr} onChange={e => updateLayout(i, 'descriptionAr', e.target.value)} />
                      </div>
                    </div>

                    {/* Completion override + Floor plan image */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      <div>
                        <label className="admin-label">Completion Status Override</label>
                        <select className="admin-input" value={layout.completionStatus} onChange={e => updateLayout(i, 'completionStatus', e.target.value)}>
                          <option value="">Use project default</option>
                          <option value="READY">Ready to Move In</option>
                          <option value="OFF_PLAN">Off-Plan</option>
                          <option value="UNDER_CONSTRUCTION">Under Construction</option>
                        </select>
                      </div>
                      <div>
                        <label className="admin-label">Floor Plan Image</label>
                        <div className="flex items-center gap-3">
                          <div className="w-20 h-14 rounded-xl border border-surface-200 bg-surface-50 flex items-center justify-center overflow-hidden shrink-0 relative group">
                            {layout.photos[0] ? (
                              <>
                                <img src={layout.photos[0]} className="w-full h-full object-cover" alt="" />
                                <button type="button" onClick={() => updateLayout(i, 'photos', [])} className="absolute inset-0 bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                  <Trash2 className="w-4 h-4 text-red-400" />
                                </button>
                              </>
                            ) : (
                              <ImageIcon className="w-6 h-6 text-surface-300" />
                            )}
                          </div>
                          <CldUploadWidget uploadPreset="saudi_re_listing" onSuccess={(r: any) => {
                            if (r.event === 'success' && r.info?.secure_url) updateLayout(i, 'photos', [r.info.secure_url]);
                          }}>
                            {({ open }) => (
                              <button type="button" onClick={() => open()} className="btn-secondary text-xs py-1.5">
                                <Upload className="w-3.5 h-3.5" /> Upload
                              </button>
                            )}
                          </CldUploadWidget>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Submit */}
            <div className="flex items-center justify-end gap-3 pb-6">
              <Link href="/projects" className="btn-secondary">Cancel</Link>
              <button type="submit" disabled={saving} className="btn-primary gap-2">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {saving ? 'Creating Project...' : 'Create Project & Listings'}
              </button>
            </div>

          </form>
        </div>
      </div>
    </div>
  );
}
