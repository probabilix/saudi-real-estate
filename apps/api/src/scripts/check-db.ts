import 'dotenv/config';
import { db } from '../db';
import { sql } from 'drizzle-orm';

async function check() {
  try {
    const res = await db.execute(sql`SELECT column_name FROM information_schema.columns WHERE table_name = 'listings' AND column_name = 'history'`);
    console.log('History column check:', res.rows.length > 0 ? 'FOUND' : 'NOT FOUND');
  } catch (err) {
    console.error('Check failed:', err);
  }
}
check();
