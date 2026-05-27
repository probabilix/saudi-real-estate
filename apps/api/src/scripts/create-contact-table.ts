import { neon } from '@neondatabase/serverless';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables from .env or .env.local
dotenv.config({ path: path.join(__dirname, '../../.env') });
dotenv.config({ path: path.join(__dirname, '../../.env.local') });

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error('Error: DATABASE_URL environment variable is missing.');
  process.exit(1);
}

async function main() {
  console.log('Connecting to Neon Database...');
  const sql = neon(connectionString!);

  console.log('Creating "contact_submissions" table if it does not exist...');
  await sql`
    CREATE TABLE IF NOT EXISTS contact_submissions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name VARCHAR(255) NOT NULL,
      email VARCHAR(255) NOT NULL,
      message TEXT NOT NULL,
      is_replied BOOLEAN DEFAULT false,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
  `;

  console.log('SUCCESS: "contact_submissions" table is now active in the database!');
}

main().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
