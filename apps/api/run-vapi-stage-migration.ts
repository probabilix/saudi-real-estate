import 'dotenv/config';
import { db } from './src/db';
import { sql } from 'drizzle-orm';

async function runMigration() {
  console.log('⏳ Running AI lead status enum migration...');
  try {
    // ALTER TYPE ADD VALUE cannot be run inside transactions, so we execute them separately
    await db.execute(sql`ALTER TYPE "crm_lead_status" ADD VALUE IF NOT EXISTS 'AI_ATTEMPTING';`);
    await db.execute(sql`ALTER TYPE "crm_lead_status" ADD VALUE IF NOT EXISTS 'AI_QUALIFIED';`);
    await db.execute(sql`ALTER TYPE "crm_lead_status" ADD VALUE IF NOT EXISTS 'AI_DISQUALIFIED';`);
    await db.execute(sql`ALTER TYPE "crm_lead_status" ADD VALUE IF NOT EXISTS 'AI_UNREACHED';`);
    console.log('✅ Lead status enum updated successfully with new VAPI stages!');
  } catch (error) {
    console.error('❌ Migration failed:', error);
  } finally {
    process.exit(0);
  }
}

runMigration();
