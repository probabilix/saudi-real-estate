import 'dotenv/config';
import { db } from '../db';
import { legalPages } from '../db/schema';
import { sql } from 'drizzle-orm';

async function seedLegal() {
  console.log('🌱 Seeding Legal Pages...');

  // 1. Ensure table exists (Fallback for drizzle-kit)
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "legal_pages" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      "slug" varchar(100) NOT NULL UNIQUE,
      "title_en" varchar(500) NOT NULL,
      "title_ar" varchar(500) NOT NULL,
      "content_en" text NOT NULL,
      "content_ar" text NOT NULL,
      "updated_at" timestamp with time zone DEFAULT now()
    );
  `);

  const pages = [
    {
      slug: 'privacy',
      titleEn: 'Privacy Policy',
      titleAr: 'سياسة الخصوصية',
      contentEn: `## 1. Introduction
Welcome to Saudi Real Estate. We are committed to protecting your personal information and your right to privacy. If you have any questions or concerns about our policy, or our practices with regards to your personal information, please contact us at support@saudi-re.com.

## 2. Information We Collect
We collect personal information that you voluntarily provide to us when registering on the platform, expressing an interest in obtaining information about us or our products and services, or otherwise contacting us.

The personal information we collect depends on the context of your interactions with us and the platform, the choices you make, and the products and features you use. The personal information we collect can include the following:
- Name and Contact Data
- Credentials
- Payment Data (processed via secure third-party providers)

## 3. How We Use Your Information
We use personal information collected via our platform for a variety of business purposes described below:
- To facilitate account creation and logon process.
- To send you marketing and promotional communications.
- To fulfill and manage your orders.
- To post testimonials with your consent.

## 4. Sharing Your Information
We only share information with your consent, to comply with laws, to provide you with services, to protect your rights, or to fulfill business obligations.

## 5. Data Security
We have implemented appropriate technical and organizational security measures designed to protect the security of any personal information we process. However, please also remember that we cannot guarantee that the internet itself is 100% secure.`,
      contentAr: `## 1. مقدمة
مرحباً بكم في سعودي عقار. نحن ملتزمون بحماية معلوماتكم الشخصية وحقكم في الخصوصية. إذا كان لديكم أي أسئلة أو استفسارات حول سياستنا، أو ممارساتنا فيما يتعلق بمعلوماتكم الشخصية، يرجى الاتصال بنا على support@saudi-re.com.

## 2. المعلومات التي نجمعها
نحن نجمع المعلومات الشخصية التي تقدمها لنا طواعية عند التسجيل في المنصة، أو التعبير عن اهتمامك بالحصول على معلومات عنا أو عن منتجاتنا وخدماتنا، أو عند الاتصال بنا بأي طريقة أخرى.

تعتمد المعلومات الشخصية التي نجمعها على سياق تفاعلاتك معنا ومع المنصة، والخيارات التي تتخذها، والمنتجات والميزات التي تستخدمها. يمكن أن تشمل المعلومات الشخصية التي نجمعها ما يلي:
- الاسم وبيانات الاتصال
- أوراق الاعتماد
- بيانات الدفع (تتم معالجتها عبر مزودي خدمة طرف ثالث آمنين)

## 3. كيف نستخدم معلوماتك
نستخدم المعلومات الشخصية التي نجمعها عبر منصتنا لأغراض تجارية متنوعة موصوفة أدناه:
- لتسهيل إنشاء الحساب وعملية تسجيل الدخول.
- لإرسال اتصالات تسويقية وترويجية إليك.
- لتنفيذ وإدارة طلباتك.
- لنشر الشهادات بموافقتك.

## 4. مشاركة معلوماتك
نحن نشارك المعلومات فقط بموافقتك، أو للامتثال للقوانين، أو لتزويدك بالخدمات، أو لحماية حقوقك، أو للوفاء بالالتزامات التجارية.

## 5. أمن البيانات
لقد قمنا بتنفيذ تدابير أمنية تقنية وتنظيمية مناسبة مصممة لحماية أمن أي معلومات شخصية نعالجها. ومع ذلك، يرجى تذكر أيضاً أننا لا نستطيع ضمان أن الإنترنت نفسه آمن بنسبة 100٪.`,
    },
    {
      slug: 'terms',
      titleEn: 'Terms of Service',
      titleAr: 'شروط الخدمة',
      contentEn: `## 1. Agreement to Terms
These Terms of Service constitute a legally binding agreement made between you, whether personally or on behalf of an entity and Saudi Real Estate, concerning your access to and use of the saudi-re.com website as well as any other media form, media channel, mobile website or mobile application related, linked, or otherwise connected thereto.

## 2. Intellectual Property Rights
Unless otherwise indicated, the Site is our proprietary property and all source code, databases, functionality, software, website designs, audio, video, text, photographs, and graphics on the Site and the trademarks, service marks, and logos contained therein are owned or controlled by us or licensed to us.

## 3. User Representations
By using the Site, you represent and warrant that:
- All registration information you submit will be true, accurate, current, and complete.
- You will maintain the accuracy of such information and promptly update such registration information as necessary.
- You have the legal capacity and you agree to comply with these Terms of Service.
- You are not a minor in the jurisdiction in which you reside.

## 4. Prohibited Activities
You may not access or use the Site for any purpose other than that for which we make the Site available. The Site may not be used in connection with any commercial endeavors except those that are specifically endorsed or approved by us.

## 5. Governing Law
These Terms of Service and your use of the Site are governed by and construed in accordance with the laws of the Kingdom of Saudi Arabia applicable to agreements made and to be entirely performed within the Kingdom.`,
      contentAr: `## 1. الموافقة على الشروط
