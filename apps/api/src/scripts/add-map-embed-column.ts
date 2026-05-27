import 'dotenv/config';
import { db } from '../db';
import { sql } from 'drizzle-orm';

async function addMapEmbedColumn() {
  console.log('--- Adding map_embed_url column to listings table ---');
  try {
    await db.execute(sql`ALTER TABLE listings ADD COLUMN IF NOT EXISTS map_embed_url TEXT;`);
    console.log('--- SUCCESS: Column map_embed_url added! ---');
  } catch (err: any) {
    console.error('Error adding column map_embed_url:', err.message);
  }
  process.exit(0);
}

addMapEmbedColumn();
