import 'dotenv/config';
import { client } from '../db';

async function main() {
  try {
    console.log('=== CREATING FAQS TABLE IN NEON POSTGRESQL ===');
    await client(`
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
    `);
    console.log('FAQs table created or verified successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error creating FAQs table:', error);
    process.exit(1);
  }
}

main();
