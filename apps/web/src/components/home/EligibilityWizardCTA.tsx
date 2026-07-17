'use client';

import { useRef } from 'react';
import Link from 'next/link';
import { useLocale } from 'next-intl';
import { motion, useInView } from 'framer-motion';
import { ArrowRight, Globe, FileCheck, Building2, ChevronRight } from 'lucide-react';

/**
 * EligibilityWizardCTA — Homepage section promoting the Buy in Saudi eligibility wizard.
 * Designed to be inserted after HowItWorksSection on the homepage.
 */
export default function EligibilityWizardCTA() {
  const locale = useLocale();
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-60px' });
  const isRTL = locale === 'ar';

  const steps = [
    {
      icon: FileCheck,
      label: isRTL ? 'تفاصيلك' : 'Your details',
      sub: isRTL ? 'الخطوة 1' : 'Step 1',
    },
    {
      icon: Globe,
      label: isRTL ? 'موقعك' : 'Your location',
      sub: isRTL ? 'الخطوة 2' : 'Step 2',
    },
    {
      icon: Building2,
      label: isRTL ? 'خطواتك التالية' : 'Your next steps',
      sub: isRTL ? 'النتيجة' : 'Result',
    },
  ];

  return (
    <section ref={ref} className="relative overflow-hidden py-20 sm:py-28 bg-[#f5f0e8]">
      {/* Subtle background pattern */}
      <div
        className="absolute inset-0 opacity-[0.025] pointer-events-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='80' height='80'%3E%3Ccircle cx='40' cy='40' r='28' fill='none' stroke='%23b8975a' stroke-width='1'/%3E%3Cline x1='12' y1='40' x2='68' y2='40' stroke='%23b8975a' stroke-width='0.5'/%3E%3Cline x1='40' y1='12' x2='40' y2='68' stroke='%23b8975a' stroke-width='0.5'/%3E%3C/svg%3E")`,
          backgroundSize: '80px 80px',
        }}
      />
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#b8975a]/30 to-transparent" />
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#b8975a]/30 to-transparent" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">

          {/* Left: Copy */}
          <motion.div
            initial={{ opacity: 0, x: isRTL ? 30 : -30 }}
            animate={inView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.7 }}
            className="space-y-7"
          >
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.25em] text-[#b8975a] mb-4">
                {isRTL ? 'الأهلية والخطوات التالية' : 'Eligibility & Next Steps'}
              </p>
              <h2
                className={`text-3xl sm:text-4xl lg:text-5xl font-bold text-[#1a1209] leading-tight ${isRTL ? 'font-arabic' : 'font-serif'}`}
                style={{ fontFamily: isRTL ? undefined : 'var(--font-playfair, Georgia, serif)' }}
              >
                {isRTL
                  ? 'اكتشف مسارك نحو التملك'
                  : 'Find your path to ownership'}
              </h2>
            </div>

            <p className={`text-[#6b5744] text-base sm:text-lg leading-relaxed ${isRTL ? 'font-arabic' : ''}`}>
              {isRTL
                ? 'اجب على 3 أسئلة سريعة واحصل على خطوات مخصصة تناسب وضعك — مع روابط رسمية حكومية لكل مرحلة.'
                : 'Answer 3 quick questions and get a personalised roadmap for your situation — with official government links for every stage.'}
            </p>

            <ul className="space-y-3">
              {[
                isRTL ? 'يستغرق دقيقتين فقط' : 'Takes about 2 minutes',
                isRTL ? 'روابط حكومية رسمية مدرجة' : 'Official government links included',
                isRTL ? 'تخطيط مخصص لوضعك' : 'Personalised guidance for your situation',
              ].map((item, i) => (
                <li key={i} className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full bg-[#b8975a]/20 flex items-center justify-center shrink-0">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#b8975a]" />
                  </div>
                  <span className={`text-[#3d2c1e] text-sm font-medium ${isRTL ? 'font-arabic' : ''}`}>{item}</span>
                </li>
              ))}
            </ul>

            <Link
              href={`/${locale}/buy-in-saudi`}
              id="home-eligibility-cta"
              className="inline-flex items-center justify-center gap-2.5 px-8 py-4 rounded-xl bg-[#1a1209] text-white font-bold text-sm tracking-wide hover:bg-[#2d1f10] transition-all duration-300 hover:-translate-y-0.5 shadow-lg group"
            >
              {isRTL ? 'ابدأ التقييم المجاني' : 'Check your eligibility →'}
            </Link>
          </motion.div>

          {/* Right: Mini wizard preview */}
          <motion.div
            initial={{ opacity: 0, x: isRTL ? -30 : 30 }}
            animate={inView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.7, delay: 0.15 }}
            className="relative"
          >
            {/* Card */}
            <div className="bg-white rounded-3xl border border-[#e8ddd0] shadow-2xl shadow-[#1a1209]/8 overflow-hidden">
              {/* Progress stepper preview */}
              <div className="px-8 pt-8 pb-6 border-b border-[#e8ddd0]">
                <div className="flex items-center justify-center gap-0 max-w-[220px] mx-auto">
                  {[1, 2, 3].map((n, i) => (
                    <div key={n} className="flex items-center">
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold border-2 ${n === 1 ? 'bg-[#1a1209] border-[#1a1209] text-white' : 'bg-white border-[#d4c5a9] text-[#a0887a]'
                        }`}>
                        {n}
                      </div>
                      {i < 2 && <div className="h-0.5 w-14 sm:w-16 bg-[#d4c5a9]" />}
                    </div>
                  ))}
                </div>
                <p className="text-center text-[10px] font-black uppercase tracking-[0.18em] text-[#8a6d4b] mt-3">YOUR DETAILS</p>
              </div>

              {/* Process Flow Visual representation */}
              <div className="px-8 py-6 space-y-5">
                <p className="font-serif text-base font-bold text-[#1a1209]"
                  style={{ fontFamily: 'var(--font-playfair, Georgia, serif)' }}>
                  {isRTL ? 'كيف يعمل تقييم الأهلية؟' : "How the check works"}
                </p>
                
                {/* Stepper Node list */}
                <div className="space-y-4 relative">
                  {/* Vertical connecting line */}
                  <div className={`absolute top-2.5 bottom-2.5 w-0.5 bg-[#d4c5a9]/40 ${isRTL ? 'right-[15px]' : 'left-[15px]'}`} />

                  {/* Node 1 */}
                  <div className={`flex items-start gap-3 relative z-10 ${isRTL ? 'flex-row-reverse text-right' : 'text-left'}`}>
                    <div className="w-8 h-8 rounded-full bg-[#faf8f4] border border-[#b8975a]/30 flex items-center justify-center text-[#8a6d4b] shadow-sm shrink-0">
                      <FileCheck className="w-4 h-4" />
                    </div>
                    <div className="min-w-0 flex-1 pt-0.5">
                      <p className="text-[11px] font-black text-[#1a1209] uppercase tracking-wider">
                        {isRTL ? '1. تفاصيل الملف الشخصي' : '1. Profile Details'}
                      </p>
                      <p className="text-[10px] text-[#6b5744] mt-0.5">
                        {isRTL ? 'أدخل اسمك وجنسيتك لبدء الفحص.' : 'Specify your citizenship and basic contact details.'}
                      </p>
                    </div>
                  </div>

                  {/* Node 2 */}
                  <div className={`flex items-start gap-3 relative z-10 ${isRTL ? 'flex-row-reverse text-right' : 'text-left'}`}>
                    <div className="w-8 h-8 rounded-full bg-[#faf8f4] border border-[#b8975a]/30 flex items-center justify-center text-[#8a6d4b] shadow-sm shrink-0">
                      <Globe className="w-4 h-4" />
                    </div>
                    <div className="min-w-0 flex-1 pt-0.5">
                      <p className="text-[11px] font-black text-[#1a1209] uppercase tracking-wider">
                        {isRTL ? '2. موقع الإقامة الحالي' : '2. Residency Location'}
                      </p>
                      <p className="text-[10px] text-[#6b5744] mt-0.5">
                        {isRTL ? 'فحص ما إذا كنت مقيماً داخل المملكة أو بالخارج.' : 'Determine identity verification paths based on location.'}
                      </p>
                    </div>
                  </div>

                  {/* Node 3 */}
                  <div className={`flex items-start gap-3 relative z-10 ${isRTL ? 'flex-row-reverse text-right' : 'text-left'}`}>
                    <div className="w-8 h-8 rounded-full bg-[#faf8f4] border border-[#b8975a]/30 flex items-center justify-center text-[#8a6d4b] shadow-sm shrink-0">
                      <Building2 className="w-4 h-4" />
                    </div>
                    <div className="min-w-0 flex-1 pt-0.5">
                      <p className="text-[11px] font-black text-[#1a1209] uppercase tracking-wider">
                        {isRTL ? '3. خارطة الطريق الحكومية' : '3. Government Roadmap'}
                      </p>
                      <p className="text-[10px] text-[#6b5744] mt-0.5">
                        {isRTL ? 'احصل على روابط نفاذ وأبشر وموافقة الهيئة العامة للعقار.' : 'Get official REGA, Absher & Nafath registration instructions.'}
                      </p>
                    </div>
                  </div>
                </div>

                <Link
                  href={`/${locale}/buy-in-saudi`}
                  className="w-full h-11 rounded-xl bg-[#1a1209] flex items-center justify-center gap-2 hover:bg-[#2d1f10] transition-all duration-300 hover:-translate-y-0.5 shadow-md shadow-[#1a1209]/15 group cursor-pointer mt-2"
                >
                  <span className="text-white text-xs font-bold">
                    {isRTL ? 'ابدأ تقييم الأهلية الآن ➔' : 'Start Eligibility Check ➔'}
                  </span>
                </Link>
              </div>

              {/* Trust strip on card */}
              <div className="px-8 py-4 bg-[#faf8f4] border-t border-[#e8ddd0]">
                <p className="text-[10px] text-[#8a6d4b] font-bold text-center uppercase tracking-wider">
                  Nafath · Absher · REGA · Saudi Properties
                </p>
              </div>
            </div>

            {/* Floating badge */}
            <div className="absolute -top-3 -right-3 bg-[#b8975a] text-white text-[10px] font-black px-3 py-1.5 rounded-full shadow-lg uppercase tracking-wider">
              Free · 2 min
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
