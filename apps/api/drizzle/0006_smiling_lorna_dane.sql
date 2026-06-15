DO $$ BEGIN
 CREATE TYPE "public"."chat_type" AS ENUM('GENERAL', 'LISTING');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."crm_activity_type" AS ENUM('CREATED', 'STATUS_CHANGE', 'ASSIGNED', 'NOTE_ADDED', 'FOLLOWUP_SCHEDULED', 'FOLLOWUP_COMPLETED', 'WHATSAPP_CONTACT', 'SCORE_UPDATED');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."crm_lead_source" AS ENUM('META_ADS', 'SNAPCHAT', 'TIKTOK', 'WHATSAPP', 'MANUAL');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."crm_lead_status" AS ENUM('NEW', 'ATTEMPTED_CONTACT', 'CONTACTED', 'SITE_VISIT_SCHEDULED', 'PROPERTY_VIEWING', 'OFFER_SUBMITTED', 'CLOSED_WON', 'CLOSED_LOST');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."crm_lead_type" AS ENUM('WEBSITE', 'CAMPAIGN');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "contact_submissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"email" varchar(255) NOT NULL,
	"message" text NOT NULL,
	"is_replied" boolean DEFAULT false,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "crm_activities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"lead_id" uuid NOT NULL,
	"lead_type" "crm_lead_type" NOT NULL,
	"performed_by_id" uuid,
	"activity_type" "crm_activity_type" NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "crm_followups" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"lead_id" uuid NOT NULL,
	"lead_type" "crm_lead_type" NOT NULL,
	"agent_id" uuid,
	"scheduled_at" timestamp with time zone NOT NULL,
	"note" text,
	"is_completed" boolean DEFAULT false,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "crm_leads" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source" "crm_lead_source" NOT NULL,
	"name" varchar(255) NOT NULL,
	"phone" varchar(30) NOT NULL,
	"email" varchar(255),
	"city_preference" varchar(100),
	"property_interest" varchar(100),
	"status" "crm_lead_status" DEFAULT 'NEW' NOT NULL,
	"lead_score" smallint DEFAULT 0,
	"assigned_agent_id" uuid,
	"campaign_details" jsonb,
	"is_duplicate" boolean DEFAULT false,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "crm_notes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"lead_id" uuid NOT NULL,
	"lead_type" "crm_lead_type" NOT NULL,
	"agent_id" uuid,
	"content" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "chat_messages" ADD COLUMN "chat_type" "chat_type" DEFAULT 'LISTING' NOT NULL;--> statement-breakpoint
ALTER TABLE "listings" ADD COLUMN "ar_city" varchar(100);--> statement-breakpoint
ALTER TABLE "listings" ADD COLUMN "ar_district" varchar(100);--> statement-breakpoint
ALTER TABLE "listings" ADD COLUMN "brochure_url" text;--> statement-breakpoint
ALTER TABLE "listings" ADD COLUMN "map_embed_url" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "gender" varchar(10);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "nationality" varchar(100);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "city" varchar(100);--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "crm_activities" ADD CONSTRAINT "crm_activities_performed_by_id_users_id_fk" FOREIGN KEY ("performed_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "crm_followups" ADD CONSTRAINT "crm_followups_agent_id_users_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "crm_leads" ADD CONSTRAINT "crm_leads_assigned_agent_id_users_id_fk" FOREIGN KEY ("assigned_agent_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "crm_notes" ADD CONSTRAINT "crm_notes_agent_id_users_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "crm_activity_lead_idx" ON "crm_activities" USING btree ("lead_id","lead_type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "crm_followup_lead_idx" ON "crm_followups" USING btree ("lead_id","lead_type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "crm_followup_sched_idx" ON "crm_followups" USING btree ("scheduled_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "crm_lead_phone_idx" ON "crm_leads" USING btree ("phone");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "crm_lead_source_idx" ON "crm_leads" USING btree ("source");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "crm_lead_status_idx" ON "crm_leads" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "crm_lead_agent_idx" ON "crm_leads" USING btree ("assigned_agent_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "crm_note_lead_idx" ON "crm_notes" USING btree ("lead_id","lead_type");