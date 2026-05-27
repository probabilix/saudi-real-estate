'use client';

import { useState, useEffect } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Phone, MapPin, Send, HelpCircle, MessageCircle, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { API_BASE_URL } from '@/lib/api';

export default function ContactPage() {
  const t = useTranslations('contact');
  const locale = useLocale();
  const isRTL = locale === 'ar';
  
  const [contactPhone, setContactPhone] = useState('+966 53 849 8580');
  const [contactLocation, setContactLocation] = useState('Riyadh, Saudi Arabia');
  const [contactEmail, setContactEmail] = useState('sales@saudi-re.com');
  const [whatsapp, setWhatsapp] = useState('');

  // Form State
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    fetch(`${API_BASE_URL}/system/settings`, { cache: 'no-store' })
      .then(r => r.ok ? r.json() : null)
      .then(json => {
        if (!json?.data) return;
        if (json.data.contact_phone) setContactPhone(json.data.contact_phone);
        if (json.data.contact_location) setContactLocation(json.data.contact_location);
        if (json.data.contact_email) setContactEmail(json.data.contact_email);
        const sl = json.data.social_links;
        if (sl?.whatsapp) setWhatsapp(sl.whatsapp);
      })
      .catch(() => {});
  }, []);

  const waPhone = (whatsapp || contactPhone).replace(/[\s\-+]/g, '');
  const waLink = `https://wa.me/${waPhone}?text=${encodeURIComponent(isRTL ? 'مرحباً، أود الاستفسار عن عقار' : 'Hello, I would like to inquire about a property')}`;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !message) return;

    setIsSubmitting(true);
    setSubmitStatus('idle');
    setErrorMessage('');

    try {
      const response = await fetch(`${API_BASE_URL}/system/contact`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name, email, message }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setSubmitStatus('success');
      } else {
        setSubmitStatus('error');
        setErrorMessage(data.message || (isRTL ? 'فشل إرسال الرسالة. يرجى المحاولة مرة أخرى.' : 'Failed to send message. Please try again.'));
      }
    } catch {
      setSubmitStatus('error');
      setErrorMessage(isRTL ? 'حدث خطأ في الشبكة. يرجى التحقق من اتصالك.' : 'A network error occurred. Please check your connection.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pt-20 pb-20">
      <div className="max-w-6xl mx-auto px-4 w-full">

        {/* Page Header — tighter, no wasted space */}
        <div className="text-center mb-10 pt-6">
          <div className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary-50 border border-primary-100 text-primary-700 text-[11px] font-black uppercase tracking-[0.2em] mb-4`}>
            <Phone className="w-3.5 h-3.5" />
            {isRTL ? 'تواصل معنا' : 'GET IN TOUCH'}
          </div>
          <h1 className={`text-3xl sm:text-4xl md:text-5xl font-black text-gray-900 mb-3 ${isRTL ? 'font-arabic' : 'font-serif'}`}>
            {t('title')}
          </h1>
          <p className={`text-base sm:text-lg text-gray-500 max-w-xl mx-auto ${isRTL ? 'font-arabic' : ''}`}>
            {t('subtitle')}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Info Side */}
          <div className="lg:col-span-1 space-y-5">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white p-6 sm:p-7 rounded-2xl sm:rounded-3xl border border-gray-100 shadow-lg shadow-gray-200/40"
            >
              <h3 className={`text-lg font-bold text-gray-900 mb-5 ${isRTL ? 'font-arabic' : ''}`}>
                {t('address')}
              </h3>

              <div className="space-y-5">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-primary-50 text-primary-600 flex items-center justify-center shrink-0">
                    <MapPin className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className={`font-bold text-gray-900 text-sm mb-1 ${isRTL ? 'font-arabic' : ''}`}>
                      {t('address')}
                    </h4>
                    <p className={`text-gray-500 text-sm font-medium ${isRTL ? 'font-arabic' : ''}`}>
                      {contactLocation}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-primary-50 text-primary-600 flex items-center justify-center shrink-0">
                    <Phone className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className={`font-bold text-gray-900 text-sm mb-1 ${isRTL ? 'font-arabic' : ''}`}>
                      {t('phone')}
                    </h4>
                    <a
                      href={`tel:${contactPhone.replace(/\s/g, '')}`}
                      className="text-primary-600 text-sm font-bold hover:text-primary-700 transition-colors"
                    >
                      {contactPhone}
                    </a>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-primary-50 text-primary-600 flex items-center justify-center shrink-0">
                    <Mail className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className={`font-bold text-gray-900 text-sm mb-1 ${isRTL ? 'font-arabic' : ''}`}>
                      {t('emailLabel')}
                    </h4>
                    <a
                      href={`mailto:${contactEmail}`}
                      className="text-primary-600 text-sm font-bold hover:text-primary-700 transition-colors"
                    >
                      {contactEmail}
                    </a>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* WhatsApp CTA card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-primary-600 p-6 sm:p-7 rounded-2xl sm:rounded-3xl text-white shadow-xl shadow-primary-600/30"
            >
              <HelpCircle className="w-9 h-9 text-primary-200 mb-3" />
              <h3 className={`text-base font-bold mb-2 ${isRTL ? 'font-arabic' : ''}`}>
                {t('helpQuickly')}
              </h3>
              <p className={`text-primary-100 text-sm leading-relaxed mb-5 font-medium ${isRTL ? 'font-arabic' : ''}`}>
                {t('helpDesc')}
              </p>
              <a
                href={waLink}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-3 bg-white text-primary-600 rounded-xl font-bold hover:bg-primary-50 transition-colors shadow-lg flex items-center justify-center gap-2 text-sm"
              >
                <MessageCircle className="w-4 h-4" />
                {t('chatWhatsapp')}
              </a>
            </motion.div>
          </div>

          {/* Form Side */}
          <div className="lg:col-span-2">
            <AnimatePresence mode="wait">
              {submitStatus === 'success' ? (
                <motion.div
                  key="success-card"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="bg-white p-8 sm:p-10 rounded-2xl sm:rounded-3xl border border-primary-100 shadow-xl shadow-primary-500/5 text-center flex flex-col items-center justify-center min-h-[400px]"
                >
                  <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-500 flex items-center justify-center mb-6 shadow-lg shadow-emerald-500/10">
                    <CheckCircle2 className="w-8 h-8" />
                  </div>
                  <h3 className={`text-2xl font-black text-gray-900 mb-3 ${isRTL ? 'font-arabic' : 'font-serif'}`}>
                    {isRTL ? 'تم الإرسال بنجاح!' : 'Message Sent Successfully!'}
                  </h3>
                  <p className={`text-gray-500 text-sm max-w-sm mb-8 leading-relaxed ${isRTL ? 'font-arabic' : ''}`}>
                    {isRTL 
                      ? 'نشكرك على تواصلك معنا. لقد تلقينا رسالتك وسيقوم أحد مستشارينا بالرد عليك قريباً.' 
                      : 'Thank you for reaching out. We have received your message and one of our advisors will contact you shortly.'}
                  </p>
                  <button
                    onClick={() => {
                      setSubmitStatus('idle');
                      setName('');
                      setEmail('');
                      setMessage('');
                    }}
                    className="px-6 py-3 bg-primary-600 hover:bg-primary-500 text-white rounded-xl font-bold text-sm shadow-lg shadow-primary-600/20 transition-all hover:-translate-y-0.5 active:translate-y-0"
                  >
                    {isRTL ? 'إرسال رسالة أخرى' : 'Send Another Message'}
                  </button>
                </motion.div>
              ) : (
                <motion.div
                  key="contact-form"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ delay: 0.15 }}
                  className="bg-white p-6 sm:p-8 md:p-10 rounded-2xl sm:rounded-3xl border border-gray-100 shadow-lg shadow-gray-200/40"
                >
                  <form className="space-y-5" onSubmit={handleSubmit}>
                    {submitStatus === 'error' && (
                      <div className="p-4 bg-red-50 border border-red-100 rounded-xl text-red-700 text-xs font-bold flex items-center gap-3 animate-shake">
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        <span>{errorMessage}</span>
                      </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <div className="space-y-2">
                        <label className={`text-sm font-bold text-gray-700 ps-1 ${isRTL ? 'font-arabic' : ''}`}>
                          {t('name')}
                        </label>
                        <input
                          type="text"
                          required
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          className="w-full h-12 bg-gray-50 border-2 border-gray-100/80 rounded-xl px-4 text-sm font-bold focus:border-primary-600/50 focus:bg-white focus:ring-4 focus:ring-primary-500/5 transition-all outline-none"
                          placeholder={isRTL ? 'فيصل العتيبي' : 'Faisal Al-Otaibi'}
                        />
                      </div>
                      <div className="space-y-2">
                        <label className={`text-sm font-bold text-gray-700 ps-1 ${isRTL ? 'font-arabic' : ''}`}>
                          {t('email')}
                        </label>
                        <input
                          type="email"
                          required
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="w-full h-12 bg-gray-50 border-2 border-gray-100/80 rounded-xl px-4 text-sm font-bold focus:border-primary-600/50 focus:bg-white focus:ring-4 focus:ring-primary-500/5 transition-all outline-none"
                          placeholder="faisal@saudi-re.com"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className={`text-sm font-bold text-gray-700 ps-1 ${isRTL ? 'font-arabic' : ''}`}>
                        {t('message')}
                      </label>
                      <textarea
                        rows={6}
                        required
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        className="w-full bg-gray-50 border-2 border-gray-100/80 rounded-xl p-4 text-sm font-bold focus:border-primary-600/50 focus:bg-white focus:ring-4 focus:ring-primary-500/5 transition-all outline-none resize-none"
                        placeholder={isRTL ? 'كيف يمكننا مساعدتك؟' : 'How can we assist you today?'}
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full h-13 py-4 bg-primary-600 disabled:bg-primary-400 text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-primary-500 transition-all shadow-lg shadow-primary-600/20 hover:-translate-y-0.5 active:translate-y-0 text-sm cursor-pointer"
                    >
                      {isSubmitting ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Send className="w-4 h-4" />
                      )}
                      {t('send')}
                    </button>
                  </form>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Map Section */}
        <div className="w-full h-[360px] mt-8 rounded-2xl sm:rounded-3xl overflow-hidden shadow-lg shadow-gray-200/40 relative z-10 border border-gray-100 bg-white p-1.5">
          <div className="w-full h-full rounded-[20px] overflow-hidden">
            <iframe
              src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d118933.26786015509!2d39.062085!3d21.543486!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x15c3d01fb1137e59%3A0xe059579737b118ab!2sJeddah%20Saudi%20Arabia!5e0!3m2!1sen!2sus!4v1714080123456!5m2!1sen!2sus"
              className="w-full h-full"
              style={{ border: 0 }}
              allowFullScreen={false}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          </div>
        </div>

      </div>
    </div>
  );
}

