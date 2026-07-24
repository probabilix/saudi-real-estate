'use client';
export const dynamic = 'force-dynamic';
import React, { useState, useEffect, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { crmApi } from '@/lib/api';
import { CldUploadWidget } from 'next-cloudinary';
import {
  Plus, Trash2, Save, ArrowLeft, ArrowRight, Loader2,
  Upload, Image as ImageIcon, Check,
  AlertCircle, Sparkles, Layers, Star,
  ShieldCheck, Building2, FileText, MapPin, Hash, Calendar, Menu
} from 'lucide-react';
import clsx from 'clsx';

const CITIES = ['Riyadh', 'Jeddah', 'Mecca', 'Madinah', 'Dammam', 'Khobar', 'Al-Ahsa', 'Tabuk', 'Buraidah', 'Abha'];

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
  brochureUrlAr: string;
  regaFalLicense: string;
  amenities: Record<string, boolean>;
  photos: string[];
  completionStatus: 'READY' | 'OFF_PLAN' | 'UNDER_CONSTRUCTION';
  expectedDelivery: string;
  totalUnits: number;
  mapEmbedUrl: string;
  foreignerEligible: boolean;
  muslimOnly: boolean;
}

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

export default function EditDeveloperProjectPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const hasUserEdited = useRef(false);

  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [isOverIndex, setIsOverIndex] = useState<number | null>(null);
  const touchStartIndexRef = useRef<number | null>(null);

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

    const updated = [...projectData.photos];
    const [moved] = updated.splice(sourceIndex, 1);
    updated.splice(targetIndex, 0, moved);
    handleProjectChange('photos', updated);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setIsOverIndex(null);
  };

  const handleTouchStart = (index: number) => {
    touchStartIndexRef.current = index;
    setDraggedIndex(index);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStartIndexRef.current === null) return;
    const touch = e.touches[0];
    const targetEl = document.elementFromPoint(touch.clientX, touch.clientY);
    if (!targetEl) return;
    const photoCard = targetEl.closest('[data-photo-index]');
    if (photoCard) {
      const targetIdxStr = photoCard.getAttribute('data-photo-index');
      if (targetIdxStr !== null) {
        const targetIdx = parseInt(targetIdxStr, 10);
        if (!isNaN(targetIdx) && targetIdx !== touchStartIndexRef.current) {
          setIsOverIndex(targetIdx);
        }
      }
    }
  };

  const handleTouchEnd = () => {
    if (touchStartIndexRef.current !== null && isOverIndex !== null && touchStartIndexRef.current !== isOverIndex) {
      const sourceIdx = touchStartIndexRef.current;
      const targetIdx = isOverIndex;
      const updated = [...projectData.photos];
      const [moved] = updated.splice(sourceIdx, 1);
      updated.splice(targetIdx, 0, moved);
      handleProjectChange('photos', updated);
    }
    touchStartIndexRef.current = null;
    setDraggedIndex(null);
    setIsOverIndex(null);
  };

  const [projectData, setProjectData] = useState<ProjectFormState>({
    nameEn: '',
    nameAr: '',
    city: 'Riyadh',
    district: '',
    descriptionEn: '',
    descriptionAr: '',
    brochureUrl: '',
    brochureUrlAr: '',
    regaFalLicense: '',
    amenities: {},
    photos: [],
    completionStatus: 'OFF_PLAN',
    expectedDelivery: '',
    totalUnits: 0,
    mapEmbedUrl: '',
    foreignerEligible: false,
    muslimOnly: false,
  });

  const [customAmenity, setCustomAmenity] = useState('');
  const [dynamicAmenities, setDynamicAmenities] = useState<string[]>([]);
  const [layouts, setLayouts] = useState<LayoutRow[]>([]);
  const [hasDraft, setHasDraft] = useState(false);
  const [draftTime, setDraftTime] = useState('');

  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(null), 4000);
      return () => clearTimeout(t);
    }
  }, [toast]);

  useEffect(() => {
    if (id) {
      loadProject();
    }
  }, [id]);

  useEffect(() => {
    const saved = localStorage.getItem(`tamleeq_developer_project_edit_draft_${id}`);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.updatedAt) {
          setHasDraft(true);
          setDraftTime(new Date(parsed.updatedAt).toLocaleString());
        }
      } catch (e) {
        // ignore
      }
    }
  }, [id]);

  useEffect(() => {
    if (hasUserEdited.current && id) {
      const draft = {
        projectData,
        layouts,
        dynamicAmenities,
        updatedAt: new Date().toISOString()
      };
      localStorage.setItem(`tamleeq_developer_project_edit_draft_${id}`, JSON.stringify(draft));
    }
  }, [projectData, layouts, dynamicAmenities, id]);

  async function loadProject() {
    setLoading(true);
    setError(null);
    try {
      const res = await crmApi.getProjectDetails(id);
      if (res.success && res.data?.project) {
        const p = res.data.project;
        const rawAmenities = p.amenities || {};
        const amenitiesState: Record<string, boolean> = {};

        AMENITY_OPTIONS.forEach(opt => {
          amenitiesState[opt.key] = rawAmenities[opt.key] === true;
        });

        const standardKeys = AMENITY_OPTIONS.map(o => o.key);
        const customKeys = Object.keys(rawAmenities).filter(
          k => rawAmenities[k] === true && !standardKeys.includes(k)
        );

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
          brochureUrlAr: p.brochureUrlAr || '',
          regaFalLicense: p.regaFalLicense || '',
          amenities: amenitiesState,
          photos: p.photos || [],
          completionStatus: p.completionStatus || 'OFF_PLAN',
          expectedDelivery: p.expectedDelivery || '',
          totalUnits: p.totalUnits || 0,
          mapEmbedUrl: p.mapEmbedUrl || '',
          foreignerEligible: !!p.foreignerEligible,
          muslimOnly: !!p.muslimOnly,
        });

        const dbLayouts = res.data.layouts || [];
        const escapeRx = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const prefixPatternEn = p.nameEn ? `(?:${escapeRx(p.nameEn)}\\s*-\\s*)+` : null;
        const prefixPatternAr = p.nameAr ? `(?:${escapeRx(p.nameAr)}\\s*-\\s*)+` : null;
        const regexEn = prefixPatternEn ? new RegExp(`^${prefixPatternEn}`) : null;
        const regexAr = prefixPatternAr ? new RegExp(`^${prefixPatternAr}`) : null;

        const mappedLayouts: LayoutRow[] = dbLayouts.map((l: any) => {
          const labelEn = l.enTitle
            ? (regexEn ? l.enTitle.replace(regexEn, '') : l.enTitle)
            : '';
          const labelAr = l.arTitle
            ? (regexAr ? l.arTitle.replace(regexAr, '') : l.arTitle)
            : '';
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
      setError(err.message || 'An error occurred loading project details.');
    } finally {
      setLoading(false);
    }
  }

  const restoreDraft = () => {
    const saved = localStorage.getItem(`tamleeq_developer_project_edit_draft_${id}`);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.projectData) setProjectData(parsed.projectData);
        if (parsed.layouts) setLayouts(parsed.layouts);
        if (parsed.dynamicAmenities) setDynamicAmenities(parsed.dynamicAmenities);
        setHasDraft(false);
      } catch (e) {
        // ignore
      }
    }
  };

  const discardDraft = () => {
    localStorage.removeItem(`tamleeq_developer_project_edit_draft_${id}`);
    setHasDraft(false);
  };

  const handleProjectChange = (key: keyof ProjectFormState, value: any) => {
    hasUserEdited.current = true;
    setProjectData(prev => ({ ...prev, [key]: value }));
  };

  const handleAmenityToggle = (key: string) => {
    hasUserEdited.current = true;
    setProjectData(prev => ({
      ...prev,
      amenities: { ...prev.amenities, [key]: !prev.amenities[key] }
    }));
  };

  const addCustomAmenity = () => {
    if (!customAmenity.trim()) return;
    hasUserEdited.current = true;
    const id = customAmenity.toLowerCase().trim().replace(/\s+/g, '_');
    setDynamicAmenities(prev => prev.includes(id) ? prev : [...prev, id]);
    setProjectData(prev => ({
      ...prev,
      amenities: { ...prev.amenities, [id]: true }
    }));
    setCustomAmenity('');
  };

  const removeCustomAmenity = (id: string) => {
    hasUserEdited.current = true;
    setDynamicAmenities(prev => prev.filter(a => a !== id));
    setProjectData(prev => {
      const nextAmenities = { ...prev.amenities };
      delete nextAmenities[id];
      return { ...prev, amenities: nextAmenities };
    });
  };

  const addLayout = () => {
    hasUserEdited.current = true;
    setLayouts(prev => [...prev, {
      labelEn: `Type ${String.fromCharCode(65 + prev.length)}`,
      labelAr: `نموذج ${String.fromCharCode(65 + prev.length)}`,
      price: '', areaSqm: '', bedrooms: '', bathrooms: '', photos: [], completionStatus: '', descriptionEn: '', descriptionAr: ''
    }]);
  };

  const removeLayout = (i: number) => {
    if (layouts.length === 1) return;
    hasUserEdited.current = true;
    setLayouts(prev => prev.filter((_, idx) => idx !== i));
  };

  const updateLayout = (i: number, key: keyof LayoutRow, val: any) => {
    hasUserEdited.current = true;
    setLayouts(prev => prev.map((l, idx) => idx === i ? { ...l, [key]: val } : l));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!projectData.nameEn || !projectData.nameAr || !projectData.city) {
      setError('Project name (English & Arabic) and City are required.');
      return;
    }

    for (let i = 0; i < layouts.length; i++) {
      if (!layouts[i].labelEn || !layouts[i].labelAr || !layouts[i].price) {
        setError(`Layout #${i + 1}: English label, Arabic label, and price are required.`);
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
      Object.entries(projectData.amenities).forEach(([k, v]) => {
        if (v) cleanAmenities[k] = true;
      });

      const payload = {
        ...projectData,
        amenities: cleanAmenities,
        totalUnits: projectData.totalUnits ? Number(projectData.totalUnits) : null,
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

      const result = await crmApi.updateProject(id, payload);

      if (result.success) {
        localStorage.removeItem(`tamleeq_developer_project_edit_draft_${id}`);
        setToast({ message: 'Project details updated successfully!', type: 'success' });
        setTimeout(() => {
          router.push('/my-projects');
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

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-slate-50">
        <div className="text-center space-y-2">
          <Loader2 className="w-8 h-8 animate-spin text-primary-600 mx-auto" />
          <p className="text-xs text-slate-500 font-semibold">Loading project details...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-slate-50">
      {/* Toast */}
      {toast && (
        <div className={clsx(
          "fixed top-4 right-4 z-[999] flex items-center gap-3 px-5 py-3.5 rounded-xl border text-sm font-semibold shadow-lg animate-in fade-in slide-in-from-top-4 duration-300",
          toast.type === 'success' ? "bg-emerald-500 text-white border-emerald-600" : "bg-rose-500 text-white border-rose-600"
        )}>
          {toast.message}
        </div>
      )}

      {/* Top Bar Header */}
      <div className="bg-slate-900 border-b border-slate-800 p-6 text-white shrink-0">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => window.dispatchEvent(new CustomEvent('crm-sidebar-toggle'))}
              className="md:hidden p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-all shrink-0"
              title="Toggle Menu"
            >
              <Menu className="w-5 h-5" />
            </button>
            <Link href="/my-projects" className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-all shrink-0">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-xl font-black text-white mt-1">Edit Project Details</h1>
              <p className="text-xs text-slate-400">Modify shared compound assets, details and layouts inventory</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Scrollable Content */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-5xl mx-auto space-y-6">

          {error && (
            <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-2xl text-red-700 text-sm font-bold shadow-sm animate-in fade-in">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {hasDraft && (
            <div className="flex items-center justify-between p-4 bg-amber-50 border border-amber-200 rounded-2xl shadow-sm">
              <div className="flex items-center gap-3">
                <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
                <div>
                  <span className="font-bold text-amber-800 text-sm">Unsaved Draft Found!</span>
                  <p className="text-amber-700 text-xs mt-0.5">We found an unsaved draft from your last edit session ({draftTime}). Would you like to restore it?</p>
                </div>
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={restoreDraft} className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs py-1.5 px-3 rounded-xl transition-all">Restore</button>
                <button type="button" onClick={discardDraft} className="bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold text-xs py-1.5 px-3 rounded-xl transition-all">Discard</button>
              </div>
            </div>
          )}

          <form id="edit-developer-project-form" onSubmit={handleSubmit} className="space-y-6">

            {/* SECTION A: PROJECT INFORMATION */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6">
              <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
                <Building2 className="w-5 h-5 text-primary-600" />
                <h2 className="text-base font-bold text-slate-900">Section A — Project Information</h2>
              </div>

              {/* Names */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Project Name (English) *</label>
                  <input
                    type="text"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-primary-500 outline-none"
                    placeholder="e.g. Al Rehab Residence"
                    value={projectData.nameEn}
                    onChange={e => handleProjectChange('nameEn', e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Project Name (Arabic) *</label>
                  <input
                    type="text"
                    dir="rtl"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-arabic focus:ring-2 focus:ring-primary-500 outline-none text-right"
                    placeholder="مثال: مشروع الرحاب"
                    value={projectData.nameAr}
                    onChange={e => handleProjectChange('nameAr', e.target.value)}
                    required
                  />
                </div>
              </div>

              {/* City + District + Total Units */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1"><MapPin className="w-3.5 h-3.5 text-slate-400" /> City *</label>
                  <select
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-primary-500 outline-none"
                    value={projectData.city}
                    onChange={e => handleProjectChange('city', e.target.value)}
                  >
                    {CITIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">District / Neighbourhood</label>
                  <input
                    type="text"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-primary-500 outline-none"
                    placeholder="e.g. Al Malqa"
                    value={projectData.district}
                    onChange={e => handleProjectChange('district', e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1"><Hash className="w-3.5 h-3.5 text-slate-400" /> Total Units</label>
                  <input
                    type="number"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-primary-500 outline-none"
                    placeholder="e.g. 48"
                    value={projectData.totalUnits}
                    onChange={e => handleProjectChange('totalUnits', e.target.value)}
                  />
                </div>
              </div>

              {/* Completion Status + Expected Delivery */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Completion Status *</label>
                  <select
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-primary-500 outline-none"
                    value={projectData.completionStatus}
                    onChange={e => handleProjectChange('completionStatus', e.target.value)}
                  >
                    <option value="READY">Ready to Move In</option>
                    <option value="OFF_PLAN">Off-Plan</option>
                    <option value="UNDER_CONSTRUCTION">Under Construction</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1"><Calendar className="w-3.5 h-3.5 text-slate-400" /> Expected Delivery</label>
                  <select
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-primary-500 outline-none"
                    value={projectData.expectedDelivery}
                    onChange={e => handleProjectChange('expectedDelivery', e.target.value)}
                  >
                    <option value="">Select Expected Delivery</option>
                    <option value="Q4 2026">Q4 2026</option>
                    <option value="Q1 2027">Q1 2027</option>
                    <option value="Q2 2027">Q2 2027</option>
                    <option value="Q3 2027">Q3 2027</option>
                    <option value="Q4 2027">Q4 2027</option>
                    <option value="After Q4 2027">After Q4 2027</option>
                    {projectData.expectedDelivery && !['Q4 2026', 'Q1 2027', 'Q2 2027', 'Q3 2027', 'Q4 2027', 'After Q4 2027'].includes(projectData.expectedDelivery) && (
                      <option value={projectData.expectedDelivery}>{projectData.expectedDelivery}</option>
                    )}
                  </select>
                </div>
              </div>

              {/* REGA Falcon License */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1"><ShieldCheck className="w-3.5 h-3.5 text-slate-400" /> REGA FAL License</label>
                  <input
                    type="text"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-primary-500 outline-none"
                    placeholder="e.g. 1234567890"
                    value={projectData.regaFalLicense}
                    onChange={e => handleProjectChange('regaFalLicense', e.target.value)}
                  />
                </div>
              </div>

              {/* Brochure English / Arabic Uploads */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1"><FileText className="w-3.5 h-3.5 text-slate-400" /> Project Brochure (English)</label>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-mono text-slate-600 truncate min-h-[38px]">
                      {projectData.brochureUrl || 'No brochure file uploaded'}
                    </div>
                    {projectData.brochureUrl && (
                      <button
                        type="button"
                        onClick={() => handleProjectChange('brochureUrl', '')}
                        className="p-2.5 text-red-500 hover:text-red-700 bg-red-50 border border-red-200 rounded-xl transition-colors shrink-0"
                        title="Remove English Brochure"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
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
                          className="flex items-center gap-1 bg-slate-200 hover:bg-slate-350 text-slate-800 font-bold px-3 py-2.5 rounded-xl text-xs shrink-0 whitespace-nowrap transition-all"
                        >
                          <Upload className="w-4 h-4" /> Upload English PDF
                        </button>
                      )}
                    </CldUploadWidget>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1"><FileText className="w-3.5 h-3.5 text-slate-400" /> Project Brochure (Arabic)</label>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-mono text-slate-600 truncate min-h-[38px]">
                      {projectData.brochureUrlAr || 'No brochure file uploaded'}
                    </div>
                    {projectData.brochureUrlAr && (
                      <button
                        type="button"
                        onClick={() => handleProjectChange('brochureUrlAr', '')}
                        className="p-2.5 text-red-500 hover:text-red-700 bg-red-50 border border-red-200 rounded-xl transition-colors shrink-0"
                        title="Remove Arabic Brochure"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                    <CldUploadWidget
                      uploadPreset="saudi_re_listing"
                      onSuccess={(result: any) => {
                        if (result.event === 'success' && result.info?.secure_url) {
                          handleProjectChange('brochureUrlAr', result.info.secure_url);
                        }
                      }}
                    >
                      {({ open }) => (
                        <button
                          type="button"
                          onClick={() => open()}
                          className="flex items-center gap-1 bg-slate-200 hover:bg-slate-350 text-slate-800 font-bold px-3 py-2.5 rounded-xl text-xs shrink-0 whitespace-nowrap transition-all"
                        >
                          <Upload className="w-4 h-4" /> Upload Arabic PDF
                        </button>
                      )}
                    </CldUploadWidget>
                  </div>
                </div>
              </div>

              {/* Descriptions */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Project Description (English)</label>
                  <textarea
                    rows={4}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-primary-500 outline-none resize-none"
                    placeholder="Describe the compound, amenities, access to key roads..."
                    value={projectData.descriptionEn}
                    onChange={e => handleProjectChange('descriptionEn', e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">وصف المشروع (عربي)</label>
                  <textarea
                    rows={4}
                    dir="rtl"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-arabic focus:ring-2 focus:ring-primary-500 outline-none resize-none text-right"
                    placeholder="اكتب وصفاً للمجمع السكني والمرافق..."
                    value={projectData.descriptionAr}
                    onChange={e => handleProjectChange('descriptionAr', e.target.value)}
                  />
                </div>
              </div>

              {/* Maps Link */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Google Maps Embed URL</label>
                <input
                  type="text"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-primary-500 outline-none"
                  placeholder="https://www.google.com/maps/embed?pb=..."
                  value={projectData.mapEmbedUrl}
                  onChange={e => {
                    const val = e.target.value;
                    const match = val.match(/src=["'](https:\/\/[^"']+)["']/i);
                    handleProjectChange('mapEmbedUrl', match ? match[1] : val);
                  }}
                />
              </div>

              {/* Foreigner Ownership Restricted Conditional Rendering */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 bg-teal-500/5 border border-teal-500/20 rounded-2xl">
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="foreignerEligible"
                    checked={projectData.foreignerEligible}
                    onChange={(e) => {
                      handleProjectChange('foreignerEligible', e.target.checked);
                      if (!e.target.checked) handleProjectChange('muslimOnly', false);
                    }}
                    className="w-4 h-4 rounded text-teal-600 focus:ring-teal-500 border-slate-300"
                  />
                  <div>
                    <label htmlFor="foreignerEligible" className="text-xs font-bold text-slate-900 cursor-pointer flex items-center gap-1.5">
                      <ShieldCheck className={clsx("w-4 h-4", projectData.foreignerEligible ? "text-teal-600" : "text-surface-400")} />
                      Eligible for Foreign Buyers
                    </label>
                    <p className="text-[10px] text-slate-500 mt-0.5">Toggle if this project is located in a REGA designated zone permitting non-Saudi ownership.</p>
                  </div>
                </div>

                {projectData.foreignerEligible && (
                  <div className="flex items-center gap-3 animate-in fade-in slide-in-from-left-2 duration-200">
                    <input
                      type="checkbox"
                      id="muslimOnly"
                      checked={projectData.muslimOnly}
                      onChange={(e) => handleProjectChange('muslimOnly', e.target.checked)}
                      className="w-4 h-4 rounded text-orange-600 focus:ring-orange-500 border-slate-300"
                    />
                    <div>
                      <label htmlFor="muslimOnly" className="text-xs font-bold text-slate-900 cursor-pointer flex items-center gap-1.5">
                        <Building2 className={clsx("w-4 h-4", projectData.muslimOnly ? "text-orange-600" : "text-surface-400")} />
                        Muslims Only Restriction
                      </label>
                      <p className="text-[10px] text-slate-500 mt-0.5">Check if this project is in Makkah / Madinah areas where ownership is restricted to Muslims only.</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* SECTION B: AMENITIES */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h2 className="text-base font-bold text-slate-900">Section B — Project Amenities</h2>
                <div className="text-xs text-slate-400 font-semibold">
                  Selected: <strong className="text-primary-600">{Object.values(projectData.amenities).filter(Boolean).length}</strong>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {AMENITY_OPTIONS.map(a => {
                  const checked = projectData.amenities[a.key];
                  return (
                    <label key={a.key} className={clsx(
                      'flex items-center gap-2.5 px-3 py-2.5 rounded-xl border text-xs font-semibold cursor-pointer select-none transition-all',
                      checked ? 'bg-primary-600/10 border-primary-500/25 text-primary-700' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    )}>
                      <input type="checkbox" className="hidden" checked={checked || false} onChange={() => handleAmenityToggle(a.key)} />
                      <div className={clsx('w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors', checked ? 'bg-primary-600 border-primary-600 text-white' : 'border-surface-300 bg-white')}>
                        {checked && <Check className="w-3 h-3" />}
                      </div>
                      <div className="flex flex-col leading-none">
                        <span>{a.label}</span>
                        <span className="text-[9px] text-slate-400 font-arabic mt-0.5" dir="rtl">{a.labelAr}</span>
                      </div>
                    </label>
                  );
                })}
              </div>

              {/* Add Custom Amenity */}
              <div className="pt-3 border-t border-slate-100 flex items-center gap-2 max-w-md">
                <input
                  type="text"
                  placeholder="Custom amenity (e.g. Tennis Court)..."
                  className="px-3 py-2 rounded-xl border border-slate-200 text-xs w-full outline-none focus:ring-2 focus:ring-primary-500"
                  value={customAmenity}
                  onChange={e => setCustomAmenity(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addCustomAmenity(); } }}
                />
                <button
                  type="button"
                  onClick={addCustomAmenity}
                  className="px-3 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all shrink-0"
                >
                  Add
                </button>
              </div>

              {dynamicAmenities.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-2">
                  {dynamicAmenities.map(id => (
                    <span key={id} className="inline-flex items-center gap-1 bg-primary-100 text-primary-800 border border-primary-200 px-2.5 py-1 rounded-lg text-xs font-bold">
                      {id.replace(/_/g, ' ')}
                      <button type="button" onClick={() => removeCustomAmenity(id)} className="text-primary-500 hover:text-red-500 ml-0.5">×</button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* SECTION C: GALLERY PHOTOS */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h2 className="text-base font-bold text-slate-900">Section C — Gallery & Project Photos</h2>
                  <p className="text-xs text-slate-400">First photo will be used as the main thumbnail. Drag to reorder photos.</p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl">
                {projectData.photos.map((url, idx) => (
                  <div
                    key={url}
                    data-photo-index={idx}
                    draggable
                    onDragStart={(e) => handleDragStart(e, idx)}
                    onDragOver={(e) => handleDragOver(e, idx)}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleDrop(e, idx)}
                    onDragEnd={handleDragEnd}
                    onTouchStart={() => handleTouchStart(idx)}
                    onTouchMove={handleTouchMove}
                    onTouchEnd={handleTouchEnd}
                    className={clsx(
                      'relative group w-28 h-24 rounded-lg overflow-hidden border bg-slate-100 transition-all cursor-move flex flex-col justify-between p-1 touch-none',
                      idx === 0 ? 'border-primary-500 ring-2 ring-primary-500/20' : 'border-slate-200',
                      draggedIndex === idx && 'opacity-40 scale-95',
                      isOverIndex === idx && 'border-primary-500 ring-2 ring-primary-500'
                    )}
                  >
                    <img src={url} alt={`Project ${idx + 1}`} className="absolute inset-0 w-full h-full object-cover pointer-events-none" />
                    <div className="relative z-10 flex justify-between items-start w-full">
                      {idx === 0 ? (
                        <span className="bg-primary-600 text-white text-[8px] font-extrabold px-1 py-0.5 rounded shadow">
                          Cover
                        </span>
                      ) : <span />}
                      <button
                        type="button"
                        onClick={() => handleProjectChange('photos', projectData.photos.filter((_, i) => i !== idx))}
                        className="p-1 bg-red-600/90 text-white rounded hover:bg-red-700 transition-colors shadow"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>

                    {/* Move shortcuts - always visible on touch/mobile */}
                    <div className="relative z-10 flex items-center justify-center gap-1.5 w-full bg-black/60 py-1 rounded backdrop-blur-[1px] opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-all">
                      <button
                        type="button"
                        disabled={idx === 0}
                        onClick={() => {
                          const updated = [...projectData.photos];
                          const [item] = updated.splice(idx, 1);
                          updated.splice(idx - 1, 0, item);
                          handleProjectChange('photos', updated);
                        }}
                        className="p-1 text-white disabled:opacity-30 active:scale-125 transition-transform"
                        title="Move left"
                      >
                        <ArrowLeft className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        disabled={idx === projectData.photos.length - 1}
                        onClick={() => {
                          const updated = [...projectData.photos];
                          const [item] = updated.splice(idx, 1);
                          updated.splice(idx + 1, 0, item);
                          handleProjectChange('photos', updated);
                        }}
                        className="p-1 text-white disabled:opacity-30 active:scale-125 transition-transform"
                        title="Move right"
                      >
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
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
                      className="w-28 h-24 border-2 border-dashed border-slate-300 rounded-lg hover:bg-white flex flex-col items-center justify-center gap-1 text-slate-400 transition-colors bg-white"
                    >
                      <Upload className="w-5 h-5" />
                      <span className="text-[10px] font-semibold">Add Photo</span>
                    </button>
                  )}
                </CldUploadWidget>
              </div>
            </div>

            {/* SECTION D: LAYOUT TYPES */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <Layers className="w-5 h-5 text-primary-600" />
                  <h2 className="text-base font-bold text-slate-900">Section B — Floor Plans & Layout Types ({layouts.length})</h2>
                </div>
                <button
                  type="button"
                  onClick={addLayout}
                  className="flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-white font-bold px-3 py-1.5 rounded-xl text-xs transition-all"
                >
                  <Plus className="w-4 h-4" />
                  Add Layout
                </button>
              </div>

              <div className="space-y-8 divide-y divide-slate-150">
                {layouts.map((layout, i) => (
                  <div key={i} className={clsx('space-y-5', i > 0 && 'pt-6')}>
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-slate-800 bg-slate-100 px-3 py-1 rounded-xl border border-slate-200 shadow-sm">
                        Layout Model #{i + 1}
                      </span>
                      {layouts.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeLayout(i)}
                          className="text-red-500 hover:text-red-700 text-xs font-semibold flex items-center gap-1 px-2.5 py-1 rounded-lg hover:bg-red-50 transition-all"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          Remove
                        </button>
                      )}
                    </div>

                    {/* Labels */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">Layout Label (English) *</label>
                        <input
                          type="text"
                          className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white focus:ring-2 focus:ring-primary-500 outline-none"
                          placeholder="e.g. Type A – 3 Bed Apartment"
                          value={layout.labelEn}
                          onChange={e => updateLayout(i, 'labelEn', e.target.value)}
                          required
                        />
                      </div>
                      <div dir="rtl">
                        <label className="block text-xs font-bold text-slate-700 mb-1 text-right">تسمية المخطط (عربي) *</label>
                        <input
                          type="text"
                          className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-arabic bg-white focus:ring-2 focus:ring-primary-500 outline-none text-right"
                          placeholder="مثال: نموذج أ – ٣ غرف"
                          value={layout.labelAr}
                          onChange={e => updateLayout(i, 'labelAr', e.target.value)}
                          required
                        />
                      </div>
                    </div>

                    {/* Price, Area, Beds, Baths */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">Price (SAR) *</label>
                        <input
                          type="number"
                          className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white focus:ring-2 focus:ring-primary-500 outline-none"
                          placeholder="e.g. 750000"
                          value={layout.price}
                          onChange={e => updateLayout(i, 'price', e.target.value)}
                          required
                        />
                      </div>
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="block text-xs font-bold text-slate-700">Area (sqm)</label>
                          {layout.areaSqm && !isNaN(Number(layout.areaSqm)) && (
                            <span className="text-[10px] font-bold text-primary-600">
                              ≈ {Math.round(Number(layout.areaSqm) * 10.7639).toLocaleString()} sqft
                            </span>
                          )}
                        </div>
                        <input
                          type="number"
                          className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white focus:ring-2 focus:ring-primary-500 outline-none"
                          placeholder="e.g. 145"
                          value={layout.areaSqm}
                          onChange={e => updateLayout(i, 'areaSqm', e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">Bedrooms</label>
                        <input
                          type="number"
                          className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white focus:ring-2 focus:ring-primary-500 outline-none"
                          placeholder="e.g. 3"
                          value={layout.bedrooms}
                          onChange={e => updateLayout(i, 'bedrooms', e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">Bathrooms</label>
                        <input
                          type="number"
                          className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white focus:ring-2 focus:ring-primary-500 outline-none"
                          placeholder="e.g. 2"
                          value={layout.bathrooms}
                          onChange={e => updateLayout(i, 'bathrooms', e.target.value)}
                        />
                      </div>
                    </div>

                    {/* Layout Descriptions */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">Layout Description (English) — Optional</label>
                        <textarea
                          rows={3}
                          className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white focus:ring-2 focus:ring-primary-500 outline-none resize-none"
                          placeholder="Specific details about this floor plan..."
                          value={layout.descriptionEn}
                          onChange={e => updateLayout(i, 'descriptionEn', e.target.value)}
                        />
                      </div>
                      <div dir="rtl">
                        <label className="block text-xs font-bold text-slate-700 mb-1 text-right">وصف المخطط (عربي) — اختياري</label>
                        <textarea
                          rows={3}
                          className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white font-arabic focus:ring-2 focus:ring-primary-500 outline-none resize-none text-right"
                          placeholder="تفاصيل خاصة بهذا المخطط..."
                          value={layout.descriptionAr}
                          onChange={e => updateLayout(i, 'descriptionAr', e.target.value)}
                        />
                      </div>
                    </div>

                    {/* Completion Override + Floor Plan Upload */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">Completion Status Override</label>
                        <select
                          className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white focus:ring-2 focus:ring-primary-500 outline-none"
                          value={layout.completionStatus}
                          onChange={e => updateLayout(i, 'completionStatus', e.target.value)}
                        >
                          <option value="">Use project default</option>
                          <option value="READY">Ready to Move In</option>
                          <option value="OFF_PLAN">Off-Plan</option>
                          <option value="UNDER_CONSTRUCTION">Under Construction</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">Floor Plan Image</label>
                        <div className="flex items-center gap-3">
                          <div className="w-20 h-14 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-center overflow-hidden shrink-0 relative group">
                            {layout.photos[0] ? (
                              <>
                                <img src={layout.photos[0]} className="w-full h-full object-cover" alt="" />
                                <button
                                  type="button"
                                  onClick={() => updateLayout(i, 'photos', [])}
                                  className="absolute inset-0 bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                  <Trash2 className="w-4 h-4 text-red-400" />
                                </button>
                              </>
                            ) : (
                              <ImageIcon className="w-6 h-6 text-slate-300" />
                            )}
                          </div>
                          <CldUploadWidget
                            uploadPreset="saudi_re_listing"
                            onSuccess={(r: any) => {
                              if (r.event === 'success' && r.info?.secure_url) {
                                updateLayout(i, 'photos', [r.info.secure_url]);
                              }
                            }}
                          >
                            {({ open }) => (
                              <button
                                type="button"
                                onClick={() => open()}
                                className="flex items-center gap-1 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold px-3 py-1.5 rounded-xl text-xs transition-all"
                              >
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

          </form>
        </div>
      </div>

      {/* Viewport bottom actions bar */}
      <div className="bg-white border-t border-slate-200 py-3 px-6 flex items-center justify-between shrink-0 shadow-[0_-4px_16px_rgba(0,0,0,0.06)] z-20">
        <div className="flex items-center gap-4">
          <span className="text-xs font-bold text-slate-500">
            Layouts: <span className="text-primary-600 font-extrabold">{layouts.length}</span>
          </span>
          <button
            type="button"
            onClick={addLayout}
            className="flex items-center gap-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-3 py-1.5 rounded-xl text-xs border border-slate-200 transition-all"
          >
            <Plus className="w-3.5 h-3.5" /> Add Layout
          </button>
        </div>

        <div className="flex items-center gap-3">
          <Link href="/my-projects" className="bg-slate-100 hover:bg-slate-250 text-slate-700 font-semibold py-1.5 px-3 rounded-xl text-xs transition-all">Cancel</Link>
          <button
            type="submit"
            form="edit-developer-project-form"
            disabled={saving}
            className="flex items-center gap-1.5 bg-primary-600 hover:bg-primary-500 disabled:opacity-50 text-white font-bold py-1.5 px-4 rounded-xl text-xs transition-all shadow-md"
          >
            {saving ? (
              <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Saving Changes...</>
            ) : (
              <><Save className="w-3.5 h-3.5" /> Save Project Details</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
