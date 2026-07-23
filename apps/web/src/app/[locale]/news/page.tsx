import { Metadata } from 'next';
import { getTranslations, unstable_setRequestLocale } from 'next-intl/server';
import NewsClient from './NewsClient';

interface Props {
  params: {
    locale: string;
  };
}

export async function generateMetadata({ params: { locale } }: Props): Promise<Metadata> {
  const isAr = locale === 'ar';

  const title = isAr
    ? 'أخبار العقار، تقارير السوق والتحليلات العقارية في السعودية'
    : 'Saudi Real Estate News, Market Reports & Investment Insights';

  const description = isAr
    ? 'تابع أحدث أخبار وتطورات السوق العقاري السعودي، تحليلات أسعار الأراضي والفلل والشقق، ورؤى الاستثمار العقاري من فريق تمليك.'
    : 'Stay informed with the latest Saudi real estate news, property market updates, price trends, and investment insights compiled by the Tamleeq editorial team.';

  return {
    title,
    description,
    alternates: {
      canonical: `${process.env.NEXT_PUBLIC_WEB_URL || 'https://tamleeq.sa'}/${locale}/news`,
    },
  };
}

export default function NewsPage({ params }: Props) {
  unstable_setRequestLocale(params.locale);

  return <NewsClient params={params} />;
}
