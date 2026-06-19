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

    // Create mortgage_banks table manually
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "mortgage_banks" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        "slug" varchar(100) NOT NULL UNIQUE,
        "external_id" varchar(50) NOT NULL,
        "name_en" varchar(255) NOT NULL,
        "name_ar" varchar(255) NOT NULL,
        "is_active" boolean DEFAULT true NOT NULL
      );
    `);
    console.log('✅ mortgage_banks table ensured');

    // Create mortgage_bank_rates table manually
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "mortgage_bank_rates" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        "bank_id" uuid NOT NULL REFERENCES "mortgage_banks"("id") ON DELETE CASCADE,
        "loan_period_years" integer NOT NULL,
        "annual_rate_pct" numeric(5,2) NOT NULL,
        CONSTRAINT "unique_bank_year" UNIQUE ("bank_id", "loan_period_years")
      );
    `);
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS "bank_year_idx" ON "mortgage_bank_rates" ("bank_id", "loan_period_years");
    `);
    console.log('✅ mortgage_bank_rates table and index ensured');

    // Create mortgage_leads table manually
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "mortgage_leads" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        "full_name" varchar(255) NOT NULL,
        "phone_number" varchar(50) NOT NULL,
        "monthly_income" numeric(12,2),
        "redf_supported" boolean DEFAULT true,
        "monthly_obligations" numeric(12,2),
        "property_external_id" varchar(100) NOT NULL,
        "property_price" numeric(12,2) NOT NULL,
        "is_citizen" boolean NOT NULL,
        "is_first_home" boolean,
        "down_payment_amount" numeric(12,2) NOT NULL,
        "loan_period_years" integer NOT NULL,
        "bank_slug" varchar(100) NOT NULL,
        "bank_name_en" varchar(255) NOT NULL,
        "applied_rate_pct" numeric(5,2) NOT NULL,
        "monthly_instalment" numeric(12,2) NOT NULL,
        "total_payable_value" numeric(12,2) NOT NULL,
        "total_loan_amount" numeric(12,2) NOT NULL,
        "status" varchar(50) DEFAULT 'new' NOT NULL,
        "created_at" timestamp with time zone DEFAULT now() NOT NULL
      );
    `);
    console.log('✅ mortgage_leads table ensured');

    // Create listing_reports table manually
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "listing_reports" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        "listing_id" uuid REFERENCES "listings"("id") ON DELETE CASCADE,
        "reason" varchar(255) NOT NULL,
        "reporter_name" varchar(255) NOT NULL,
        "reporter_email" varchar(255) NOT NULL,
        "description" text,
        "status" varchar(50) DEFAULT 'PENDING' NOT NULL,
        "created_at" timestamp with time zone DEFAULT now() NOT NULL
      );
    `);
    
    // Alter listing_reports table to support polymorphic project reports
    await db.execute(sql`ALTER TABLE "listing_reports" ALTER COLUMN "listing_id" DROP NOT NULL;`);
    await db.execute(sql`ALTER TABLE "listing_reports" ADD COLUMN IF NOT EXISTS "project_id" uuid;`);
    await db.execute(sql`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'listing_reports_project_id_projects_id_fk') THEN
          ALTER TABLE "listing_reports" ADD CONSTRAINT "listing_reports_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE;
        END IF;
      END $$;
    `);
    console.log('✅ listing_reports table and polymorphic columns ensured');
    
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

    // Ensure all Phase 1 schema columns exist
    console.log('⏳ Running Phase 1 schema alterations...');
    
    await db.execute(sql`ALTER TABLE "buyer_profiles" ADD COLUMN IF NOT EXISTS "completion_status_preference" varchar(50);`);
    await db.execute(sql`ALTER TABLE "buyer_profiles" ADD COLUMN IF NOT EXISTS "district_preference" varchar(100);`);
    
    await db.execute(sql`ALTER TABLE "chat_messages" ADD COLUMN IF NOT EXISTS "listing_id" uuid;`);
    await db.execute(sql`ALTER TABLE "chat_messages" ADD COLUMN IF NOT EXISTS "project_id" uuid;`);
    
    await db.execute(sql`ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "project_id" uuid;`);
    
    await db.execute(sql`ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "brochure_url" text;`);
    await db.execute(sql`ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "rega_fal_license" varchar(100);`);
    await db.execute(sql`ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "amenities" jsonb DEFAULT '{}'::jsonb;`);
    await db.execute(sql`ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "photos" text[] DEFAULT '{}'::text[];`);
    await db.execute(sql`ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "completion_status" "completion_status";`);
    await db.execute(sql`ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "expected_delivery" varchar(50);`);
    await db.execute(sql`ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "total_units" integer;`);
    await db.execute(sql`ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "is_featured" boolean DEFAULT false;`);
    await db.execute(sql`ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "featured_order" integer DEFAULT 0;`);

    console.log('⏳ Creating indexes and foreign keys...');
    
    // Add constraints if not exists (using DO block to handle safely)
    await db.execute(sql`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chat_messages_listing_id_listings_id_fk') THEN
          ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_listing_id_listings_id_fk" FOREIGN KEY ("listing_id") REFERENCES "listings"("id") ON DELETE SET NULL;
        END IF;
      END $$;
    `);

    await db.execute(sql`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chat_messages_project_id_projects_id_fk') THEN
          ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE SET NULL;
        END IF;
      END $$;
    `);

    await db.execute(sql`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'leads_project_id_projects_id_fk') THEN
          ALTER TABLE "leads" ADD CONSTRAINT "leads_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE SET NULL;
        END IF;
      END $$;
    `);

    await db.execute(sql`CREATE INDEX IF NOT EXISTS "chat_msg_listing_idx" ON "chat_messages" USING btree ("listing_id");`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS "chat_msg_project_idx" ON "chat_messages" USING btree ("project_id");`);
    console.log('✅ Phase 1 schema alterations complete!');

  } catch (error) {
    console.error('❌ Fix failed:', error);
  } finally {
    process.exit(0);
  }
}

fixDb();

