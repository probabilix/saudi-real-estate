import 'dotenv/config';
import { db } from '../db';
import { sql } from 'drizzle-orm';

async function checkEnums() {
  const result = await db.execute(sql`
    SELECT enumlabel 
    FROM pg_enum 
    JOIN pg_type ON pg_enum.enumtypid = pg_type.oid 
    WHERE pg_type.typname = 'listing_type'
  `);
  console.log('Listing Type Enum Values:', result.rows.map(r => r.enumlabel));
}

checkEnums().catch(console.error);
