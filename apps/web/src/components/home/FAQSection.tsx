'use client';

import { useState } from 'react';
import { useLocale } from 'next-intl';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, HelpCircle, MessageCircle } from 'lucide-react';
import Link from 'next/link';

interface FAQ {
  id: string;
  questionEn: string;
  questionAr: string;
  answerEn: string;
  answerAr: string;
  order: number;
}

const fallbackFaqs = [
  {
    id: '1',
    questionEn: 'Who owns the properties listed on this marketplace?',
    questionAr: 'من يملك العقارات المعروضة في هذا السوق؟',
    answerEn: 'All listings are direct, handpicked premium holdings from our exclusive real estate portfolio and vetted institutional developers. We ensure 100% authenticity and transaction speed.',
    answerAr: 'جميع العقارات المدرجة حصرية ومختارة بعناية من محفظتنا العقارية الخاصة ومطورين معتمدين. نضمن الموثوقية التامة وسرعة إتمام الصفقات.',
    order: 1,
  },
  {
    id: '2',
    questionEn: 'How does the Noor AI Concierge qualification process work?',
    questionAr: 'كيف تعمل عملية التأهيل مع المساعد الذكي نور؟',
    answerEn: 'Our dedicated AI Concierge, Noor, helps you explore specs, neighborhood data, and local rules. Once Noor qualifies your budget and intent, the broker\'s contact details are immediately unlocked.',
    answerAr: 'يساعدك مساعدنا الذكي "نور" في استكشاف المواصفات والبيانات المحلية. بمجرد التأهيل، يتم فتح بيانات الاتصال المباشرة بالوكيل فوراً.',
    order: 2,
  },
  {
    id: '3',
    questionEn: 'Are the listed property prices final or negotiable?',
    questionAr: 'هل الأسعار المعروضة نهائية أم قابلة للتفاوض؟',
    answerEn: 'Listed prices reflect verified valuations, but our brokers can discuss structured payment plans, installment schemes, or financing options once you are qualified.',
    answerAr: 'تعكس الأسعار التقييم المعتمد، لكن يمكن مناقشة خطط سداد مهيكلة وأقساط ميسرة مع وكلائنا بعد التأهيل.',
    order: 3,
  },
  {
    id: '4',
    questionEn: 'Can non-Saudi nationals or foreigners purchase property in the Kingdom?',
    questionAr: 'هل يمكن لغير السعوديين أو الأجانب شراء عقارات في المملكة؟',
    answerEn: 'Yes. Saudi Arabia\'s premium residency program and recent REGA reforms allow eligible foreigners to own freehold property in designated zones. Our team can guide you through the full legal process.',
    answerAr: 'نعم. تتيح برامج الإقامة المميزة وإصلاحات الهيئة العامة للعقار للأجانب المؤهلين تملك عقارات في مناطق محددة. فريقنا يرشدك عبر الإجراءات القانونية كاملة.',
    order: 4,
  },
];

interface FAQSectionProps {
  faqs?: FAQ[];
}

