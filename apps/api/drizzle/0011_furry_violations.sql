DO $$ BEGIN
 CREATE TYPE "public"."wizard_lead_status" AS ENUM('in_progress', 'completed', 'abandoned');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "wizard_leads" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"wizard_id" varchar(100) DEFAULT 'buy-in-saudi-eligibility' NOT NULL,
	"status" "wizard_lead_status" DEFAULT 'in_progress' NOT NULL,
	"full_name" varchar(255) NOT NULL,
	"email" varchar(255) NOT NULL,
	"phone" varchar(50) NOT NULL,
	"citizenship" varchar(100) NOT NULL,
	"consent" boolean DEFAULT false NOT NULL,
	"answers" jsonb DEFAULT '{}'::jsonb,
	"result_key" varchar(50),
	"lead_tags" text[] DEFAULT '{}'::text[],
	"source" varchar(100) DEFAULT 'buy-in-saudi-eligibility' NOT NULL,
	"crm_synced_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "wizard_lead_email_wizard_idx" ON "wizard_leads" USING btree ("email","wizard_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "wizard_lead_status_idx" ON "wizard_leads" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "wizard_lead_created_idx" ON "wizard_leads" USING btree ("created_at");