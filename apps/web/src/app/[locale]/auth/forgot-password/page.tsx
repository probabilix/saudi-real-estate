'use client';

import { useState, useRef, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Mail, Lock, Eye, EyeOff, CheckCircle2, ShieldCheck, Building2, KeyRound } from 'lucide-react';
import { api } from '@/lib/api';

export default function ForgotPasswordPage({ params: { locale } }: { params: { locale: string } }) {
  const t = useTranslations('auth');
  const tCommon = useTranslations('common');
  
  const [email, setEmail] = useState('');
  const [otpArray, setOtpArray] = useState<string[]>(Array(6).fill(''));
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<'email' | 'otp' | 'success'>('email');
  const [token, setToken] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Focus refs for the 6 OTP input boxes
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Automatically focus first box when moving to the OTP step
  useEffect(() => {
    if (step === 'otp') {
      setTimeout(() => {
        otpRefs.current[0]?.focus();
      }, 100);
    }
  }, [step]);

  const handleOtpChange = (value: string, index: number) => {
    const cleanVal = value.replace(/\D/g, '');
    if (!cleanVal) {
      const newOtp = [...otpArray];
      newOtp[index] = '';
      setOtpArray(newOtp);
      return;
    }

    const digit = cleanVal[cleanVal.length - 1]; // Get last character typed
    const newOtp = [...otpArray];
    newOtp[index] = digit;
    setOtpArray(newOtp);

    // Auto focus next box
    if (index < 5 && otpRefs.current[index + 1]) {
      otpRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
    if (e.key === 'Backspace') {
      if (!otpArray[index] && index > 0 && otpRefs.current[index - 1]) {
        const newOtp = [...otpArray];
        newOtp[index - 1] = '';
        setOtpArray(newOtp);
        otpRefs.current[index - 1]?.focus();
      }
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').trim();
    if (/^\d{6}$/.test(pastedData)) {
      const digits = pastedData.split('');
      setOtpArray(digits);
      otpRefs.current[5]?.focus();
    }
  };

  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const response = await api.forgotPassword(email);
      if (response.success && response.data?.token) {
        setToken(response.data.token);
        setStep('otp');
      } else {
        setError(response.error || t('invalidCredentials') || 'Failed to send OTP code');
      }
    } catch (err) {
      setError(locale === 'ar' ? 'فشل الاتصال بالخادم. يرجى المحاولة مرة أخرى.' : 'Failed to connect to the server. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    const otpCode = otpArray.join('');
    if (newPassword !== confirmPassword) {
      setError(locale === 'ar' ? 'كلمات المرور غير متطابقة' : 'Passwords do not match');
      return;
    }
    if (otpCode.length !== 6) {
      setError(locale === 'ar' ? 'يرجى إدخال رمز تحقق مكون من 6 أرقام' : 'Please enter a valid 6-digit OTP code');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const response = await api.resetPassword({
        token,
        code: otpCode,
        newPassword
      });
      if (response.success) {
        setStep('success');
      } else {
        setError(response.error || t('invalidOtp') || 'Invalid or expired OTP code');
      }
    } catch (err) {
      setError(locale === 'ar' ? 'فشل الاتصال بالخادم. يرجى المحاولة مرة أخرى.' : 'Failed to connect to the server. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-screen flex bg-white dark:bg-gray-900 overflow-hidden">
      
      {/* ── Left Side: Visual/Branding (Hidden on mobile) ── */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-gray-900 overflow-hidden">
        <Image
          src="https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1200&q=90"
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

      {/* ── Right Side: Auth Forms ── */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 sm:p-12 lg:p-20 relative overflow-y-auto bg-white dark:bg-gray-950">
        
        {/* Back Link */}
        {step !== 'success' && (
          <Link 
            href={`/${locale}/auth/login`}
            className="absolute top-8 left-8 sm:top-10 sm:left-10 flex items-center gap-2 text-gray-400 hover:text-primary-600 dark:hover:text-gold transition-colors font-bold text-xs group"
          >
            <ArrowLeft className={`w-4 h-4 transition-transform group-hover:-translate-x-1 ${locale === 'ar' ? 'rotate-180' : ''}`} />
            {tCommon('back')}
          </Link>
        )}

        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="max-w-[420px] w-full mx-auto"
        >
          <AnimatePresence mode="wait">
            {step === 'email' && (
              <motion.div
                key="email-step"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.3 }}
              >
                <div className="mb-10 text-center lg:text-start">
                  <div className="w-12 h-12 bg-primary-600 rounded-xl mb-6 mx-auto lg:mx-0 flex items-center justify-center shadow-lg shadow-primary-600/20">
                    <KeyRound className="w-6 h-6 text-white" />
                  </div>
                  <h1 className="text-3xl md:text-4xl font-playfair font-bold text-gray-900 dark:text-white mb-2">
                    {t('forgotPassword')}
                  </h1>
                  <p className="text-gray-500 dark:text-gray-400 font-medium text-sm">
                    {t('forgotSubtitle')}
                  </p>
                </div>

                {error && (
                  <motion.div 
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-6 p-4 bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 rounded-xl text-xs font-bold border border-red-100 dark:border-red-950/40 flex items-center gap-3"
                  >
                    <div className="w-1.5 h-1.5 rounded-full bg-red-600 dark:bg-red-400 animate-pulse shrink-0" />
                    <span>{error}</span>
                  </motion.div>
                )}

                <form onSubmit={handleRequestOtp} className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-700 dark:text-gray-300 ml-1 uppercase tracking-widest">
                      {t('email')}
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        className="w-full pl-11 pr-4 py-3.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 focus:bg-white dark:focus:bg-gray-900 focus:ring-2 focus:ring-primary-600 dark:focus:ring-gold outline-none transition-all placeholder:text-gray-300 dark:text-white font-medium"
                        placeholder="name@example.com"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-primary-600 hover:bg-primary-500 text-white font-bold py-4 rounded-2xl shadow-xl shadow-primary-600/20 active:scale-[0.98] transition-all flex items-center justify-center gap-3 mt-4"
                  >
                    {loading ? (
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      t('sendReset')
                    )}
                  </button>
                </form>

                <div className="mt-10 pt-8 border-t border-gray-50 dark:border-gray-800 flex flex-col items-center gap-4">
                  <p className="text-center text-sm text-gray-500 font-medium">
                    <Link href={`/${locale}/auth/login`} className="text-primary-600 font-extrabold hover:underline">
                      {t('backToLogin')}
                    </Link>
                  </p>
                </div>
              </motion.div>
            )}

            {step === 'otp' && (
              <motion.div
                key="otp-step"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.3 }}
              >
                <div className="mb-10 text-center lg:text-start">
                  <div className="w-12 h-12 bg-green-500 rounded-xl mb-6 mx-auto lg:mx-0 flex items-center justify-center shadow-lg shadow-green-500/20">
                    <ShieldCheck className="w-6 h-6 text-white" />
                  </div>
                  <h1 className="text-3xl md:text-4xl font-playfair font-bold text-gray-900 dark:text-white mb-2">
                    {t('resetSent')}
                  </h1>
                  <p className="text-gray-500 dark:text-gray-400 font-medium text-sm">
                    {t('resetSentSubtitle')}
                  </p>
                </div>

                {error && (
                  <motion.div 
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-6 p-4 bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 rounded-xl text-xs font-bold border border-red-100 dark:border-red-950/40 flex items-center gap-3"
                  >
                    <div className="w-1.5 h-1.5 rounded-full bg-red-600 dark:bg-red-400 animate-pulse shrink-0" />
                    <span>{error}</span>
                  </motion.div>
                )}

                <form onSubmit={handleResetPassword} className="space-y-4">
                  
                  {/* OTP Verification Code: 6 Boxes */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-700 dark:text-gray-300 ml-1 uppercase tracking-widest block text-center lg:text-start">
                      {t('otpLabel')}
                    </label>
                    <div className="flex justify-between gap-2 md:gap-3 dir-ltr" style={{ direction: 'ltr' }}>
                      {otpArray.map((digit, index) => (
                        <input
                          key={index}
                          ref={(el) => { otpRefs.current[index] = el; }}
                          type="text"
                          value={digit}
                          onChange={(e) => handleOtpChange(e.target.value, index)}
                          onKeyDown={(e) => handleOtpKeyDown(e, index)}
                          onPaste={handleOtpPaste}
                          required
                          maxLength={1}
                          autoComplete="one-time-code"
                          className="w-12 h-14 md:w-14 md:h-16 text-center font-playfair font-bold text-2xl rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 focus:ring-2 focus:ring-primary-600 dark:focus:ring-gold outline-none transition-all text-gray-900 dark:text-white autofill:shadow-[inset_0_0_0px_1000px_#f9fafb] dark:autofill:shadow-[inset_0_0_0px_1000px_#1f2937]"
                        />
                      ))}
                    </div>
                  </div>

                  {/* New Password */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-700 dark:text-gray-300 ml-1 uppercase tracking-widest">
                      {t('newPassword')}
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        required
                        className="w-full pl-11 pr-12 py-3.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 focus:bg-white dark:focus:bg-gray-900 focus:ring-2 focus:ring-primary-600 dark:focus:ring-gold outline-none transition-all placeholder:text-gray-300 dark:text-white font-medium"
                        placeholder="••••••••"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-primary-600 dark:hover:text-gold transition-colors p-1"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Confirm New Password */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-700 dark:text-gray-300 ml-1 uppercase tracking-widest">
                      {t('confirmNewPassword')}
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
                      <input
                        type={showConfirmPassword ? 'text' : 'password'}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                        className="w-full pl-11 pr-12 py-3.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 focus:bg-white dark:focus:bg-gray-900 focus:ring-2 focus:ring-primary-600 dark:focus:ring-gold outline-none transition-all placeholder:text-gray-300 dark:text-white font-medium"
                        placeholder="••••••••"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-primary-600 dark:hover:text-gold transition-colors p-1"
                      >
                        {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-primary-600 hover:bg-primary-500 text-white font-bold py-4 rounded-2xl shadow-xl shadow-primary-600/20 active:scale-[0.98] transition-all flex items-center justify-center gap-3 mt-4"
                  >
                    {loading ? (
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      t('updatePassword')
                    )}
                  </button>
                </form>

                <div className="mt-6 text-center pt-5 border-t border-gray-100 dark:border-gray-800">
                  <button
                    type="button"
                    onClick={() => {
                      setError(null);
                      setStep('email');
                    }}
                    className="text-gray-400 hover:text-primary-600 dark:hover:text-gold text-xs font-bold transition-colors"
                  >
                    {locale === 'ar' ? 'تغيير البريد الإلكتروني' : 'Change email address'}
                  </button>
                </div>
              </motion.div>
            )}

            {step === 'success' && (
              <motion.div
                key="success-step"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4 }}
                className="text-center py-6"
              >
                <div className="w-20 h-20 bg-green-500/10 text-green-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
                  <CheckCircle2 className="w-12 h-12" />
                </div>
                <h1 className="text-2xl font-bold mb-3 text-gray-900 dark:text-white">
                  {t('passwordChangedSuccess')}
                </h1>
                <p className="text-gray-500 dark:text-gray-400 mb-8 leading-relaxed text-sm px-4">
                  {locale === 'ar' ? 'تم تحديث كلمة المرور الخاصة بك بنجاح. يمكنك الآن تسجيل الدخول باستخدام كلمة المرور الجديدة.' : 'Your password has been successfully updated. You can now log in using your new credentials.'}
                </p>
                <Link 
                  href={`/${locale}/auth/login`} 
                  className="inline-flex items-center justify-center gap-2 px-8 py-3.5 bg-primary-600 hover:bg-primary-500 text-white rounded-xl font-bold transition-all shadow-lg hover:shadow-primary-600/20 active:scale-95"
                >
                  <ArrowLeft className={`w-4 h-4 ${locale === 'ar' ? 'rotate-180' : ''}`} />
                  {t('backToLogin')}
                </Link>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>

    </div>
  );
}
