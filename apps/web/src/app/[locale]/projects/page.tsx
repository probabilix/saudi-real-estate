import { Metadata } from 'next';
import { getTranslations, unstable_setRequestLocale } from 'next-intl/server';
import ProjectsClient from './ProjectsClient';
import { getApiBaseUrl } from '@/lib/api';

interface Props {
  params: {
    locale: string;
  };
  searchParams: {
    city?: string;
    completionStatus?: string;
    type?: string;
    purpose?: string;
    expectedDelivery?: string;
    q?: string;
    page?: string;
  };
}

export async function generateMetadata({ params: { locale }, searchParams }: Props): Promise<Metadata> {
  const isAr = locale === 'ar';

  const city = searchParams.city || '';
  const completionStatus = searchParams.completionStatus || '';
  const type = searchParams.type || '';
  const purpose = searchParams.purpose || '';

  // 1. Completion Status Text
  let statusText = '';
  if (completionStatus) {
    const cStatus = completionStatus.toUpperCase();
    if (cStatus === 'READY') {
      statusText = isAr ? 'جاهزة للتسليم' : 'Ready to Move';
    } else if (cStatus === 'OFF_PLAN') {
      statusText = isAr ? 'قيد الإنشاء (على الخارطة)' : 'Off-Plan';
    } else if (cStatus === 'UNDER_CONSTRUCTION') {
      statusText = isAr ? 'تحت الإنشاء' : 'Under Construction';
    }
  }

  // 2. Resolve Property Type Text
  let typeText = '';
  if (type) {
    const uType = type.toUpperCase();
    if (uType === 'VILLA') {
      typeText = isAr ? 'مشاريع فلل ومجمعات سكنية' : 'Villa Projects & Compounds';
    } else if (uType === 'APARTMENT') {
      typeText = isAr ? 'مشاريع شقق سكنية' : 'Apartment Buildings & Residences';
    } else {
      typeText = isAr ? 'مشاريع عقارية' : 'Real Estate Projects';
    }
  } else {
    typeText = isAr ? 'مشاريع عقارية' : 'Real Estate Projects';
  }

  // 3. Resolve City Text
  let cityText = '';
  if (city) {
    const lCity = city.toLowerCase();
    if (lCity === 'riyadh') {
      cityText = isAr ? 'في الرياض' : 'in Riyadh';
    } else if (lCity === 'jeddah') {
      cityText = isAr ? 'في جدة' : 'in Jeddah';
    } else if (lCity === 'dammam') {
      cityText = isAr ? 'في الدمام' : 'in Dammam';
    } else {
      cityText = isAr ? `في ${city}` : `in ${city}`;
    }
  } else {
    cityText = isAr ? 'في المملكة العربية السعودية' : 'in Saudi Arabia';
  }

  // 4. Construct Meta Title
  // e.g. "Off-Plan Villa Projects in Riyadh | Tamleeq"
  // e.g. "مشاريع فلل قيد الإنشاء في الرياض | تمليك"
  let title = '';
  if (isAr) {
    title = `${typeText} ${statusText ? `${statusText} ` : ''}${cityText}`;
  } else {
    title = `${statusText ? `${statusText} ` : ''}${typeText} ${cityText}`;
  }

  if (!isAr) {
    title = title.trim().replace(/^\w/, (c) => c.toUpperCase());
  }

  // 5. Fetch count dynamically
  let countText = '';
  try {
    const apiBase = getApiBaseUrl();
    const queryParams = new URLSearchParams();
    if (city) queryParams.set('city', city);
    if (completionStatus) queryParams.set('completionStatus', completionStatus);
    if (type) queryParams.set('type', type);
    if (purpose) queryParams.set('purpose', purpose);
    queryParams.set('limit', '1');

    const res = await fetch(`${apiBase}/system/projects?${queryParams.toString()}`, { next: { revalidate: 60 } });
    if (res.ok) {
      const json = await res.json();
      const total = json?.data?.total || json?.total || 0;
      if (total > 0) {
        countText = isAr ? `تصفح ${total}+ مشروع عقاري متميز. ` : `Discover ${total}+ premium real estate projects. `;
      }
    }
  } catch (err) {
    // Fail silently
  }

  const description = isAr
    ? `${countText}اكتشف أحدث المشاريع السكنية والفلل والمجمعات السكنية قيد الإنشاء والجاهزة في السعودية بمساعدة تمليك.`
    : `${countText}Explore the latest compounds, off-plan developments, and premium master-planned projects in Saudi Arabia on Tamleeq.`;

  return {
    title,
    description,
    alternates: {
      canonical: `${process.env.NEXT_PUBLIC_WEB_URL || 'https://tamleeq.sa'}/${locale}/projects`,
    },
  };
}

export default function ProjectsPage({ params: { locale } }: { params: { locale: string } }) {
  unstable_setRequestLocale(locale);

  return <ProjectsClient />;
}
