const { neon } = require('@neondatabase/serverless');
const dotenv = require('dotenv');
const path = require('path');
const bcrypt = require('bcryptjs');

dotenv.config({ path: path.join(__dirname, '../.env') });

const sql = neon(process.env.DATABASE_URL);

const PHOTOS = [
  'https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=800&q=80',
  'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=800&q=80',
  'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800&q=80',
  'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800&q=80',
  'https://images.unsplash.com/photo-1600047509807-ba8f99d2cdde?w=800&q=80',
  'https://images.unsplash.com/photo-1558036117-15d82a90b9b1?w=800&q=80',
  'https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?w=800&q=80'
];

const CITIES = [
  { en: 'Riyadh', ar: 'الرياض', districts: ['Al Malqa', 'Al Nakheel', 'Hittin', 'Al Yasmin'] },
  { en: 'Jeddah', ar: 'جدة', districts: ['Ash Shati', 'Al Hamra', 'Al Nahdah'] },
  { en: 'Dammam', ar: 'الدمام', districts: ['Al Shati', 'Al Faisaliyah'] }
];

async function seed() {
  console.log('🚀 Starting Precision Seeding...');

  // 1. Wipe all existing listings, leads, and broker profiles
  await sql`DELETE FROM listings`;
  await sql`DELETE FROM leads`;
  await sql`DELETE FROM broker_profiles`;
  console.log('🧹 Wiped listings, leads, and broker profiles.');

  // 2. Clear previous agents linked to Mahesh Firm to avoid duplicates
  const firmOwnerResult = await sql`SELECT id FROM users WHERE email = 'maheshcy09@gmail.com'`;
  const firmOwnerId = firmOwnerResult[0]?.id;

  if (firmOwnerId) {
    // Grant initial credits to firm owner for testing
    await sql`UPDATE users SET credits_balance = 1000 WHERE id = ${firmOwnerId}`;
    
    // Now safe to delete agents as broker_profiles is wiped
    await sql`DELETE FROM users WHERE firm_id = ${firmOwnerId} OR (role = 'SOLO_BROKER' AND email != 'maheshchowdaryraavi04@gmail.com')`;
    console.log('🧹 Cleared existing agents and random brokers + Granted 1000 credits to Firm Owner.');
  }

  const soloBrokerResult = await sql`SELECT id FROM users WHERE email = 'maheshchowdaryraavi04@gmail.com'`;
  const soloBrokerId = soloBrokerResult[0]?.id;

  if (!firmOwnerId || !soloBrokerId) {
    console.error('❌ Target accounts not found in DB!');
    process.exit(1);
  }

  // Helper for generating listings
  const createListing = async (ownerId, count) => {
    for (let i = 0; i < count; i++) {
      const city = CITIES[i % CITIES.length];
      const district = city.districts[i % city.districts.length];
      const type = i % 2 === 0 ? 'VILLA' : 'APARTMENT';
      const price = Math.floor(Math.random() * 2000000) + 800000;
      
      await sql`
        INSERT INTO listings (
          owner_id, type, purpose, status, 
          city, district, 
          price, area_sqm, bedrooms, bathrooms, 
          en_title, ar_title, en_description, ar_description,
          photos, amenities, is_featured, verified, rega_verified_at
        ) VALUES (
          ${ownerId}, ${type}, 'SALE', 'ACTIVE',
          ${city.en}, ${district},
          ${price}, ${(Math.floor(Math.random() * 200) + 150).toString()}, 
          ${Math.floor(Math.random() * 3) + 3}, ${Math.floor(Math.random() * 2) + 2},
          ${`Beautiful ${type.toLowerCase()} in ${district}, ${city.en}`},
          ${`${type === 'VILLA' ? 'فيلا' : 'شقة'} جميلة في ${district}، ${city.ar}`},
          ${`Experience premium living in this ${type.toLowerCase()}.`},
          ${`استمتع بحياة راقية في هذه الـ ${type === 'VILLA' ? 'فيلا' : 'شقة'}.`},
          ${[PHOTOS[i % PHOTOS.length]]},
          ${JSON.stringify({ parking: true, security: true, central_ac: true })},
          ${Math.random() > 0.8}, true, NOW()
        )
      `;
    }
  };

  const createBrokerProfile = async (userId, name) => {
    await sql`
      INSERT INTO broker_profiles (
        user_id, title_en, title_ar, bio_en, bio_ar, 
        experience_level, service_areas, whatsapp, national_id
      ) VALUES (
        ${userId}, 
        ${`Senior Real Estate Consultant`}, ${`مستشار عقاري أول`},
        ${`Experienced real estate professional specializing in high-end properties.`},
        ${`خبير عقاري متخصص في العقارات الراقية.`},
        '6-10', 
        ${['Riyadh', 'Jeddah']},
        '966500000000',
        ${Math.floor(Math.random() * 9000000000) + 1000000000}
      )
    `;
  };

  // 3. Mahesh Solo Broker -> 10 properties + Profile
  console.log('📦 Seeding Solo Broker properties & profile...');
  await createListing(soloBrokerId, 10);
  await createBrokerProfile(soloBrokerId, 'Mahesh Solo');

  // 4. Mahesh Firm Owner -> 8 Agents, each with 2-5 properties
  console.log('🏢 Seeding Firm Agents and properties...');
  const hashedPassword = await bcrypt.hash('password123', 10);
  
  for (let i = 1; i <= 8; i++) {
    const [agent] = await sql`
      INSERT INTO users (
        name, email, password_hash, role, firm_id, 
        rega_verified, verification_status, is_active, credits_balance
      ) VALUES (
        ${`Agent ${i} (Mahesh Firm)`}, ${`agent${i}_mahesh@test.com`}, ${hashedPassword}, 
        'AGENT', ${firmOwnerId}, true, 'VERIFIED', true, 10
      ) RETURNING id
    `;
    
    const propCount = Math.floor(Math.random() * 4) + 2; // 2 to 5
    await createListing(agent.id, propCount);
    await createBrokerProfile(agent.id, `Agent ${i}`);
  }

  // 5. 12 Independent Random Brokers -> 2-5 properties each
  console.log('👤 Seeding Independent Brokers and properties...');
  for (let i = 1; i <= 12; i++) {
    const [broker] = await sql`
      INSERT INTO users (
        name, email, password_hash, role, 
        rega_verified, verification_status, is_active
      ) VALUES (
        ${`Independent Broker ${i}`}, ${`broker${i}_random@test.com`}, ${hashedPassword}, 
        'SOLO_BROKER', true, 'VERIFIED', true
      ) RETURNING id
    `;
    
    const propCount = Math.floor(Math.random() * 4) + 2;
    await createListing(broker.id, propCount);
    await createBrokerProfile(broker.id, `Indep Broker ${i}`);
  }

  console.log('✅ PRECISION SEEDING COMPLETE!');
  process.exit(0);
}

seed().catch(err => {
  console.error('❌ SEEDING FAILED:', err);
  process.exit(1);
});
