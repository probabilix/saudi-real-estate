import { Metadata } from 'next';
import { getTranslations, unstable_setRequestLocale } from 'next-intl/server';
import AboutClient from './AboutClient';

interface Props {
  params: {
    locale: string;
  };
}

export async function generateMetadata({ params: { locale } }: Props): Promise<Metadata> {
  const t = await getTranslations({ locale, namespace: 'about' });

  return {
    title: t('title') || 'About Tamleeq',
    description: t('description') || 'Tamleeq is Saudi Arabia\'s leading AI-powered property marketplace connecting buyers, brokers and developers.',
    alternates: {
      canonical: `${process.env.NEXT_PUBLIC_WEB_URL || 'https://tamleeq.sa'}/${locale}/about`,
    },
  };
}

export default function AboutPage({ params }: Props) {
  unstable_setRequestLocale(params.locale);

  return <AboutClient />;
}
