import { db } from '../db';
import { sql } from 'drizzle-orm';

async function finalFix() {
  console.log('--- FORCING DATA UPDATE ---');
  try {
    await db.execute(sql`UPDATE leads SET is_qualified = true WHERE buyer_profile_id = 'bb6cb5c3-dbb9-4084-a113-cc52db7618da';`);
    console.log('--- SUCCESS: is_qualified is now TRUE in the database! ---');
    
    // Verify it
    const res = await db.execute(sql`SELECT is_qualified FROM leads WHERE buyer_profile_id = 'bb6cb5c3-dbb9-4084-a113-cc52db7618da';`);
    console.log('Database Value now:', res.rows[0]);
  } catch (err: any) {
    console.error('Update failed:', err.message);
  }
  process.exit(0);
}

finalFix();
