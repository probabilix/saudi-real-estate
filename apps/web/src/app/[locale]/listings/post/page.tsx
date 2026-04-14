'use client';

import { motion } from 'framer-motion';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Home, TreePalm, ArrowRight, ArrowLeft } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';

export default function PostListingPage({ params: { locale } }: { params: { locale: string } }) {
  const t = useTranslations('listings');
  const tCommon = useTranslations('common');
  const { user, isAuthenticated, loading } = useAuth();
  const router = useRouter();

  // 🛡️ Security Gate: Redirect unauthenticated users
  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push(`/${locale}/auth/login?redirect=listings/post`);
    }
  }, [isAuthenticated, loading, locale, router]);

  const options = [
    {
      id: 'sell-rent',
      title: t('sellTitle'),
      description: t('sellDesc'),
      icon: Home,
      href: `/${locale}/listings/post/verify?type=sell`,
      color: 'from-primary-600 to-primary-700',
    },
    {
      id: 'daily',
      title: t('dailyTitle'),
      description: t('dailyDesc'),
      icon: TreePalm,
      href: `/${locale}/listings/post/verify?type=daily`,
      color: 'from-gold to-orange-400',
      isNew: true,
    },
  ];

  if (loading || !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="w-12 h-12 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 relative overflow-hidden">
      {/* Decorative Background */}
      <div className="absolute top-[-5%] right-[-5%] w-[30%] h-[30%] bg-primary-600/5 rounded-full blur-[100px]" />
      <div className="absolute bottom-[-5%] left-[-5%] w-[30%] h-[30%] bg-gold/5 rounded-full blur-[100px]" />

      <div className="max-w-4xl mx-auto relative">
        {/* Back Link */}
        <Link 
          href={`/${locale}`}
          className="inline-flex items-center gap-2 text-gray-400 hover:text-primary-600 transition-colors mb-12 font-bold group"
        >
          <div className="w-8 h-8 rounded-full border border-gray-200 flex items-center justify-center group-hover:border-primary-600 group-hover:bg-primary-50 transition-all">
            <ArrowLeft className={`w-4 h-4 ${locale === 'ar' ? 'rotate-180' : ''}`} />
          </div>
          {tCommon('back')}
        </Link>

        {/* Header */}
        <div className="text-center mb-16">
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl md:text-5xl font-playfair font-bold text-gray-900 mb-4"
          >
            {t('postTitle')}
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-gray-500 text-lg font-medium"
          >
            {t('postSubtitle')}
          </motion.p>
        </div>

        {/* Options Grid */}
        <div className="grid md:grid-cols-2 gap-8 mb-12">
          {options.map((option, idx) => (
            <motion.div
              key={option.id}
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ delay: idx * 0.1 + 0.2 }}
            >
              <Link 
                href={option.href}
                className="group block relative h-full bg-white rounded-[2rem] p-8 border border-gray-100 shadow-[0_10px_30px_rgba(0,0,0,0.04)] hover:shadow-[0_20px_50px_rgba(0,0,0,0.08)] transition-all duration-500 overflow-hidden"
              >
                {/* Selection State Indicator */}
                <div className="absolute top-6 right-6 w-6 h-6 rounded-full border-2 border-gray-200 group-hover:border-primary-600 group-hover:bg-primary-600 transition-all flex items-center justify-center">
                  <div className="w-2 h-2 rounded-full bg-white opacity-0 group-hover:opacity-100 scale-0 group-hover:scale-100 transition-all" />
                </div>

                {option.isNew && (
                  <div className="absolute top-0 left-0">
                    <div className="bg-red-500 text-white text-[10px] font-bold px-3 py-1 rounded-br-xl uppercase tracking-wider">
                      New
                    </div>
                  </div>
                )}

                <div className={`w-20 h-20 bg-gradient-to-br ${option.color} rounded-3xl flex items-center justify-center mb-8 shadow-lg shadow-primary-600/20 group-hover:scale-110 transition-transform duration-500`}>
                  <option.icon className="w-10 h-10 text-white" />
                </div>

                <h2 className="text-2xl font-bold text-gray-900 mb-3 group-hover:text-primary-600 transition-colors">
                  {option.title}
                </h2>
                <p className="text-gray-500 font-medium leading-relaxed">
                  {option.description}
                </p>

                <div className="mt-8 flex items-center gap-2 text-primary-600 font-bold opacity-0 group-hover:opacity-100 translate-x-[-10px] group-hover:translate-x-0 transition-all duration-300">
                  {tCommon('continue')}
                  <ArrowRight className={`w-4 h-4 ${locale === 'ar' ? 'rotate-180' : ''}`} />
                </div>
              </Link>
            </motion.div>
          ))}
        </div>

        {/* Summary Footer */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="text-center bg-primary-50 px-8 py-10 rounded-3xl border border-primary-100"
        >
          <p className="text-primary-800 font-bold mb-4">
            {t('requiredDocs')}
          </p>
          <div className="flex flex-wrap justify-center gap-6 text-sm text-primary-700 font-medium">
            <span className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-primary-600" /> {tCommon('appName')} / {t('falLicense')}</span>
            <span className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-primary-600" /> {t('adPermit')}</span>
            <span className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-primary-600" /> {t('regaOfficial')}</span>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
