import 'dotenv/config';
import { db } from '../db';
import { listings, users, brokerProfiles } from '../db/schema';
import { sql, eq } from 'drizzle-orm';

async function seedPremiumData() {
  console.log('💎 Seeding Rich Premium Property Data...');

  try {
    // 1. Get all listings to update
    const allListings = await db.select().from(listings);
    
    for (const l of allListings) {
      console.log(`✨ Updating Listing: ${l.enTitle || l.arTitle} (ID: ${l.id})`);

      // 2. High-Fidelity Photo Gallery (Unsplash Real Estate)
      const premiumPhotos = [
        'https://images.unsplash.com/photo-1613490493576-7fde63acd811?auto=format&fit=crop&w=1200&q=80',
        'https://images.unsplash.com/photo-1613977257363-707ba9348227?auto=format&fit=crop&w=1200&q=80',
        'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1200&q=80',
        'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80',
        'https://images.unsplash.com/photo-1600607687940-47a6d2524ec3?auto=format&fit=crop&w=1200&q=80',
        'https://images.unsplash.com/photo-1600566753190-17f0bb2a6c3e?auto=format&fit=crop&w=1200&q=80',
        'https://images.unsplash.com/photo-1600047509807-ba8f99d2cdde?auto=format&fit=crop&w=1200&q=80',
        'https://images.unsplash.com/photo-1600585154542-6379b1d3f66d?auto=format&fit=crop&w=1200&q=80',
        'https://images.unsplash.com/photo-1600566752355-35792bed65ee?auto=format&fit=crop&w=1200&q=80',
        'https://images.unsplash.com/photo-1512918766775-d22748b835e5?auto=format&fit=crop&w=1200&q=80',
      ];

      // 3. Robust Amenities Object
      const richAmenities = {
        parking: true,
        security: true,
        central_ac: true,
        swimming_pool: true,
        gym: true,
        maid_room: true,
        driver_room: true,
        balcony: true,
        private_garden: true,
        smart_home: true,
        built_in_wardrobes: true,
        kitchen_appliances: true,
        study_room: true,
        walk_in_closet: true,
        elevator: true,
        pets_allowed: true,
        concierge: true,
        view_of_landmark: true,
        barbecue_area: true,
        waste_disposal: true
      };

      // 4. Compliance Data (REGA Standards)
      const complianceData = {
        regaFalLicense: '1200001234',
        regaAdvertisingLicense: '7200005678',
        regaLicenseIssueDate: new Date('2024-01-15').toISOString(),
        regaLicenseExpiryDate: new Date('2025-01-15').toISOString(),
      };

      // 5. Ownership Legacy (History)
      const mockHistory = [
        {
          year: 2022,
          price: (l.price || 2000000) * 0.85,
          date: '2022-06-12',
          agencyName: 'Saudi Properties Real Estate',
          thumbnailUrl: premiumPhotos[4]
        },
        {
          year: 2018,
          price: (l.price || 2000000) * 0.65,
          date: '2018-11-20',
          agencyName: 'Kingdom Realty',
          thumbnailUrl: premiumPhotos[7]
        }
      ];

      // 6. Detailed Narrative
      const enNarrative = `Experience the pinnacle of luxury living in this architectural masterpiece. Located in the highly sought-after ${l.district} neighborhood of ${l.city}, this property offers a seamless blend of contemporary design and timeless elegance. The spacious open-concept living area is bathed in natural light, featuring floor-to-ceiling windows that offer breathtaking views. The gourmet chef's kitchen is equipped with state-of-the-art appliances and premium finishes. Each bedroom is a private sanctuary, complete with en-suite bathrooms and ample closet space. Step outside to yours private oasis, featuring a meticulously landscaped garden and a stunning swimming pool, perfect for entertaining or quiet relaxation. High-speed internet, smart home automation, and 24/7 security ensure peace of mind and ultra-modern convenience. This is more than just a home—it is a lifestyle statement for the uncompromising.`;
      
      const arNarrative = `استمتع بقمة المعيشة الفاخرة في هذه التحفة المعمارية. يقع هذا العقار في حي ${l.district} المرغوب للغاية في ${l.city}، ويوفر مزيجًا سلسًا من التصميم المعاصر والأناقة الخالدة. تغمر منطقة المعيشة الواسعة ذات المفهوم المفتوح بالضوء الطبيعي، وتتميز بنوافذ ممتدة من الأرض حتى السقف توفر إطلالات خلابة. تم تجهيز مطبخ الشيف الذواق بأحدث الأجهزة والتشطيبات المتميزة. كل غرفة نوم هي ملاذ خاص، كاملة مع حمامات داخلية ومساحة واسعة للخزائن. اخرج إلى واحتك الخاصة، التي تتميز بحديقة ذات مناظر طبيعية دقيقة وحمام سباحة مذهل، مثالي للترفيه أو الاسترخاء الهادئ. تضمن الإنترنت عالي السرعة، وأتمتة المنزل الذكي، والأمن على مدار الساعة طوال أيام الأسبوع راحة البال والراحة الحديثة للغاية. هذا أكثر من مجرد منزل - إنه بيان نمط حياة لمن لا يقبل المساومة.`;

      // 7. Update Database
      await db.update(listings)
        .set({
          photos: premiumPhotos,
          amenities: richAmenities,
          enDescription: enNarrative,
          arDescription: arNarrative,
          history: mockHistory,
          ...complianceData,
          youtubeUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', // Mock virtual tour
          shortId: l.shortId || `SRE-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
          truCheckVerified: true
        })
        .where(eq(listings.id, l.id));
    }

    console.log('✅ Seeding Complete. All test listings are now rich with data.');
    process.exit(0);
  } catch (err) {
    console.error('❌ Seeding Failed:', err);
    process.exit(1);
  }
}

seedPremiumData();
