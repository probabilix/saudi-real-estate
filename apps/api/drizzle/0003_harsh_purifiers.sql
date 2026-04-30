ALTER TYPE "listing_status" ADD VALUE 'REMOVED';--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "system_settings" (
	"key" varchar(255) PRIMARY KEY NOT NULL,
	"value" text NOT NULL,
	"description" text,
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "listings" ADD COLUMN "youtube_url" varchar(255);--> statement-breakpoint
ALTER TABLE "listings" ADD COLUMN "video_url" text;--> statement-breakpoint
ALTER TABLE "listings" ADD COLUMN "tru_check_verified" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "listings" ADD COLUMN "short_id" varchar(20);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "short_id_idx" ON "listings" USING btree ("short_id");--> statement-breakpoint
ALTER TABLE "listings" ADD CONSTRAINT "listings_short_id_unique" UNIQUE("short_id");