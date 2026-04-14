/**
 * Saudi Real Estate - Testing Preparation Script
 * 
 * Objectives:
 * 1. Seed Master Firms & Brokers.
 * 2. Seed 6 HIGH-QUALITY Elite Listings with isFeatured: true.
 * 3. Seed 94+ randomized rich listings with full narratives and history.
 */

import 'dotenv/config';
import { db } from '../db';
import { users, brokerProfiles, listings } from '../db/schema';
import { eq, sql } from 'drizzle-orm';
import { PropertyHistoryEvent } from '@saudi-re/shared';

const TARGET_EMAILS = {
  FIRM_OWNER: 'maheshcy09@gmail.com',
  SOLO_BROKER: 'maheshchowdaryraavi04@gmail.com'
};

const CITIES = [
  { en: 'Riyadh', ar: 'الرياض', districts: ['Al Malqa', 'Al Nakheel', 'Hittin', 'Al Yasmin', 'Al Sahafa'] },
  { en: 'Jeddah', ar: 'جدة', districts: ['Ash Shati', 'Al Khalidiyyah', 'Al Hamra', 'Obhur Al-Shamaliyah', 'Al Nahdah'] },
  { en: 'Dammam', ar: 'الدمام', districts: ['Ash Shati Ash Sharqi', 'Al Faisaliyah', 'Al Jalawiyah', 'Al Shati'] }
];

const PHOTOS = [
  'https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=800&q=80',
  'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=800&q=80',
  'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800&q=80',
  'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800&q=80',
  'https://images.unsplash.com/photo-1600047509807-ba8f99d2cdde?w=800&q=80',
  'https://images.unsplash.com/photo-1558036117-15d82a90b9b1?w=800&q=80',
  'https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?w=800&q=80'
];

const NARRATIVE_TEMPLATES = [
  {
    en: "A magnificent {type} located in the prime area of {district}, {city}. This property boasts exceptional craftsmanship, modern architectural lines, and premium internal finishes. The layout offers maximum natural light and a seamless flow between living spaces, making it perfect for both personal residency and investment profile.",
    ar: "تعد هذه الـ {type} الموجودة في حي {district} بمدينة {city} تحفة معمارية متميزة. تتميز بتصميم عصري وخطوط معمارية حديثة مع تشطيبات داخلية فاخرة. يوفر التصميم أقصى قدر من الإضاءة الطبيعية وانسيابية في المساحات، مما يجعلها مثالية للسكن الشخصي أو الاستثمار."
  },
  {
    en: "Experience luxury living in this elegantly designed {type}. Situated in the highly sought-after {district} neighborhood of {city}, this home features state-of-the-art amenities and is within walking distance to high-end shopping and dining. A truly unique opportunity for the discerning buyer.",
    ar: "استمتع بتجربة حياة فاخرة في هذه الـ {type} المصممة بأناقة. تقع في حي {district} المرغوب جداً في مدينة {city}. تتميز بمرافق حديثة وتقع على مسافة قريبة من مراكز التسوق الراقية والمطاعم. هي فرصة فريدة حقاً للمشتري المتميز."
  },
  {
    en: "Modern {type} featuring spacious interiors and high-quality build materials. Located in {city}, {district}. The property is ready for immediate move-in and offers great potential for high rental yield. Close to schools, hospitals, and major transport links.",
    ar: "{type} عصرية تتميز بمساحات داخلية واسعة ومواد بناء عالية الجودة. تقع في مدينة {city}، حي {district}. العقار جاهز للانتقال الفوري ويوفر إمكانات كبيرة لعائد استثماري عالٍ. بالقرب من المدارس والمستشفيات وطرق النقل الرئيسية."
  }
];

const AGENCIES = ['Riyadh Elite Realty', 'Kingdom Property Group', 'Jeddah Coastal Homes', 'Eastern Province Associates', 'Modern Saudi Living'];

function generateHistory(price: number): PropertyHistoryEvent[] {
  const years = [2024, 2025, 2026];
  const events: PropertyHistoryEvent[] = [];

  // Add a listed event
  events.push({
    year: years[0],
    event: 'LISTED',
    price: Math.round(price * 0.95),
    date: `${years[0]}-04-12T09:00:00Z`,
    agencyName: AGENCIES[Math.floor(Math.random() * AGENCIES.length)],
    photosCount: 24,
    floorplansCount: 1,
    thumbnailUrl: PHOTOS[Math.floor(Math.random() * PHOTOS.length)]
  });

  // Add a sale or rent event
  events.push({
    year: years[1],
    event: 'SOLD',
    price: price,
    date: `${years[1]}-08-20T14:30:00Z`,
    agencyName: AGENCIES[Math.floor(Math.random() * AGENCIES.length)],
    photosCount: 32,
    floorplansCount: 2,
    thumbnailUrl: PHOTOS[Math.floor(Math.random() * PHOTOS.length)]
  });

  return events;
}

