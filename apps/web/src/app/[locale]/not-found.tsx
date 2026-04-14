import Link from 'next/link';
import { useTranslations, useLocale } from 'next-intl';
import { Home } from 'lucide-react';

export default function NotFound() {
  const t = useTranslations('common');
  const locale = useLocale();

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] px-4 text-center">
      <div className="w-24 h-24 bg-primary-50 rounded-3xl flex items-center justify-center mb-8">
        <span className="text-4xl font-bold text-primary-600">404</span>
      </div>
      <h1 className={`text-3xl font-bold text-charcoal mb-4 ${locale === 'ar' ? 'font-arabic' : 'font-serif'}`}>
        {t('notFoundTitle')}
      </h1>
      <p className={`text-charcoal-muted max-w-md mb-10 ${locale === 'ar' ? 'font-arabic' : ''}`}>
        {t('notFoundDesc')}
      </p>
      <Link
        href={`/${locale}`}
        className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-primary-600 text-white font-bold text-sm shadow-lg hover:bg-primary-700 transition-all active:scale-95 group"
      >
        <Home className={`w-4 h-4 transition-transform group-hover:-translate-y-0.5`} />
        {t('backHome')}
      </Link>
    </div>
  );
}
