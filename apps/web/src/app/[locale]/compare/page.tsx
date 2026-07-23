import { Metadata } from 'next';
import { unstable_setRequestLocale } from 'next-intl/server';
import CompareClient from './CompareClient';

interface Props {
  params: {
    locale: string;
  };
}

export async function generateMetadata({ params: { locale } }: Props): Promise<Metadata> {
  const isAr = locale === 'ar';

  const title = isAr
    ? 'مقارنة العقارات جنباً إلى جنب'
    : 'Compare Properties Side-by-Side';

  const description = isAr
    ? 'قارن بين مختلف العقارات والفلل والشقق المعروضة في السعودية بناءً على السعر، المساحة، عدد الغرف والموقع لاتخاذ قرار أفضل.'
    : 'Compare multiple real estate listings side-by-side. Evaluate prices, area specs, room counts, and layouts to make the right choice on Tamleeq.';

  return {
    title,
    description,
    alternates: {
      canonical: `${process.env.NEXT_PUBLIC_WEB_URL || 'https://tamleeq.sa'}/${locale}/compare`,
    },
  };
}

export default function ComparePage({ params }: Props) {
  unstable_setRequestLocale(params.locale);

  return <CompareClient params={params} />;
}
