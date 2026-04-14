'use client';

import { useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { API_BASE_URL } from '@/lib/api';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';

import { Building2, ArrowLeft, Mail, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function LoginPage({ params: { locale } }: { params: { locale: string } }) {
  const t = useTranslations('auth');
  const tCommon = useTranslations('common');
  const { login } = useAuth();
  const router = useRouter();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showEmailForm, setShowEmailForm] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    const success = await login({ email, password });
    if (!success) {
      setError(t('invalidCredentials'));
      setLoading(false);
    } else {
      router.push(`/${locale}`);
    }
  };

  const handleGoogleLogin = () => {
    window.location.href = `${API_BASE_URL}/auth/google`;
  };

  return (
    <div className="h-screen flex bg-white overflow-hidden">
      {/* ── Left Side: Visual/Branding (Hidden on mobile) ── */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-gray-900 overflow-hidden">
        <Image
          src="https://images.unsplash.com/photo-1582653280693-eb56d99002bb?w=1200&q=90"
          alt="Luxury Property"
          fill
          className="object-cover opacity-60"
          priority
          unoptimized
        />
        <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-gray-900/40 to-transparent" />
        
        <div className="absolute bottom-16 left-16 right-16 z-10">
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <div className="w-16 h-1 w-20 bg-gold mb-8 rounded-full" />
            <h2 className="text-4xl xl:text-5xl font-playfair font-bold text-white leading-tight mb-6">
              {t('brandingTitle')}
            </h2>
            <p className="text-lg text-white/70 max-w-lg mb-10 leading-relaxed font-medium">
              {t('brandingSubtitle')}
            </p>
            
            <div className="flex gap-8">
              <div className="flex items-center gap-3 text-white/90">
                <ShieldCheck className="w-6 h-6 text-gold" />
                <span className="text-[10px] font-bold uppercase tracking-widest">{t('trustedExperts')}</span>
              </div>
              <div className="flex items-center gap-3 text-white/90">
                <CheckCircle2 className="w-6 h-6 text-gold" />
                <span className="text-[10px] font-bold uppercase tracking-widest">{t('verifiedListings')}</span>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* ── Right Side: Auth Form ── */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 sm:p-12 lg:p-20 relative overflow-y-auto">
        {/* Back Link */}
        <Link 
          href={`/${locale}`}
          className="absolute top-8 left-8 sm:top-10 sm:left-10 flex items-center gap-2 text-gray-400 hover:text-primary-600 transition-colors font-bold text-xs group"
        >
          <ArrowLeft className={`w-4 h-4 transition-transform group-hover:-translate-x-1 ${locale === 'ar' ? 'rotate-180' : ''}`} />
          {tCommon('back')}
        </Link>

        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="max-w-[400px] w-full"
        >
          <div className="mb-10 text-center lg:text-start">
            <div className="w-12 h-12 bg-primary-600 rounded-xl mb-6 mx-auto lg:mx-0 flex items-center justify-center shadow-lg shadow-primary-600/20">
              <Building2 className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-3xl md:text-4xl font-playfair font-bold text-gray-900 mb-2">{t('loginTitle')}</h1>
            <p className="text-gray-500 font-medium text-sm">{t('loginSubtitle')}</p>
          </div>

          {error && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-8 p-4 bg-red-50 text-red-600 rounded-xl text-xs font-bold border border-red-100 flex items-center gap-3"
            >
              <div className="w-1.5 h-1.5 rounded-full bg-red-600 animate-pulse" />
              {error}
            </motion.div>
          )}

          <AnimatePresence mode="wait">
            {!showEmailForm ? (
              <motion.div 
                key="options"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-4"
              >
                <button
                  onClick={handleGoogleLogin}
                  className="w-full flex items-center justify-center gap-4 px-8 py-4 border border-gray-100 rounded-2xl bg-white hover:bg-gray-50 hover:border-gray-200 transition-all font-bold text-gray-700 shadow-sm"
                >
                  <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l3.66-2.84z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
                  </svg>
                  {t('continueWithGoogle')}
                </button>

                <button
                  className="w-full flex items-center justify-center gap-4 px-8 py-4 border border-gray-100 rounded-2xl bg-white hover:bg-gray-50 hover:border-gray-200 transition-all font-bold text-gray-700 shadow-sm"
                >
                  <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24" fill="#1877F2" aria-hidden="true">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                  </svg>
                  {t('continueWithFacebook')}
                </button>

                <div className="relative py-4">
                  <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-100"></div></div>
                  <div className="relative flex justify-center text-[10px] uppercase tracking-[0.3em] font-extrabold text-gray-400">
                    <span className="px-4 bg-white">{tCommon('or')}</span>
                  </div>
                </div>

                <button
                  onClick={() => setShowEmailForm(true)}
                  className="w-full flex items-center justify-center gap-4 px-8 py-4 rounded-2xl bg-gray-900 text-white hover:bg-black transition-all font-bold shadow-xl shadow-gray-900/10"
                >
                  <Mail className="w-5 h-5 opacity-70" />
                  {t('continueWithEmail')}
                </button>
              </motion.div>
            ) : (
              <motion.div 
                key="form"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-700 ml-1 uppercase tracking-widest">{t('email')}</label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="w-full px-5 py-3.5 rounded-xl border border-gray-100 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-primary-600 focus:border-transparent outline-none transition-all placeholder:text-gray-300 font-medium"
                      placeholder="name@example.com"
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between px-1">
                      <label className="text-xs font-bold text-gray-700 uppercase tracking-widest">{t('password')}</label>
                      <Link href={`/${locale}/auth/forgot-password`} className="text-primary-600 text-xs font-bold hover:underline">
                        {t('forgotPassword')}
                      </Link>
                    </div>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="w-full px-5 py-3.5 rounded-xl border border-gray-100 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-primary-600 focus:border-transparent outline-none transition-all placeholder:text-gray-300 font-medium"
                      placeholder="••••••••"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-primary-600 hover:bg-primary-500 text-white font-bold py-4 rounded-2xl shadow-xl shadow-primary-600/20 active:scale-[0.98] transition-all flex items-center justify-center gap-3 mt-4"
                  >
                    {loading ? (
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : t('signIn')}
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowEmailForm(false)}
                    className="w-full text-gray-400 hover:text-gray-600 transition-colors text-xs font-bold pt-2 active:scale-95"
                  >
                    {t('backToOptions')}
                  </button>
                </form>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="mt-10 pt-8 border-t border-gray-50 flex flex-col items-center gap-6">
            <p className="text-center text-sm text-gray-500 font-medium">
              {t('noAccount')}{' '}
              <Link href={`/${locale}/auth/register`} className="text-primary-600 font-extrabold hover:underline">
                {t('signUp')}
              </Link>
            </p>

            <div className="text-center text-[10px] text-gray-400 uppercase tracking-[0.2em] leading-loose max-w-[280px]">
              {t('terms')} &amp; {t('privacy')}
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
