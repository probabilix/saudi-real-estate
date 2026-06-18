'use client';

import { useRef } from 'react';
import Link from 'next/link';
import { useLocale } from 'next-intl';
import { motion, useInView } from 'framer-motion';
import { ArrowRight, MessageCircle, Phone, TrendingUp, CheckCircle } from 'lucide-react';

interface CTASectionProps {
  contactPhone?: string;
  whatsappNumber?: string;
}

const BENEFITS = [
  { en: 'No broker commissions for buyers', ar: 'لا عمولات للمشترين' },
  { en: 'Verified & direct property titles', ar: 'صكوك موثقة ومباشرة' },
  { en: 'Exclusive premium portfolio', ar: 'محفظة عقارية حصرية' },
];

export default function CTASection({ contactPhone, whatsappNumber }: CTASectionProps) {
  const locale = useLocale();
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-80px' });
  const isRTL = locale === 'ar';

  const phone = contactPhone || '+966 53 849 8580';
  const whatsapp = whatsappNumber || phone;
  const waLink = `https://wa.me/${whatsapp.replace(/[\s\-+]/g, '')}?text=${encodeURIComponent(isRTL ? 'مرحباً، أود الاستفسار عن عقار' : 'Hello, I would like to inquire about a property')}`;

  return (
    <section ref={ref} className="relative overflow-hidden">
      {/* Full-bleed dark gradient — no island card, no floating */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#0a1a1c] via-charcoal to-[#0e2426]" />

      {/* Arabic geometric pattern */}
      <div
        className="absolute inset-0 opacity-[0.035] pointer-events-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='80' height='80'%3E%3Ccircle cx='40' cy='40' r='30' fill='none' stroke='%23ffffff' stroke-width='1'/%3E%3Ccircle cx='40' cy='40' r='15' fill='none' stroke='%23ffffff' stroke-width='0.5'/%3E%3Cline x1='10' y1='40' x2='70' y2='40' stroke='%23ffffff' stroke-width='0.3'/%3E%3Cline x1='40' y1='10' x2='40' y2='70' stroke='%23ffffff' stroke-width='0.3'/%3E%3C/svg%3E")`,
          backgroundSize: '80px 80px',
        }}
      />

      {/* Glow accents */}
      <div className="absolute -top-40 -right-40 w-[500px] h-[500px] rounded-full bg-primary-600/10 blur-[120px] pointer-events-none" />
      <div className="absolute -bottom-40 -left-40 w-[400px] h-[400px] rounded-full bg-gold/8 blur-[100px] pointer-events-none" />

      {/* Gold border lines */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-gold/50 to-transparent" />
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary-500/30 to-transparent" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 sm:py-28">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">

          {/* Left: Content */}
          <motion.div
            initial={{ opacity: 0, x: isRTL ? 30 : -30 }}
            animate={inView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.8 }}
            className="space-y-7"
          >
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/8 border border-white/12 text-white/70 text-[11px] font-black uppercase tracking-[0.2em]">
              <TrendingUp className="w-3 h-3" />
              {isRTL ? 'استثمر في المملكة' : 'INVEST IN THE KINGDOM'}
            </div>

            <h2 className={`text-3xl sm:text-4xl lg:text-5xl font-bold text-white leading-tight ${isRTL ? 'font-arabic' : 'font-serif'}`}>
              {isRTL
                ? 'ابدأ رحلتك نحو العقار المثالي'
                : 'Start Your Journey to the Perfect Property'}
            </h2>

            <p className={`text-white/65 leading-relaxed text-base sm:text-lg ${isRTL ? 'font-arabic' : ''}`}>
              {isRTL
                ? 'محفظتنا العقارية الحصرية تنتظرك. من الفلل الفاخرة في الرياض إلى واجهات جدة البحرية — كل عقار موثق ومباشر.'
                : 'Our exclusive portfolio awaits you. From luxury villas in Riyadh to Jeddah\'s waterfront residences — every property verified and direct.'}
            </p>

            {/* Benefit list */}
            <ul className="space-y-3">
              {BENEFITS.map((b, i) => (
                <li key={i} className="flex items-center gap-3">
                  <CheckCircle className="w-4 h-4 text-primary-400 flex-shrink-0" />
                  <span className={`text-white/75 text-sm font-medium ${isRTL ? 'font-arabic' : ''}`}>
                    {isRTL ? b.ar : b.en}
                  </span>
                </li>
              ))}
            </ul>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <Link
                href={`/${locale}/projects`}
                className="inline-flex items-center justify-center gap-2.5 px-7 py-4 rounded-xl bg-primary-600 text-white font-bold text-sm shadow-xl shadow-primary-600/25 hover:bg-primary-500 hover:-translate-y-0.5 transition-all duration-300 group"
              >
                {isRTL ? 'تصفح المشاريع' : 'Browse Projects'}
                <ArrowRight className={`w-4 h-4 transition-transform ${isRTL ? 'rotate-180 group-hover:-translate-x-1' : 'group-hover:translate-x-1'}`} />
              </Link>

              {/* WhatsApp CTA — critical for Saudi market */}
              <a
                href={waLink}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2.5 px-7 py-4 rounded-xl bg-[#25D366]/10 border border-[#25D366]/30 text-[#25D366] font-bold text-sm hover:bg-[#25D366]/20 hover:border-[#25D366]/50 hover:-translate-y-0.5 transition-all duration-300"
              >
                <MessageCircle className="w-4 h-4" />
                {isRTL ? 'واتساب' : 'WhatsApp Us'}
              </a>
            </div>

            {/* Phone */}
            {phone && (
              <a
                href={`tel:${phone.replace(/\s/g, '')}`}
                className="flex items-center gap-2 text-white/40 hover:text-white/70 text-sm transition-colors"
              >
                <Phone className="w-3.5 h-3.5" />
                {phone}
              </a>
            )}
          </motion.div>

          {/* Right: Stat cards */}
          <motion.div
            initial={{ opacity: 0, x: isRTL ? -30 : 30 }}
            animate={inView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="grid grid-cols-2 gap-4"
          >
            {[
              { value: '200+', label: isRTL ? 'عقار حصري' : 'Exclusive Listings', sub: isRTL ? 'وتتزايد أسبوعياً' : 'Growing weekly' },
              { value: '100%', label: isRTL ? 'مجاني للمشترين' : 'Free for Buyers', sub: isRTL ? 'بدون رسوم خفية' : 'No hidden fees' },
              { value: 'SAR', label: isRTL ? '50M+ في معاملات' : '50M+ in Deals', sub: isRTL ? 'تم إتمامها' : 'Completed', colSpan: true },
            ].map((card, i) => (
              <div
                key={i}
                className={`bg-white/6 backdrop-blur-md rounded-2xl p-6 border border-white/10 hover:border-primary-400/30 transition-all duration-300 ${(card as any).colSpan ? 'col-span-2' : ''}`}
              >
                <div className={`text-3xl sm:text-4xl font-black text-white tracking-tight mb-1 ${isRTL ? 'font-arabic' : ''}`}>
                  {card.value}
                </div>
                <div className={`text-sm font-bold text-white/70 ${isRTL ? 'font-arabic' : ''}`}>{card.label}</div>
                <div className="text-xs text-white/35 mt-1">{card.sub}</div>
              </div>
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  );
}
