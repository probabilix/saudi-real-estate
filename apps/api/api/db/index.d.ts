import * as schema from './schema';
declare const client: import("@neondatabase/serverless").NeonQueryFunction<false, false>;
/**
 * The Drizzle instance used for all database queries.
 * import { db } from '@/db'
 */
export declare const db: import("drizzle-orm/neon-http").NeonHttpDatabase<typeof schema> & {
    $client: import("@neondatabase/serverless").NeonQueryFunction<false, false>;
};
export { client, schema };
//# sourceMappingURL=index.d.ts.map