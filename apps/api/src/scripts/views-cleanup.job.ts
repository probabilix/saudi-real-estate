import 'dotenv/config';
import { db } from '../db';
import { propertyViews } from '../db/schema';
import { lte } from 'drizzle-orm';

async function cleanupOldViews() {
  console.log('[CLEANUP JOB] Starting old property views ledger records cleanup...');
  try {
    // Retention window: 90 days
    const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);

    const deleted = await db.delete(propertyViews)
      .where(lte(propertyViews.viewedAt, ninetyDaysAgo))
      .returning({ id: propertyViews.id });

    console.log(`[CLEANUP JOB] Finished views cleanup successfully:`);
    console.log(` - Pruned ${deleted.length} raw view ledger entries older than 90 days`);
    
    process.exit(0);
  } catch (err) {
    console.error('[CLEANUP JOB] Error during views ledger cleanup:', err);
    process.exit(1);
  }
}

cleanupOldViews();
