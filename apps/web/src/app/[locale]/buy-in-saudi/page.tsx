import { Metadata } from 'next';
import { unstable_setRequestLocale } from 'next-intl/server';
import BuyInSaudiClient from './BuyInSaudiClient';

interface Props {
  params: {
    locale: string;
  };
}

export async function generateMetadata({ params: { locale } }: Props): Promise<Metadata> {
  const isAr = locale === 'ar';

  const title = isAr
    ? 'كيفية شراء عقار في السعودية | دليل التملك لغير السعوديين والمقيمين 2026'
    : 'How to Buy Property in Saudi Arabia | Foreigner & Expat Buyer Guide 2026';

  const description = isAr
    ? 'الدليل الشامل لشراء العقارات في المملكة العربية السعودية لغير السعوديين والمقيمين ومواطني دول مجلس التعاون. تعرف على الشروط واللوائح والأهلية القانونية.'
    : 'The complete step-by-step guide for foreigners, expats, and GCC nationals to buy real estate in Saudi Arabia. Understand eligibility rules, legal procedures, and REGA regulations.';

  return {
    title,
    description,
    alternates: {
      canonical: `${process.env.NEXT_PUBLIC_WEB_URL || 'https://tamleeq.sa'}/${locale}/buy-in-saudi`,
    },
  };
}

export default function BuyInSaudiPage({ params }: Props) {
  unstable_setRequestLocale(params.locale);

  // Schema.org JSON-LD Structured Data for HowTo
  const isAr = params.locale === 'ar';
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'HowTo',
    'name': isAr 
      ? 'كيفية شراء عقار في السعودية لغير السعوديين'
      : 'How to Buy Property in Saudi Arabia for Foreigners',
    'description': isAr
      ? 'دليل خطوة بخطوة لشراء العقارات وتملكها في المملكة العربية السعودية للمقيمين والأجانب.'
      : 'Step-by-step procedure for expats and international buyers to purchase real estate in Saudi Arabia.',
    'step': [
      {
        '@type': 'HowToStep',
        'name': isAr ? 'التحقق من الأهلية والجنسية' : 'Check Eligibility & Citizenship',
        'text': isAr 
          ? 'تحديد ما إذا كنت مواطناً سعودياً، أو خليجياً، أو مقيماً يحمل إقامة سارية، أو مستثمراً أجنبياً.'
          : 'Determine if you are a Saudi citizen, GCC national, premium residency holder, or foreign investor.'
      },
      {
        '@type': 'HowToStep',
        'name': isAr ? 'تأكيد الغرض من العقار' : 'Verify Property Purpose',
        'text': isAr
          ? 'تأكيد ما إذا كان العقار للسكن الخاص أو للاستثمار التجاري حيث تختلف الشروط واللوائح الحكومية.'
          : 'Confirm whether the property is for private residential use or commercial investment as rules differ.'
      },
      {
        '@type': 'HowToStep',
        'name': isAr ? 'الحصول على الموافقات الرسمية' : 'Obtain Official Approvals',
        'text': isAr
          ? 'تقديم طلب تملك عقار لغير السعوديين عبر منصة أبشر أو بوابة وزارة الداخلية للحصول على الترخيص الرسمي.'
          : 'Submit a property ownership application for non-Saudis through the Absher platform or Ministry of Interior portal.'
      }
    ]
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <BuyInSaudiClient />
    </>
  );
}
