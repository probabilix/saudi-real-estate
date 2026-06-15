import 'dotenv/config';
import { db } from '../db';
import { sql } from 'drizzle-orm';

async function migrate() {
  console.log('🚀 Running manual inventory schema migration...');
  try {
    // 1. Alter lead_status enum values
    const values = [
      'ATTEMPTED_CONTACT',
      'AGENT_CONTACTED',
      'SITE_VISIT_SCHEDULED',
      'PROPERTY_VIEWING',
      'OFFER_SUBMITTED',
      'AI_DISQUALIFIED'
    ];
    for (const val of values) {
      try {
        await db.execute(sql`ALTER TYPE "lead_status" ADD VALUE '${sql.raw(val)}';`);
        console.log(`✅ Added ${val} to lead_status enum`);
      } catch (err: any) {
        if (err.code === '42710') { // duplicate_object
          console.log(`ℹ️ ${val} already exists in lead_status enum`);
        } else {
          console.error(`❌ Error adding ${val}:`, err.message);
        }
      }
    }

    // 2. Create projects table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "projects" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        "name_en" varchar(255) NOT NULL,
        "name_ar" varchar(255) NOT NULL,
        "description_en" text,
        "description_ar" text,
        "city" varchar(100) NOT NULL,
        "district" varchar(100),
        "map_embed_url" text,
        "created_at" timestamp with time zone DEFAULT now(),
        "updated_at" timestamp with time zone DEFAULT now()
      );
    `);
    console.log('✅ projects table created/verified');

    // 3. Create project_units table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "project_units" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        "project_id" uuid NOT NULL,
        "listing_id" uuid,
        "unit_number" varchar(50) NOT NULL,
        "floor" smallint NOT NULL,
        "type" varchar(50) NOT NULL,
        "status" varchar(50) DEFAULT 'AVAILABLE' NOT NULL,
        "price" bigint,
        "created_at" timestamp with time zone DEFAULT now(),
        "updated_at" timestamp with time zone DEFAULT now()
      );
    `);
    console.log('✅ project_units table created/verified');

    // 4. Add project_id column to listings table
    await db.execute(sql`
      ALTER TABLE "listings" ADD COLUMN IF NOT EXISTS "project_id" uuid;
    `);
    console.log('✅ project_id column added/verified on listings');

    // 5. Add foreign key constraints
    try {
      await db.execute(sql`
        ALTER TABLE "project_units" 
        ADD CONSTRAINT "project_units_project_id_projects_id_fk" 
        FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE;
      `);
      console.log('✅ Foreign key project_units -> projects added');
    } catch (err: any) {
      console.log('ℹ️ Foreign key project_units -> projects already exists or failed:', err.message);
    }

    try {
      await db.execute(sql`
        ALTER TABLE "project_units" 
        ADD CONSTRAINT "project_units_listing_id_listings_id_fk" 
        FOREIGN KEY ("listing_id") REFERENCES "listings"("id") ON DELETE CASCADE;
      `);
      console.log('✅ Foreign key project_units -> listings added');
    } catch (err: any) {
      console.log('ℹ️ Foreign key project_units -> listings already exists or failed:', err.message);
    }

    try {
      await db.execute(sql`
        ALTER TABLE "listings" 
        ADD CONSTRAINT "listings_project_id_projects_id_fk" 
        FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE SET NULL;
      `);
      console.log('✅ Foreign key listings -> projects added');
    } catch (err: any) {
      console.log('ℹ️ Foreign key listings -> projects already exists or failed:', err.message);
    }

    console.log('🎉 Database migration completed successfully!');
  } catch (error) {
    console.error('❌ Migration failed:', error);
  } finally {
    process.exit(0);
  }
}

migrate();
