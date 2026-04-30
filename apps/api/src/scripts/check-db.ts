import 'dotenv/config';
import { db } from '../db';
import { sql } from 'drizzle-orm';

async function checkTable() {
  try {
    const result = await db.execute(sql`SELECT to_regclass('public.favorites')`);
    process.stdout.write('Table existence check: ' + JSON.stringify(result) + '\n');
    process.exit(0);
  } catch (err) {
    process.stderr.write('Error checking table: ' + err + '\n');
    process.exit(1);
  }
}

checkTable();
