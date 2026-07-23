'use client';

import { useTranslations, useLocale } from 'next-intl';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { Building2, Globe, Sparkles, TrendingUp, ShieldCheck, Map, Users, ArrowRight, Award, Compass, HeartHandshake } from 'lucide-react';
import Link from 'next/link';

export default function AboutClient() {
  const t = useTranslations('about');
  const tCommon = useTranslations('common');
  const locale = useLocale();
  const isRTL = locale === 'ar';

  return (
    <div className="min-h-screen bg-[#fafbfc] text-slate-900 pb-20 relative overflow-hidden">
      {/* Background glow orbs */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-primary-100/40 rounded-full blur-3xl -z-10" />
      <div className="absolute top-[40%] right-1/4 w-[600px] h-[600px] bg-gold-light/10 rounded-full blur-3xl -z-10" />

      {/* ── BREATHTAKING HERO SECTION (Dark Slate Premium) ── */}
      <section className="relative bg-slate-950 pt-32 pb-24 text-white overflow-hidden">
        {/* Subtle geometric pattern */}
        <div className="absolute inset-0 opacity-10 bg-[linear-gradient(to_right,#0d7377_1px,transparent_1px),linear-gradient(to_bottom,#0d7377_1px,transparent_1px)] bg-[size:4rem_4rem]" />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/90 to-transparent" />
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            {/* Left side: Heading */}
            <div className="lg:col-span-7 space-y-6 text-center lg:text-start">
              <motion.div
                initial={{ opacity: 0, y: -15 }}
                animate={{ opacity: 1, y: 0 }}
                className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 border border-white/20 text-gold text-[10px] font-black uppercase tracking-[0.2em]"
              >
                <Sparkles className="w-3.5 h-3.5" />
                {isRTL ? 'المستقبل العقاري' : 'THE NEXT CHAPTER'}
              </motion.div>

              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className={`text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-[1.1] ${isRTL ? 'font-arabic' : 'font-serif'}`}
              >
                {isRTL ? 'نحن نقود التحول العقاري مع' : 'Leading the Future of Real Estate with'} <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-gold via-gold-light to-gold">
                  {isRTL ? 'تمليك' : 'Tamleeq'}
                </span>
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="text-lg text-slate-300 max-w-2xl font-medium leading-relaxed mx-auto lg:mx-0"
              >
                {t('subtitle')}
              </motion.p>
            </div>

            {/* Right side: Premium Float Card Grid */}
            <div className="lg:col-span-5 relative flex justify-center">
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.3, type: 'spring' }}
                className="relative w-full max-w-[400px] aspect-[4/3] rounded-3xl overflow-hidden bg-slate-900 border border-white/10 p-6 flex flex-col justify-between shadow-[0_24px_50px_rgba(0,0,0,0.5)]"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-primary-950/40 via-slate-900 to-slate-950 -z-10" />
                
                {/* Micro dots */}
                <div className="flex justify-between items-start">
                  <div className="w-10 h-10 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
                    <Building2 className="w-5 h-5 text-gold" />
                  </div>
                  <span className="text-[10px] font-black text-white/40 tracking-widest uppercase">
                    EST. 2026
                  </span>
                </div>

                <div className="space-y-4">
                  <h3 className={`text-xl font-bold ${isRTL ? 'font-arabic' : 'font-serif'}`}>
                    {isRTL ? 'تمليك في أرقام' : 'Tamleeq by the Numbers'}
                  </h3>
                  <div className="grid grid-cols-2 gap-4 border-t border-white/10 pt-4">
                    <div>
                      <p className="text-2xl font-black text-gold">200+</p>
                      <p className="text-[10px] text-white/60 uppercase tracking-wider">{isRTL ? 'عقارات معتمدة' : 'Verified Listings'}</p>
                    </div>
                    <div>
                      <p className="text-2xl font-black text-gold">100%</p>
                      <p className="text-[10px] text-white/60 uppercase tracking-wider">{isRTL ? 'ملكية مباشرة' : 'Direct Access'}</p>
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </section>

      {/* ── LUXURY ASYMMETRICAL STORY SECTION (Saudi Vision 2030) ── */}
      <section className="py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 items-center">
          
          {/* Asymmetrical Bento Image Grid */}
          <div className="lg:col-span-6 grid grid-cols-12 gap-4 relative">
            <div className="col-span-8 rounded-3xl overflow-hidden aspect-[4/5] relative shadow-2xl">
              <Image
                src="https://images.unsplash.com/photo-1582407947304-fd86f028f716?w=800&q=80"
                alt="Riyadh Luxury Architecture"
                fill
                className="object-cover"
                unoptimized
              />
            </div>
            <div className="col-span-4 flex flex-col justify-end gap-4">
              <div className="rounded-2xl overflow-hidden aspect-square relative shadow-xl">
                <Image
                  src="https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=400&q=80"
                  alt="Jeddah Coast"
                  fill
                  className="object-cover"
                  unoptimized
                />
              </div>
              <div className="bg-primary-900 text-white rounded-2xl p-4 flex flex-col justify-between aspect-square shadow-xl border border-primary-800">
                <Compass className="w-6 h-6 text-gold" />
                <div>
                  <p className="text-xs font-bold text-primary-200 uppercase tracking-widest">{isRTL ? 'التغطية' : 'Coverage'}</p>
                  <p className="text-sm font-black">{isRTL ? 'أنحاء المملكة' : 'Kingdom-wide'}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Core Story copy */}
          <div className="lg:col-span-6 space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-primary-50 rounded-lg text-primary-700 text-xs font-black uppercase tracking-wider">
              <Award className="w-4 h-4" />
              {isRTL ? 'رؤيتنا الإستراتيجية' : 'STRATEGIC VISION'}
            </div>
            <h2 className={`text-3xl sm:text-4xl font-bold text-slate-900 ${isRTL ? 'font-arabic' : 'font-serif'}`}>
              {t('heroTitle')}
            </h2>
            <p className="text-slate-600 leading-relaxed text-lg font-medium">
              {t('bannerDesc')}
            </p>
            <p className="text-slate-500 leading-relaxed font-medium">
              {isRTL 
                ? 'نحن نوفر تقنيات متطورة في مجال العقارات لتسهيل قرارات الشراء والاستثمار بما يتماشى مع رؤية المملكة 2030 للتحول الرقمي والشفافية التامة.'
                : 'We leverage intelligent technology and certified real estate networks to build absolute transparency, matching qualified buyers with REGA-certified brokers securely.'}
            </p>
          </div>

        </div>
      </section>

      {/* ── IMMERSIVE VISION & MISSION GLASS CARDS ── */}
      <section className="bg-slate-50 py-24 border-y border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16 space-y-3">
            <span className="text-[11px] font-black uppercase tracking-[0.2em] text-primary-600">
              {isRTL ? 'الركائز الأساسية' : 'THE FOUNDATIONS'}
            </span>
            <h2 className={`text-3xl sm:text-4xl font-bold text-slate-900 ${isRTL ? 'font-arabic' : 'font-serif'}`}>
              {isRTL ? 'رؤيتنا ورسالتنا للعقارات' : 'Our Vision & Mission'}
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Vision Card */}
            <div className="bg-white p-10 sm:p-12 rounded-3xl border border-slate-200/60 shadow-xl shadow-slate-100/50 relative overflow-hidden group hover:border-primary-600/30 transition-all duration-300">
              <div className="absolute top-0 right-0 w-32 h-32 bg-primary-50 rounded-bl-[100px] -z-10 transition-transform duration-500 group-hover:scale-110" />
              <div className="w-14 h-14 bg-primary-50 text-primary-600 rounded-2xl flex items-center justify-center mb-8 border border-primary-100">
                <Globe className="w-7 h-7" />
              </div>
              <h3 className="text-2xl font-bold text-slate-900 mb-4">{t('vision')}</h3>
              <p className="text-slate-600 leading-relaxed text-lg font-medium">
                {t('visionTextExtended')}
              </p>
            </div>

            {/* Mission Card */}
            <div className="bg-white p-10 sm:p-12 rounded-3xl border border-slate-200/60 shadow-xl shadow-slate-100/50 relative overflow-hidden group hover:border-primary-600/30 transition-all duration-300">
              <div className="absolute top-0 right-0 w-32 h-32 bg-primary-50 rounded-bl-[100px] -z-10 transition-transform duration-500 group-hover:scale-110" />
              <div className="w-14 h-14 bg-primary-50 text-primary-600 rounded-2xl flex items-center justify-center mb-8 border border-primary-100">
                <TrendingUp className="w-7 h-7" />
              </div>
              <h3 className="text-2xl font-bold text-slate-900 mb-4">{t('mission')}</h3>
              <p className="text-slate-600 leading-relaxed text-lg font-medium">
                {t('missionTextExtended')}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── CORE VALUE STATS ── */}
      <section className="py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
          
          <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-lg shadow-slate-200/30 space-y-4 hover:-translate-y-1 transition-all duration-300">
            <div className="w-16 h-16 mx-auto bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center border border-emerald-100">
              <ShieldCheck className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold text-slate-900">{t('regaVerifiedTitle')}</h3>
            <p className="text-slate-500 text-sm font-medium leading-relaxed">{t('regaVerifiedDesc')}</p>
          </div>

          <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-lg shadow-slate-200/30 space-y-4 hover:-translate-y-1 transition-all duration-300">
            <div className="w-16 h-16 mx-auto bg-primary-50 text-primary-600 rounded-2xl flex items-center justify-center border border-primary-100">
              <Map className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold text-slate-900">{t('kingdomReachTitle')}</h3>
            <p className="text-slate-500 text-sm font-medium leading-relaxed">{t('kingdomReachDesc')}</p>
          </div>

          <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-lg shadow-slate-200/30 space-y-4 hover:-translate-y-1 transition-all duration-300">
            <div className="w-16 h-16 mx-auto bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center border border-amber-100">
              <Users className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold text-slate-900">{t('communityFirstTitle')}</h3>
            <p className="text-slate-500 text-sm font-medium leading-relaxed">{t('communityFirstDesc')}</p>
          </div>

        </div>
      </section>

      {/* ── IMMERSIVE PILLARS SECTION ── */}
      <section className="bg-slate-950 text-white py-24 relative overflow-hidden">
        <div className="absolute inset-0 opacity-5" 
          style={{ backgroundImage: 'radial-gradient(circle at 20% 50%, rgba(13,115,119,0.3) 0%, transparent 50%)' }} />
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            <div className="bg-white/5 border border-white/10 rounded-3xl p-8 backdrop-blur-md space-y-4">
              <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-gold" />
              </div>
              <h3 className={`text-2xl font-bold ${isRTL ? 'font-arabic' : 'font-serif'}`}>{t('historyTitle')}</h3>
              <p className="text-slate-300 leading-relaxed font-medium text-sm">
                {t('historyDesc')}
              </p>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-3xl p-8 backdrop-blur-md space-y-4">
              <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
                <HeartHandshake className="w-5 h-5 text-gold" />
              </div>
              <h3 className={`text-2xl font-bold ${isRTL ? 'font-arabic' : 'font-serif'}`}>{t('whyChooseUsTitle')}</h3>
              <p className="text-slate-300 leading-relaxed font-medium text-sm">
                {t('whyChooseUsDesc')}
              </p>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-3xl p-8 backdrop-blur-md space-y-4">
              <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
                <ShieldCheck className="w-5 h-5 text-gold" />
              </div>
              <h3 className={`text-2xl font-bold ${isRTL ? 'font-arabic' : 'font-serif'}`}>{t('commitmentTitle')}</h3>
              <p className="text-slate-300 leading-relaxed font-medium text-sm">
                {t('commitmentDesc')}
              </p>
            </div>

          </div>
        </div>
      </section>

      {/* ── BREATHTAKING FINAL CTA STRIP ── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-24">
        <div className="bg-gradient-to-br from-primary-600 via-primary-700 to-primary-800 rounded-[40px] p-12 md:p-16 text-center text-white shadow-2xl shadow-primary-600/30 overflow-hidden relative">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-black/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />

          <Building2 className="w-14 h-14 text-gold mx-auto mb-6 relative z-10" />
          <h2 className={`text-3xl sm:text-4xl md:text-5xl font-bold mb-6 relative z-10 ${isRTL ? 'font-arabic' : 'font-serif'}`}>
            {t('bannerTitle')}
          </h2>
          <p className="text-primary-100 max-w-2xl mx-auto mb-8 text-lg font-medium relative z-10">
            {t('bannerDesc')}
          </p>
          <div className="flex justify-center relative z-10">
            <Link
              href={`/${locale}/contact`}
              className="px-8 py-4 bg-white text-primary-700 rounded-2xl font-bold hover:bg-slate-50 hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 shadow-xl flex items-center gap-2"
            >
              <span>{t('joinNetwork')}</span>
              <ArrowRight className={`w-4 h-4 ${isRTL ? 'rotate-180' : ''}`} />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
