import { db } from '../db';
import { sql } from 'drizzle-orm';

async function checkOwner() {
  const LISTING_ID = '00bb83aa-2e9e-47a2-a004-c83982fd5ff7';
  const CORRECT_BROKER_ID = '65b5c0c9-8ed0-445e-80b5-1530849301a5';

  // 1. Get listing owner details
  const listing = await db.execute(sql`
    SELECT l.id, l.owner_id, u.name, u.email, u.phone
    FROM listings l
    JOIN users u ON u.id = l.owner_id
    WHERE l.id = ${LISTING_ID}
  `);
  console.log('Listing Owner:', JSON.stringify(listing.rows[0], null, 2));

  // 2. Fix broker_id in the leads table (should be listing owner, not Nabeel)
  await db.execute(sql`
    UPDATE leads 
    SET broker_id = ${CORRECT_BROKER_ID}
    WHERE listing_id = ${LISTING_ID}
  `);
  console.log('Fixed broker_id in leads table to:', CORRECT_BROKER_ID);

  process.exit(0);
}

checkOwner();
