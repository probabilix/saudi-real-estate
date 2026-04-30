'use client';

import React, { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import Image from 'next/image';
import {
  User,
  Award,
  Globe,
  AlertCircle,
  Briefcase,
  Save,
  Loader2,
  ShieldCheck,
  Camera,
  MessageSquare,
  ArrowLeftRight,
  Wand2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/hooks/use-auth';
import { api } from '@/lib/api';
import { X, Plus } from 'lucide-react';

export default function SettingsPage({ params: { locale } }: { params: { locale: string } }) {
  const t = useTranslations('dashboard');
  const tSettings = useTranslations('dashboard.settings');
  const tCommon = useTranslations('common');
  const tProfiles = useTranslations('profiles');

  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [formErrors, setFormErrors] = useState<string[]>([]);

  const isRTL = locale === 'ar';

  // Form State
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [formData, setFormData] = useState<Record<string, any>>({
    name: '',
    titleEn: '',
    titleAr: '',
    bioEn: '',
    bioAr: '',
    whatsapp: '',
    nationalId: '',
    regaLicenseNumber: '',
    experienceLevel: null,
    languages: [] as string[],
    serviceAreas: [] as string[],
    gender: null,
    address: '',
    avatarUrl: ''
  });

  useEffect(() => {
    async function loadProfile() {
      const res = await api.getProfile();
      if (res.success && res.data) {
        const p = res.data.profile || {};
        const u = res.data.user || {};
        setFormData({
          name: u.name || user?.name || '',
          titleEn: p.titleEn || '',
          titleAr: p.titleAr || '',
          bioEn: p.bioEn || '',
          bioAr: p.bioAr || '',
          whatsapp: p.whatsapp || u.phone || user?.phone || '',
          nationalId: p.nationalId || '',
          regaLicenseNumber: p.regaLicenseNumber || u.regaLicence || user?.regaLicence || '',
          experienceLevel: p.experienceLevel || null,
          languages: p.languages || [],
          serviceAreas: p.serviceAreas || [],
          gender: p.gender || null,
          address: p.address || '',
          avatarUrl: u.avatarUrl || user?.avatarUrl || ''
        });
      }
      setLoading(false);
    }
    loadProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSave = async () => {
    // Reset errors
    setFormErrors([]);
    setError(null);

    // Validate mandatory fields
    const missingFields: string[] = [];
    if (!formData.name?.trim()) missingFields.push('name');
    if (!formData.whatsapp?.trim()) missingFields.push('whatsapp');
    if (!formData.gender) missingFields.push('gender');

    if (missingFields.length > 0) {
      setFormErrors(missingFields);
      setError('Please fill all mandatory fields (Name, WhatsApp, Gender)');
      setTimeout(() => setError(null), 5000);
      return;
    }

    setSaving(true);
    // Normalize: convert empty strings to undefined to satisfy backend Zod schemas
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const n = (v: any) => (v === '' ? undefined : v);

    const profileUpdate = {
      titleEn: n(formData.titleEn),
      titleAr: n(formData.titleAr),
      bioEn: n(formData.bioEn),
      bioAr: n(formData.bioAr),
      whatsapp: n(formData.whatsapp),
      nationalId: n(formData.nationalId),
      regaLicenseNumber: n(formData.regaLicenseNumber),
      experienceLevel: n(formData.experienceLevel),
      languages: formData.languages,
      serviceAreas: formData.serviceAreas,
      gender: n(formData.gender),
      address: n(formData.address),
      name: n(formData.name)
    };
    
    try {
      const res = await api.updateProfile(profileUpdate);
      if (res.success) {
        setSuccess('Profile updated successfully');
        setTimeout(() => setSuccess(null), 5000);
        setFormErrors([]);
      } else {
        setError(res.error || 'Failed to update profile');
        setTimeout(() => setError(null), 5000);
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred');
      setTimeout(() => setError(null), 5000);
    } finally {
      setSaving(false);
    }
  };

  const handleUnifiedPolish = async (type: 'title' | 'bio') => {
    const isBio = type === 'bio';
    const sourceEn = isBio ? formData.bioEn : formData.titleEn;
    const sourceAr = isBio ? formData.bioAr : formData.titleAr;

    const textToProcess = sourceEn || sourceAr;
    const fromLang: 'en' | 'ar' = sourceEn ? 'en' : 'ar';
    const toLang: 'en' | 'ar' = sourceEn ? 'ar' : 'en';

    if (!textToProcess) return;

    setAiLoading(true);
    const res = await api.aiTranslate({
      text: textToProcess,
      fromLang,
      toLang,
      context: isBio ? 'bio' : 'title'
    });

    if (res.success && res.data && typeof res.data === 'object' && 'translatedText' in res.data) {
      const translatedText = res.data.translatedText as string;

      try {
        if (isBio) {
          const cleanedText = translatedText.replace(/```json|```/g, '').trim();
          const bilingualData = JSON.parse(cleanedText);
          
          setFormData(prev => ({
            ...prev,
            bioEn: bilingualData.en || prev.bioEn,
            bioAr: bilingualData.ar || prev.bioAr
          }));
        } else {
          setFormData(prev => ({
            ...prev,
            [toLang === 'en' ? 'titleEn' : 'titleAr']: translatedText
          }));
        }
      } catch (err) {
        console.error('Failed to parse AI response:', err);
        setFormData(prev => ({
          ...prev,
          [isBio ? (toLang === 'en' ? 'bioEn' : 'bioAr') : (toLang === 'en' ? 'titleEn' : 'titleAr')]: translatedText
        }));
      }
    }
    setAiLoading(false);
  };

  const TagInput = ({
    label,
    placeholder,
    tags,
    onAdd,
    onRemove,
    suggestions = []
  }: {
    label: string,
    placeholder: string,
    tags: string[],
    onAdd: (tag: string) => void,
    onRemove: (tag: string) => void,
    suggestions?: string[]
  }) => {
    const [input, setInput] = useState('');
    const [showSuggestions, setShowSuggestions] = useState(false);

    const filteredSuggestions = suggestions.filter(s =>
      s.toLowerCase().includes(input.toLowerCase()) && !tags.includes(s)
    );

    return (
      <div className="space-y-4">
        <label className="text-sm font-bold text-gray-500 ps-1">{label}</label>
        <div className="flex flex-wrap gap-2 mb-3">
          <AnimatePresence>
            {tags.map(tag => (
              <motion.span
                key={tag}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary-50 text-primary-700 rounded-full text-xs font-bold border border-primary-100 shadow-sm transition-all hover:bg-primary-100"
              >
                {tag}
                <button
                  onClick={() => onRemove(tag)}
                  className="hover:text-red-500 transition-colors"
                >
                  <X className="w-3 h-3" />
                </button>
              </motion.span>
            ))}
          </AnimatePresence>
        </div>
        <div className="relative">
          <div className="relative">
            <input
              type="text"
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                setShowSuggestions(true);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && input.trim()) {
                  e.preventDefault();
                  onAdd(input.trim());
                  setInput('');
                  setShowSuggestions(false);
                }
              }}
              onFocus={() => setShowSuggestions(true)}
              placeholder={placeholder}
              className="w-full h-12 bg-white border-2 border-gray-100 rounded-xl px-4 text-sm font-semibold focus:border-primary-600/50 transition-all outline-none pr-10"
            />
            <Plus className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          </div>

          {showSuggestions && input.trim() && filteredSuggestions.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              className="absolute z-50 w-full mt-2 bg-white border border-gray-100 rounded-2xl shadow-2xl p-2 max-h-48 overflow-y-auto overflow-x-hidden custom-scrollbar"
            >
              {filteredSuggestions.map(suggestion => (
                <button
                  key={suggestion}
                  onClick={() => {
                    onAdd(suggestion);
                    setInput('');
                    setShowSuggestions(false);
                  }}
                  className="w-full text-left px-4 py-3 text-sm font-bold text-gray-700 hover:bg-primary-50 hover:text-primary-600 rounded-xl transition-all"
                >
                  {suggestion}
                </button>
              ))}
            </motion.div>
          )}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-96 gap-4">
        <Loader2 className="w-12 h-12 text-primary-600 animate-spin" />
        <p className="text-sm font-bold text-gray-400 animate-pulse">{tCommon('loading')}</p>
      </div>
    );
  }

  const verStatus = user?.verificationStatus || 'UNVERIFIED';

  const CITIES = ['Riyadh', 'Jeddah', 'Khobar', 'Dammam', 'Mecca', 'Medina'];
  const LANGUAGES = ['English', 'Arabic', 'Urdu', 'Hindi', 'French'];

  return (
    <div className="space-y-8 pb-20" dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="lg:sticky lg:top-[82px] bg-white z-20 pt-8 pb-4 mb-4 flex flex-col md:flex-row md:items-center justify-between gap-6 transition-all duration-300 border-b border-gray-100/60">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-gray-900 mb-1 leading-tight">{tSettings('title')}</h1>
          <p className="text-sm md:text-gray-500 font-medium opacity-70">{tSettings('subtitle')}</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 md:flex-none flex items-center justify-center gap-2 px-8 py-3.5 bg-primary-600 text-white rounded-2xl font-bold shadow-xl shadow-primary-600/20 hover:bg-primary-500 transition-all active:scale-95 disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {tCommon('save')}
          </button>
        </div>
      </div>

      {/* ── Status Bar (Slim & Practical) ── */}
      <AnimatePresence>
        {verStatus !== 'VERIFIED' && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className={`px-4 py-2 rounded-xl border flex items-center gap-3 shadow-sm ${verStatus === 'PENDING'
              ? 'bg-amber-50 border-amber-100 text-amber-800'
              : 'bg-red-50 border-red-100 text-red-800'
              }`}
          >
            <div className={`shrink-0 ${verStatus === 'PENDING' ? 'text-amber-500' : 'text-red-500'}`}>
              {verStatus === 'PENDING' ? <ShieldCheck className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
            </div>
            <p className="text-[10px] font-black uppercase tracking-widest flex-1">
              {verStatus === 'PENDING' ? tSettings('verificationInProgress') : tSettings('actionRequired')}
            </p>
            {verStatus !== 'PENDING' && (
              <button className="text-[10px] font-black uppercase underline decoration-2 underline-offset-4">
                {tCommon('continue')}
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* ── Profile Snapshot (Photo First) ── */}
        <div className="lg:w-80 shrink-0 space-y-6">
          <section className="bg-white rounded-[32px] p-8 border border-gray-100 shadow-xl shadow-black/[0.03] text-center">
            <div className="relative inline-block w-40 h-40 group">
              <div className="w-full h-full rounded-full bg-gray-50 border-4 border-white shadow-xl flex items-center justify-center overflow-hidden relative">
                {formData.avatarUrl ? (
                  <Image src={formData.avatarUrl} alt="Avatar" fill className="object-cover" unoptimized />
                ) : (
                  <User className="w-12 h-12 text-gray-300" />
                )}
              </div>
              <button className={`absolute bottom-2 ${isRTL ? 'left-2' : 'right-2'} p-3 bg-primary-600 text-white rounded-full shadow-lg hover:bg-primary-500 transition-all group-hover:scale-110 z-10`}>
                <Camera className="w-4 h-4" />
              </button>
            </div>
            <div className="mt-6">
              <h3 className="text-sm font-bold text-gray-900">{formData.name}</h3>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">
                {user?.role ? t(`roles.${user.role}`) : ''}
              </p>
            </div>
          </section>

          {/* ── Professional Expertise (Relocated to Sidebar) ── */}
          <section className="bg-white rounded-[32px] p-6 border border-gray-100 shadow-xl shadow-black/[0.03] space-y-6">
            <div className="flex items-center gap-3 pb-4 border-b border-gray-50">
              <div className="w-8 h-8 rounded-lg bg-primary-50 flex items-center justify-center text-primary-600">
                <Globe className="w-4 h-4" />
              </div>
              <h3 className="font-bold text-gray-900">{tProfiles('marketTrackRecord')}</h3>
            </div>

            <div className="space-y-6">
              {/* Experience Level */}
              <div className="space-y-3">
                <label className="text-xs font-bold text-gray-500 ps-1">{tSettings('experienceLevel')}</label>
                <div className="grid grid-cols-2 gap-2">
                  {['0-2', '3-5', '6-10', '10+'].map(level => {
                    const isActive = formData.experienceLevel === level;
                    return (
                      <button
                        key={level}
                        onClick={() => setFormData({ ...formData, experienceLevel: level })}
                        className={`py-2 px-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border-2 ${
                          isActive
                            ? 'bg-primary-600 border-primary-600 text-white shadow-md'
                            : 'bg-white border-gray-100 text-gray-400 hover:border-primary-100 hover:text-primary-600'
                        }`}
                      >
                        {level} {tProfiles('years')}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Regions Operated */}
              <TagInput
                label={tSettings('serviceAreas')}
                placeholder="e.g. Riyadh..."
                tags={formData.serviceAreas || []}
                suggestions={CITIES}
                onAdd={(tag) => {
                  if (!(formData.serviceAreas || []).includes(tag)) {
                    setFormData({ ...formData, serviceAreas: [...(formData.serviceAreas || []), tag] });
                  }
                }}
                onRemove={(tag) => {
                  setFormData({ ...formData, serviceAreas: (formData.serviceAreas || []).filter((t: string) => t !== tag) });
                }}
              />

              {/* Languages Spoken */}
              <TagInput
                label={tSettings('spokenLanguages')}
                placeholder="e.g. English..."
                tags={formData.languages || []}
                suggestions={LANGUAGES}
                onAdd={(tag) => {
                  if (!(formData.languages || []).includes(tag)) {
                    setFormData({ ...formData, languages: [...(formData.languages || []), tag] });
                  }
                }}
                onRemove={(tag) => {
                  setFormData({ ...formData, languages: (formData.languages || []).filter((t: string) => t !== tag) });
                }}
              />
            </div>
          </section>

          <section className="hidden lg:block bg-gradient-to-br from-primary-600 to-primary-800 rounded-[32px] p-8 text-white shadow-2xl shadow-primary-600/30">
            <h3 className="text-lg font-bold mb-2 flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-primary-200" /> {tSettings('needHelp')}
            </h3>
            <p className="text-sm font-medium text-primary-100 mb-6 leading-relaxed">
              {tSettings('helpDesc')}
            </p>
            <button className="w-full py-4 bg-white/10 backdrop-blur-md rounded-2xl font-bold text-sm hover:bg-white/20 transition-all border border-white/10">
              {tSettings('contactSupport')}
            </button>
          </section>
        </div>

        <div className="flex-1 space-y-6 md:space-y-8">
          <section className="bg-white rounded-[32px] p-6 md:p-8 border border-gray-100 shadow-xl shadow-black/[0.03] space-y-6 md:space-y-8">
            <div className="flex items-center gap-3 pb-4 md:pb-6 border-b border-gray-50">
              <div className="w-9 h-9 md:w-10 md:h-10 rounded-xl bg-primary-50 flex items-center justify-center text-primary-600">
                <User className="w-4 h-4 md:w-5 md:h-5" />
              </div>
              <h2 className="text-lg md:text-xl font-bold text-gray-900">{tSettings('professionalProfile')}</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-500 ps-1 flex items-center gap-1">
                  {tSettings('fullName')} <span className="text-rose-500">*</span>
                </label>
                <input
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  className={`w-full h-12 bg-white border-2 ${formErrors.includes('name') ? 'border-rose-500' : 'border-gray-100/80'} rounded-xl px-4 text-sm font-bold shadow-[inset_0_2px_4px_rgba(0,0,0,0.03)] focus:border-primary-600/50 focus:ring-4 focus:ring-primary-500/5 transition-all outline-none`}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-500 ps-1 flex items-center gap-1">
                  {tSettings('whatsappNumber')} <span className="text-rose-500">*</span>
                </label>
                <input
                  value={formData.whatsapp}
                  onChange={e => setFormData({ ...formData, whatsapp: e.target.value })}
                  placeholder="+966 5X XXX XXXX"
                  className={`w-full h-12 bg-white border-2 ${formErrors.includes('whatsapp') ? 'border-rose-500' : 'border-gray-100/80'} rounded-xl px-4 text-sm font-bold shadow-[inset_0_2px_4px_rgba(0,0,0,0.03)] focus:border-primary-600/50 focus:ring-4 focus:ring-primary-500/5 transition-all outline-none`}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-500 ps-1 flex items-center gap-1">
                  {tProfiles('gender') || 'Gender'} <span className="text-rose-500">*</span>
                </label>
                <div className={`grid grid-cols-2 gap-2 p-1 rounded-2xl border-2 ${formErrors.includes('gender') ? 'border-rose-500/50 bg-rose-50/30' : 'border-transparent'}`}>
                  {['MALE', 'FEMALE'].map(g => (
                    <button
                      key={g}
                      onClick={() => {
                        setFormData({ ...formData, gender: g });
                        setFormErrors(prev => prev.filter(f => f !== 'gender'));
                      }}
                      className={`h-11 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border-2 ${
                        formData.gender === g
                          ? 'bg-primary-600 border-primary-600 text-white shadow-md'
                          : 'bg-white border-gray-100 text-gray-400 hover:border-primary-100 hover:text-primary-600'
                      }`}
                    >
                      {g}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-8">
              <div className="p-6 md:p-8 rounded-[32px] bg-gray-50/50 border border-gray-100 space-y-6">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-primary-600 text-white flex items-center justify-center">
                    <Briefcase className="w-4 h-4" />
                  </div>
                  <h3 className="font-bold text-gray-900">{tSettings('professionalTitle')}</h3>
                </div>

                <div className="relative grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 items-center">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ps-1">{tSettings('english')}</label>
                    <input
                      placeholder={tSettings('titlePlaceholder')}
                      value={formData.titleEn}
                      onChange={e => setFormData({ ...formData, titleEn: e.target.value })}
                      className="w-full h-12 bg-white border-2 border-gray-100 rounded-xl px-4 text-sm font-bold focus:border-primary-600/50 transition-all outline-none"
                    />
                  </div>

                  <div className="flex justify-center md:absolute md:left-1/2 md:top-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:z-10 py-4 md:py-0">
                    <button
                      onClick={() => handleUnifiedPolish('title')}
                      disabled={aiLoading || (!formData.titleEn && !formData.titleAr)}
                      className="w-10 h-10 bg-white border-2 border-primary-100 rounded-full flex items-center justify-center text-primary-600 shadow-lg hover:scale-110 active:scale-95 transition-all disabled:opacity-50 group hover:bg-primary-50 relative z-20"
                      title={tSettings('aiPolishTranslate')}
                    >
                      {aiLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowLeftRight className="w-4 h-4" />}
                    </button>
                  </div>

                  <div className="space-y-2" dir="rtl">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ps-1 text-right block">{tSettings('arabic')}</label>
                    <input
                      placeholder={tSettings('titlePlaceholder')}
                      value={formData.titleAr}
                      onChange={e => setFormData({ ...formData, titleAr: e.target.value })}
                      className="w-full h-12 bg-white border-2 border-gray-100 rounded-xl px-4 text-sm font-bold font-arabic focus:border-primary-600/50 transition-all outline-none text-right"
                    />
                  </div>
                </div>
              </div>

              <div className="p-6 md:p-8 rounded-[32px] bg-primary-50/30 border border-primary-100/50 space-y-6">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-primary-600 text-white flex items-center justify-center">
                    <MessageSquare className="w-4 h-4" />
                  </div>
                  <h3 className="font-bold text-gray-900">{tSettings('aboutMe')}</h3>
                </div>

                <div className="relative flex flex-col items-stretch gap-4 md:grid md:grid-cols-2 md:gap-8 md:items-center">
                  <div className="space-y-2 order-2 md:order-1">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ps-1">{tSettings('english')}</label>
                    <textarea
                      rows={4}
                      placeholder={tSettings('bioPlaceholder')}
                      value={formData.bioEn}
                      onChange={e => setFormData({ ...formData, bioEn: e.target.value })}
                      className="w-full bg-white border-2 border-gray-100 rounded-[24px] p-5 text-sm font-bold focus:border-primary-600/50 transition-all outline-none resize-none leading-relaxed"
                    />
                  </div>

                  <div className="flex justify-center md:absolute md:left-1/2 md:top-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:z-10 py-2 md:py-0 order-1 md:order-2">
                    <button
                      onClick={() => handleUnifiedPolish('bio')}
                      disabled={aiLoading || (!formData.bioEn && !formData.bioAr)}
                      className="w-14 h-14 bg-primary-600 text-white rounded-full flex flex-col items-center justify-center shadow-xl shadow-primary-600/30 hover:scale-110 active:scale-95 transition-all disabled:opacity-50 group hover:bg-primary-500 overflow-hidden relative z-20"
                      title={tSettings('premiumAiPolish')}
                    >
                      <AnimatePresence mode="wait">
                        {aiLoading ? (
                          <motion.div
                            key="loading"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 flex items-center justify-center bg-primary-600"
                          >
                            <Loader2 className="w-6 h-6 animate-spin" />
                          </motion.div>
                        ) : (
                          <motion.div
                            key="icon"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="flex flex-col items-center"
                          >
                            <Wand2 className="w-5 h-5 group-hover:rotate-12 transition-transform" />
                            <span className="text-[8px] font-black uppercase mt-0.5 tracking-tighter">AI Magic</span>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </button>
                  </div>

                  <div className="space-y-2 order-2 md:order-3" dir="rtl">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ps-1 text-right block">{tSettings('arabic')}</label>
                    <textarea
                      rows={4}
                      placeholder={tSettings('bioPlaceholder')}
                      value={formData.bioAr}
                      onChange={e => setFormData({ ...formData, bioAr: e.target.value })}
                      className="w-full bg-white border-2 border-gray-100 rounded-[24px] p-5 text-sm font-bold font-arabic focus:border-primary-600/50 transition-all outline-none resize-none leading-relaxed text-right"
                    />
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="bg-white rounded-[32px] p-8 border border-gray-100 shadow-xl shadow-black/[0.03] space-y-8">
            <div className="flex items-center gap-3 pb-6 border-b border-gray-50">
              <div className="w-10 h-10 rounded-xl bg-primary-50 flex items-center justify-center text-primary-600">
                <Award className="w-5 h-5" />
              </div>
              <h2 className="text-xl font-bold text-gray-900">{tSettings('credentialsIdentity')}</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700 ps-1">{tSettings('regaLicenseNumber')}</label>
                <div className="relative">
                  <ShieldCheck className={`absolute ${isRTL ? 'right-4' : 'left-4'} top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400`} />
                  <input
                    readOnly={verStatus === 'VERIFIED'}
                    value={formData.regaLicenseNumber}
                    onChange={e => setFormData({ ...formData, regaLicenseNumber: e.target.value })}
                    className={`w-full h-12 bg-gray-50 border border-gray-100 rounded-xl ${isRTL ? 'pe-11 ps-4' : 'ps-11 pe-4'} text-sm font-bold focus:bg-white transition-all outline-none`}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700 ps-1">{tSettings('nationalId')}</label>
                <input
                  readOnly={verStatus === 'VERIFIED'}
                  value={formData.nationalId}
                  onChange={e => setFormData({ ...formData, nationalId: e.target.value })}
                  className="w-full h-12 bg-gray-50 border border-gray-100 rounded-xl px-4 text-sm font-bold focus:bg-white transition-all outline-none"
                />
              </div>
            </div>
          </section>
        </div>
      </div>

      <div className="lg:hidden space-y-6 mt-8">
          <section className="bg-gradient-to-br from-primary-600 to-primary-800 rounded-[32px] p-8 text-white shadow-2xl shadow-primary-600/30">
            <h3 className="text-lg font-bold mb-2 flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-primary-200" /> {tSettings('needHelp')}
            </h3>
            <p className="text-sm font-medium text-primary-100 mb-6 leading-relaxed">
              {tSettings('helpDesc')}
            </p>
            <button className="w-full py-4 bg-white/10 backdrop-blur-md rounded-2xl font-bold text-sm hover:bg-white/20 transition-all border border-white/10">
              {tSettings('contactSupport')}
            </button>
          </section>
      </div>
      <AnimatePresence>
        {error && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="fixed bottom-12 left-1/2 -translate-x-1/2 z-[100] bg-rose-600 text-white px-10 py-5 rounded-3xl shadow-2xl flex items-center gap-4 border border-rose-400/30 backdrop-blur-xl">
            <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
              <AlertCircle className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="font-black uppercase tracking-widest text-[10px]">Error</p>
              <p className="font-bold text-sm">{error}</p>
            </div>
            <button onClick={() => setError(null)} className="ml-4 p-1 hover:bg-white/10 rounded-full transition-all">
              <X className="w-4 h-4 text-white" />
            </button>
          </motion.div>
        )}

        {success && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="fixed bottom-12 left-1/2 -translate-x-1/2 z-[100] bg-emerald-600 text-white px-10 py-5 rounded-3xl shadow-2xl flex items-center gap-4 border border-emerald-400/30 backdrop-blur-xl">
            <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
              <ShieldCheck className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="font-black uppercase tracking-widest text-[10px]">Success</p>
              <p className="font-bold text-sm">{success}</p>
            </div>
            <button onClick={() => setSuccess(null)} className="ml-4 p-1 hover:bg-white/10 rounded-full transition-all">
              <X className="w-4 h-4 text-white" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Mobile Sticky Bar ── */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-xl border-t border-gray-100 p-4 pb-8 flex items-center justify-between gap-4 shadow-[0_-10px_40px_rgba(0,0,0,0.05)]">
        <div className="flex flex-col">
          <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">{tCommon('status') || 'Status'}</span>
          <span className={`text-xs font-bold ${verStatus === 'VERIFIED' ? 'text-emerald-600' : 'text-amber-600'}`}>
            {verStatus}
          </span>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex-1 flex items-center justify-center gap-2 h-14 bg-primary-600 text-white rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-primary-600/20 active:scale-95 transition-all disabled:opacity-50"
        >
          {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
          {tCommon('save')}
        </button>
      </div>
    </div>
  );
}
