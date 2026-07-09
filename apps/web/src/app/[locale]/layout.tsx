import type { Metadata } from 'next';
import { Playfair_Display, DM_Sans, IBM_Plex_Sans_Arabic } from 'next/font/google';
import { NextIntlClientProvider } from 'next-intl';
import { unstable_setRequestLocale } from 'next-intl/server';
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

export async function generateMetadata(): Promise<Metadata> {
  return {
    alternates: {
      languages: {
        en: '/en',
        ar: '/ar',
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
