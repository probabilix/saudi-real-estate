ALTER TYPE "lead_status" ADD VALUE 'ATTEMPTED_CONTACT';--> statement-breakpoint
ALTER TYPE "lead_status" ADD VALUE 'AGENT_CONTACTED';--> statement-breakpoint
ALTER TYPE "lead_status" ADD VALUE 'SITE_VISIT_SCHEDULED';--> statement-breakpoint
ALTER TYPE "lead_status" ADD VALUE 'PROPERTY_VIEWING';--> statement-breakpoint
ALTER TYPE "lead_status" ADD VALUE 'OFFER_SUBMITTED';--> statement-breakpoint
ALTER TYPE "lead_status" ADD VALUE 'AI_DISQUALIFIED';--> statement-breakpoint
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
--> statement-breakpoint
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
--> statement-breakpoint
ALTER TABLE "listings" ADD COLUMN "project_id" uuid;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "project_units" ADD CONSTRAINT "project_units_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "project_units" ADD CONSTRAINT "project_units_listing_id_listings_id_fk" FOREIGN KEY ("listing_id") REFERENCES "public"."listings"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "listings" ADD CONSTRAINT "listings_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
