import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });
console.log('DATABASE_URL from env:', process.env.DATABASE_URL ? 'FOUND' : 'MISSING');

async function run() {
  const { client } = await import('../db');
  console.log('Querying database columns for listings...');
  const res = await client(`
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'listings'
  `);
  console.log(JSON.stringify(res, null, 2));
}

run().catch(console.error);
