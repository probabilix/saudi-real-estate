import 'dotenv/config';
import { db } from '../db';
import { sql } from 'drizzle-orm';

async function migrate() {
  console.log('--- Running Map View & Coordinates Migration ---');
  try {
    console.log('1. Adding lat to projects table...');
    await db.execute(sql`ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "lat" DECIMAL(10, 7);`);

    console.log('2. Adding lng to projects table...');
    await db.execute(sql`ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "lng" DECIMAL(10, 7);`);

    console.log('3. Creating lat/lng index on listings table...');
    await db.execute(sql`CREATE INDEX IF NOT EXISTS "listings_lat_lng_idx" ON "listings" ("lat", "lng") WHERE "lat" IS NOT NULL AND "lng" IS NOT NULL;`);

    console.log('4. Creating lat/lng index on projects table...');
    await db.execute(sql`CREATE INDEX IF NOT EXISTS "projects_lat_lng_idx" ON "projects" ("lat", "lng") WHERE "lat" IS NOT NULL AND "lng" IS NOT NULL;`);

    console.log('--- SUCCESS: Migration complete! ---');
  } catch (err: any) {
    console.error('Migration failed:', err.message);
  }
  process.exit(0);
}

migrate();
