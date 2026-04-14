DO $$ BEGIN
 CREATE TYPE "public"."buyer_purpose" AS ENUM('OWN_USE', 'INVESTMENT', 'RENTAL_INCOME');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."completion_status" AS ENUM('READY', 'OFF_PLAN', 'UNDER_CONSTRUCTION');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."furnishing_status" AS ENUM('UNFURNISHED', 'PARTLY_FURNISHED', 'FULLY_FURNISHED');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."language" AS ENUM('ar', 'en', 'ur', 'hi');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."lead_status" AS ENUM('NEW', 'VIEWED', 'CONTACTED', 'CLOSED_WON', 'CLOSED_LOST');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."listing_purpose" AS ENUM('SALE', 'RENT', 'LEASE');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."listing_status" AS ENUM('ACTIVE', 'SOLD', 'RENTED', 'DRAFT', 'FLAGGED');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."listing_type" AS ENUM('APARTMENT', 'VILLA', 'FLOOR', 'RESIDENTIAL_BUILDING', 'RESIDENTIAL_LAND', 'REST_HOUSE', 'CHALET', 'ROOM', 'TOWNHOUSE', 'DUPLEX', 'OFFICE', 'COMMERCIAL_BUILDING', 'WAREHOUSE', 'COMMERCIAL_LAND', 'INDUSTRIAL_LAND', 'FARM', 'AGRICULTURE_PLOT', 'COMPLEX', 'HOTEL', 'WORKSHOP', 'FACTORY', 'SCHOOL', 'HEALTH_CENTER', 'GAS_STATION', 'SHOWROOM');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."placement_type" AS ENUM('HOMEPAGE_BANNER', 'TOP_OF_SEARCH', 'CITY_SPOTLIGHT');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."residence_type" AS ENUM('FAMILY', 'BACHELOR');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."subscription_tier" AS ENUM('FREE', 'STARTER', 'PRO', 'ELITE');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."translation_status" AS ENUM('PENDING', 'DONE', 'FAILED');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."user_role" AS ENUM('ADMIN', 'FIRM', 'AGENT', 'SOLO_BROKER', 'OWNER', 'BUYER');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "buyer_profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" varchar(255) NOT NULL,
	"user_id" uuid,
	"budget_min" bigint,
	"budget_max" bigint,
	"city_preference" varchar(100),
	"property_type" text[],
	"purpose" "buyer_purpose",
	"timeline_months" smallint,
	"intent_score" smallint DEFAULT 0,
	"listings_viewed" uuid[],
	"shortlisted" uuid[],
	"contact_provided" boolean DEFAULT false,
	"language_preference" "language" DEFAULT 'en',
	"last_seen" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "featured_placements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"listing_id" uuid NOT NULL,
	"broker_id" uuid NOT NULL,
	"placement_type" "placement_type" NOT NULL,
	"price_sar" integer,
	"starts_at" timestamp with time zone,
	"ends_at" timestamp with time zone,
	"is_active" boolean DEFAULT true
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "leads" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"buyer_profile_id" uuid NOT NULL,
	"listing_id" uuid NOT NULL,
	"broker_id" uuid NOT NULL,
	"status" "lead_status" DEFAULT 'NEW',
	"intent_score_at_creation" smallint,
	"ai_summary" text,
	"buyer_budget_display" varchar(100),
	"buyer_timeline_display" varchar(100),
	"notified_whatsapp" boolean DEFAULT false,
	"notified_email" boolean DEFAULT false,
	"notified_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "listings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_id" uuid NOT NULL,
	"type" "listing_type" NOT NULL,
	"purpose" "listing_purpose" NOT NULL,
	"status" "listing_status" DEFAULT 'DRAFT',
	"city" varchar(100) NOT NULL,
	"district" varchar(100),
	"lat" numeric(10, 7),
	"lng" numeric(10, 7),
	"price" bigint NOT NULL,
	"area_sqm" numeric(10, 2),
	"bedrooms" smallint,
	"bathrooms" smallint,
	"floor" smallint,
	"ar_title" varchar(500) NOT NULL,
	"ar_description" text,
	"en_title" varchar(500),
	"en_description" text,
	"translation_status" "translation_status" DEFAULT 'PENDING',
	"photos" text[] NOT NULL,
	"amenities" jsonb DEFAULT '{}'::jsonb,
	"foreigner_eligible" boolean DEFAULT false,
	"is_freehold" boolean DEFAULT true,
	"rega_advertising_license" varchar(100),
	"rega_fal_license" varchar(100),
	"rega_license_issue_date" varchar(100),
	"rega_license_expiry_date" varchar(100),
	"location_description_deed_ar" text,
	"property_age" smallint,
	"furnishing_status" "furnishing_status",
	"completion_status" "completion_status",
	"residence_type" "residence_type",
	"tru_check_timestamp" timestamp with time zone,
	"is_featured" boolean DEFAULT false,
	"featured_until" timestamp with time zone,
	"verified" boolean DEFAULT false,
	"mandate_doc_url" text,
	"views_count" integer DEFAULT 0,
	"search_vector" "tsvector",
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "subscriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"tier" "subscription_tier" NOT NULL,
	"price_sar" integer NOT NULL,
	"started_at" timestamp with time zone,
	"expires_at" timestamp with time zone,
	"payment_reference" varchar(255),
	"is_active" boolean DEFAULT true
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar(255) NOT NULL,
	"phone" varchar(30),
	"password_hash" varchar(255) NOT NULL,
	"role" "user_role" NOT NULL,
	"firm_id" uuid,
	"name" varchar(255),
	"rega_licence" varchar(100),
	"rega_verified" boolean DEFAULT false,
	"subscription_tier" "subscription_tier" DEFAULT 'FREE',
	"subscription_until" timestamp with time zone,
	"avatar_url" text,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "buyer_profiles" ADD CONSTRAINT "buyer_profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "featured_placements" ADD CONSTRAINT "featured_placements_listing_id_listings_id_fk" FOREIGN KEY ("listing_id") REFERENCES "public"."listings"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "featured_placements" ADD CONSTRAINT "featured_placements_broker_id_users_id_fk" FOREIGN KEY ("broker_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "leads" ADD CONSTRAINT "leads_buyer_profile_id_buyer_profiles_id_fk" FOREIGN KEY ("buyer_profile_id") REFERENCES "public"."buyer_profiles"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "leads" ADD CONSTRAINT "leads_listing_id_listings_id_fk" FOREIGN KEY ("listing_id") REFERENCES "public"."listings"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "leads" ADD CONSTRAINT "leads_broker_id_users_id_fk" FOREIGN KEY ("broker_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "listings" ADD CONSTRAINT "listings_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "search_vector_idx" ON "listings" USING gin ("search_vector");