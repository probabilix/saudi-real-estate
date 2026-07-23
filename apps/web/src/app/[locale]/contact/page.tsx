import { Metadata } from 'next';
import { getTranslations, unstable_setRequestLocale } from 'next-intl/server';
import ContactClient from './ContactClient';

interface Props {
  params: {
    locale: string;
  };
}

export async function generateMetadata({ params: { locale } }: Props): Promise<Metadata> {
  const t = await getTranslations({ locale, namespace: 'contact' });

  return {
    title: t('metaTitle') || 'Contact Us',
    description: t('metaDescription') || 'Get in touch with the Tamleeq team. Reach out via email, phone, or WhatsApp.',
    alternates: {
      canonical: `${process.env.NEXT_PUBLIC_WEB_URL || 'https://tamleeq.sa'}/${locale}/contact`,
    },
  };
}

export default function ContactPage({ params }: Props) {
  unstable_setRequestLocale(params.locale);

  return <ContactClient />;
}
