import type { Metadata } from 'next';
import { Playfair_Display, DM_Sans, IBM_Plex_Sans_Arabic } from 'next/font/google';
import { NextIntlClientProvider } from 'next-intl';
import { unstable_setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { locales } from '@/i18n';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { AuthProvider } from '@/hooks/use-auth';
import NavWrapper from '@/components/layout/NavWrapper';

const playfair = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-playfair',
  display: 'swap',
});

const dmSans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-dm-sans',
  display: 'swap',
  weight: ['400', '500', '700'],
});

const ibmPlexArabic = IBM_Plex_Sans_Arabic({
  subsets: ['arabic'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-ibm-plex-arabic',
  display: 'swap',
});

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params: { locale },
}: {
  params: { locale: string };
}): Promise<Metadata> {
  console.log('Generating metadata for locale:', locale);
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
  if (!locales.includes(locale as any)) {
    notFound();
  }

  // Required for next-intl v3 static rendering support
  unstable_setRequestLocale(locale);

  // Load messages directly
  const messages = (await import(`@/messages/${locale}.json`)).default;

  const dir = locale === 'ar' ? 'rtl' : 'ltr';
  // Use DM Sans for English, IBM Plex for Arabic
  const fontClass = locale === 'ar' ? ibmPlexArabic.variable : dmSans.variable;

  return (
    <html lang={locale} dir={dir} suppressHydrationWarning>
      <head />
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
