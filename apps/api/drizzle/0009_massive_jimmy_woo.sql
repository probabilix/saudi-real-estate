ALTER TABLE "buyer_profiles" ADD COLUMN "completion_status_preference" varchar(50);--> statement-breakpoint
ALTER TABLE "buyer_profiles" ADD COLUMN "district_preference" varchar(100);--> statement-breakpoint
ALTER TABLE "chat_messages" ADD COLUMN "listing_id" uuid;--> statement-breakpoint
ALTER TABLE "chat_messages" ADD COLUMN "project_id" uuid;--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN "project_id" uuid;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "brochure_url" text;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "rega_fal_license" varchar(100);--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "amenities" jsonb DEFAULT '{}'::jsonb;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "photos" text[] DEFAULT '{}'::text[];--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "completion_status" "completion_status";--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "expected_delivery" varchar(50);--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "total_units" integer;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "is_reapplied" boolean DEFAULT false;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_listing_id_listings_id_fk" FOREIGN KEY ("listing_id") REFERENCES "public"."listings"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "leads" ADD CONSTRAINT "leads_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "chat_msg_listing_idx" ON "chat_messages" USING btree ("listing_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "chat_msg_project_idx" ON "chat_messages" USING btree ("project_id");