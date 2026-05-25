import { db } from '../db';
import { sql } from 'drizzle-orm';
import { users, buyerProfiles, leads } from '../db/schema';
import { eq, and } from 'drizzle-orm';

async function addSpecificLead() {
  const EMAIL = 'maheshchowdaryraavi04@gmail.com';
  const LISTING_ID = '00bb83aa-2e9e-47a2-a004-c83982fd5ff7';
  const CORRECT_BROKER_ID = '65b5c0c9-8ed0-445e-80b5-1530849301a5';

  console.log(`--- Adding Lead for ${EMAIL} ---`);

  try {
    // 1. Find User
    let [user] = await db.select().from(users).where(eq(users.email, EMAIL)).limit(1);
    if (!user) {
      console.log('User not found, creating mock user for testing...');
      const [newUser] = await db.insert(users).values({
        email: EMAIL,
        name: 'Mahesh Test',
        role: 'BUYER',
        passwordHash: 'mock-hash'
      }).returning();
      user = newUser;
    }

    // 2. Ensure Buyer Profile
    let [profile] = await db.select().from(buyerProfiles).where(eq(buyerProfiles.userId, user.id)).limit(1);
    if (!profile) {
      console.log('Creating buyer profile...');
      const [newProfile] = await db.insert(buyerProfiles).values({
        userId: user.id,
        sessionId: 'test-reveal',
        lastSeen: new Date()
      }).returning();
      profile = newProfile;
    }

    // 3. Create/Update Lead
    console.log('Synchronizing lead status...');
    await db.delete(leads).where(and(eq(leads.buyerProfileId, profile.id), eq(leads.listingId, LISTING_ID)));
    
    await db.insert(leads).values({
      buyerProfileId: profile.id,
      listingId: LISTING_ID,
      brokerId: CORRECT_BROKER_ID, // FIXED: Now using the actual listing owner ID
      isQualified: true,
      status: 'CONTACTED'
    });

    console.log(`--- SUCCESS: ${EMAIL} is now a QUALIFIED lead for this property ---`);
  } catch (err: any) {
    console.error('FAILED:', err.message);
  }
  process.exit(0);
}

addSpecificLead();
