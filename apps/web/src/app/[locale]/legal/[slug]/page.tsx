'use client';

import Link from 'next/link';
import { ChevronRight, Shield } from 'lucide-react';

const LEGAL_CONTENT: Record<string, {
  en: { title: string; sections: { heading: string; body: string[] }[] };
  ar: { title: string; sections: { heading: string; body: string[] }[] };
}> = {
  privacy: {
    en: {
      title: 'Privacy Policy',
      sections: [
        {
          heading: '1. Introduction',
          body: [
            'Saudi Real Estate ("we", "our", or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you visit our platform saudi-re.com.',
            'Please read this policy carefully. If you disagree with its terms, please discontinue use of the site.',
          ],
        },
        {
          heading: '2. Information We Collect',
          body: [
            'We may collect personal information you voluntarily provide when registering an account, listing a property, or contacting us. This includes:',
            '• Full name, email address, and phone number',
            '• Profile information such as company name and REGA license number',
            '• Payment information (processed via secure third-party gateways)',
            '• Property listing data and uploaded images',
            'We also collect non-personal data automatically, such as browser type, IP address, pages visited, and time spent on pages.',
          ],
        },
        {
          heading: '3. How We Use Your Information',
          body: [
            'We use your information to:',
            '• Create and manage your account',
            '• Process property listings and transactions',
            '• Send service notifications and updates',
            '• Respond to customer support requests',
            '• Improve our platform based on usage analytics',
            '• Comply with Saudi law and regulatory requirements',
          ],
        },
        {
          heading: '4. Sharing Your Information',
          body: [
            'We do not sell your personal information. We may share data with:',
            '• Verified brokers and agencies when you inquire about a property',
            '• Payment processors to facilitate transactions',
            '• Government authorities when required by Saudi law',
            '• Service providers who assist in platform operations under confidentiality agreements',
          ],
        },
        {
          heading: '5. Data Security',
          body: [
            'We implement industry-standard security measures including SSL encryption, secure servers, and access controls to protect your data. However, no method of transmission over the internet is 100% secure.',
          ],
        },
        {
          heading: '6. Your Rights',
          body: [
            'You have the right to access, update, or delete your personal data at any time by contacting us at privacy@saudi-re.com. You may also opt out of marketing communications through your account settings.',
          ],
        },
        {
          heading: '7. Contact Us',
          body: [
            'If you have questions about this Privacy Policy, contact us at: privacy@saudi-re.com or call 920003000.',
          ],
        },
      ],
    },
    ar: {
      title: 'سياسة الخصوصية',
      sections: [
        {
          heading: '1. مقدمة',
          body: [
            'سعودي عقار ("نحن" أو "لنا") ملتزمون بحماية خصوصيتك. توضح سياسة الخصوصية هذه كيفية جمع معلوماتك واستخدامها والإفصاح عنها وحمايتها عند زيارة منصتنا saudi-re.com.',
            'يرجى قراءة هذه السياسة بعناية. إذا كنت لا توافق على شروطها، يرجى التوقف عن استخدام الموقع.',
          ],
        },
        {
          heading: '2. المعلومات التي نجمعها',
          body: [
            'قد نجمع معلومات شخصية تقدمها طواعية عند تسجيل حساب أو إدراج عقار أو التواصل معنا، بما في ذلك:',
            '• الاسم الكامل والبريد الإلكتروني ورقم الهاتف',
            '• معلومات الملف الشخصي مثل اسم الشركة ورقم ترخيص هيئة العقار',
            '• معلومات الدفع (تتم معالجتها عبر بوابات دفع آمنة)',
            '• بيانات إدراج العقار والصور المرفوعة',
          ],
        },
        {
          heading: '3. كيف نستخدم معلوماتك',
          body: [
            'نستخدم معلوماتك من أجل:',
            '• إنشاء حسابك وإدارته',
            '• معالجة إدراجات العقارات والمعاملات',
            '• إرسال إشعارات الخدمة والتحديثات',
            '• الرد على طلبات دعم العملاء',
            '• تحسين منصتنا بناءً على تحليلات الاستخدام',
            '• الامتثال للقانون السعودي والمتطلبات التنظيمية',
          ],
        },
        {
          heading: '4. مشاركة معلوماتك',
          body: [
            'لا نبيع معلوماتك الشخصية. قد نشارك البيانات مع:',
            '• الوسطاء والوكالات المعتمدين عند استفسارك عن عقار',
            '• معالجي الدفع لتسهيل المعاملات',
            '• الجهات الحكومية وفقاً لما يقتضيه القانون السعودي',
          ],
        },
        {
          heading: '5. أمن البيانات',
          body: [
            'نطبق معايير أمان صناعية متطورة تشمل تشفير SSL وخوادم آمنة وضوابط وصول لحماية بياناتك.',
          ],
        },
        {
          heading: '6. حقوقك',
          body: [
            'يحق لك الوصول إلى بياناتك الشخصية أو تحديثها أو حذفها في أي وقت عبر التواصل معنا على privacy@saudi-re.com.',
          ],
        },
        {
          heading: '7. تواصل معنا',
          body: [
            'إذا كان لديك أسئلة حول سياسة الخصوصية، تواصل معنا على: privacy@saudi-re.com أو اتصل على 920003000.',
          ],
        },
      ],
    },
  },
  terms: {
    en: {
      title: 'Terms of Service',
      sections: [
        {
          heading: '1. Acceptance of Terms',
          body: [
            'By accessing and using Saudi Real Estate (saudi-re.com), you accept and agree to be bound by these Terms of Service. If you do not agree to these terms, you must not use our platform.',
          ],
        },
        {
          heading: '2. Platform Description',
          body: [
            'Saudi Real Estate is a licensed real estate marketplace operating under Saudi regulations. We connect property buyers, sellers, landlords, and tenants with REGA-verified brokers and agencies across the Kingdom.',
          ],
        },
        {
          heading: '3. User Accounts',
          body: [
            'To access certain features, you must register and maintain an account. You agree to:',
            '• Provide accurate and complete registration information',
            '• Keep your login credentials confidential',
            '• Notify us immediately of any unauthorized account access',
            '• Be responsible for all activity under your account',
            'Brokers must hold a valid REGA license. False credentials will result in immediate account termination.',
          ],
        },
        {
          heading: '4. Property Listings',
          body: [
            'All listings must be accurate and lawful. You agree not to:',
            '• Post fraudulent or misleading property information',
            '• List properties you are not authorized to sell or rent',
            '• Use the platform for money laundering or illegal transactions',
            'We reserve the right to remove any listing that violates these terms without notice.',
          ],
        },
        {
          heading: '5. Credits & Payments',
          body: [
            'Credits purchased on the platform are non-refundable unless required by applicable Saudi consumer protection law. All transactions are processed in Saudi Riyal (SAR).',
          ],
        },
        {
          heading: '6. Intellectual Property',
          body: [
            'All content on saudi-re.com including text, graphics, logos, and software is the property of Saudi Real Estate and protected by applicable intellectual property laws.',
          ],
        },
        {
          heading: '7. Limitation of Liability',
          body: [
            'Saudi Real Estate is a marketplace platform and is not a party to transactions between buyers and sellers. We are not liable for any losses arising from transactions conducted through the platform.',
          ],
        },
        {
          heading: '8. Governing Law',
          body: [
            'These Terms are governed by the laws of the Kingdom of Saudi Arabia. Any disputes shall be subject to the jurisdiction of the competent courts in Riyadh.',
          ],
        },
      ],
    },
    ar: {
      title: 'شروط الخدمة',
      sections: [
        {
          heading: '1. قبول الشروط',
          body: [
            'بالوصول إلى سعودي عقار (saudi-re.com) واستخدامه، فإنك توافق على الالتزام بشروط الخدمة هذه. إذا كنت لا توافق، يجب عليك عدم استخدام المنصة.',
          ],
        },
        {
          heading: '2. وصف المنصة',
          body: [
            'سعودي عقار هي منصة عقارية مرخصة تعمل وفق الأنظمة السعودية، تربط المشترين والبائعين والملاك والمستأجرين بوسطاء ووكالات معتمدة من هيئة العقار عبر المملكة.',
          ],
        },
        {
          heading: '3. حسابات المستخدمين',
          body: [
            'للوصول إلى بعض الميزات، يجب التسجيل والحفاظ على حساب. توافق على:',
            '• تقديم معلومات تسجيل دقيقة وكاملة',
            '• الحفاظ على سرية بيانات تسجيل الدخول',
            '• إخطارنا فوراً بأي وصول غير مصرح به',
            'يجب أن يمتلك الوسطاء ترخيصاً صالحاً من هيئة العقار.',
          ],
        },
        {
          heading: '4. إدراجات العقارات',
          body: [
            'يجب أن تكون جميع الإدراجات دقيقة وقانونية. توافق على عدم:',
            '• نشر معلومات عقارية احتيالية أو مضللة',
            '• إدراج عقارات غير مخول لك بيعها أو تأجيرها',
            'نحتفظ بالحق في إزالة أي إدراج ينتهك هذه الشروط دون إشعار.',
          ],
        },
        {
          heading: '5. الرسوم والمدفوعات',
          body: [
            'الرصيد المشترى في المنصة غير قابل للاسترداد إلا وفقاً لقوانين حماية المستهلك السعودية المعمول بها. تتم جميع المعاملات بالريال السعودي.',
          ],
        },
        {
          heading: '6. الملكية الفكرية',
          body: [
            'جميع المحتويات على saudi-re.com بما في ذلك النصوص والرسومات والشعارات والبرامج هي ملك لسعودي عقار ومحمية بموجب قوانين الملكية الفكرية.',
          ],
        },
        {
          heading: '7. القانون الحاكم',
          body: [
            'تخضع هذه الشروط لقوانين المملكة العربية السعودية، وتختص المحاكم المختصة في الرياض بالنظر في أي نزاعات.',
          ],
        },
      ],
    },
  },
  'foreign-ownership': {
    en: {
      title: 'Foreign Ownership Guide',
      sections: [
        {
          heading: '1. Overview',
          body: [
            'Saudi Arabia has progressively opened its real estate sector to foreign investors as part of Vision 2030. This guide explains the legal framework for non-Saudi nationals wishing to purchase or invest in property within the Kingdom.',
          ],
        },
        {
          heading: '2. Who Can Own Property?',
          body: [
            'The following categories of non-Saudis may own real estate in Saudi Arabia:',
            '• Foreign nationals with a valid Iqama (residency permit)',
            '• Holders of the Saudi Premium Residency card',
            '• Foreign companies with a commercial registration in KSA',
            '• GCC nationals (subject to specific regulations)',
            '• Foreign investors under approved investment licenses from MISA',
          ],
        },
        {
          heading: '3. Restricted Areas',
          body: [
            'Foreign nationals are generally prohibited from owning property in:',
            '• The holy cities of Makkah Al-Mukarramah and Al-Madinah Al-Munawwarah',
            '• Certain border zones and strategic areas designated by the government',
            'Exceptions may apply for specific investment projects approved by relevant authorities.',
          ],
        },
        {
          heading: '4. Saudi Premium Residency Benefits',
          body: [
            'Holders of the Saudi Premium Residency enjoy the broadest property rights, including:',
            '• Ownership of residential property for personal use',
            '• Investment in commercial real estate',
            '• No requirement for a Saudi sponsor or partner',
            '• Ability to transfer ownership and inherit property',
          ],
        },
        {
          heading: '5. Purchase Process',
          body: [
            'The property purchase process for foreigners typically involves:',
            '• Step 1: Obtain the required residency or investment license',
            '• Step 2: Secure Ministry of Interior approval via Absher portal',
            '• Step 3: Conduct due diligence on the property title deed (Sak)',
            '• Step 4: Execute the sale agreement before a licensed notary',
            '• Step 5: Register the property with the Ministry of Justice (Najiz platform)',
          ],
        },
        {
          heading: '6. Financing Options',
          body: [
            'Foreign property buyers may access financing through:',
            '• Saudi banks offering Sharia-compliant mortgage products (Murabaha)',
            '• Developer payment plans for off-plan projects',
            '• International financing arrangements (subject to Saudi banking regulations)',
          ],
        },
        {
          heading: '7. Tax & Fees',
          body: [
            '• Real Estate Transaction Tax (RETT): 5% of the property value, paid by the buyer',
            '• VAT: Applies to first sale of new commercial properties',
            '• Municipality fees and notary charges apply',
            'There is currently no annual property tax in Saudi Arabia.',
          ],
        },
        {
          heading: '8. Contact & Assistance',
          body: [
            'Our REGA-certified brokers can guide you through every step of the process. Contact us at foreign@saudi-re.com or call 920003000 for dedicated foreign investment support.',
          ],
        },
      ],
    },
    ar: {
      title: 'دليل التملك للأجانب',
      sections: [
        {
          heading: '1. نظرة عامة',
          body: [
            'فتحت المملكة العربية السعودية قطاعها العقاري تدريجياً أمام المستثمرين الأجانب في إطار رؤية 2030. يشرح هذا الدليل الإطار القانوني لغير السعوديين الراغبين في شراء العقارات أو الاستثمار فيها داخل المملكة.',
          ],
        },
        {
          heading: '2. من يمكنه التملك؟',
          body: [
            'يمكن للفئات التالية من غير السعوديين تملك العقارات:',
            '• الرعايا الأجانب الحاملون لإقامة سارية المفعول',
            '• حاملو بطاقة الإقامة المميزة السعودية',
            '• الشركات الأجنبية المسجلة تجارياً في المملكة',
            '• مواطنو دول الخليج العربي (وفق أنظمة محددة)',
            '• المستثمرون الأجانب بموجب تراخيص استثمار معتمدة من وزارة الاستثمار',
          ],
        },
        {
          heading: '3. المناطق المقيدة',
          body: [
            'يُحظر عموماً على الأجانب تملك العقارات في:',
            '• مكة المكرمة والمدينة المنورة',
            '• مناطق الحدود والمناطق الاستراتيجية المحددة حكومياً',
          ],
        },
        {
          heading: '4. مزايا الإقامة المميزة',
          body: [
            'يتمتع حاملو الإقامة المميزة بأوسع حقوق التملك، تشمل:',
            '• تملك العقارات السكنية للاستخدام الشخصي',
            '• الاستثمار في العقارات التجارية',
            '• عدم الحاجة إلى كفيل سعودي',
            '• إمكانية نقل الملكية والإرث',
          ],
        },
        {
          heading: '5. إجراءات الشراء',
          body: [
            '• الخطوة 1: الحصول على الإقامة أو ترخيص الاستثمار',
            '• الخطوة 2: الحصول على موافقة وزارة الداخلية عبر أبشر',
            '• الخطوة 3: التحقق من صك الملكية',
            '• الخطوة 4: إبرام عقد البيع أمام كاتب عدل مرخص',
            '• الخطوة 5: تسجيل العقار عبر منصة ناجز',
          ],
        },
        {
          heading: '6. الضرائب والرسوم',
          body: [
            '• ضريبة التصرفات العقارية: 5% من قيمة العقار يدفعها المشتري',
            '• ضريبة القيمة المضافة: تنطبق على البيع الأول للعقارات التجارية الجديدة',
            '• رسوم البلدية وأتعاب كتّاب العدل',
            'لا توجد حالياً ضريبة عقارية سنوية في المملكة العربية السعودية.',
          ],
        },
        {
          heading: '7. التواصل والدعم',
          body: [
            'يمكن لوسطائنا المعتمدين من هيئة العقار إرشادك في كل خطوة. تواصل معنا على foreign@saudi-re.com أو اتصل على 920003000.',
          ],
        },
      ],
    },
  },
};

