import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { unstable_setRequestLocale } from 'next-intl/server';
import BrokerProfileClient from './BrokerProfileClient';
import { getApiBaseUrl } from '@/lib/api';

interface Props {
  params: {
    locale: string;
    id: string;
  };
}

async function getBrokerData(id: string): Promise<any> {
  try {
    const apiBase = getApiBaseUrl();
    const res = await fetch(`${apiBase}/user/public-broker/${id}`, { next: { revalidate: 60 } });
    if (res.ok) {
      const json = await res.json();
      return json?.data || null;
    }
  } catch (err) {
    console.error('Error fetching broker data in server wrapper:', err);
  }
  return null;
}

export async function generateMetadata({ params: { locale, id } }: Props): Promise<Metadata> {
  const data = await getBrokerData(id);
  if (!data || !data.broker) {
    return {
      title: 'Broker Profile Not Found',
    };
  }

  const isAr = locale === 'ar';
  const name = data.broker.name || 'Broker';
  const city = isAr ? data.broker.cityAr || data.broker.city : data.broker.cityEn || data.broker.city;
  const listingsCount = data.stats?.activeListings || 0;

  // Title: "Mohammed Al-Qahtani — REGA-Licensed Broker in Riyadh"
  let title = '';
  if (isAr) {
    title = `${name} — وسيط عقاري مرخص من الهيئة العامة للعقار في ${city || 'المملكة'}`;
  } else {
    title = `${name} — REGA-Licensed Broker in ${city || 'Saudi Arabia'}`;
  }

  let description = '';
  if (isAr) {
    description = `تصفح ${listingsCount} عقار موثق ومعلن بواسطة الوسيط العقاري المرخص ${name} في ${city || 'المملكة العربية السعودية'} عبر منصة تمليك.`;
  } else {
    description = `View ${listingsCount} verified property listings managed by REGA-licensed broker ${name} in ${city || 'Saudi Arabia'} on Tamleeq.`;
  }

  return {
    title,
    description,
    alternates: {
      canonical: `${process.env.NEXT_PUBLIC_WEB_URL || 'https://tamleeq.sa'}/${locale}/brokers/${id}`,
    },
  };
}

export default async function BrokerProfilePage({ params }: Props) {
  unstable_setRequestLocale(params.locale);

  const data = await getBrokerData(params.id);
  if (!data || !data.broker) {
    notFound();
  }

  // Schema.org JSON-LD Structured Data
  const isAr = params.locale === 'ar';
  const name = data.broker.name || 'Broker';
  const city = isAr ? data.broker.cityAr || data.broker.city : data.broker.cityEn || data.broker.city;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'RealEstateAgent',
    'name': name,
    'telephone': data.broker.phone || '',
    'image': data.broker.avatarUrl || '',
    'url': `${process.env.NEXT_PUBLIC_WEB_URL || 'https://tamleeq.sa'}/${params.locale}/brokers/${params.id}`,
    'address': {
      '@type': 'PostalAddress',
      'addressLocality': city || '',
      'addressCountry': 'SA'
    }
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <BrokerProfileClient params={params} />
    </>
  );
}
