import { db } from '../db';
import { sql } from 'drizzle-orm';

async function fixEnum() {
  console.log('Adding REMOVED to listing_status enum...');
  try {
    // Note: Drizzle's db.execute is used for raw SQL
    await db.execute(sql`ALTER TYPE listing_status ADD VALUE 'REMOVED'`);
    console.log('Successfully added REMOVED value.');
  } catch (err: any) {
    if (err.message.includes('already exists')) {
      console.log('Value REMOVED already exists in enum.');
    } else {
      console.error('Error adding value:', err.message);
    }
  }
}

fixEnum().then(() => process.exit(0));
