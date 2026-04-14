'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';

export default function ForgotPasswordPage({ params: { locale } }: { params: { locale: string } }) {
  const t = useTranslations('auth');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    await new Promise(resolve => setTimeout(resolve, 1500));
    setSuccess(true);
    setLoading(false);
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center bg-gray-50 dark:bg-charcoal px-4 py-12">
      <div className="max-w-md w-full bg-white dark:bg-gray-900 rounded-3xl shadow-2xl p-8 lg:p-10 border border-gray-100 dark:border-gray-800 transition-all duration-500">
        <AnimatePresence mode="wait">
          {success ? (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4 }}
              className="text-center py-4"
            >
              <div className="w-20 h-20 bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
                <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <h1 className="text-2xl font-bold mb-3 dark:text-white">{t('resetSent')}</h1>
              <p className="text-gray-500 dark:text-gray-400 mb-8 leading-relaxed">
                {t('resetSentSubtitle')}
              </p>
              <Link 
                href={`/${locale}/auth/login`} 
                className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-primary-600 text-white rounded-xl font-bold hover:bg-primary-500 transition-all shadow-lg hover:shadow-primary-600/20"
              >
                <ArrowLeft className={`w-4 h-4 ${locale === 'ar' ? 'rotate-180' : ''}`} />
                {t('backToLogin')}
              </Link>
            </motion.div>
          ) : (
            <motion.div
              key="form"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <div className="text-center mb-10">
                <h1 className="text-3xl font-playfair font-bold text-primary-700 dark:text-gold mb-2">
                  {t('forgotPassword')}
                </h1>
                <p className="text-gray-500 dark:text-gray-400">
                  {t('forgotSubtitle')}
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 ml-1">
                    {t('email')}
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full px-4 py-3.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50 focus:ring-2 focus:ring-primary-600 dark:focus:ring-gold outline-none transition-all placeholder:text-gray-400"
                    placeholder="name@example.com"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full relative group bg-primary-600 hover:bg-primary-500 text-white font-bold py-4 rounded-xl shadow-lg shadow-primary-600/20 active:scale-[0.98] transition-all overflow-hidden"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
                  {loading ? (
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>{t('loading')}</span>
                    </div>
                  ) : (
                    t('sendReset')
                  )}
                </button>
              </form>

              <div className="mt-8 text-center pt-6 border-t border-gray-100 dark:border-gray-800">
                <Link 
                  href={`/${locale}/auth/login`} 
                  className="text-charcoal-muted hover:text-primary-700 dark:text-gray-400 dark:hover:text-gold transition-colors text-sm font-bold inline-flex items-center gap-2"
                >
                  <ArrowLeft className={`w-4 h-4 ${locale === 'ar' ? 'rotate-180' : ''}`} />
                  {t('backToLogin')}
                </Link>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
