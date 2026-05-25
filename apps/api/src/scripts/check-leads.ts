import { db } from '../db';
import { leads, buyerProfiles } from '../db/schema';
import { eq } from 'drizzle-orm';

async function checkLeads() {
  const USER_ID = '94bfbbd0-b8f2-4ff2-ad11-95f7eb4c0ea4';
  const result = await db.select().from(leads)
    .innerJoin(buyerProfiles, eq(leads.buyerProfileId, buyerProfiles.id))
    .where(eq(buyerProfiles.userId, USER_ID));
    
  console.log(JSON.stringify(result, null, 2));
  process.exit(0);
}

checkLeads();