const ELITE_LISTINGS = [
  {
    type: 'VILLA', purpose: 'SALE',
    city: 'Riyadh', arCity: 'الرياض', district: 'Hittin', arDistrict: 'حطين',
    price: 3500000, areaSqm: 450, bedrooms: 5, bathrooms: 6,
    arTitle: 'فيلا فاخرة في حطين مع مسبح خاص',
    enTitle: 'Luxury Villa in Hittin with Private Pool',
    arDescription: 'فيلا فاخرة في قلب حي حطين بالرياض، تتميز بتصميم عصري وتشطيبات فاخرة. تضم مسبحاً خاصاً وحديقة واسعة ومجلس كبير.',
    enDescription: 'A stunning luxury villa in the heart of Hittin, Riyadh. Features modern design, premium finishes, private pool, spacious garden, and a grand majlis.',
    photos: ['https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=820&q=80', 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=820&q=80'],
    amenities: { pool: true, gym: true, garden: true, parking: true, security: true, mosque_nearby: true },
    history: [
      {
        year: 2026,
        event: 'LISTED',
        price: 3500000,
        date: '2026-03-15T10:00:00Z',
        agencyName: 'Riyadh Elite Realty',
        photosCount: 42,
        floorplansCount: 2,
        thumbnailUrl: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=120&q=80'
      }
    ]
  },
  {
    type: 'APARTMENT', purpose: 'SALE',
    city: 'Jeddah', arCity: 'جدة', district: 'Al Nahdah', arDistrict: 'النهضة',
    price: 830000, areaSqm: 117, bedrooms: 3, bathrooms: 3,
    arTitle: 'شقة سكنية في حي النهضة - شمال جدة',
    enTitle: 'Apartment in North Jeddah, Al Nahdah 3 bedrooms',
    arDescription: 'شقة سكنية جديدة للبيع في حي النهضة، أحد أرقى أحياء جدة.',
    enDescription: 'New residential and investment apartments for sale in Al Nahda district.',
    photos: ['https://images.unsplash.com/photo-1558036117-15d82a90b9b1?w=820&q=80', 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=820&q=80'],
    amenities: { balcony: true, cctv: true, parking: true, security: true, central_ac: true },
    history: [
      {
        year: 2026,
        event: 'SOLD',
        price: 1700000,
        date: '2026-02-02T00:00:00Z',
        agencyName: 'Riley Real Estate',
        photosCount: 31,
        floorplansCount: 1,
        thumbnailUrl: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=120&q=80'
      }
    ]
  },
  {
    type: 'OFFICE', purpose: 'LEASE',
    city: 'Riyadh', arCity: 'الرياض', district: 'KAFD', arDistrict: 'مركز الملك عبدالله المالي',
    price: 200000, areaSqm: 320, bedrooms: 0, bathrooms: 3,
    arTitle: 'مكتب فاخر في مركز الملك عبدالله المالي',
    enTitle: 'Premium Office Space in KAFD Tower',
    arDescription: 'مساحة مكتبية راقية في برج KAFD بالرياض.',
    enDescription: 'Grade-A office space in King Abdullah Financial District.',
    photos: ['https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?w=820&q=80'],
    amenities: { parking: true, security: true, central_ac: true, elevator: true },
    history: generateHistory(200000)
  },
  {
    type: 'VILLA', purpose: 'SALE',
    city: 'Riyadh', arCity: 'الرياض', district: 'Al Malqa', arDistrict: 'الملقا',
    price: 2800000, areaSqm: 380, bedrooms: 4, bathrooms: 5,
    arTitle: 'فيلا عصرية في الملقا',
    enTitle: 'Modern Villa in Al Malqa',
    arDescription: 'فيلا بتصميم حديث في حي الملقا الراقي.',
    enDescription: 'Contemporary villa in upscale Al Malqa district.',
    photos: ['https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=820&q=80'],
    amenities: { garden: true, parking: true, security: true, maid_room: true },
    history: generateHistory(2800000)
  },
  {
    type: 'TOWNHOUSE', purpose: 'SALE',
    city: 'Dammam', arCity: 'الدمام', district: 'Al Shati', arDistrict: 'الشاطئ',
    price: 950000, areaSqm: 240, bedrooms: 3, bathrooms: 4,
    arTitle: 'تاون هاوس في حي الشاطئ',
    enTitle: 'Townhouse in Al Shati, Dammam',
    arDescription: 'تاون هاوس عصري وواسع في الدمام.',
    enDescription: 'Spacious and modern townhouse in Dammam.',
    photos: ['https://images.unsplash.com/photo-1600047509807-ba8f99d2cdde?w=820&q=80'],
    amenities: { garden: true, parking: true, balcony: true },
    history: generateHistory(950000)
  },
  {
    type: 'RESIDENTIAL_LAND', purpose: 'SALE',
    city: 'Riyadh', arCity: 'الرياض', district: 'Al Nakheel', arDistrict: 'النخيل',
    price: 5000000, areaSqm: 800, bedrooms: 0, bathrooms: 0,
    arTitle: 'أرض سكنية في النخيل',
    enTitle: 'Residential Land in Al Nakheel',
    arDescription: 'أرض سكنية مميزة في حي النخيل بالرياض.',
    enDescription: 'Premium residential land in Al Nakheel, Riyadh.',
    photos: ['https://images.unsplash.com/photo-1544986581-efac024faf62?w=820&q=80'],
    amenities: { mosque_nearby: true },
    history: generateHistory(5000000)
  }
];

async function main() {
  console.log('🚀 Seeding Database with Fully Enriched Data...');

  // Wipe Listings
  await db.delete(listings).where(sql`1=1`);

  // Target Accounts
  const firmOwner = await db.query.users.findFirst({ where: eq(users.email, TARGET_EMAILS.FIRM_OWNER) });
  const soloMahesh = await db.query.users.findFirst({ where: eq(users.email, TARGET_EMAILS.SOLO_BROKER) });

  if (!firmOwner || !soloMahesh) {
    console.warn('⚠️ Target accounts not found.');
    return;
  }

  // 1. Seed Elite
  for (const elite of ELITE_LISTINGS) {
    const insertData = {
      ownerId: Math.random() > 0.5 ? soloMahesh.id : firmOwner.id,
      type: elite.type as any,
      purpose: elite.purpose as any,
      status: 'ACTIVE' as any,
      city: elite.city,
      arCity: elite.arCity,
      district: elite.district,
      arDistrict: elite.arDistrict,
      price: elite.price,
      areaSqm: elite.areaSqm.toString(),
      bedrooms: elite.bedrooms,
      bathrooms: elite.bathrooms,
      arTitle: elite.arTitle,
      enTitle: elite.enTitle,
      arDescription: elite.arDescription,
      enDescription: elite.enDescription,
      photos: elite.photos,
      amenities: elite.amenities,
      history: (elite as any).history || [],
      isFeatured: true,
      verified: true,
      regaVerifiedAt: new Date(),
    };
    
    await db.insert(listings).values(insertData);
  }

  // 2. Seed Random Enriched (Fill to 100)
  for (let i = 1; i <= 94; i++) {
    const city = CITIES[i % CITIES.length];
    const district = city.districts[i % city.districts.length];
    const price = Math.floor(Math.random() * 3000000) + 500000;
    const type = i % 3 === 0 ? 'VILLA' : 'APARTMENT';

    // Select a random template and fill it
    const template = NARRATIVE_TEMPLATES[i % NARRATIVE_TEMPLATES.length];
    const enDesc = template.en.replace('{type}', type.toLowerCase()).replace('{district}', district).replace('{city}', city.en);
    const arDesc = template.ar.replace('{type}', type === 'VILLA' ? 'فيلا' : 'شقة').replace('{district}', district).replace('{city}', city.ar);

    const insertData = {
      ownerId: soloMahesh.id,
      type: type as any,
      purpose: 'SALE' as any,
      status: 'ACTIVE' as any,
      city: city.en,
      arCity: city.ar,
      district,
      arDistrict: district, // Simulating same for demo
      price,
      areaSqm: (Math.floor(Math.random() * 200) + 100).toString(),
      bedrooms: Math.floor(Math.random() * 3) + 2,
      bathrooms: Math.floor(Math.random() * 2) + 2,
      arTitle: `${type === 'VILLA' ? 'فيلا' : 'شقة'} فاخرة في حي ${district}`,
      enTitle: `Luxury ${type.charAt(0) + type.slice(1).toLowerCase()} in ${district}`,
      arDescription: arDesc,
      enDescription: enDesc,
      photos: [PHOTOS[i % PHOTOS.length]],
      amenities: { parking: true, security: true, central_ac: true },
      history: generateHistory(price),
      isFeatured: false,
      verified: true
    };

    await db.insert(listings).values(insertData);
  }

  console.log('✅ SEEDING COMPLETE: Every listing is now "fully stuffed" with narratives and history.');
}

main().catch(err => {
  console.error('❌ SEEDING FAILED:', err);
  process.exit(1);
});
