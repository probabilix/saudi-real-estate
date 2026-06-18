'use client';
export const dynamic = 'force-dynamic';
import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { AdminTopBar } from '@/components/AdminSidebar';
import { adminApi } from '@/lib/api';
import { CldUploadWidget } from 'next-cloudinary';
import {
  Plus, Trash2, Save, X, ArrowLeft, Loader2,
  Upload, Image as ImageIcon, Check,
  AlertCircle, Sparkles, Building, Layers, Star
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
  { key: 'power', label: 'Power Backup', labelAr: 'مولد كهرباء احتياطي' },
  { key: 'gas', label: 'Central Gas', labelAr: 'غاز مركزي' },
  { key: 'tv_room', label: 'TV Room', labelAr: 'غرفة معيشة / تلفزيون' },
  { key: 'lounge', label: 'Lounge', labelAr: 'صالة استقبال' },
  { key: 'kitchen_plus', label: 'Kitchen+', labelAr: 'مطبخ مجهز' },
  { key: 'driver_room', label: 'Driver Room', labelAr: 'غرفة سائق' },
  { key: 'concierge', label: 'Concierge', labelAr: 'خدمة بواب' },
  { key: 'study_room', label: 'Study Room', labelAr: 'غرفة دراسة' },
  { key: 'view_of_landmark', label: 'View Of Landmark', labelAr: 'إطلالة على معلم' },
  { key: 'walk_in_closet', label: 'Walk In Closet', labelAr: 'غرفة ملابس' },
  { key: 'waste_disposal', label: 'Waste Disposal', labelAr: 'التخلص من النفايات' },
  { key: 'built_in_wardrobes', label: 'Built In Wardrobes', labelAr: 'خزائن ملابس مدمجة' },
  { key: 'kitchen_appliances', label: 'Kitchen Appliances', labelAr: 'أجهزة مطبخ مدمجة' },
  { key: 'barbecue_area', label: 'Barbecue Area', labelAr: 'منطقة شواء' },
];

interface ProjectFormState {
  nameEn: string;
  nameAr: string;
  city: string;
  district: string;
  descriptionEn: string;
  descriptionAr: string;
  brochureUrl: string;
  regaFalLicense: string;
  amenities: Record<string, boolean>;
  photos: string[];
  completionStatus: 'READY' | 'OFF_PLAN' | 'UNDER_CONSTRUCTION';
  expectedDelivery: string;
  totalUnits: number;
  mapEmbedUrl: string;
  isFeatured: boolean;
  featuredOrder: number;
}

