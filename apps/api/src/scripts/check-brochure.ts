import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.join(__dirname, '../../.env') });

import { db } from '../db';
import { listings } from '../db/schema';
import { eq } from 'drizzle-orm';

async function checkBrochure() {
  try {
    const result = await db.select().from(listings).where(eq(listings.id, 'ab39caca-855d-4b13-878d-97ba2587071a'));
    console.log('Result:', JSON.stringify(result, null, 2));
    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

checkBrochure();
