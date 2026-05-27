import { Metadata } from 'next';
import FAQSection from '@/components/home/FAQSection';
import { API_BASE_URL } from '@/lib/api';
import Link from 'next/link';
import { ChevronRight, Home } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Frequently Asked Questions | Saudi RE',
  description: 'Find answers to common questions about our exclusive real estate portfolio, AI qualification process, REGA compliance, and purchasing property in Saudi Arabia.',
};

export const dynamic = 'force-dynamic';

async function getFaqs() {
  try {
    const res = await fetch(`${API_BASE_URL}/system/faqs`, {
      cache: 'no-store',
    });
    if (!res.ok) return [];
    const json = await res.json();
    return json?.data || json || [];
  } catch {
    return [];
  }
}

export default async function FAQsPage({
  params: { locale },
}: {
  params: { locale: string };
}) {
  const faqs = await getFaqs();

  return (
    <div className="min-h-screen bg-white">
      {/* Premium Breadcrumb Header */}
      <div className="bg-white border-b border-surface-100 py-4">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex items-center gap-2 text-[11px] font-bold text-charcoal-muted uppercase tracking-widest">
            <Link
              href={`/${locale}`}
              className="flex items-center gap-1.5 hover:text-primary-600 transition-colors"
            >
              <Home className="w-3.5 h-3.5" />
              {locale === 'ar' ? 'الرئيسية' : 'Home'}
            </Link>
            <ChevronRight className={`w-3 h-3 ${locale === 'ar' ? 'rotate-180' : ''}`} />
            <span className="text-primary-600">
              {locale === 'ar' ? 'الأسئلة الشائعة' : 'FAQs'}
            </span>
          </nav>
        </div>
      </div>

      {/* Page Hero */}
      <div className="bg-gradient-to-b from-surface-50 to-white py-12 sm:py-16 border-b border-surface-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary-50 border border-primary-100 text-primary-700 text-[11px] font-black uppercase tracking-[0.2em]">
            {locale === 'ar' ? 'مركز المساعدة' : 'Help Center'}
          </div>
          <h1
            className={`text-3xl sm:text-4xl lg:text-5xl font-bold text-charcoal leading-tight ${
              locale === 'ar' ? 'font-arabic' : 'font-serif'
            }`}
          >
            {locale === 'ar'
              ? 'الأسئلة الشائعة'
              : 'Frequently Asked Questions'}
          </h1>
          <p
            className={`text-charcoal-muted text-base sm:text-lg max-w-2xl mx-auto ${
              locale === 'ar' ? 'font-arabic' : ''
            }`}
          >
            {locale === 'ar'
              ? 'إجابات على أكثر الأسئلة شيوعاً حول محفظتنا العقارية الحصرية وعملية التأهيل.'
              : 'Answers to the most common questions about our exclusive portfolio, AI qualification, and Saudi property ownership.'}
          </p>
        </div>
      </div>

      {/* FAQ Section */}
      <FAQSection faqs={faqs} />
    </div>
  );
}
