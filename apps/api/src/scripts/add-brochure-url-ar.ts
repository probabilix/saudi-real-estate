import 'dotenv/config';
import { db } from '../db';
import { sql } from 'drizzle-orm';

async function addBrochureUrlArColumn() {
  console.log('--- Adding brochure_url_ar column to projects and listings tables ---');
  try {
    await db.execute(sql`ALTER TABLE projects ADD COLUMN IF NOT EXISTS brochure_url_ar TEXT;`);
    console.log('--- SUCCESS: Column brochure_url_ar added to projects! ---');
    
    await db.execute(sql`ALTER TABLE listings ADD COLUMN IF NOT EXISTS brochure_url_ar TEXT;`);
    console.log('--- SUCCESS: Column brochure_url_ar added to listings! ---');
  } catch (err: any) {
    console.error('Error adding column brochure_url_ar:', err.message);
  }
  process.exit(0);
}

addBrochureUrlArColumn();
