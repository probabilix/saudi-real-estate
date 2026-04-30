import { db } from './src/db';
import { systemSettings } from './src/db/schema';
import { eq } from 'drizzle-orm';

async function seedSettings() {
  console.log('🌱 Seeding System Settings...');
  
  try {
    // 1. Listing Cost
    await db.insert(systemSettings).values({
      key: 'listing_cost_credits',
      value: '10',
      description: 'The number of credits deducted when a user publishes a new listing.'
    }).onConflictDoUpdate({
      target: systemSettings.key,
      set: { value: '10' }
    });

    console.log('✅ Successfully seeded listing_cost_credits = 10');
  } catch (error) {
    console.error('❌ Seeding failed:', error);
  } finally {
    process.exit(0);
  }
}

seedSettings();
