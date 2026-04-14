'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { ArrowLeft, FileCheck, Info, X, CheckCircle2, ShieldCheck, FileText } from 'lucide-react';
import { api } from '@/lib/api';

export default function VerifyListingPage({ params: { locale } }: { params: { locale: string } }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const type = searchParams.get('type') || 'sell';
  const t = useTranslations('listings');
  const tCommon = useTranslations('common');

  const [value, setValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [success, setSuccess] = useState(false);

  const isDaily = type === 'daily';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // Simulate API call to save permit/license
    // In a real scenario, this updates the user's professional profile
    await new Promise(resolve => setTimeout(resolve, 1500));
    setSuccess(true);
    setLoading(false);
  };

  if (success) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center px-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full text-center bg-white p-10 rounded-[2.5rem] shadow-2xl border border-primary-100"
        >
          <div className="w-24 h-24 bg-primary-50 text-primary-600 rounded-full flex items-center justify-center mx-auto mb-8 shadow-inner">
            <ShieldCheck className="w-12 h-12" />
          </div>
          <h1 className="text-3xl font-playfair font-bold mb-4 text-gray-900">{t('successTitle')}</h1>
          <p className="text-gray-500 mb-10 leading-relaxed font-medium">
            {t('successDesc', { type: isDaily ? 'Permit' : 'License' })}
          </p>
          <Link
            href={`/${locale}`}
            className="inline-block w-full bg-primary-600 text-white px-8 py-4 rounded-2xl font-bold shadow-lg shadow-primary-600/20 hover:bg-primary-500 transition-all active:scale-[0.98]"
          >
            {tCommon('backHome')}
          </Link>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white py-12 px-4 relative overflow-hidden">
      {/* Decorative Blur */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary-600/5 rounded-full blur-[120px]" />

      <div className="max-w-2xl mx-auto relative">
        {/* Back Link */}
        <button
          onClick={() => router.back()}
          className="inline-flex items-center gap-2 text-gray-400 hover:text-primary-600 transition-colors mb-12 font-bold group"
        >
          <ArrowLeft className={`w-4 h-4 ${locale === 'ar' ? 'rotate-180' : ''}`} />
          {tCommon('back')}
        </button>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <div className="w-24 h-24 bg-primary-50 text-primary-600 rounded-[2rem] flex items-center justify-center mx-auto mb-8">
            <FileCheck className="w-12 h-12" />
          </div>

          <h1 className="text-3xl md:text-4xl font-playfair font-bold text-gray-900 mb-4">
            {isDaily ? t('titleDaily') : t('titleProfessional')}
          </h1>
          <p className="text-gray-500 font-medium mb-12 max-w-lg mx-auto leading-relaxed">
            {isDaily ? t('descDaily') : t('descProfessional')}
          </p>

          {/* Form */}
          <form onSubmit={handleSubmit} className="max-w-md mx-auto space-y-8">
            <div className="relative group">
              <input
                type="text"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                required
                placeholder={isDaily ? t('placeholderDaily') : t('placeholderProfessional')}
                className="w-full px-6 py-5 rounded-[1.5rem] border-2 border-gray-100 bg-gray-50/50 focus:border-primary-600 outline-none transition-all text-center text-xl font-bold tracking-wider placeholder:font-normal placeholder:tracking-normal placeholder:text-gray-300"
              />
            </div>

            <button
              type="submit"
              disabled={loading || !value}
              className="w-full bg-primary-600 hover:bg-primary-500 disabled:bg-gray-200 disabled:cursor-not-allowed text-white font-bold py-5 rounded-[1.5rem] shadow-xl shadow-primary-600/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
            >
              {loading ? (
                <div className="w-6 h-6 border-3 border-white/30 border-t-white rounded-full animate-spin" />
              ) : tCommon('continue')}
            </button>
          </form>

          {/* Help Link */}
          {!isDaily && (
            <button
              onClick={() => setShowHelp(true)}
              className="mt-12 inline-flex items-center gap-2 text-primary-600 font-bold hover:underline transition-all"
            >
              <Info className="w-4 h-4" />
              {t('helpLink')}
            </button>
          )}

          {/* Permit Tip for Daily */}
          {isDaily && (
            <p className="mt-12 text-sm text-gray-400 flex items-center justify-center gap-2">
              <ShieldCheck className="w-4 h-4" />
              {t('permitTip')}
            </p>
          )}
        </motion.div>
      </div>

      {/* Help Modal */}
      <AnimatePresence>
        {showHelp && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowHelp(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100]"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed left-4 right-4 top-1/2 -translate-y-1/2 md:left-auto md:right-auto md:w-full md:max-w-2xl bg-white rounded-[2.5rem] shadow-2xl z-[101] overflow-hidden"
            >
              <div className="p-8 md:p-12 relative">
                <button
                  onClick={() => setShowHelp(false)}
                  className="absolute top-6 right-6 p-2 rounded-full hover:bg-gray-100 transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>

                <h3 className="text-2xl font-bold text-gray-900 mb-4">
                  {t('helpTitle')}
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-10">
                  <div className="p-6 bg-primary-50 rounded-2xl border border-primary-100 relative">
                    <div className="absolute -top-3 left-6 px-3 py-1 bg-primary-600 text-white text-[10px] font-bold rounded-lg uppercase tracking-wider">{tCommon('phase')} 1</div>
                    <CheckCircle2 className="w-8 h-8 text-primary-600 mb-4" />
                    <h4 className="font-bold text-gray-900 mb-2 underline decoration-primary-600/30 decoration-4 underline-offset-4">{t('step1Title')}</h4>
                    <p className="text-xs text-gray-600 leading-relaxed">
                      {t('step1Desc')}
                    </p>
                  </div>

                  <div className="p-6 bg-surface-50 rounded-2xl border border-surface-200 relative">
                    <div className="absolute -top-3 left-6 px-3 py-1 bg-gray-500 text-white text-[10px] font-bold rounded-lg uppercase tracking-wider">{tCommon('phase')} 2</div>
                    <FileText className="w-8 h-8 text-gray-500 mb-4" />
                    <h4 className="font-bold text-gray-900 mb-2 underline decoration-gray-500/30 decoration-4 underline-offset-4">{t('step2Title')}</h4>
                    <p className="text-xs text-gray-600 leading-relaxed">
                      {t('step2Desc')}
                    </p>
                  </div>

                  <div className="p-6 bg-surface-50 rounded-2xl border border-surface-200 relative">
                    <div className="absolute -top-3 left-6 px-3 py-1 bg-gray-500 text-white text-[10px] font-bold rounded-lg uppercase tracking-wider">{tCommon('phase')} 3</div>
                    <ShieldCheck className="w-8 h-8 text-gray-500 mb-4" />
                    <h4 className="font-bold text-gray-900 mb-2 underline decoration-gray-500/30 decoration-4 underline-offset-4">{t('step3Title')}</h4>
                    <p className="text-xs text-gray-600 leading-relaxed">
                      {t('step3Desc')}
                    </p>
                  </div>
                </div>

                <div className="mt-12 p-6 bg-gold/10 rounded-2xl border border-gold/30 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-bold text-gold">{t('noLicense')}</p>
                    <p className="text-xs text-gold/80">{t('licenseTip')}</p>
                  </div>
                  <button className="px-6 py-2 bg-gold text-gray-900 font-bold rounded-xl hover:bg-gold/90 transition-all text-xs">
                    {t('getLicense')}
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
