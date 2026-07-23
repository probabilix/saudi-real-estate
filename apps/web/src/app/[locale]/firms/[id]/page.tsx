import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { unstable_setRequestLocale } from 'next-intl/server';
import FirmProfileClient from './FirmProfileClient';
import { getApiBaseUrl } from '@/lib/api';

interface Props {
  params: {
    locale: string;
    id: string;
  };
}

async function getFirmData(id: string): Promise<any> {
  try {
    const apiBase = getApiBaseUrl();
    const res = await fetch(`${apiBase}/user/public-firm/${id}`, { next: { revalidate: 60 } });
    if (res.ok) {
      const json = await res.json();
      return json?.data || null;
    }
  } catch (err) {
    console.error('Error fetching firm data in server wrapper:', err);
  }
  return null;
}

export async function generateMetadata({ params: { locale, id } }: Props): Promise<Metadata> {
  const data = await getFirmData(id);
  if (!data || !data.firm) {
    return {
      title: 'Agency Profile Not Found',
    };
  }

  const isAr = locale === 'ar';
  const name = data.firm.name || 'Agency';
  const city = isAr ? data.firm.cityAr || data.firm.city : data.firm.cityEn || data.firm.city;
  const listingsCount = data.stats?.activeListings || 0;
  const agentsCount = data.stats?.agentsCount || 0;

  // Title: "Dar Al Arkan — Real Estate Agency in Riyadh | Tamleeq"
  let title = '';
  if (isAr) {
    title = `${name} — وكالة عقارية معتمدة في ${city || 'المملكة'}`;
  } else {
    title = `${name} — Real Estate Agency in ${city || 'Saudi Arabia'}`;
  }

  let description = '';
  if (isAr) {
    description = `تصفح ${listingsCount} عقار موثق معلن بواسطة الوكالة العقارية ${name} في ${city || 'المملكة'}، مع فريق من ${agentsCount} وسيط عقاري معتمد عبر تمليك.`;
  } else {
    description = `Browse ${listingsCount} verified property listings managed by ${name} in ${city || 'Saudi Arabia'}, with a team of ${agentsCount} professional brokers on Tamleeq.`;
  }

  return {
    title,
    description,
    alternates: {
      canonical: `${process.env.NEXT_PUBLIC_WEB_URL || 'https://tamleeq.sa'}/${locale}/firms/${id}`,
    },
  };
}

export default async function FirmProfilePage({ params }: Props) {
  unstable_setRequestLocale(params.locale);

  const data = await getFirmData(params.id);
  if (!data || !data.firm) {
    notFound();
  }

  // Schema.org JSON-LD Structured Data
  const isAr = params.locale === 'ar';
  const name = data.firm.name || 'Agency';
  const city = isAr ? data.firm.cityAr || data.firm.city : data.firm.cityEn || data.firm.city;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'RealEstateAgent',
    'name': name,
    'telephone': data.firm.phone || '',
    'image': data.firm.avatarUrl || '',
    'url': `${process.env.NEXT_PUBLIC_WEB_URL || 'https://tamleeq.sa'}/${params.locale}/firms/${params.id}`,
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
      <FirmProfileClient params={params} />
    </>
  );
}
