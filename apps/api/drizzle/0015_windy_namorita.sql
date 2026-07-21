DO $$ BEGIN
 CREATE TYPE "public"."property_view_source" AS ENUM('web', 'app');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."property_view_type" AS ENUM('listing', 'project');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "listing_comparison_pairs" (
	"listing_id_a" uuid NOT NULL,
	"listing_id_b" uuid NOT NULL,
	"count" integer DEFAULT 1 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "listing_comparison_pairs_listing_id_a_listing_id_b_pk" PRIMARY KEY("listing_id_a","listing_id_b")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "mortgage_calculator_usage" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"property_external_id" varchar(100) NOT NULL,
	"property_type" varchar(20) NOT NULL,
	"status" varchar(50) DEFAULT 'new' NOT NULL,
	"notes" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "unq_user_proj_usage" UNIQUE("user_id","property_external_id","property_type")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "project_comparison_pairs" (
	"project_id_a" uuid NOT NULL,
	"project_id_b" uuid NOT NULL,
	"count" integer DEFAULT 1 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "project_comparison_pairs_project_id_a_project_id_b_pk" PRIMARY KEY("project_id_a","project_id_b")
);
--> statement-breakpoint
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
ALTER TABLE "listings" ADD COLUMN "brochure_url_ar" text;--> statement-breakpoint
ALTER TABLE "mortgage_leads" ADD COLUMN "user_id" uuid;--> statement-breakpoint
ALTER TABLE "mortgage_leads" ADD COLUMN "notes" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "news" ADD COLUMN "faqs" jsonb DEFAULT '[]'::jsonb;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "brochure_url_ar" text;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "views_count" integer DEFAULT 0;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "listing_comparison_pairs" ADD CONSTRAINT "listing_comparison_pairs_listing_id_a_listings_id_fk" FOREIGN KEY ("listing_id_a") REFERENCES "public"."listings"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "listing_comparison_pairs" ADD CONSTRAINT "listing_comparison_pairs_listing_id_b_listings_id_fk" FOREIGN KEY ("listing_id_b") REFERENCES "public"."listings"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "mortgage_calculator_usage" ADD CONSTRAINT "mortgage_calculator_usage_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "project_comparison_pairs" ADD CONSTRAINT "project_comparison_pairs_project_id_a_projects_id_fk" FOREIGN KEY ("project_id_a") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "project_comparison_pairs" ADD CONSTRAINT "project_comparison_pairs_project_id_b_projects_id_fk" FOREIGN KEY ("project_id_b") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "property_views" ADD CONSTRAINT "property_views_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "listing_pair_a_idx" ON "listing_comparison_pairs" USING btree ("listing_id_a");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "listing_pair_b_idx" ON "listing_comparison_pairs" USING btree ("listing_id_b");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "project_pair_a_idx" ON "project_comparison_pairs" USING btree ("project_id_a");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "project_pair_b_idx" ON "project_comparison_pairs" USING btree ("project_id_b");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "pv_property_date_idx" ON "property_views" USING btree ("property_id","viewed_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "pv_user_property_idx" ON "property_views" USING btree ("user_id","property_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "pv_session_property_idx" ON "property_views" USING btree ("session_key","property_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "pv_viewed_at_idx" ON "property_views" USING btree ("viewed_at");--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "mortgage_leads" ADD CONSTRAINT "mortgage_leads_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
