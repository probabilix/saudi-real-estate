-- ── Migration 0015: Property View Tracking ──
-- Adds views_count to projects table and creates property_views ledger table.

-- 1. Create enums
DO $$ BEGIN
 CREATE TYPE "public"."property_view_type" AS ENUM('listing', 'project');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."property_view_source" AS ENUM('web', 'app');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint

-- 2. Add views_count column to projects (safe: IF NOT EXISTS pattern)
ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "views_count" integer DEFAULT 0;
--> statement-breakpoint

-- 3. Create property_views ledger table
CREATE TABLE IF NOT EXISTS "property_views" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"property_type" "property_view_type" NOT NULL,
	"property_id" uuid NOT NULL,
	"user_id" uuid,
	"session_key" varchar(255),
	"ip_address" varchar(64),
	"source" "property_view_source" DEFAULT 'web' NOT NULL,
	"viewed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint

-- 4. Foreign key: user_id → users.id (set null on delete to preserve history)
DO $$ BEGIN
 ALTER TABLE "property_views" ADD CONSTRAINT "property_views_user_id_users_id_fk"
   FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint

-- 5. Indexes for performance
CREATE INDEX IF NOT EXISTS "pv_property_date_idx" ON "property_views" USING btree ("property_id", "viewed_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "pv_user_property_idx" ON "property_views" USING btree ("user_id", "property_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "pv_session_property_idx" ON "property_views" USING btree ("session_key", "property_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "pv_viewed_at_idx" ON "property_views" USING btree ("viewed_at");
