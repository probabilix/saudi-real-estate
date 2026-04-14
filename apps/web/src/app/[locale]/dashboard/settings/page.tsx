'use client';

import React, { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import Image from 'next/image';
import {
  User,
  MapPin,
  Award,
  Globe,
  Sparkles,
  AlertCircle,
  Briefcase,
  Save,
  Loader2,
  ChevronRight,
  ShieldCheck,
  Camera,
  MessageSquare,
  Zap,
  ArrowRightLeft,
  Wand2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/hooks/use-auth';
import { api } from '@/lib/api';

export default function SettingsPage({ params: { locale } }: { params: { locale: string } }) {
  const t = useTranslations('dashboard');
  const tSettings = useTranslations('dashboard.settings');
  const tCommon = useTranslations('common');

  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);

  const isRTL = locale === 'ar';

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    titleEn: '',
    titleAr: '',
    bioEn: '',
    bioAr: '',
    whatsapp: '',
    nationalId: '',
    regaLicenseNumber: '',
    experienceLevel: '',
    languages: [] as string[],
    serviceAreas: [] as string[],
    gender: '',
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
          name: u.name || '',
          titleEn: p.titleEn || '',
          titleAr: p.titleAr || '',
          bioEn: p.bioEn || '',
          bioAr: p.bioAr || '',
          whatsapp: p.whatsapp || u.phone || '',
          nationalId: p.nationalId || '',
          regaLicenseNumber: p.regaLicenseNumber || u.regaLicence || '',
          experienceLevel: p.experienceLevel || '',
          languages: p.languages || [],
          serviceAreas: p.serviceAreas || [],
          gender: p.gender || '',
          address: p.address || '',
          avatarUrl: u.avatarUrl || ''
        });
      }
      setLoading(false);
    }
    loadProfile();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    const res = await api.updateProfile(formData);
    if (res.success) {
      // Success logic
    }
    setSaving(false);
  };

  const handleUnifiedPolish = async (type: 'title' | 'bio') => {
    const isBio = type === 'bio';
    const sourceEn = isBio ? formData.bioEn : formData.titleEn;
    const sourceAr = isBio ? formData.bioAr : formData.titleAr;

    // Detect Source: If En has text, translate to Ar. If Ar has text, translate to En.
    // If both have text, default to English -> Arabic.
    let textToProcess = sourceEn || sourceAr;
    let fromLang: 'en' | 'ar' = sourceEn ? 'en' : 'ar';
    let toLang: 'en' | 'ar' = sourceEn ? 'ar' : 'en';

    if (!textToProcess) return;

    setAiLoading(true);
    const res = await api.aiTranslate({
      text: textToProcess,
      fromLang,
      toLang,
      context: isBio ? 'bio' : 'title' // Matching backend Zod enum exactly
    });

    if (res.success && res.data?.translatedText) {
      const { translatedText } = res.data;

      try {
        if (isBio) {
          // Parse the bilingual JSON from AI
          const cleanedText = translatedText.replace(/```json|```/g, '').trim();
          const bilingualData = JSON.parse(cleanedText);
          
          setFormData(prev => ({
            ...prev,
            bioEn: bilingualData.en || prev.bioEn,
            bioAr: bilingualData.ar || prev.bioAr
          }));
        } else {
          // Standard title sync behavior (one field at a time)
          setFormData(prev => ({
            ...prev,
            [toLang === 'en' ? 'titleEn' : 'titleAr']: translatedText
          }));
        }
      } catch (err) {
        console.error('Failed to parse AI response:', err);
        // Fallback: just update the target field if JSON fails
        setFormData(prev => ({
          ...prev,
          [isBio ? (toLang === 'en' ? 'bioEn' : 'bioAr') : (toLang === 'en' ? 'titleEn' : 'titleAr')]: translatedText
        }));
      }
    }
    setAiLoading(false);
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

  const CITIES = ['Riyadh', 'Jeddah', 'Khobar', 'Dammam', 'Mecca', 'Medina']; // Keys in common.cities
  const LANGUAGES = ['English', 'Arabic', 'Urdu', 'Hindi', 'French']; // Keys in common.languages

  return (
    <div className="space-y-8 pb-20" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* ── Page Header ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-1">{tSettings('title')}</h1>
          <p className="text-gray-500 font-medium">{tSettings('subtitle')}</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-8 py-3 bg-primary-600 text-white rounded-2xl font-bold shadow-xl shadow-primary-600/20 hover:bg-primary-500 transition-all active:scale-95 disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {tCommon('save')}
          </button>
        </div>
      </div>

      {/* ── Verification Banner ── */}
      <AnimatePresence>
        {verStatus !== 'VERIFIED' && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className={`p-6 rounded-3xl border ${verStatus === 'PENDING'
              ? 'bg-amber-50 border-amber-100 text-amber-800'
              : 'bg-red-50 border-red-100 text-red-800'
              } flex flex-col md:flex-row items-start md:items-center gap-6 shadow-xl shadow-black/5`}
          >
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 ${verStatus === 'PENDING' ? 'bg-amber-100' : 'bg-red-100'
              }`}>
              {verStatus === 'PENDING' ? <ShieldCheck className="w-7 h-7" /> : <AlertCircle className="w-7 h-7" />}
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-bold mb-1">
                {verStatus === 'PENDING' ? tSettings('verificationInProgress') : tSettings('actionRequired')}
              </h3>
              <p className="text-sm font-medium opacity-80 leading-relaxed">
                {verStatus === 'PENDING'
                  ? 'Our compliance team is currently reviewing your REGA credentials. We will notify you once your account is fully active.'
                  : tSettings('helpDesc')}
              </p>
            </div>
            {verStatus !== 'PENDING' && (
              <button className="px-6 py-2.5 bg-red-600 text-white rounded-xl text-sm font-bold hover:bg-red-700 transition-all shadow-lg shadow-red-600/20">
                {tCommon('continue')}
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* ── Left Column: Core Info ── */}
        <div className="lg:col-span-2 space-y-8">

          {/* Section: Professional Profile */}
          <section className="bg-white rounded-[32px] p-8 border border-gray-100 shadow-xl shadow-black/[0.03] space-y-8">
            <div className="flex items-center gap-3 pb-6 border-b border-gray-50">
              <div className="w-10 h-10 rounded-xl bg-primary-50 flex items-center justify-center text-primary-600">
                <User className="w-5 h-5" />
              </div>
              <h2 className="text-xl font-bold text-gray-900">{tSettings('professionalProfile')}</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-500 ps-1">{tSettings('fullName')}</label>
                <input
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  className="w-full h-12 bg-white border-2 border-gray-100/80 rounded-xl px-4 text-sm font-bold shadow-[inset_0_2px_4px_rgba(0,0,0,0.03)] focus:border-primary-600/50 focus:ring-4 focus:ring-primary-500/5 transition-all outline-none"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-500 ps-1">{tSettings('whatsappNumber')}</label>
                <input
                  value={formData.whatsapp}
                  onChange={e => setFormData({ ...formData, whatsapp: e.target.value })}
                  className="w-full h-12 bg-white border-2 border-gray-100/80 rounded-xl px-4 text-sm font-bold shadow-[inset_0_2px_4px_rgba(0,0,0,0.03)] focus:border-primary-600/50 focus:ring-4 focus:ring-primary-500/5 transition-all outline-none"
                />
              </div>
            </div>

            {/* Unified Bilingual Section */}
            <div className="space-y-8">
              {/* Professional Title Group */}
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

                  {/* Central Sync Button - Robust Mobile & Desktop Design */}
                  <div className="flex justify-center md:absolute md:left-1/2 md:top-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:z-10 py-4 md:py-0">
                    <button
                      onClick={() => handleUnifiedPolish('title')}
                      disabled={aiLoading || (!formData.titleEn && !formData.titleAr)}
                      className="w-10 h-10 bg-white border-2 border-primary-100 rounded-full flex items-center justify-center text-primary-600 shadow-lg hover:scale-110 active:scale-95 transition-all disabled:opacity-50 group bg-white hover:bg-primary-50 relative z-20"
                      title={tSettings('aiPolishTranslate')}
                    >
                      {aiLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRightLeft className="w-4 h-4" />}
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

              {/* Bio Description Group */}
              <div className="p-6 md:p-8 rounded-[32px] bg-primary-50/30 border border-primary-100/50 space-y-6">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-primary-600 text-white flex items-center justify-center">
                    <MessageSquare className="w-4 h-4" />
                  </div>
                  <h3 className="font-bold text-gray-900">{tSettings('aboutMe')}</h3>
                </div>

                <div className="relative grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8 items-center">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ps-1">{tSettings('english')}</label>
                    <textarea
                      rows={10}
                      placeholder={tSettings('bioPlaceholder')}
                      value={formData.bioEn}
                      onChange={e => setFormData({ ...formData, bioEn: e.target.value })}
                      className="w-full bg-white border-2 border-gray-100 rounded-[24px] p-5 text-sm font-bold focus:border-primary-600/50 transition-all outline-none resize-none leading-relaxed"
                    />
                  </div>

                  {/* Central "AI Magic" Button - Robust Mobile & Desktop Design */}
                  <div className="flex justify-center md:absolute md:left-1/2 md:top-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:z-10 py-4 md:py-0">
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

                  <div className="space-y-2" dir="rtl">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ps-1 text-right block">{tSettings('arabic')}</label>
                    <textarea
                      rows={10}
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

          {/* Section: Professional Credentials */}
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

        {/* ── Right Column: Metadata & Photo ── */}
        <div className="space-y-8">
          {/* Section: Profile Image */}
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

          {/* Section: Experience & Languages */}
          <section className="bg-white rounded-[32px] p-8 border border-gray-100 shadow-xl shadow-black/[0.03] space-y-6">
            <div className="space-y-4">
              <label className="text-sm font-bold text-gray-700 flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-gray-400" /> {tSettings('experienceLevel')}
              </label>
              <select
                value={formData.experienceLevel}
                onChange={e => setFormData({ ...formData, experienceLevel: e.target.value })}
                className="w-full h-12 bg-gray-50 border border-gray-100 rounded-xl px-4 text-sm font-bold outline-none"
              >
                <option value="">{tCommon('select')}</option>
                <option value="0-2">0 - 2 {isRTL ? 'سنوات' : 'Years'}</option>
                <option value="3-5">3 - 5 {isRTL ? 'سنوات' : 'Years'}</option>
                <option value="6-10">6 - 10 {isRTL ? 'سنوات' : 'Years'}</option>
                <option value="10+">10+ {isRTL ? 'سنوات' : 'Years'}</option>
              </select>
            </div>

            <div className="space-y-4">
              <label className="text-sm font-bold text-gray-700 flex items-center gap-2">
                <MapPin className="w-4 h-4 text-gray-400" /> {tSettings('serviceAreas')}
              </label>
              <div className="flex flex-wrap gap-2">
                {CITIES.map(area => (
                  <button
                    key={area}
                    onClick={() => {
                      const newAreas = formData.serviceAreas.includes(area)
                        ? formData.serviceAreas.filter(a => a !== area)
                        : [...formData.serviceAreas, area];
                      setFormData({ ...formData, serviceAreas: newAreas });
                    }}
                    className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all ${formData.serviceAreas.includes(area)
                      ? 'bg-primary-50 border-primary-200 text-primary-700'
                      : 'bg-white border-gray-100 text-gray-500 hover:border-primary-200 shadow-sm'
                      }`}
                  >
                    {tCommon(`cities.${area}`)}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-4 pt-4 border-t border-gray-50">
              <label className="text-sm font-bold text-gray-700 flex items-center gap-2">
                <Globe className="w-4 h-4 text-gray-400" /> {tSettings('spokenLanguages')}
              </label>
              <div className="flex flex-wrap gap-2">
                {LANGUAGES.map(lang => (
                  <button
                    key={lang}
                    onClick={() => {
                      const newLangs = formData.languages.includes(lang)
                        ? formData.languages.filter(l => l !== lang)
                        : [...formData.languages, lang];
                      setFormData({ ...formData, languages: newLangs });
                    }}
                    className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all ${formData.languages.includes(lang)
                      ? 'bg-primary-50 border-primary-200 text-primary-700'
                      : 'bg-white border-gray-100 text-gray-500 hover:border-primary-200 shadow-sm'
                      }`}
                  >
                    {tCommon(`languages.${lang}`)}
                  </button>
                ))}
              </div>
            </div>
          </section>

          {/* Section: Support */}
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
      </div>
    </div>
  );
}
