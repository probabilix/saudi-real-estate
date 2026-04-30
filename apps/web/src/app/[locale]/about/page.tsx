'use client';

import { useTranslations } from 'next-intl';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { Building2, Globe, Sparkles, TrendingUp, ShieldCheck, Map, Users } from 'lucide-react';

export default function AboutPage({ params: { locale } }: { params: { locale: string } }) {
  const t = useTranslations('about');
  const tCommon = useTranslations('common');
  const isRTL = locale === 'ar';

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col pt-24 pb-16">
      {/* Header Section */}
      <div className="max-w-7xl mx-auto px-4 w-full mb-20 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary-50 text-primary-700 rounded-full text-xs font-bold uppercase tracking-widest mb-4 border border-primary-100">
            <Sparkles className="w-4 h-4" /> {tCommon('appName')}
          </div>
          <h1 className="text-5xl md:text-6xl font-black text-gray-900 leading-tight">
            {t('title')}
          </h1>
          <p className="text-xl md:text-2xl text-gray-500 max-w-3xl mx-auto font-medium">
            {t('subtitle')}
          </p>
        </motion.div>
      </div>

      {/* Hero Image Section */}
      <div className="max-w-7xl mx-auto px-4 w-full mb-24">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
          className="w-full h-[400px] md:h-[500px] rounded-[40px] overflow-hidden shadow-2xl relative"
        >
          <Image
            src="https://assets.hrewards.com/assets/jpg.large_23_422de58a6a.jpg?optimize"
            alt="Saudi Skyline"
            fill
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
          <div className="absolute bottom-8 left-8 md:bottom-12 md:left-12">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-2">{t('heroTitle')}</h2>
            <p className="text-white/80 text-lg font-medium">{t('heroSubtitle')}</p>
          </div>
        </motion.div>
      </div>

      {/* Vision & Mission Grid */}
      <div className="max-w-7xl mx-auto px-4 w-full mb-24">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <motion.div
            initial={{ opacity: 0, x: isRTL ? 20 : -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="bg-white p-12 rounded-[40px] border border-gray-100 shadow-xl shadow-gray-200/40 relative overflow-hidden group hover:border-primary-200 transition-all"
          >
            <div className="absolute top-0 right-0 w-40 h-40 bg-primary-50 rounded-bl-[120px] -z-10 transition-transform group-hover:scale-110" />
            <div className="w-16 h-16 bg-primary-100 text-primary-600 rounded-3xl flex items-center justify-center mb-8 shadow-sm">
              <Globe className="w-8 h-8" />
            </div>
            <h2 className="text-3xl font-bold text-gray-900 mb-6">{t('vision')}</h2>
            <p className="text-gray-600 leading-relaxed font-medium text-lg">
              {t('visionTextExtended')}
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: isRTL ? -20 : 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="bg-white p-12 rounded-[40px] border border-gray-100 shadow-xl shadow-gray-200/40 relative overflow-hidden group hover:border-primary-200 transition-all"
          >
            <div className="absolute top-0 right-0 w-40 h-40 bg-primary-50 rounded-bl-[120px] -z-10 transition-transform group-hover:scale-110" />
            <div className="w-16 h-16 bg-primary-100 text-primary-600 rounded-3xl flex items-center justify-center mb-8 shadow-sm">
              <TrendingUp className="w-8 h-8" />
            </div>
            <h2 className="text-3xl font-bold text-gray-900 mb-6">{t('mission')}</h2>
            <p className="text-gray-600 leading-relaxed font-medium text-lg">
              {t('missionTextExtended')}
            </p>
          </motion.div>
        </div>
      </div>

      {/* Core Values / Stats */}
      <div className="bg-white border-y border-gray-100 py-24 mb-24">
        <div className="max-w-7xl mx-auto px-4 w-full">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 text-center">
            <div className="space-y-4">
              <div className="w-20 h-20 mx-auto bg-gray-50 rounded-full flex items-center justify-center text-primary-600 mb-6">
                <ShieldCheck className="w-10 h-10" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900">{t('regaVerifiedTitle')}</h3>
              <p className="text-gray-500 font-medium">{t('regaVerifiedDesc')}</p>
            </div>
            <div className="space-y-4">
              <div className="w-20 h-20 mx-auto bg-gray-50 rounded-full flex items-center justify-center text-primary-600 mb-6">
                <Map className="w-10 h-10" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900">{t('kingdomReachTitle')}</h3>
              <p className="text-gray-500 font-medium">{t('kingdomReachDesc')}</p>
            </div>
            <div className="space-y-4">
              <div className="w-20 h-20 mx-auto bg-gray-50 rounded-full flex items-center justify-center text-primary-600 mb-6">
                <Users className="w-10 h-10" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900">{t('communityFirstTitle')}</h3>
              <p className="text-gray-500 font-medium">{t('communityFirstDesc')}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Additional Deep Dive Sections */}
      <div className="max-w-7xl mx-auto px-4 w-full mb-24">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="bg-white p-10 rounded-[32px] border border-gray-100 shadow-xl shadow-gray-200/40 relative"
          >
            <h3 className="text-2xl font-bold text-gray-900 mb-4">{t('historyTitle')}</h3>
            <p className="text-gray-600 leading-relaxed font-medium">
              {t('historyDesc')}
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="bg-white p-10 rounded-[32px] border border-gray-100 shadow-xl shadow-gray-200/40 relative"
          >
            <h3 className="text-2xl font-bold text-gray-900 mb-4">{t('whyChooseUsTitle')}</h3>
            <p className="text-gray-600 leading-relaxed font-medium">
              {t('whyChooseUsDesc')}
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="bg-white p-10 rounded-[32px] border border-gray-100 shadow-xl shadow-gray-200/40 relative"
          >
            <h3 className="text-2xl font-bold text-gray-900 mb-4">{t('commitmentTitle')}</h3>
            <p className="text-gray-600 leading-relaxed font-medium">
              {t('commitmentDesc')}
            </p>
          </motion.div>
        </div>
      </div>

      {/* Feature Banner */}
      <div className="max-w-7xl mx-auto px-4 w-full">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="bg-gradient-to-br from-primary-600 to-primary-800 rounded-[40px] p-12 md:p-16 text-center text-white shadow-2xl shadow-primary-600/30 overflow-hidden relative"
        >
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-black/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />

          <Building2 className="w-16 h-16 text-primary-200 mx-auto mb-8 relative z-10" />
          <h3 className="text-4xl md:text-5xl font-bold mb-6 relative z-10">{t('bannerTitle')}</h3>
          <p className="text-primary-100 max-w-3xl mx-auto mb-10 text-xl font-medium relative z-10">
            {t('bannerDesc')}
          </p>
          <div className="flex flex-wrap justify-center gap-4 relative z-10">
            <button className="px-8 py-4 bg-white text-primary-600 rounded-2xl font-bold hover:bg-gray-50 transition-colors shadow-xl">
              {t('joinNetwork')}
            </button>
          </div>
        </motion.div>
      </div>

    </div>
  );
}