export default function LegalPage({ params: { locale, slug } }: { params: { locale: string; slug: string } }) {
  const isRTL = locale === 'ar';
  const lang = isRTL ? 'ar' : 'en';
  const content = LEGAL_CONTENT[slug]?.[lang];

  if (!content) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <h1 className="text-3xl font-black text-gray-900">Page Not Found</h1>
        <Link href={`/${locale}`} className="text-primary-600 font-bold hover:underline">Return Home</Link>
      </div>
    );
  }

  return (
    <div className={`bg-white min-h-screen ${isRTL ? 'rtl' : 'ltr'}`}>
      {/* Breadcrumb */}
      <div className="border-b border-gray-100 bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4 flex items-center gap-2 text-xs font-bold text-gray-400">
          <Link href={`/${locale}`} className="hover:text-primary-600 transition-colors uppercase tracking-widest">
            {isRTL ? 'الرئيسية' : 'Home'}
          </Link>
          <ChevronRight className={`w-3 h-3 ${isRTL ? 'rotate-180' : ''}`} />
          <span className="text-gray-700 uppercase tracking-widest">{content.title}</span>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-16 md:py-24">
        {/* Header */}
        <div className="mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-primary-50 rounded-lg text-primary-700 text-xs font-black uppercase tracking-widest mb-6">
            <Shield className="w-3.5 h-3.5" />
            {isRTL ? 'وثيقة رسمية' : 'Official Document'}
          </div>
          <h1 className={`text-4xl md:text-6xl font-black text-gray-900 mb-6 tracking-tight leading-tight ${isRTL ? 'font-arabic' : 'font-serif'}`}>
            {content.title}
          </h1>
          <div className="w-20 h-1.5 bg-primary-600 rounded-full" />
        </div>

        {/* Sections */}
        <div className="space-y-12">
          {content.sections.map((section, i) => (
            <div key={i} className="border-b border-gray-100 pb-12 last:border-0">
              <h2 className={`text-xl md:text-2xl font-black text-gray-900 mb-5 ${isRTL ? 'font-arabic' : 'font-serif'}`}>
                {section.heading}
              </h2>
              <div className="space-y-3">
                {section.body.map((para, j) => (
                  <p
                    key={j}
                    className={`text-gray-600 leading-relaxed text-base md:text-lg ${
                      para.startsWith('•') ? `ps-4 border-s-2 border-primary-200 ${isRTL ? 'font-arabic' : ''}` : ''
                    } ${isRTL ? 'font-arabic' : ''}`}
                  >
                    {para}
                  </p>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Footer CTA */}
        <div className="mt-20 bg-gray-900 rounded-3xl p-10 md:p-14 text-center">
          <h3 className={`text-2xl md:text-3xl font-black text-white mb-4 ${isRTL ? 'font-arabic' : 'font-serif'}`}>
            {isRTL ? 'هل لديك أسئلة؟' : 'Have Questions?'}
          </h3>
          <p className={`text-gray-400 mb-8 font-medium ${isRTL ? 'font-arabic' : ''}`}>
            {isRTL ? 'فريقنا جاهز لمساعدتك في أي استفسار قانوني.' : 'Our team is ready to assist with any legal inquiries.'}
          </p>
          <a
            href="mailto:support@saudi-re.com"
            className={`inline-block px-10 py-4 bg-primary-600 text-white rounded-2xl font-black hover:bg-primary-500 transition-all ${isRTL ? 'font-arabic' : ''}`}
          >
            {isRTL ? 'تواصل معنا' : 'Contact Us'}
          </a>
        </div>
      </div>
    </div>
  );
}