export default function EditProjectPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Project Data State
  const [projectData, setProjectData] = useState<ProjectFormState>({
    nameEn: '',
    nameAr: '',
    city: 'Riyadh',
    district: '',
    descriptionEn: '',
    descriptionAr: '',
    brochureUrl: '',
    regaFalLicense: '',
    amenities: {},
    photos: [],
    completionStatus: 'READY',
    expectedDelivery: '',
    totalUnits: 0,
    mapEmbedUrl: '',
    isFeatured: false,
    featuredOrder: 0,
  });

  // Custom dynamic amenities list
  const [customAmenity, setCustomAmenity] = useState('');
  const [dynamicAmenities, setDynamicAmenities] = useState<string[]>([]);

  // Layouts State
  interface LayoutRow {
    id?: string;
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

  const [layouts, setLayouts] = useState<LayoutRow[]>([]);

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

  useEffect(() => {
    if (id) {
      loadProject();
    }
  }, [id]);

  async function loadProject() {
    setLoading(true);
    setError(null);
    try {
      const res = await adminApi.getProjectDetails(id);
      if (res.success && res.data?.project) {
        const p = res.data.project;
        
        // Map initial amenities values safely
        const rawAmenities = p.amenities || {};
        const amenitiesState: Record<string, boolean> = {};
        
        // Pre-fill standard ones
        AMENITY_OPTIONS.forEach(opt => {
          amenitiesState[opt.key] = rawAmenities[opt.key] === true;
        });

        // Detect dynamic custom amenities
        const standardKeys = AMENITY_OPTIONS.map(o => o.key);
        const customKeys = Object.keys(rawAmenities).filter(
          k => rawAmenities[k] === true && !standardKeys.includes(k)
        );
        
        // Map custom ones too
        customKeys.forEach(k => {
          amenitiesState[k] = true;
        });

        setDynamicAmenities(customKeys);
        setProjectData({
          nameEn: p.nameEn || '',
          nameAr: p.nameAr || '',
          city: p.city || 'Riyadh',
          district: p.district || '',
          descriptionEn: p.descriptionEn || '',
          descriptionAr: p.descriptionAr || '',
          brochureUrl: p.brochureUrl || '',
          regaFalLicense: p.regaFalLicense || '',
          amenities: amenitiesState,
          photos: p.photos || [],
          completionStatus: p.completionStatus || 'READY',
          expectedDelivery: p.expectedDelivery || '',
          totalUnits: p.totalUnits || 0,
          mapEmbedUrl: p.mapEmbedUrl || '',
          isFeatured: !!p.isFeatured,
          featuredOrder: p.featuredOrder || 0,
        });

        // Pre-fill layouts
        const dbLayouts = res.data.layouts || [];
        const mappedLayouts: LayoutRow[] = dbLayouts.map((l: any) => {
          const regexEn = new RegExp(`^${p.nameEn || ''}\\s*-\\s*`);
          const regexAr = new RegExp(`^${p.nameAr || ''}\\s*-\\s*`);
          const labelEn = l.enTitle ? l.enTitle.replace(regexEn, '') : '';
          const labelAr = l.arTitle ? l.arTitle.replace(regexAr, '') : '';
          return {
            id: l.id,
            labelEn,
            labelAr,
            price: l.price ? String(l.price) : '',
            areaSqm: l.areaSqm ? String(l.areaSqm) : '',
            bedrooms: l.bedrooms !== null ? String(l.bedrooms) : '',
            bathrooms: l.bathrooms !== null ? String(l.bathrooms) : '',
            photos: l.photos || [],
            completionStatus: l.completionStatus || '',
            descriptionEn: l.enDescription || '',
            descriptionAr: l.arDescription || '',
          };
        });
        setLayouts(mappedLayouts);
      } else {
        setError('Failed to fetch project details.');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred while loading project details.');
    } finally {
      setLoading(false);
    }
  }

  // Handle inputs
  const handleProjectChange = (key: keyof ProjectFormState, value: any) => {
    setProjectData(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleAmenityToggle = (key: string) => {
    setProjectData(prev => ({
      ...prev,
      amenities: {
        ...prev.amenities,
        [key]: !prev.amenities[key]
      }
    }));
  };

  const addCustomAmenity = () => {
    if (!customAmenity.trim()) return;
    const id = customAmenity.toLowerCase().trim().replace(/\s+/g, '_');
    setDynamicAmenities(prev => prev.includes(id) ? prev : [...prev, id]);
    setProjectData(prev => ({
      ...prev,
      amenities: {
        ...prev.amenities,
        [id]: true
      }
    }));
    setCustomAmenity('');
  };

  const removeCustomAmenity = (id: string) => {
    setDynamicAmenities(prev => prev.filter(a => a !== id));
    setProjectData(prev => {
      const nextAmenities = { ...prev.amenities };
      delete nextAmenities[id];
      return { ...prev, amenities: nextAmenities };
    });
  };

  // Submit update
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation checks
    if (!projectData.nameEn || !projectData.nameAr || !projectData.city) {
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
      // Filter amenities to only send true ones
      const cleanAmenities: Record<string, boolean> = {};
      Object.entries(projectData.amenities).forEach(([k, v]) => {
        if (v) cleanAmenities[k] = true;
      });

      const payload = {
        ...projectData,
        amenities: cleanAmenities,
        totalUnits: projectData.totalUnits ? Number(projectData.totalUnits) : null,
        featuredOrder: projectData.featuredOrder ? Number(projectData.featuredOrder) : 0,
        layouts: layouts.map(l => ({
          id: l.id,
          labelEn: l.labelEn,
          labelAr: l.labelAr,
          price: Number(l.price),
          areaSqm: l.areaSqm ? Number(l.areaSqm) : undefined,
          bedrooms: l.bedrooms ? Number(l.bedrooms) : undefined,
          bathrooms: l.bathrooms ? Number(l.bathrooms) : undefined,
          photos: l.photos,
          completionStatus: l.completionStatus || undefined,
          descriptionEn: l.descriptionEn || undefined,
          descriptionAr: l.descriptionAr || undefined,
        })),
      };

      const result = await adminApi.updateProject(id, payload);

      if (result.success) {
        setToast({ message: 'Project details updated successfully!', type: 'success' });
        setTimeout(() => {
          router.push('/projects');
        }, 1500);
      } else {
        setError(result.message || 'Failed to update project details.');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred during save.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-canvas">
      <AdminTopBar title="Edit Project Details" />

      {/* Top Banner and Navigation */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6 max-w-5xl mx-auto w-full pb-20">
        
        <div className="flex items-center gap-3">
          <Link href="/projects" className="btn-secondary py-1.5 px-3">
            <ArrowLeft className="w-4 h-4" /> Back to Projects
          </Link>
          <div className="h-4 w-px bg-surface-200" />
          <div className="text-xs text-surface-500 font-medium">Modify Project Shared Assets</div>
        </div>

        {error && (
          <div className="flex items-center gap-3 px-4 py-3 bg-rose-50 border border-rose-200 rounded-xl text-sm text-rose-700">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
            <p className="font-semibold">{error}</p>
          </div>
        )}

        {toast && (
          <div className={clsx(
            "fixed top-4 right-4 z-[999] flex items-center gap-3 px-5 py-3.5 rounded-xl border text-sm font-semibold shadow-lg animate-in fade-in slide-in-from-top-4 duration-300",
            toast.type === 'success' ? "bg-emerald-500 text-white border-emerald-600" : "bg-rose-500 text-white border-rose-600"
          )}>
            {toast.type === 'success' ? <Check className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
            {toast.message}
          </div>
        )}

        {loading ? (
          <div className="py-20 text-center flex flex-col items-center gap-3 bg-white border border-surface-150 rounded-2xl">
            <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
            <p className="text-xs text-surface-500">Loading project records...</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-8 animate-in fade-in duration-200">
            
            {/* SHARED PROJECT DETAILS */}
            <div className="admin-card p-6 space-y-6">
              <div className="flex items-center gap-2 border-b border-surface-100 pb-3">
                <Building className="w-5 h-5 text-primary-600" />
                <h2 className="text-base font-bold text-surface-900">Project Shared Information</h2>
              </div>

              {/* Bilingual Project Names */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="admin-label">Project Name (English)</label>
                  <input
                    type="text"
                    placeholder="e.g. Al Yasmin Residence"
                    className="admin-input"
                    value={projectData.nameEn}
                    onChange={(e) => handleProjectChange('nameEn', e.target.value)}
                    required
                  />
                </div>
                <div dir="rtl">
                  <label className="admin-label text-right">اسم المشروع (عربي)</label>
                  <input
                    type="text"
                    placeholder="مثال: سكن الياسمين"
                    className="admin-input text-right font-arabic"
                    value={projectData.nameAr}
                    onChange={(e) => handleProjectChange('nameAr', e.target.value)}
                    required
                  />
                </div>
              </div>

              {/* Location */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="admin-label">City</label>
                  <select
                    className="admin-input"
                    value={projectData.city}
                    onChange={(e) => handleProjectChange('city', e.target.value)}
                    required
                  >
                    {CITIES.map(city => (
                      <option key={city} value={city}>{city}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="admin-label">District (English)</label>
                  <input
                    type="text"
                    placeholder="e.g. Al Yasmin"
                    className="admin-input"
                    value={projectData.district}
                    onChange={(e) => handleProjectChange('district', e.target.value)}
                  />
                </div>
              </div>

              {/* Shared Document Files & Info */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="admin-label">REGA FAL License Number</label>
                  <input
                    type="text"
                    placeholder="e.g. 1200008889"
                    className="admin-input"
                    value={projectData.regaFalLicense}
                    onChange={(e) => handleProjectChange('regaFalLicense', e.target.value)}
                  />
                </div>
                <div>
                  <label className="admin-label">Completion Status</label>
                  <select
                    className="admin-input"
                    value={projectData.completionStatus}
                    onChange={(e) => handleProjectChange('completionStatus', e.target.value)}
                  >
                    <option value="READY">Ready to Move</option>
                    <option value="OFF_PLAN">Off Plan</option>
                    <option value="UNDER_CONSTRUCTION">Under Construction</option>
                  </select>
                </div>
                {projectData.completionStatus !== 'READY' && (
                  <div>
                    <label className="admin-label">Expected Delivery</label>
                    <input
                      type="text"
                      placeholder="e.g. Q3 2026 or Dec 2027"
                      className="admin-input"
                      value={projectData.expectedDelivery}
                      onChange={(e) => handleProjectChange('expectedDelivery', e.target.value)}
                    />
                  </div>
                )}
                {projectData.completionStatus === 'READY' && (
                  <div>
                    <label className="admin-label">Total physical units count</label>
                    <input
                      type="number"
                      placeholder="e.g. 48"
                      className="admin-input"
                      value={projectData.totalUnits || ''}
                      onChange={(e) => handleProjectChange('totalUnits', e.target.value ? Number(e.target.value) : '')}
                    />
                  </div>
                )}
              </div>

              {/* Brochure PDF Upload */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="admin-label">Project Brochure PDF Document</label>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 bg-surface-50 border border-surface-200 rounded-xl px-3.5 py-2.5 text-xs font-mono text-surface-600 truncate">
                      {projectData.brochureUrl || 'No brochure file uploaded'}
                    </div>
                    <CldUploadWidget
                      uploadPreset="saudi_re_listing"
                      onSuccess={(result: any) => {
                        if (result.event === 'success' && result.info?.secure_url) {
                          handleProjectChange('brochureUrl', result.info.secure_url);
                        }
                      }}
                    >
                      {({ open }) => (
                        <button
                          type="button"
                          onClick={() => open()}
                          className="btn-secondary shrink-0 whitespace-nowrap py-2.5"
                        >
                          <Upload className="w-4 h-4" /> Upload PDF
                        </button>
                      )}
                    </CldUploadWidget>
                  </div>
                </div>

                <div>
                  <label className="admin-label">Google Maps Embed URL</label>
                  <input
                    type="text"
                    placeholder="Paste Map Embed iframe src url..."
                    className="admin-input text-xs"
                    value={projectData.mapEmbedUrl}
                    onChange={(e) => handleProjectChange('mapEmbedUrl', e.target.value)}
                  />
                </div>
              </div>

              {/* Featured Status (Admin/CRM settings) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 bg-amber-500/5 border border-amber-500/20 rounded-2xl">
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="isFeatured"
                    checked={projectData.isFeatured}
                    onChange={(e) => handleProjectChange('isFeatured', e.target.checked)}
                    className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500 border-surface-300"
                  />
                  <div>
                    <label htmlFor="isFeatured" className="text-xs font-bold text-surface-900 cursor-pointer flex items-center gap-1.5">
                      <Star className={clsx("w-4 h-4", projectData.isFeatured ? "text-amber-500 fill-amber-500" : "text-surface-400")} />
                      Feature this project
                    </label>
                    <p className="text-[10px] text-surface-500 mt-0.5">Show this project in the featured section of home page and top of project searches.</p>
                  </div>
                </div>
                {projectData.isFeatured && (
                  <div>
                    <label className="admin-label">Featured Order (Sorting Rank)</label>
                    <input
                      type="number"
                      min="0"
                      placeholder="e.g. 1"
                      className="admin-input"
                      value={projectData.featuredOrder}
                      onChange={(e) => handleProjectChange('featuredOrder', e.target.value)}
                    />
                    <p className="text-[10px] text-surface-500 mt-1">Lower values rank higher (e.g., 1 is shown before 2).</p>
                  </div>
                )}
              </div>

              {/* Cover Photo Gallery */}
              <div className="space-y-3">
                <label className="admin-label">Project gallery cover photos</label>
                <div className="flex flex-wrap gap-4 items-center">
                  {projectData.photos.map((photoUrl, index) => (
                    <div key={index} className="w-24 h-16 rounded-xl border border-surface-200 overflow-hidden relative group">
                      <img src={photoUrl} className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => handleProjectChange('photos', projectData.photos.filter((_, i) => i !== index))}
                        className="absolute inset-0 bg-black/55 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Trash2 className="w-4 h-4 text-red-400" />
                      </button>
                    </div>
                  ))}
                  
                  <CldUploadWidget
                    uploadPreset="saudi_re_listing"
                    onSuccess={(result: any) => {
                      if (result.event === 'success' && result.info?.secure_url) {
                        handleProjectChange('photos', [...projectData.photos, result.info.secure_url]);
                      }
                    }}
                  >
                    {({ open }) => (
                      <button
                        type="button"
                        onClick={() => open()}
                        className="w-24 h-16 border-2 border-dashed border-surface-200 rounded-xl hover:bg-surface-50 flex flex-col items-center justify-center gap-1 text-surface-400 transition-colors"
                      >
                        <Plus className="w-5 h-5 text-surface-400" />
                        <span className="text-[10px] font-semibold">Add Photo</span>
                      </button>
                    )}
                  </CldUploadWidget>
                </div>
              </div>

              {/* Bilingual Description Textareas */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="admin-label">Description (English)</label>
                  <textarea
                    placeholder="Describe the compound complex, physical amenities, access to key roads..."
                    className="admin-input h-28"
                    value={projectData.descriptionEn}
                    onChange={(e) => handleProjectChange('descriptionEn', e.target.value)}
                  />
                </div>
                <div dir="rtl">
                  <label className="admin-label text-right">الوصف (عربي)</label>
                  <textarea
                    placeholder="اكتب وصفاً للمجمع السكني، والمرافق المشتركة وموقعه..."
                    className="admin-input h-28 text-right font-arabic"
                    value={projectData.descriptionAr}
                    onChange={(e) => handleProjectChange('descriptionAr', e.target.value)}
                  />
                </div>
              </div>

              {/* Shared Amenities checklist */}
              <div className="space-y-4">
                <label className="admin-label">Shared Amenities</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-xl bg-surface-50 border border-surface-150">
                  {AMENITY_OPTIONS.map(amenity => {
                    const isChecked = projectData.amenities[amenity.key];
                    return (
                      <label
                        key={amenity.key}
                        className={clsx(
                          "flex items-center gap-2.5 px-3 py-2 rounded-xl border text-xs font-semibold cursor-pointer select-none transition-all",
                          isChecked 
                            ? "bg-primary-600/10 border-primary-500/25 text-primary-700" 
                            : "bg-white border-surface-200 text-surface-600 hover:bg-surface-50"
                        )}
                      >
                        <input
                          type="checkbox"
                          className="hidden"
                          checked={isChecked || false}
                          onChange={() => handleAmenityToggle(amenity.key)}
                        />
                        <div className={clsx(
                          "w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors",
                          isChecked ? "bg-primary-600 border-primary-600 text-white" : "border-surface-300 bg-white"
                        )}>
                          {isChecked && <Check className="w-3 h-3" />}
                        </div>
                        <div className="flex flex-col">
                          <span>{amenity.label}</span>
                          <span className="text-[9px] text-surface-400 font-arabic tracking-wide mt-0.5" dir="rtl">{amenity.labelAr}</span>
                        </div>
                      </label>
                    );
                  })}
                </div>

                {/* Custom dynamic amenities */}
                <div className="space-y-3 pt-3 border-t border-surface-150">
                  <div className="text-xs font-bold text-surface-700">Custom Project-Specific Amenities</div>
                  
                  {dynamicAmenities.length > 0 && (
                    <div className="flex flex-wrap gap-2 pb-2">
                      {dynamicAmenities.map(id => (
                        <span key={id} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-indigo-50 border border-indigo-100 text-xs font-bold text-indigo-700">
                          {id.replace(/_/g, ' ')}
                          <button
                            type="button"
                            onClick={() => removeCustomAmenity(id)}
                            className="w-4 h-4 rounded-full bg-indigo-200 hover:bg-indigo-300 text-indigo-800 flex items-center justify-center text-[10px] transition-colors"
                          >
                            <X className="w-2.5 h-2.5" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="flex items-center gap-3">
                    <input
                      type="text"
                      placeholder="e.g. Squash Court or Driver Lounge"
                      className="admin-input max-w-xs"
                      value={customAmenity}
                      onChange={(e) => setCustomAmenity(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          addCustomAmenity();
                        }
                      }}
                    />
                    <button
                      type="button"
                      onClick={addCustomAmenity}
                      className="btn-secondary py-2"
                    >
                      <Plus className="w-4 h-4" /> Add Custom Amenity
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
                        Layout #{i + 1} {layout.id ? `(Existing: ${layout.id.slice(0, 8)})` : '(New)'}
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
                            {layout.photos?.[0] ? (
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

            {/* Submission Action */}
            <div className="flex items-center justify-end gap-3 pt-4">
              <Link href="/projects" className="btn-secondary">
                Cancel
              </Link>
              <button
                type="submit"
                disabled={saving}
                className="btn-primary px-6"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Saving changes...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" /> Save Project Details
                  </>
                )}
              </button>
            </div>

          </form>
        )}

      </div>
    </div>
  );
}
