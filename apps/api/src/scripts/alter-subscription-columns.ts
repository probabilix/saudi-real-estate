import { db } from '../db';
import { sql } from 'drizzle-orm';

async function migrateColumns() {
  console.log('--- Altering subscription columns to VARCHAR(50) ---');
  try {
    // 1. Alter users.subscription_tier to VARCHAR(50)
    await db.execute(sql`ALTER TABLE users ALTER COLUMN subscription_tier TYPE VARCHAR(50) USING subscription_tier::varchar;`);
    console.log('--- SUCCESS: users.subscription_tier altered! ---');

    // 2. Alter subscriptions.tier to VARCHAR(50)
    await db.execute(sql`ALTER TABLE subscriptions ALTER COLUMN tier TYPE VARCHAR(50) USING tier::varchar;`);
    console.log('--- SUCCESS: subscriptions.tier altered! ---');
  } catch (err: any) {
    console.error('Error altering columns:', err.message);
  }
  process.exit(0);
}

migrateColumns();