export default function FAQSection({ faqs = [] }: FAQSectionProps) {
  const locale = useLocale();
  const [activeIndex, setActiveIndex] = useState<string | null>(null);
  const isRTL = locale === 'ar';
  const displayFaqs = faqs.length > 0 ? faqs : fallbackFaqs;

  return (
    <section className="py-20 sm:py-28 bg-white relative overflow-hidden">
      {/* Soft teal accent */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary-100 to-transparent" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-5 gap-12 lg:gap-16 items-start">

          {/* Left column: heading + image */}
          <div className="lg:col-span-2 space-y-8 lg:sticky lg:top-24">
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary-50 border border-primary-100 text-primary-700 text-[11px] font-black uppercase tracking-[0.2em]">
                <HelpCircle className="w-3.5 h-3.5" />
                {isRTL ? 'الأسئلة الشائعة' : 'FAQ'}
              </div>
              <h2 className={`text-3xl sm:text-4xl font-bold text-charcoal leading-tight ${isRTL ? 'font-arabic' : 'font-serif'}`}>
                {isRTL ? 'كل ما تود معرفته' : 'Everything You Need to Know'}
              </h2>
              <p className={`text-charcoal-muted text-sm sm:text-base leading-relaxed ${isRTL ? 'font-arabic' : ''}`}>
                {isRTL
                  ? 'أسئلة شائعة حول محفظتنا العقارية وآلية التأهيل بالذكاء الاصطناعي.'
                  : 'Common questions about our exclusive portfolio and AI-powered qualification.'}
              </p>
            </div>

            {/* Decorative property image */}
            <div className="relative aspect-[4/5] rounded-2xl sm:rounded-3xl overflow-hidden shadow-2xl hidden sm:block">
              <img
                src="https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=600&q=85"
                alt="Premium Saudi Real Estate"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-charcoal/60 via-transparent to-transparent" />
              <div className="absolute bottom-6 left-6 right-6">
                <div className="text-xs text-white/60 uppercase tracking-widest mb-1">
                  {isRTL ? 'محفظتنا' : 'Our Portfolio'}
                </div>
                <div className={`text-white font-bold text-lg ${isRTL ? 'font-arabic' : 'font-serif'}`}>
                  {isRTL ? 'عقارات حصرية في قلب المملكة' : 'Premium Properties Across the Kingdom'}
                </div>
              </div>
            </div>

            {/* Contact CTA */}
            <div className="p-5 rounded-2xl bg-primary-50 border border-primary-100">
              <p className={`text-sm font-medium text-charcoal mb-3 ${isRTL ? 'font-arabic' : ''}`}>
                {isRTL ? 'لم تجد إجابتك؟ تواصل معنا مباشرة' : "Didn't find your answer? Talk to us directly."}
              </p>
              <Link
                href={`/${locale}/contact`}
                className="inline-flex items-center gap-2 text-primary-600 font-bold text-sm hover:text-primary-700 transition-colors"
              >
                <MessageCircle className="w-4 h-4" />
                {isRTL ? 'تواصل معنا' : 'Contact Support'}
              </Link>
            </div>
          </div>

          {/* Right column: FAQ accordion */}
          <div className="lg:col-span-3 space-y-3">
            {displayFaqs.map((faq) => {
              const question = isRTL ? faq.questionAr : faq.questionEn;
              const answer = isRTL ? faq.answerAr : faq.answerEn;
              const isOpen = activeIndex === faq.id;

              return (
                <motion.div
                  key={faq.id}
                  initial={{ opacity: 0, y: 15 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '-30px' }}
                  transition={{ duration: 0.5 }}
                  className={`rounded-2xl border transition-all duration-300 ${
                    isOpen
                      ? 'bg-white border-primary-200 shadow-lg shadow-primary-500/8'
                      : 'bg-white border-gray-100 hover:border-primary-100 hover:shadow-md'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => setActiveIndex(isOpen ? null : faq.id)}
                    className="w-full flex items-center justify-between p-5 sm:p-6 text-start outline-none"
                  >
                    <span className={`text-base font-bold text-charcoal pr-4 leading-snug ${isRTL ? 'font-arabic' : ''}`}>
                      {question}
                    </span>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center border flex-shrink-0 transition-all duration-300 ${
                      isOpen
                        ? 'bg-primary-600 border-primary-600 text-white rotate-180'
                        : 'bg-surface-50 border-surface-200 text-charcoal-muted'
                    }`}>
                      <ChevronDown className="w-4 h-4" />
                    </div>
                  </button>

                  <AnimatePresence initial={false}>
                    {isOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3, ease: 'easeInOut' }}
                        className="overflow-hidden"
                      >
                        <div className={`px-5 pb-6 sm:px-6 sm:pb-7 text-sm sm:text-base text-charcoal-muted leading-relaxed border-t border-gray-50 pt-4 ${isRTL ? 'font-arabic' : ''}`}>
                          {answer}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
