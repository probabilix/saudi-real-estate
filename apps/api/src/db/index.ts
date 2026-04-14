// ──────────────────────────────────────────────
// Saudi Real Estate — Database Connection
// ──────────────────────────────────────────────

import { drizzle } from 'drizzle-orm/neon-serverless';
import { Pool } from '@neondatabase/serverless';
import * as schema from './schema';

// Use the pooled connection URL from Neon
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL environment variable is not set');
}

/**
 * The Neon serverless pooler. 
 * This handles many concurrent connections efficiently.
 */
const pool = new Pool({ connectionString });

/**
 * The Drizzle instance used for all database queries.
 * import { db } from '@/db'
 */
export const db = drizzle(pool, { schema });

// Export the raw pool and schema for utility/migration use
export { pool, schema };
