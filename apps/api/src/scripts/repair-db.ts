import 'dotenv/config';
import { db } from '../db';
import { sql } from 'drizzle-orm';

async function repair() {
  try {
    console.log('Starting manual database repair...');
    
    // Create favorites table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "favorites" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        "user_id" uuid NOT NULL,
        "listing_id" uuid NOT NULL,
        "created_at" timestamp with time zone DEFAULT now()
      );
    `);
    console.log('✓ Favorites table ensured');

    // Create index
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS "user_listing_idx" ON "favorites" ("user_id", "listing_id");
    `);
    console.log('✓ Index ensured');

    console.log('Database repair completed successfully!');
    process.exit(0);
  } catch (err) {
    console.error('Repair failed:', err);
    process.exit(1);
  }
}

repair();
