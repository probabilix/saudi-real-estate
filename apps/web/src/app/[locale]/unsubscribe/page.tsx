'use client';

import { useState, useEffect } from 'react';
import { useLocale } from 'next-intl';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Send, CheckCircle2, AlertCircle, Loader2, ArrowLeft } from 'lucide-react';
import { API_BASE_URL } from '@/lib/api';
import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function UnsubscribePage() {
  const locale = useLocale();
  const isRTL = locale === 'ar';
  const router = useRouter();

  const { user, loading: authLoading, isAuthenticated } = useAuth();
  const [email, setEmail] = useState('');
  const [subStatus, setSubStatus] = useState<'LOADING' | 'ACTIVE' | 'UNSUBSCRIBE_REQUESTED' | 'UNSUBSCRIBED' | 'NOT_SUBSCRIBED'>('LOADING');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push(`/${locale}/auth/login?returnTo=/${locale}/unsubscribe`);
    }
  }, [authLoading, isAuthenticated, router, locale]);

  // Set email from logged in user and fetch current subscription status
  useEffect(() => {
    if (user?.email) {
      setEmail(user.email);
      setSubStatus('LOADING');
      fetch(`${API_BASE_URL}/newsletter/check-status?email=${encodeURIComponent(user.email)}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.status) {
            setSubStatus(data.status);
          } else {
            setSubStatus('NOT_SUBSCRIBED');
          }
        })
        .catch(() => {
          setSubStatus('NOT_SUBSCRIBED');
        });
    }
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setIsSubmitting(true);
    setSubmitStatus('idle');
    setErrorMessage('');

    try {
      const response = await fetch(`${API_BASE_URL}/newsletter/unsubscribe-request`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setSubmitStatus('success');
        setSubStatus('UNSUBSCRIBE_REQUESTED');
      } else {
        setSubmitStatus('error');
        setErrorMessage(
          data.message ||
            (isRTL
              ? 'فشل تقديم الطلب. يرجى التحقق من البريد الإلكتروني.'
              : 'Failed to submit request. Please verify your email.')
        );
      }
    } catch {
      setSubmitStatus('error');
      setErrorMessage(
        isRTL
          ? 'حدث خطأ في الشبكة. يرجى التحقق من اتصالك.'
          : 'A network error occurred. Please check your connection.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReactivate = async () => {
    setIsSubmitting(true);
    setSubmitStatus('idle');
    setErrorMessage('');
    try {
      const response = await fetch(`${API_BASE_URL}/newsletter/subscribe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, name: user?.name }),
      });
      const data = await response.json();
      if (response.ok && data.success) {
        setSubStatus('ACTIVE');
      } else {
        setErrorMessage(data.message || 'Failed to reactivate subscription');
      }
    } catch {
      setErrorMessage(isRTL ? 'خطأ في الاتصال بالشبكة' : 'Network connection error');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (authLoading || !isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center pt-24 pb-20 px-4">
        <div className="text-center space-y-3">
          <Loader2 className="w-8 h-8 animate-spin text-primary-600 mx-auto" />
          <p className="text-xs text-gray-500 font-bold">Redirecting to login...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center pt-24 pb-20 px-4">
      {/* Top Back to Home CTA */}
      <div className="w-full max-w-md mb-4 flex justify-start">
        <Link
          href={`/${locale}`}
          className="inline-flex items-center gap-2 text-xs font-bold text-gray-500 hover:text-gray-900 transition-colors bg-white px-3.5 py-1.5 rounded-full border border-gray-200/60 shadow-sm"
        >
          <ArrowLeft className={`w-3.5 h-3.5 ${isRTL ? 'rotate-180' : ''}`} />
          {isRTL ? 'العودة للرئيسية' : 'Back to Home'}
        </Link>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full bg-white rounded-3xl border border-gray-200/80 p-8 shadow-2xl shadow-gray-200/60 relative overflow-hidden"
      >
        <div className="absolute inset-0 opacity-10 pointer-events-none"
          style={{ background: 'radial-gradient(circle at 100% 0%, rgba(13,115,119,0.15) 0%, transparent 80%)' }} />

        <div className="relative">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center mx-auto mb-4">
              <Mail className="w-6 h-6" />
            </div>
            <h1 className={`text-2xl font-black text-gray-900 mb-2 ${isRTL ? 'font-arabic' : 'font-serif'}`}>
              {isRTL ? 'إدارة الاشتراك في النشرة' : 'Newsletter Subscription Portal'}
            </h1>
            <p className={`text-sm text-gray-500 leading-relaxed ${isRTL ? 'font-arabic' : ''}`}>
              {isRTL 
                ? 'إدارة اشتراك النشرة البريدية وتحديد تفضيلات الاستلام.' 
                : 'Manage your newsletter preferences and subscription status.'}
            </p>
          </div>

          <AnimatePresence mode="wait">
            {subStatus === 'LOADING' ? (
              <div className="text-center py-10 space-y-3">
                <Loader2 className="w-8 h-8 animate-spin text-primary-600 mx-auto" />
                <p className="text-xs text-gray-500 font-bold">Checking subscription status...</p>
              </div>
            ) : subStatus === 'UNSUBSCRIBE_REQUESTED' ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="text-center py-2 space-y-4"
              >
                <div className="w-12 h-12 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center mx-auto border border-amber-200">
                  <AlertCircle className="w-6 h-6" />
                </div>
                <div className="space-y-2">
                  <h3 className={`text-lg font-bold text-gray-900 ${isRTL ? 'font-arabic' : ''}`}>
                    {isRTL ? 'طلب إلغاء الاشتراك قيد المعالجة' : 'Unsubscribe Request Pending'}
                  </h3>
                  <p className={`text-xs text-gray-500 max-w-xs mx-auto leading-relaxed ${isRTL ? 'font-arabic' : ''}`}>
                    {isRTL
                      ? `تم تقديم طلب إلغاء الاشتراك لـ (${email}) مسبقاً وسيقوم المشرف بمعالجته قريباً.`
                      : `Your request to unsubscribe (${email}) has been received and is currently being processed.`}
                  </p>
                </div>

                {errorMessage && (
                  <div className="p-3 bg-red-50 text-red-700 text-xs font-semibold rounded-xl border border-red-100">
                    {errorMessage}
                  </div>
                )}

                <div className="pt-4 space-y-3">
                  <button
                    onClick={handleReactivate}
                    disabled={isSubmitting}
                    className="w-full flex items-center justify-center gap-2 px-5 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-xl transition-all shadow-md shadow-emerald-250 disabled:opacity-50"
                  >
                    {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                    {isRTL ? 'تراجع وإعادة تفعيل الاشتراك' : 'Reactivate My Subscription'}
                  </button>
                  <Link
                    href={`/${locale}`}
                    className="inline-flex items-center gap-2 text-xs font-bold text-gray-500 hover:text-gray-900 transition-colors"
                  >
                    <ArrowLeft className={`w-3.5 h-3.5 ${isRTL ? 'rotate-180' : ''}`} />
                    {isRTL ? 'العودة للرئيسية' : 'Back to Homepage'}
                  </Link>
                </div>
              </motion.div>
            ) : subStatus === 'UNSUBSCRIBED' || subStatus === 'NOT_SUBSCRIBED' ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="text-center py-2 space-y-4"
              >
                <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center mx-auto border border-slate-200">
                  <Mail className="w-6 h-6" />
                </div>
                <div className="space-y-2">
                  <h3 className={`text-lg font-bold text-gray-900 ${isRTL ? 'font-arabic' : ''}`}>
                    {subStatus === 'UNSUBSCRIBED'
                      ? (isRTL ? 'أنت غير مشترك حالياً' : 'You are currently unsubscribed')
                      : (isRTL ? 'غير مشترك في النشرة' : 'Not Currently Subscribed')}
                  </h3>
                  <p className={`text-xs text-gray-500 max-w-xs mx-auto leading-relaxed ${isRTL ? 'font-arabic' : ''}`}>
                    {isRTL
                      ? `حسابك (${email}) غير مسجل في قائمة النشرات البريدية الفعالة.`
                      : `Your account (${email}) is not currently receiving newsletter emails.`}
                  </p>
                </div>

                {errorMessage && (
                  <div className="p-3 bg-red-50 text-red-700 text-xs font-semibold rounded-xl border border-red-100">
                    {errorMessage}
                  </div>
                )}

                <div className="pt-4 space-y-3">
                  <button
                    onClick={handleReactivate}
                    disabled={isSubmitting}
                    className="w-full flex items-center justify-center gap-2 px-5 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-xl transition-all shadow-md shadow-emerald-250 disabled:opacity-50"
                  >
                    {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                    {isRTL ? 'الاشتراك في النشرة البريدية' : 'Re-subscribe to Newsletter'}
                  </button>
                  <Link
                    href={`/${locale}`}
                    className="inline-flex items-center gap-2 text-xs font-bold text-gray-500 hover:text-gray-900 transition-colors"
                  >
                    <ArrowLeft className={`w-3.5 h-3.5 ${isRTL ? 'rotate-180' : ''}`} />
                    {isRTL ? 'العودة للرئيسية' : 'Back to Homepage'}
                  </Link>
                </div>
              </motion.div>
            ) : (
              <>
                <motion.form
                  onSubmit={handleSubmit}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="space-y-5"
                >
                  <div>
                    <label htmlFor="email" className={`block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2 ${isRTL ? 'font-arabic text-right' : ''}`}>
                      {isRTL ? 'البريد الإلكتروني' : 'Email Address'}
                    </label>
                    <input
                      id="email"
                      type="email"
                      required
                      disabled={true}
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="name@example.com"
                      className={`w-full px-4 py-3 bg-gray-150 border border-gray-250 rounded-xl text-sm text-gray-500 placeholder-gray-400 focus:outline-none cursor-not-allowed ${isRTL ? 'text-right' : ''}`}
                    />
                    <p className={`text-[10px] text-gray-400 mt-1.5 ${isRTL ? 'text-right' : ''}`}>
                      {isRTL ? 'يتم تحديد البريد الإلكتروني تلقائياً من حسابك النشط لحمايتك.' : 'Email is locked to your authenticated user account for security.'}
                    </p>
                  </div>

                  {submitStatus === 'error' && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-4 bg-red-50 rounded-xl border border-red-100 flex items-start gap-3"
                    >
                      <AlertCircle className="w-5 h-5 text-red-650 shrink-0 mt-0.5" />
                      <p className={`text-xs text-red-700 font-semibold leading-relaxed ${isRTL ? 'font-arabic text-right w-full' : ''}`}>
                        {errorMessage}
                      </p>
                    </motion.div>
                  )}

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full flex items-center justify-center gap-2 px-5 py-3 bg-red-600 hover:bg-red-700 text-white font-bold text-sm rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md shadow-red-200"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        {isRTL ? 'جاري الإرسال...' : 'Submitting Request...'}
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        {isRTL ? 'إرسال طلب إلغاء الاشتراك' : 'Submit Unsubscribe Request'}
                      </>
                    )}
                  </button>
                </motion.form>

                <div className="mt-8 pt-6 border-t border-gray-100 text-center space-y-4">
                  <p className={`text-xs text-gray-500 font-bold ${isRTL ? 'font-arabic' : ''}`}>
                    {isRTL ? 'هل غيرت رأيك؟' : 'Changed your mind?'}
                  </p>
                  <Link
                    href={`/${locale}`}
                    className="w-full flex items-center justify-center gap-2 px-5 py-3 bg-emerald-600 text-white font-bold text-sm rounded-xl hover:bg-emerald-700 transition-all shadow-md shadow-emerald-250"
                  >
                    {isRTL ? 'لا، أريد الاستمرار في الاشتراك!' : 'Keep my subscription active!'}
                  </Link>
                  <div className="flex flex-col gap-2 pt-2 text-xs font-semibold text-primary-600">
                    <Link href={`/${locale}/listings`} className="hover:underline">
                      {isRTL ? 'تصفح العقارات المتاحة للبيع والشراء' : 'Browse properties for sale & rent'}
                    </Link>
                    <Link href={`/${locale}/projects`} className="hover:underline">
                      {isRTL ? 'اكتشف المشاريع العقارية الكبرى' : 'Explore luxury mega developments'}
                    </Link>
                  </div>
                </div>
              </>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}
