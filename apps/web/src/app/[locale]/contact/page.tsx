'use client';

import { useTranslations } from 'next-intl';
import { motion } from 'framer-motion';
import { Mail, Phone, MapPin, Send, HelpCircle } from 'lucide-react';

export default function ContactPage() {
  const t = useTranslations('contact');

  return (
    <div className="min-h-screen bg-gray-50 pt-32 pb-24">
      <div className="max-w-6xl mx-auto px-4 w-full">

        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-black text-gray-900 mb-4">{t('title')}</h1>
          <p className="text-xl text-gray-500">{t('subtitle')}</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* Info Side */}
          <div className="lg:col-span-1 space-y-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white p-8 rounded-[32px] border border-gray-100 shadow-xl shadow-gray-200/40"
            >
              <h3 className="text-xl font-bold text-gray-900 mb-6">{t('address')}</h3>

              <div className="space-y-6">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-primary-50 text-primary-600 flex items-center justify-center shrink-0">
                    <MapPin className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-900 text-sm mb-1">{t('address')}</h4>
                    <p className="text-gray-500 text-sm font-medium">{t('addressText')}</p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-primary-50 text-primary-600 flex items-center justify-center shrink-0">
                    <Phone className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-900 text-sm mb-1">{t('phone')}</h4>
                    <p className="text-gray-500 text-sm font-medium">920003000</p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-primary-50 text-primary-600 flex items-center justify-center shrink-0">
                    <Mail className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-900 text-sm mb-1">{t('emailLabel')}</h4>
                    <p className="text-gray-500 text-sm font-medium">sales@saudirealestate.com</p>
                  </div>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-primary-600 p-8 rounded-[32px] text-white shadow-xl shadow-primary-600/30"
            >
              <HelpCircle className="w-10 h-10 text-primary-200 mb-4" />
              <h3 className="text-lg font-bold mb-2">{t('helpQuickly')}</h3>
              <p className="text-primary-100 text-sm leading-relaxed mb-6 font-medium">
                {t('helpDesc')}
              </p>
              <button className="w-full py-3 bg-white text-primary-600 rounded-xl font-bold hover:bg-primary-50 transition-colors shadow-lg">
                {t('chatWhatsapp')}
              </button>
            </motion.div>
          </div>

          {/* Form Side */}
          <div className="lg:col-span-2">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-white p-8 md:p-12 rounded-[32px] border border-gray-100 shadow-xl shadow-gray-200/40"
            >
              <form className="space-y-6" onSubmit={(e) => e.preventDefault()}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-700 ps-1">{t('name')}</label>
                    <input
                      type="text"
                      className="w-full h-14 bg-gray-50 border-2 border-gray-100/80 rounded-2xl px-5 text-sm font-bold focus:border-primary-600/50 focus:bg-white focus:ring-4 focus:ring-primary-500/5 transition-all outline-none"
                      placeholder="John Doe"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-700 ps-1">{t('email')}</label>
                    <input
                      type="email"
                      className="w-full h-14 bg-gray-50 border-2 border-gray-100/80 rounded-2xl px-5 text-sm font-bold focus:border-primary-600/50 focus:bg-white focus:ring-4 focus:ring-primary-500/5 transition-all outline-none"
                      placeholder="hello@example.com"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700 ps-1">{t('message')}</label>
                  <textarea
                    rows={6}
                    className="w-full bg-gray-50 border-2 border-gray-100/80 rounded-2xl p-5 text-sm font-bold focus:border-primary-600/50 focus:bg-white focus:ring-4 focus:ring-primary-500/5 transition-all outline-none resize-none"
                    placeholder="How can we assist you today?"
                  />
                </div>

                <button className="w-full h-14 bg-primary-600 text-white rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-primary-500 transition-all shadow-lg shadow-primary-600/20 hover:-translate-y-0.5 active:translate-y-0">
                  <Send className="w-5 h-5" />
                  {t('send')}
                </button>
              </form>
            </motion.div>
          </div>

          {/* Map Section */}
          <div className="w-full h-[400px] mt-12 rounded-[32px] overflow-hidden shadow-xl shadow-gray-200/40 relative z-10 border border-gray-100 bg-white p-2">
            <div className="w-full h-full rounded-[24px] overflow-hidden">
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
    </div>
  );
}
