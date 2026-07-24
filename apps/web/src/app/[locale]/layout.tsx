import type { Metadata } from 'next';
import { Playfair_Display, DM_Sans, IBM_Plex_Sans_Arabic } from 'next/font/google';
import { NextIntlClientProvider } from 'next-intl';
import { getTranslations, unstable_setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { locales } from '@/i18n';
import { AuthProvider } from '@/hooks/use-auth';
import NavWrapper from '@/components/layout/NavWrapper';
import ChatWidget from '@/components/chat/ChatWidget';
import type { Locale } from '@/i18n';
import { API_BASE_URL } from '@/lib/api';

const playfair = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-playfair',
  display: 'fallback',
});

const dmSans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-dm-sans',
  display: 'fallback',
  weight: ['400', '500', '700'],
});

const ibmPlexArabic = IBM_Plex_Sans_Arabic({
  subsets: ['arabic'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-ibm-plex-arabic',
  display: 'fallback',
});

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params: { locale },
}: {
  params: { locale: string };
}): Promise<Metadata> {
  const t = await getTranslations({ locale, namespace: 'metadata' });
  const base = process.env.NEXT_PUBLIC_WEB_URL || process.env.FRONTEND_URL || 'https://tamleeq.sa';
  const isAr = locale === 'ar';

  return {
    metadataBase: new URL(base),
    title: {
      default: t('title'),
      template: `%s | ${t('brandName')}`,
    },
    description: t('description'),
    keywords: isAr
      ? ['عقارات السعودية', 'شقق للبيع الرياض', 'فلل للبيع جدة', 'هيئة العقار', 'تمليك']
      : ['Saudi real estate', 'properties for sale Riyadh', 'villas Jeddah', 'apartments Saudi Arabia', 'REGA licensed brokers', 'Tamleeq'],
    openGraph: {
      type: 'website',
      locale: isAr ? 'ar_SA' : 'en_US',
      siteName: t('brandName'),
      url: `${base}/${locale}`,
      images: [
        {
          url: '/og-image.jpg',
          width: 1200,
          height: 630,
          alt: t('title'),
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: t('title'),
      description: t('description'),
    },
    alternates: {
      canonical: `${base}/${locale}`,
      languages: {
        en: `${base}/en`,
        ar: `${base}/ar`,
      },
    },
  };
}

export default async function LocaleLayout({
  children,
  params: { locale },
}: {
  children: React.ReactNode;
  params: { locale: string };
}) {
  if (!locales.includes(locale as Locale)) {
    notFound();
  }

  // Required for next-intl v3 static rendering support
  unstable_setRequestLocale(locale);

  // Load messages directly
  const messages = (await import(`../../messages/${locale}.json`)).default;

  const dir = locale === 'ar' ? 'rtl' : 'ltr';
  // Use DM Sans for English, IBM Plex for Arabic
  const fontClass = locale === 'ar' ? ibmPlexArabic.variable : dmSans.variable;

  let faviconUrl = '/favicon.ico';
  if (process.env.NEXT_PHASE !== 'phase-production-build') {
    try {
      const res = await fetch(`${API_BASE_URL}/system/settings`, { next: { revalidate: 60 } });
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data?.favicon_url) {
          faviconUrl = json.data.favicon_url;
        }
      }
    } catch (err) {
      console.error('Failed to fetch favicon on server', err);
    }
  }

  return (
    <html lang={locale} dir={dir} suppressHydrationWarning>
      <head>
        <link rel="icon" href={faviconUrl} />
      </head>
      <body
        className={`${playfair.variable} ${dmSans.variable} ${ibmPlexArabic.variable} ${fontClass} font-sans bg-white text-charcoal antialiased min-h-screen flex flex-col`}
      >
        <NextIntlClientProvider locale={locale} messages={messages}>
          <AuthProvider>
            <NavWrapper locale={locale}>
              {children}
            </NavWrapper>
          </AuthProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
