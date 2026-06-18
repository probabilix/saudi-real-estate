'use client';

import Link from 'next/link';
import { useLocale } from 'next-intl';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';

export default function FooterCTAStrip() {
  const locale = useLocale();
  const isRTL = locale === 'ar';

  return (
    <section className="relative bg-primary-600 py-8 sm:py-10 overflow-hidden">
      {/* Shimmer line */}
      <div className="absolute inset-0 bg-gradient-to-r from-primary-700 via-primary-500 to-primary-700 opacity-50" />
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent" />
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 sm:gap-8">
          <motion.p
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className={`text-white font-bold text-lg sm:text-xl text-center sm:text-start ${isRTL ? 'font-arabic' : 'font-serif'}`}
          >
            {isRTL
              ? 'هل أنت مستعد للعثور على عقارك المثالي؟'
              : 'Ready to find your next property?'}
          </motion.p>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="flex-shrink-0"
          >
            <Link
              href={`/${locale}/projects`}
              className="inline-flex items-center gap-2.5 px-7 py-3.5 rounded-xl bg-white text-primary-700 font-extrabold text-sm hover:bg-primary-50 hover:-translate-y-0.5 shadow-lg shadow-primary-800/25 transition-all duration-300 group"
            >
              {isRTL ? 'تصفح جميع المشاريع' : 'Browse All Projects'}
              <ArrowRight className={`w-4 h-4 transition-transform ${isRTL ? 'rotate-180 group-hover:-translate-x-1' : 'group-hover:translate-x-1'}`} />
            </Link>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
