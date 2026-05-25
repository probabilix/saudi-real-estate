import 'dotenv/config';
import { db } from '../db';
import { faqs } from '../db/schema';

const premiumFaqs = [
  {
    questionEn: 'Who owns the properties listed on this portal?',
    questionAr: 'من يملك العقارات المعروضة في هذه البوابة؟',
    answerEn: 'All listed properties are fully owned, developed, and managed directly by our company. We present an exclusive, curated portfolio of luxury assets, ensuring direct pricing and direct legal handovers.',
    answerAr: 'جميع العقارات المدرجة مملوكة ومطورة ومدارة بالكامل مباشرة من قبل شركتنا. نحن نقدم محفظة حصرية من الأصول الفاخرة، مما يضمن أفضل الأسعار والتعاقد المباشر.',
    order: 1,
  },
  {
    questionEn: 'How does the Noor AI Concierge qualification process work?',
    questionAr: 'كيف تعمل عملية التأهيل مع المساعد الذكي نور؟',
    answerEn: "Our AI Concierge, Noor, helps you explore specs, locations, and pricing. Once Noor qualifies your budget and purchase intent, our direct project sales team's contact details are immediately unlocked on your screen.",
    answerAr: 'يساعدك مساعدنا الذكي "نور" في استكشاف المواصفات، والمواقع، والأسعار. بمجرد قيام نور بتأهيل ميزانيتك وجاهزيتك للشراء، يتم فتح بيانات الاتصال المباشرة بفريق المبيعات الخاص بنا فوراً.',
    order: 2,
  },
  {
    questionEn: 'Are the property prices negotiable?',
    questionAr: 'هل أسعار العقارات قابلة للتفاوض؟',
    answerEn: 'Listed prices represent our direct developer valuations. While they reflect premium build quality, our direct sales team can discuss structured payment solutions, corporate incentives, or bank pre-approvals.',
    answerAr: 'تعكس الأسعار المعروضة التقييم المباشر للمطور. وفي حين أنها تمثل جودة بناء فاخرة، يمكن لفريق المبيعات المباشر لدينا مناقشة حلول سداد مهيكلة، أو حوافز خاصة، أو موافقات تمويلية.',
    order: 3,
  },
  {
    questionEn: 'What documents are required to initiate a purchase?',
    questionAr: 'ما هي المستندات المطلوبة لبدء عملية الشراء؟',
    answerEn: 'For Saudi nationals and residents, a valid National ID/Iqama and bank pre-approval are needed. For international buyers, our legal team manages the official Ministry of Justice registration under the latest premium residency ownership regulations.',
    answerAr: 'بالنسبة للمواطنين والمقيمين، يلزم وجود هوية وطنية/إقامة سارية وموافقة تمويلية. بالنسبة للمشترين الدوليين، يتولى فريقنا القانوني إدارة التسجيل الرسمي بوزارة العدل بموجب أنظمة الإقامة المميزة والتملك العقاري.',
    order: 4,
  },
  {
    questionEn: 'Do you offer direct developer payment plans?',
    questionAr: 'هل تقدمون خطط سداد مباشرة من المطور؟',
    answerEn: 'Yes! We offer flexible, interest-free installment schemes directly from our development office. Post-handover payment plans are available for selected luxury villa portfolios and residential towers.',
    answerAr: 'نعم! نحن نقدم خطط سداد مرنة وأقساطاً ميسرة مباشرة من مكتب المطور وبدون فوائد. تتوفر خطط سداد ممتدة لبعد التسليم على مشاريع مختارة من الفلل والأبراج السكنية الفاخرة.',
    order: 5,
  },
  {
    questionEn: 'Can non-Saudi nationals purchase your properties?',
    questionAr: 'هل يمكن لغير السعوديين شراء عقاراتكم؟',
    answerEn: 'Absolutely. Non-Saudi buyers with a valid residency (Iqama) or holders of the Saudi Premium Residency card are fully eligible to purchase freehold properties in our portfolio. Our legal department manages the entire MoI approval process.',
    answerAr: 'بالتأكيد. يمكن للمشترين غير السعوديين الذين لديهم إقامة سارية أو حاملي بطاقات الإقامة المميزة تملك عقارات حرة بالكامل من محفظتنا. يتولى فريقنا القانوني إدارة عملية الحصول على موافقة وزارة الداخلية بالكامل.',
    order: 6,
  },
  {
    questionEn: 'Are there any hidden fees or brokerage commissions?',
    questionAr: 'هل هناك أي رسوم مخفية أو عمولات وساطة؟',
    answerEn: 'None. Because you are buying directly from the developer, there are zero middleman commissions, broker fees, or listing markups. The only standard transaction fee is the 5% Real Estate Transaction Tax (RETT) required by Saudi regulations.',
    answerAr: 'لا يوجد مطلقاً. لأنك تشتري مباشرة من المطور، لا توجد أي عمولات وساطة، أو رسوم وسطاء، أو زيادات إضافية. الرسوم القياسية الوحيدة هي ضريبة التصرفات العقارية بنسبة 5٪ المطلوبة بموجب الأنظمة السعودية.',
    order: 7,
  },
  {
    questionEn: 'What warranties are provided with the properties?',
    questionAr: 'ما هي الضمانات المقدمة مع العقارات؟',
    answerEn: 'We provide comprehensive structural warranties of up to 10 years, alongside dedicated direct developer guarantees on electrical, plumbing, and mechanical works for the first year post-handover.',
    answerAr: 'نحن نقدم ضمانات إنشائية وهيكلية شاملة تصل إلى 10 سنوات، إلى جانب ضمانات مباشرة من المطور على الأعمال الكهربائية والسباكة والميكانيكية للعام الأول بعد التسليم.',
    order: 8,
  },
];

async function seedFaqs() {
  try {
    console.log('=== SEEDING PREMIUM FAQS INTO DATABASE ===');
    
    // Clear existing FAQs first
    await db.delete(faqs);
    
    // Insert new ones
    for (const faq of premiumFaqs) {
      await db.insert(faqs).values(faq);
    }
    
    console.log('Premium FAQs successfully seeded into Neon PostgreSQL!');
    process.exit(0);
  } catch (err) {
    console.error('Error seeding FAQs:', err);
    process.exit(1);
  }
}

seedFaqs();
