import 'dotenv/config';
import { db } from '../db';
import { sql } from 'drizzle-orm';
import { users, buyerProfiles, leads, listings } from '../db/schema';
import { eq, and } from 'drizzle-orm';

async function masterSync() {
  console.log('--- STARTING MASTER DATABASE SYNC ---');

  try {
    // 1. Force add the column
    console.log('1. Checking leads table columns...');
    await db.execute(sql`ALTER TABLE leads ADD COLUMN IF NOT EXISTS is_qualified BOOLEAN DEFAULT false;`);
    
    // 2. Verify columns
    const cols = await db.execute(sql`SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'leads' ORDER BY column_name;`);
    console.log('Current Leads Columns:', cols.rows.map((c: any) => c.column_name).join(', '));

    // 3. Ensure EVERY user has a buyer profile
    console.log('2. Synchronizing buyer profiles for all users...');
    const allUsers = await db.select().from(users);
    for (const user of allUsers) {
      const [existing] = await db.select().from(buyerProfiles).where(eq(buyerProfiles.userId, user.id)).limit(1);
      if (!existing) {
        console.log(`Creating profile for ${user.name || user.email}...`);
        await db.insert(buyerProfiles).values({
          userId: user.id,
          sessionId: user.id,
          lastSeen: new Date()
        });
      }
    }

    // Clean up any existing auto-sync session IDs to isolate sessions
    console.log('Migrating existing auto-sync session IDs to unique IDs...');
    await db.execute(sql`
      UPDATE buyer_profiles
      SET session_id = COALESCE(user_id::varchar, id::varchar)
      WHERE session_id = 'auto-sync';
    `);

    // 4. Force Qualify Nabeel
    console.log('3. Force qualifying Nabeel (probabilix.ai@gmail.com)...');
    const EMAIL = 'probabilix.ai@gmail.com';
    const LISTING_ID = '00bb83aa-2e9e-47a2-a004-c83982fd5ff7';
    
    const [nabeel] = await db.select().from(users).where(eq(users.email, EMAIL)).limit(1);
    if (nabeel) {
      const [profile] = await db.select().from(buyerProfiles).where(eq(buyerProfiles.userId, nabeel.id)).limit(1);
      if (profile) {
        // Delete any non-qualified lead first to avoid duplicates
        await db.delete(leads).where(and(eq(leads.buyerProfileId, profile.id), eq(leads.listingId, LISTING_ID)));
        
        // Insert fresh qualified lead
        await db.insert(leads).values({
          buyerProfileId: profile.id,
          listingId: LISTING_ID,
          brokerId: nabeel.id, // Assuming he is the broker for this test or just any ID
          isQualified: true,
          status: 'CONTACTED'
        });
        console.log('Nabeel is now officially QUALIFIED in the leads table.');
      }
    }

    console.log('--- MASTER SYNC COMPLETE: REFRESH YOUR NEON AND WEBSITE NOW ---');
  } catch (err: any) {
    console.error('CRITICAL SYNC ERROR:', err.message);
  }
  process.exit(0);
}

masterSync();
