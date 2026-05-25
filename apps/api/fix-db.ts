import 'dotenv/config';
import { db } from './src/db';
import { sql } from 'drizzle-orm';

async function fixDb() {
  console.log('🛠 Fixing Database...');
  
  try {
    // Create system_settings table manually
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "system_settings" (
        "key" varchar(255) PRIMARY KEY NOT NULL,
        "value" text NOT NULL,
        "description" text,
        "updated_at" timestamp with time zone DEFAULT now()
      );
    `);
    console.log('✅ system_settings table ensured');

    // Create legal_pages table manually
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "legal_pages" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        "slug" varchar(100) NOT NULL UNIQUE,
        "title_en" varchar(500) NOT NULL,
        "title_ar" varchar(500) NOT NULL,
        "content_en" text NOT NULL,
        "content_ar" text NOT NULL,
        "updated_at" timestamp with time zone DEFAULT now()
      );
    `);
    console.log('✅ legal_pages table ensured');
    
    // Add missing columns to broker_profiles
    await db.execute(sql`
      ALTER TABLE "broker_profiles" ADD COLUMN IF NOT EXISTS "nationality" varchar(100);
    `);
    await db.execute(sql`
      ALTER TABLE "broker_profiles" ADD COLUMN IF NOT EXISTS "city" varchar(100);
    `);
    await db.execute(sql`
      ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "avatar_url" text;
    `);
    console.log('✅ broker_profiles and users columns ensured');

  } catch (error) {
    console.error('❌ Fix failed:', error);
  } finally {
    process.exit(0);
  }
}

fixDb();
