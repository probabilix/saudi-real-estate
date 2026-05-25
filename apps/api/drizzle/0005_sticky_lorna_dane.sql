CREATE TABLE IF NOT EXISTS "faqs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"question_en" text NOT NULL,
	"question_ar" text NOT NULL,
	"answer_en" text NOT NULL,
	"answer_ar" text NOT NULL,
	"order" integer DEFAULT 0,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);