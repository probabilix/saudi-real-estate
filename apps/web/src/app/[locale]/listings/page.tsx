import { Metadata } from 'next';
import { getTranslations, unstable_setRequestLocale } from 'next-intl/server';
import ListingsClient from './ListingsClient';
import { getApiBaseUrl } from '@/lib/api';

interface Props {
  params: {
    locale: string;
  };
  searchParams: {
    city?: string;
    type?: string;
    purpose?: string;
    minPrice?: string;
    maxPrice?: string;
    bedrooms?: string;
    q?: string;
    page?: string;
    sortBy?: string;
  };
}

export async function generateMetadata({ params: { locale }, searchParams }: Props): Promise<Metadata> {
  const isAr = locale === 'ar';

  const city = searchParams.city || '';
  const type = searchParams.type || '';
  const purpose = searchParams.purpose || '';
  const bedrooms = searchParams.bedrooms ? Number(searchParams.bedrooms) : undefined;

  // 1. Resolve Purpose Text
  let purposeText = '';
  if (purpose === 'SALE') {
    purposeText = isAr ? 'للبيع' : 'for Sale';
  } else if (purpose === 'RENT') {
    purposeText = isAr ? 'للإيجار' : 'for Rent';
  } else {
    purposeText = isAr ? 'للبيع والإيجار' : 'for Sale & Rent';
  }

  // 2. Resolve Property Type Text
  let typeText = '';
  if (type) {
    const uType = type.toUpperCase();
    if (uType === 'VILLA') {
      typeText = isAr ? 'فلل' : 'Villas';
    } else if (uType === 'APARTMENT') {
      typeText = isAr ? 'شقق' : 'Apartments';
    } else if (uType === 'LAND') {
      typeText = isAr ? 'أراضي' : 'Land';
    } else if (uType === 'COMMERCIAL') {
      typeText = isAr ? 'عقارات تجارية' : 'Commercial Properties';
    } else {
      typeText = isAr ? 'عقارات' : 'Properties';
    }
  } else {
    typeText = isAr ? 'عقارات' : 'Properties';
  }

  // 3. Resolve Bedrooms Text
  let bedsText = '';
  if (bedrooms) {
    bedsText = isAr ? `${bedrooms} غرف نوم` : `${bedrooms} Bedroom`;
  }

  // 4. Resolve City Text
  let cityText = '';
  if (city) {
    const lCity = city.toLowerCase();
    if (lCity === 'riyadh') {
      cityText = isAr ? 'في الرياض' : 'in Riyadh';
    } else if (lCity === 'jeddah') {
      cityText = isAr ? 'في جدة' : 'in Jeddah';
    } else if (lCity === 'dammam') {
      cityText = isAr ? 'في الدمام' : 'in Dammam';
    } else if (lCity === 'alula') {
      cityText = isAr ? 'في العلا' : 'in AlUla';
    } else {
      cityText = isAr ? `في ${city}` : `in ${city}`;
    }
  } else {
    cityText = isAr ? 'في المملكة العربية السعودية' : 'in Saudi Arabia';
  }

  // 5. Construct Meta Title
  let title = '';
  if (isAr) {
    title = `${typeText} ${bedsText ? `${bedsText} ` : ''}${purposeText} ${cityText}`;
  } else {
    title = `${bedsText ? `${bedsText} ` : ''}${typeText} ${purposeText} ${cityText}`;
  }

  if (!isAr) {
    title = title.trim().replace(/^\w/, (c) => c.toUpperCase());
  }

  // 6. Fetch live results count dynamically
  let countText = '';
  try {
    const apiBase = getApiBaseUrl();
    const queryParams = new URLSearchParams();
    if (city) queryParams.set('city', city);
    if (type) queryParams.set('type', type);
    if (purpose) queryParams.set('purpose', purpose);
    if (bedrooms) queryParams.set('bedrooms', String(bedrooms));
    queryParams.set('excludeProjects', 'true');
    queryParams.set('limit', '1');

    const res = await fetch(`${apiBase}/listings?${queryParams.toString()}`, { next: { revalidate: 60 } });
    if (res.ok) {
      const json = await res.json();
      const total = json?.data?.total || json?.total || 0;
      if (total > 0) {
        countText = isAr ? `${total.toLocaleString()}+ شقق وفلل وعقارات. ` : `${total.toLocaleString()}+ Properties for Sale & Rent. `;
      }
    }
  } catch (err) {
    // Fail silently
  }

  const description = isAr
    ? `${countText}ابحث في قائمة العقارات والفلل الموثقة من الهيئة العامة للعقار في تمليك. ابحث وقارن بالأسعار والموقع وخيارات التمويل.`
    : `${countText}Explore verified listings in Saudi Arabia with interactive maps, drive-time commute searches, and detailed broker histories on Tamleeq.`;

  return {
    title,
    description,
    alternates: {
      canonical: `${process.env.NEXT_PUBLIC_WEB_URL || 'https://tamleeq.sa'}/${locale}/listings`,
    },
  };
}

export default function ListingsPage({ params: { locale } }: { params: { locale: string } }) {
  unstable_setRequestLocale(locale);

  return <ListingsClient />;
}
