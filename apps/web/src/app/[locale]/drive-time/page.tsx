import { Metadata } from 'next';
import { unstable_setRequestLocale } from 'next-intl/server';
import DriveTimeClient from './DriveTimeClient';

interface Props {
  params: {
    locale: string;
  };
}

export async function generateMetadata({ params: { locale } }: Props): Promise<Metadata> {
  const isAr = locale === 'ar';

  const title = isAr
    ? 'البحث بـ وقت القيادة والمواصلات'
    : 'Search by Commute & Drive Time';

  const description = isAr
    ? 'ابحث عن عقارك المثالي بناءً على وقت القيادة والقرب من مقر عملك، مدرستك، أو مشفاك. ابحث بذكاء مع تمليك.'
    : 'Find properties in Saudi Arabia filtered by drive time commute proximity to your workplace, school, or key landmarks. Explore smarter on Tamleeq.';

  return {
    title,
    description,
    alternates: {
      canonical: `${process.env.NEXT_PUBLIC_WEB_URL || 'https://tamleeq.sa'}/${locale}/drive-time`,
    },
  };
}

export default function DriveTimePage({ params }: Props) {
  unstable_setRequestLocale(params.locale);

  return <DriveTimeClient params={params} />;
}