تشكل شروط الخدمة هذه اتفاقية ملزمة قانوناً مبرمة بينك، سواء شخصياً أو بالنيابة عن كيان، وبين سعودي عقار، فيما يتعلق بوصولك إلى واستخدامك لموقع saudi-re.com بالإضافة إلى أي نموذج وسائط آخر أو قناة وسائط أو موقع ويب للجوال أو تطبيق جوال ذي صلة أو مرتبط أو متصل به بأي طريقة أخرى.

## 2. حقوق الملكية الفكرية
ما لم ينص على خلاف ذلك، فإن الموقع هو ملكية خاصة بنا وجميع أكواد المصدر وقواعد البيانات والوظائف والبرامج وتصاميم المواقع والصوت والفيديو والنصوص والصور والرسومات الموجودة على الموقع والعلامات التجارية وعلامات الخدمة والشعارات الواردة فيه مملوكة لنا أو خاضعة لسيطرتنا أو مرخصة لنا.

## 3. إقرارات المستخدم
باستخدام الموقع، فإنك تقر وتضمن ما يلي:
- أن جميع معلومات التسجيل التي تقدمها ستكون صحيحة ودقيقة وحديثة وكاملة.
- أنك ستحافظ على دقة هذه المعلومات وتحديث معلومات التسجيل هذه على الفور حسب الضرورة.
- أن لديك الأهلية القانونية وتوافق على الالتزام بشروط الخدمة هذه.
- أنك لست قاصراً في الولاية القضائية التي تقيم فيها.

## 4. الأنشطة المحظورة
لا يجوز لك الوصول إلى الموقع أو استخدامه لأي غرض آخر غير الغرض الذي نوفر الموقع من أجله. لا يجوز استخدام الموقع فيما يتعلق بأي مساعٍ تجارية باستثناء تلك التي تم إقرارها أو الموافقة عليها بشكل خاص من قبلنا.

## 5. القانون الحاكم
تخضع شروط الخدمة هذه واستخدامك للموقع وتفسر وفقاً لقوانين المملكة العربية السعودية السارية على الاتفاقيات المبرمة والتي سيتم تنفيذها بالكامل داخل المملكة.`,
    },
    {
      slug: 'foreign-ownership',
      titleEn: 'Foreign Ownership Guide',
      titleAr: 'دليل التملك للأجانب',
      contentEn: `## 1. Overview
The Kingdom of Saudi Arabia has introduced progressive regulations to encourage foreign investment in the real estate sector. This guide outlines the essential rules for non-Saudi nationals looking to purchase property in the Kingdom.

## 2. General Rules
Non-Saudis are permitted to own real estate for their private residence with the approval of the Ministry of Interior. However, ownership is generally restricted in the holy cities of Makkah and Madinah, except through inheritance or specific investment structures.

## 3. Commercial Investment
Foreign entities and non-Saudi investors registered for commercial activities can own real estate necessary for their professional operations or housing for their employees, subject to regulations from the Ministry of Investment (MISA).

## 4. Premium Residency
Holders of the Saudi Premium Residency (Special Talent, Gifted, Investor, Entrepreneur, or Real Estate Owner) enjoy enhanced rights regarding property ownership, including the ability to own residential property in various regions.

## 5. Legal Process
The purchase process involves:
- Obtaining a valid residency (Iqama) or Premium Residency.
- Securing necessary approvals via the Absher or Ministry of Interior portals.
- Registering the property through a licensed notary or the Ministry of Justice (Najiz).`,
      contentAr: `## 1. نظرة عامة
أدخلت المملكة العربية السعودية لوائح تقدمية لتشجيع الاستثمار الأجنبي في القطاع العقاري. يوضح هذا الدليل القواعد الأساسية للمواطنين غير السعوديين الراغبين في شراء العقارات في المملكة.

## 2. القواعد العامة
يُسمح لغير السعوديين بتملك العقارات لسكنهم الخاص بموافقة وزارة الداخلية. ومع ذلك، يُحظر التملك عموماً في المدن المقدسة (مكة المكرمة والمدينة المنورة)، إلا عن طريق الميراث أو هياكل استثمارية محددة.

## 3. الاستثمار التجاري
يمكن للكيانات الأجنبية والمستثمرين غير السعوديين المسجلين للأنشطة التجارية تملك العقارات اللازمة لعملياتهم المهنية أو لإسكان موظفيهم، ويخضع ذلك للوائح وزارة الاستثمار (MISA).

## 4. الإقامة المميزة
يتمتع حاملو الإقامة المميزة السعودية (كفاءة استثنائية، موهبة، مستثمر، رائد أعمال، أو مالك عقار) بحقوق معززة فيما يتعلق بتملك العقارات، بما في ذلك القدرة على تملك العقارات السكنية في مناطق مختلفة.

## 5. العملية القانونية
تتضمن عملية الشراء ما يلي:
- الحصول على إقامة سارية المفعول أو إقامة مميزة.
- الحصول على الموافقات اللازمة عبر منصة أبشر أو بوابات وزارة الداخلية.
- تسجيل العقار من خلال كاتب عدل مرخص أو وزارة العدل (ناجز).`,
    }
  ];

  for (const page of pages) {
    await db.insert(legalPages).values(page as any).onConflictDoUpdate({
      target: legalPages.slug,
      set: {
        titleEn: page.titleEn,
        titleAr: page.titleAr,
        contentEn: page.contentEn,
        contentAr: page.contentAr,
        updatedAt: new Date()
      }
    });
  }

  console.log('✅ Legal Pages Seeded Successfully!');
}

seedLegal().catch(console.error);
