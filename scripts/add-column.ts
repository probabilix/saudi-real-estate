import { db } from './apps/api/src/db';
import { sql } from 'drizzle-orm';

async function addColumn() {
  console.log('--- Adding is_qualified column to leads table ---');
  try {
    await db.execute(sql`ALTER TABLE leads ADD COLUMN IF NOT EXISTS is_qualified BOOLEAN DEFAULT false;`);
    console.log('--- SUCCESS: Column added! ---');
  } catch (err: any) {
    console.error('Error adding column:', err.message);
  }
  process.exit(0);
}

addColumn();
