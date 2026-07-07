DO $$ BEGIN
 CREATE TYPE "public"."credit_ledger_type" AS ENUM('CREDIT_PURCHASE', 'LISTING_PUBLISH', 'LISTING_FEATURE', 'LISTING_BUMP', 'ADMIN_GRANT', 'FIRM_GRANT');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."credit_order_status" AS ENUM('PENDING', 'PAID', 'FAILED', 'REFUNDED');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "credit_ledger" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"broker_id" uuid NOT NULL,
	"type" "credit_ledger_type" NOT NULL,
	"amount" integer NOT NULL,
	"balance_after" integer NOT NULL,
	"ref_order_id" uuid,
	"ref_listing_id" uuid,
	"description" text,
	"performed_by_id" uuid,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "credit_orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"broker_id" uuid NOT NULL,
	"package_id" uuid NOT NULL,
	"credits_amount" integer NOT NULL,
	"price_sar" integer NOT NULL,
	"moyasar_payment_id" varchar(100),
	"moyasar_reference" varchar(100),
	"status" "credit_order_status" DEFAULT 'PENDING' NOT NULL,
	"credited_at" timestamp with time zone,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "credit_orders_moyasar_payment_id_unique" UNIQUE("moyasar_payment_id"),
	CONSTRAINT "credit_orders_moyasar_reference_unique" UNIQUE("moyasar_reference")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "credit_packages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"key" varchar(50) NOT NULL,
	"name_en" varchar(100) NOT NULL,
	"name_ar" varchar(100) NOT NULL,
	"description_en" text,
	"description_ar" text,
	"credits" integer NOT NULL,
	"price_sar" integer NOT NULL,
	"is_popular" boolean DEFAULT false,
	"is_active" boolean DEFAULT true,
	"sort_order" integer DEFAULT 0,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "credit_packages_key_unique" UNIQUE("key")
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "credit_ledger" ADD CONSTRAINT "credit_ledger_broker_id_users_id_fk" FOREIGN KEY ("broker_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "credit_ledger" ADD CONSTRAINT "credit_ledger_ref_order_id_credit_orders_id_fk" FOREIGN KEY ("ref_order_id") REFERENCES "public"."credit_orders"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "credit_ledger" ADD CONSTRAINT "credit_ledger_ref_listing_id_listings_id_fk" FOREIGN KEY ("ref_listing_id") REFERENCES "public"."listings"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "credit_ledger" ADD CONSTRAINT "credit_ledger_performed_by_id_users_id_fk" FOREIGN KEY ("performed_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "credit_orders" ADD CONSTRAINT "credit_orders_broker_id_users_id_fk" FOREIGN KEY ("broker_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "credit_orders" ADD CONSTRAINT "credit_orders_package_id_credit_packages_id_fk" FOREIGN KEY ("package_id") REFERENCES "public"."credit_packages"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "credit_ledger_broker_idx" ON "credit_ledger" USING btree ("broker_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "credit_ledger_type_idx" ON "credit_ledger" USING btree ("type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "credit_ledger_created_idx" ON "credit_ledger" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "credit_order_broker_idx" ON "credit_orders" USING btree ("broker_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "credit_order_status_idx" ON "credit_orders" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "credit_order_moyasar_idx" ON "credit_orders" USING btree ("moyasar_payment_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "credit_order_created_idx" ON "credit_orders" USING btree ("created_at");