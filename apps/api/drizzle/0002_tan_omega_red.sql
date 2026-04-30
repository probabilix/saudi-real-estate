DO $$ BEGIN
 CREATE TYPE "public"."broker_experience_level" AS ENUM('0-2', '3-5', '6-10', '10+');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."gender" AS ENUM('MALE', 'FEMALE');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."verification_status" AS ENUM('UNVERIFIED', 'PENDING', 'VERIFIED', 'REJECTED');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "broker_profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"title_en" varchar(255),
	"title_ar" varchar(255),
	"bio_en" text,
	"bio_ar" text,
	"whatsapp" varchar(30),
	"national_id" varchar(50),
	"rega_license_number" varchar(100),
	"experience_level" "broker_experience_level",
	"languages" text[] DEFAULT '{}'::text[],
	"service_areas" text[] DEFAULT '{}'::text[],
	"gender" "gender",
	"national_short_address" varchar(255),
	"address" text,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "broker_profiles_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
ALTER TABLE "listings" ADD COLUMN "history" jsonb DEFAULT '[]'::jsonb;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "verification_status" "verification_status" DEFAULT 'UNVERIFIED';--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "credits_balance" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "rating" numeric(3, 2) DEFAULT '0';--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "review_count" integer DEFAULT 0;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "broker_profiles" ADD CONSTRAINT "broker_profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
