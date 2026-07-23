import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { unstable_setRequestLocale } from 'next-intl/server';
import LegalClient from './LegalClient';

interface Props {
  params: {
    locale: string;
    slug: string;
  };
}

export async function generateMetadata({ params: { locale, slug } }: Props): Promise<Metadata> {
  const isAr = locale === 'ar';

  let title = '';
  let description = '';

  if (slug === 'privacy') {
    title = isAr ? 'سياسة الخصوصية' : 'Privacy Policy';
    description = isAr
      ? 'سياسة الخصوصية الرسمية لمنصة تمليك. تعرف على كيفية جمع وحماية واستخدام بياناتك الشخصية.'
      : 'Official Privacy Policy for the Tamleeq platform. Understand how we collect, protect, and use your personal information.';
  } else if (slug === 'terms') {
    title = isAr ? 'الشروط والأحكام' : 'Terms & Conditions';
    description = isAr
      ? 'الشروط والأحكام الرسمية لمنصة تمليك. القواعد واللوائح المنظمة لاستخدام البوابة العقارية.'
      : 'Official Terms & Conditions for the Tamleeq platform. Rules and regulations governing the use of our real estate portal.';
  } else {
    title = isAr ? 'وثيقة قانونية' : 'Legal Document';
    description = title;
  }

  return {
    title,
    description,
    alternates: {
      canonical: `${process.env.NEXT_PUBLIC_WEB_URL || 'https://tamleeq.sa'}/${locale}/legal/${slug}`,
    },
    robots: {
      index: false, // Legal pages usually shouldn't clutter primary listing search results
      follow: true,
    },
  };
}

export default function LegalPage({ params }: Props) {
  unstable_setRequestLocale(params.locale);

  const validSlugs = ['privacy', 'terms'];
  if (!validSlugs.includes(params.slug)) {
    notFound();
  }

  return <LegalClient params={params} />;
}
