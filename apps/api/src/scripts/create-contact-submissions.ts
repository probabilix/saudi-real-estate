import 'dotenv/config';
import { db } from '../db';
import { sql } from 'drizzle-orm';

async function run() {
  console.log('⚡ Creating contact_submissions table...');
  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS contact_submissions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        is_replied BOOLEAN DEFAULT false,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);
    console.log('✅ Table contact_submissions created successfully!');
  } catch (err) {
    console.error('❌ Error creating table:', err);
  } finally {
    process.exit(0);
  }
}

run();
