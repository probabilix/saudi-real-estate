import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

async function run() {
  const { client } = await import('../db');
  console.log('Adding ar_city and ar_district columns to listings table...');
  await client(`ALTER TABLE listings ADD COLUMN IF NOT EXISTS ar_city VARCHAR(100);`);
  await client(`ALTER TABLE listings ADD COLUMN IF NOT EXISTS ar_district VARCHAR(100);`);
  console.log('Database columns migrated successfully!');
}
run().catch(console.error);
