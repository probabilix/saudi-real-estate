ALTER TYPE "crm_lead_status" ADD VALUE 'AI_ATTEMPTING';--> statement-breakpoint
ALTER TYPE "crm_lead_status" ADD VALUE 'AI_QUALIFIED';--> statement-breakpoint
ALTER TYPE "crm_lead_status" ADD VALUE 'AI_DISQUALIFIED';--> statement-breakpoint
ALTER TYPE "crm_lead_status" ADD VALUE 'AI_UNREACHED';--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "listing_reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"listing_id" uuid,
	"project_id" uuid,
	"reason" varchar(255) NOT NULL,
	"reporter_name" varchar(255) NOT NULL,
	"reporter_email" varchar(255) NOT NULL,
	"description" text,
	"status" varchar(50) DEFAULT 'PENDING' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "mortgage_bank_rates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"bank_id" uuid NOT NULL,
	"loan_period_years" integer NOT NULL,
	"annual_rate_pct" numeric(5, 2) NOT NULL,
	CONSTRAINT "unique_bank_year" UNIQUE("bank_id","loan_period_years")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "mortgage_banks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" varchar(100) NOT NULL,
	"external_id" varchar(50) NOT NULL,
	"name_en" varchar(255) NOT NULL,
	"name_ar" varchar(255) NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	CONSTRAINT "mortgage_banks_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "mortgage_leads" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"full_name" varchar(255) NOT NULL,
	"phone_number" varchar(50) NOT NULL,
	"monthly_income" numeric(12, 2),
	"redf_supported" boolean DEFAULT true,
	"monthly_obligations" numeric(12, 2),
	"property_external_id" varchar(100) NOT NULL,
	"property_price" numeric(12, 2) NOT NULL,
	"is_citizen" boolean NOT NULL,
	"is_first_home" boolean,
	"down_payment_amount" numeric(12, 2) NOT NULL,
	"loan_period_years" integer NOT NULL,
	"bank_slug" varchar(100) NOT NULL,
	"bank_name_en" varchar(255) NOT NULL,
	"applied_rate_pct" numeric(5, 2) NOT NULL,
	"monthly_instalment" numeric(12, 2) NOT NULL,
	"total_payable_value" numeric(12, 2) NOT NULL,
	"total_loan_amount" numeric(12, 2) NOT NULL,
	"status" varchar(50) DEFAULT 'new' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "project_favorites" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"project_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "listings" ADD COLUMN "muslim_only" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "lat" numeric(10, 7);--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "lng" numeric(10, 7);--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "is_featured" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "featured_order" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "foreigner_eligible" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "muslim_only" boolean DEFAULT false;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "listing_reports" ADD CONSTRAINT "listing_reports_listing_id_listings_id_fk" FOREIGN KEY ("listing_id") REFERENCES "public"."listings"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "listing_reports" ADD CONSTRAINT "listing_reports_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "mortgage_bank_rates" ADD CONSTRAINT "mortgage_bank_rates_bank_id_mortgage_banks_id_fk" FOREIGN KEY ("bank_id") REFERENCES "public"."mortgage_banks"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "project_favorites" ADD CONSTRAINT "project_favorites_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "project_favorites" ADD CONSTRAINT "project_favorites_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "bank_year_idx" ON "mortgage_bank_rates" USING btree ("bank_id","loan_period_years");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "user_project_idx" ON "project_favorites" USING btree ("user_id","project_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "listings_lat_lng_idx" ON "listings" USING btree ("lat","lng");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "projects_lat_lng_idx" ON "projects" USING btree ("lat","lng");