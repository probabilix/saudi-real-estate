'use client';

import { useTranslations } from 'next-intl';
import { motion } from 'framer-motion';
import { Check, Wallet, Crown, Shield } from 'lucide-react';

export default function PackagesPage() {
  const t = useTranslations('packages');

  const packages = [
    {
      id: 'executive',
      icon: <Crown className="w-6 h-6 text-purple-600" />,
      title: t('executive'),
      credits: '10,000',
      price: '4,999 SAR',
      color: 'bg-white border-purple-200 hover:border-purple-400 shadow-xl rounded-[32px]',
      btnColor: 'bg-purple-600 hover:bg-purple-700 text-white',
      tag: t('bestValue')
    },
    {
      id: 'professional',
      icon: <Shield className="w-6 h-6 text-indigo-600" />,
      title: t('professional'),
      credits: '5,000',
      price: '2,999 SAR',
      color: 'bg-white border-indigo-200 hover:border-indigo-400 shadow-lg rounded-[32px]',
      btnColor: 'bg-indigo-600 hover:bg-indigo-700 text-white'
    },
    {
      id: 'advanced',
      icon: <Shield className="w-6 h-6 text-blue-600" />,
      title: t('advanced'),
      credits: '2,500',
      price: '1,499 SAR',
      color: 'bg-white border-blue-200 hover:border-blue-400 shadow-lg rounded-[32px]',
      btnColor: 'bg-blue-600 hover:bg-blue-700 text-white'
    },
    {
      id: 'starter',
      icon: <Wallet className="w-6 h-6 text-amber-600" />,
      title: t('starter'),
      credits: '1,000',
      price: '799 SAR',
      color: 'bg-white border-amber-200 hover:border-amber-400 shadow-lg rounded-[32px]',
      btnColor: 'bg-white border-2 border-amber-500 text-amber-600 hover:bg-amber-50'
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50 pt-24 pb-16">
      <div className="max-w-7xl mx-auto px-4 w-full">

        <div className="text-center mb-16">
          <motion.h1
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl md:text-5xl font-black text-gray-900 mb-4"
          >
            {t('heroTitle')}
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-xl text-gray-500"
          >
            {t('heroSubtitle')}
          </motion.p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 max-w-7xl mx-auto mb-16">
          {packages.map((pkg, idx) => (
            <motion.div
              key={pkg.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 * (idx + 1) }}
              className={`relative p-8 border ${pkg.color} flex flex-col h-full`}
            >
              {pkg.tag && (
                <div className="absolute top-0 right-0 px-4 py-1.5 bg-purple-100 text-purple-700 text-[10px] font-black uppercase tracking-widest rounded-bl-2xl rounded-tr-[30px] border-b border-l border-purple-200">
                  {pkg.tag}
                </div>
              )}

              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-center shrink-0">
                  {pkg.icon}
                </div>
                <h3 className="text-xl font-bold text-gray-900">{pkg.title}</h3>
              </div>

              <div className="mb-8">
                <div className="text-3xl font-black text-gray-900 mb-1">{pkg.credits}</div>
                <div className="text-sm font-bold text-gray-400 uppercase tracking-widest">{t('creditsCount')}</div>
              </div>

              <div className="mb-6 pb-6 border-b border-gray-100">
                <div className="text-xl font-bold text-gray-900 bg-gray-50 inline-block px-4 py-2 rounded-xl border border-gray-100">{pkg.price}</div>
              </div>

              <button className={`w-full py-3.5 rounded-xl font-bold transition-all mt-auto ${pkg.btnColor}`}>
                {t('selectPackage')}
              </button>
            </motion.div>
          ))}
        </div>

        {/* Features Table Style Breakdown */}
        <div className="max-w-5xl mx-auto bg-white rounded-[32px] p-8 md:p-12 border border-gray-100 shadow-xl shadow-gray-200/40 mt-12">
          <h3 className="text-2xl font-bold mb-8">{t('whatCanYouDo')}</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-6 gap-x-12">
            {[
              { title: t('featureBasicTitle'), desc: t('featureBasicDesc') },
              { title: t('featureHotTitle'), desc: t('featureHotDesc') },
              { title: t('featureSignatureTitle'), desc: t('featureSignatureDesc') },
              { title: t('featureAllocationTitle'), desc: t('featureAllocationDesc') },
              { title: t('featureRefreshTitle'), desc: t('featureRefreshDesc') },
            ].map((f, i) => (
              <div key={i} className="flex gap-4">
                <div className="mt-1 w-6 h-6 rounded-full bg-primary-50 text-primary-600 flex items-center justify-center shrink-0">
                  <Check className="w-3.5 h-3.5" />
                </div>
                <div>
                  <h4 className="font-bold text-gray-900 mb-1">{f.title}</h4>
                  <p className="text-sm font-medium text-gray-500">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
