import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from './schema';

// Use HTTP connection for Vercel Serverless compatibility
const connectionString = process.env.DATABASE_URL!;
const client = neon(connectionString);

/**
 * The Drizzle instance used for all database queries.
 * import { db } from '@/db'
 */
export const db = drizzle(client, { schema });

// Export the raw client and schema for utility use
export { client, schema };
