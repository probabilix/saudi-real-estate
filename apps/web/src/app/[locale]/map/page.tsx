import { Metadata } from 'next';
import { unstable_setRequestLocale } from 'next-intl/server';
import MapClient from './MapClient';

interface Props {
  params: {
    locale: string;
  };
}

export async function generateMetadata({ params: { locale } }: Props): Promise<Metadata> {
  const isAr = locale === 'ar';

  const title = isAr
    ? 'خريطة العقارات التفاعلية في السعودية | ابحث بالخريطة'
    : 'Interactive Real Estate Map Search';

  const description = isAr
    ? 'تصفح آلاف العقارات والفلل والشقق الموثقة في الرياض وجدة ومختلف مدن المملكة عبر خريطة عقارية تفاعلية سهلة الاستخدام.'
    : 'Browse thousands of verified apartments, villas, and lands across Saudi Arabia on an interactive map search layout. Find your home on Tamleeq.';

  return {
    title,
    description,
    alternates: {
      canonical: `${process.env.NEXT_PUBLIC_WEB_URL || 'https://tamleeq.sa'}/${locale}/map`,
    },
  };
}

export default function MapPage({ params }: Props) {
  unstable_setRequestLocale(params.locale);

  return <MapClient params={params} />;
}
