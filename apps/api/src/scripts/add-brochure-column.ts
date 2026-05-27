import 'dotenv/config';
import { db } from '../db';
import { sql } from 'drizzle-orm';

async function addBrochureColumn() {
  console.log('--- Adding brochure_url column to listings table ---');
  try {
    await db.execute(sql`ALTER TABLE listings ADD COLUMN IF NOT EXISTS brochure_url TEXT;`);
    console.log('--- SUCCESS: Column brochure_url added! ---');
  } catch (err: any) {
    console.error('Error adding column brochure_url:', err.message);
  }
  process.exit(0);
}

addBrochureColumn();
