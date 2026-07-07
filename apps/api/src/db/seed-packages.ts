import { db } from './index';
import { creditPackages } from './schema';
import { eq } from 'drizzle-orm';

const PACKAGES = [
  {
    key: 'starter',
    nameEn: 'Starter Package',
    nameAr: 'باقة المبتدئين',
    credits: 1000,
    priceSar: 799,
    isPopular: false,
    isActive: true,
    sortOrder: 0,
    descriptionEn: 'Ideal for independent agents testing out properties',
    descriptionAr: 'مثالية للوكلاء المستقلين لتجربة تسويق العقارات',
  },
  {
    key: 'advanced',
    nameEn: 'Advanced Package',
    nameAr: 'الباقة المتقدمة',
    credits: 2500,
    priceSar: 1499,
    isPopular: true,
    isActive: true,
    sortOrder: 1,
    descriptionEn: 'Best value for active local brokers',
    descriptionAr: 'أفضل قيمة للوسطاء المحليين النشطين',
  },
  {
    key: 'professional',
    nameEn: 'Professional Package',
    nameAr: 'الباقة الاحترافية',
    credits: 5000,
    priceSar: 2999,
    isPopular: false,
    isActive: true,
    sortOrder: 2,
    descriptionEn: 'Optimized for growing brokerage agencies',
    descriptionAr: 'محسنة لوكالات الوساطة المتنامية',
  },
  {
    key: 'elite',
    nameEn: 'Elite Package',
    nameAr: 'باقة النخبة',
    credits: 10000,
    priceSar: 4999,
    isPopular: false,
    isActive: true,
    sortOrder: 3,
    descriptionEn: 'Maximum discount for listing agencies & firms',
    descriptionAr: 'أقصى خصم لوكالات وقنوات تسويق العقارات',
  },
];

async function seed() {
  console.log('Seeding credit packages...');
  for (const pkg of PACKAGES) {
    // Check if key exists
    const [exists] = await db.select({ id: creditPackages.id })
      .from(creditPackages)
      .where(eq(creditPackages.key, pkg.key))
      .limit(1);

    if (exists) {
      console.log(`Package key '${pkg.key}' already exists, updating values...`);
      await db.update(creditPackages)
        .set({
          nameEn: pkg.nameEn,
          nameAr: pkg.nameAr,
          credits: pkg.credits,
          priceSar: pkg.priceSar,
          isPopular: pkg.isPopular,
          isActive: pkg.isActive,
          sortOrder: pkg.sortOrder,
          descriptionEn: pkg.descriptionEn,
          descriptionAr: pkg.descriptionAr,
          updatedAt: new Date(),
        })
        .where(eq(creditPackages.id, exists.id));
    } else {
      console.log(`Creating package '${pkg.key}'...`);
      await db.insert(creditPackages).values(pkg);
    }
  }
  console.log('Credit packages seeding completed successfully.');
  process.exit(0);
}

seed().catch(err => {
  console.error('Seeding failed:', err);
  process.exit(1);
});
