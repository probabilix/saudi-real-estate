import { db } from '../apps/api/src/db';
import { users, buyerProfiles, leads, listings } from '../apps/api/src/db/schema';
import { eq, and } from 'drizzle-orm';

async function forceQualify() {
  const EMAIL = 'probabilix.ai@gmail.com';
  const LISTING_ID = '00bb83aa-2e9e-47a2-a004-c83982fd5ff7';

  console.log(`--- Starting Force Qualification for ${EMAIL} ---`);

  // 1. Get User
  const [user] = await db.select().from(users).where(eq(users.email, EMAIL)).limit(1);
  if (!user) {
    console.error(`User ${EMAIL} not found!`);
    return;
  }
  console.log(`Found User ID: ${user.id}`);

  // 2. Get/Create Buyer Profile
  let [profile] = await db.select().from(buyerProfiles).where(eq(buyerProfiles.userId, user.id)).limit(1);
  if (!profile) {
    console.log('Creating missing buyer profile...');
    const newProfile = await db.insert(buyerProfiles).values({
      userId: user.id,
      sessionId: 'test-session',
      lastSeen: new Date()
    }).returning();
    profile = newProfile[0];
  }
  console.log(`Buyer Profile ID: ${profile.id}`);

  // 3. Get Listing
  const [listing] = await db.select().from(listings).where(eq(listings.id, LISTING_ID)).limit(1);
  if (!listing) {
    console.error(`Listing ${LISTING_ID} not found!`);
    return;
  }
  console.log(`Found Listing: ${listing.enTitle || listing.arTitle}`);

  // 4. Create/Update Qualified Lead
  const [existingLead] = await db.select().from(leads).where(
    and(
      eq(leads.buyerProfileId, profile.id),
      eq(leads.listingId, listing.id)
    )
  ).limit(1);

  if (existingLead) {
    console.log('Updating existing lead to QUALIFIED status...');
    await db.update(leads)
      .set({ isQualified: true, status: 'CONTACTED' })
      .where(eq(leads.id, existingLead.id));
  } else {
    console.log('Creating NEW qualified lead...');
    await db.insert(leads).values({
      buyerProfileId: profile.id,
      listingId: listing.id,
      brokerId: listing.ownerId,
      isQualified: true,
      status: 'CONTACTED'
    });
  }

  console.log('--- SUCCESS: Lead Qualified! ---');
  process.exit(0);
}

forceQualify().catch(err => {
  console.error(err);
  process.exit(1);
});
