import 'dotenv/config';
import { db } from '../db';
import { listingComparisonPairs, projectComparisonPairs } from '../db/schema';
import { and, eq, lte } from 'drizzle-orm';

async function cleanupStaleComparisons() {
  console.log('[CLEANUP JOB] Starting stale comparison pairs cleanup...');
  try {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const twelveMonthsAgo = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);

    // 1. Clean up stale one-off pairs older than 30 days
    const listingPrunedCold = await db.delete(listingComparisonPairs)
      .where(and(
        eq(listingComparisonPairs.count, 1),
        lte(listingComparisonPairs.updatedAt, thirtyDaysAgo)
      ))
      .returning();
      
    const projectPrunedCold = await db.delete(projectComparisonPairs)
      .where(and(
        eq(projectComparisonPairs.count, 1),
        lte(projectComparisonPairs.updatedAt, thirtyDaysAgo)
      ))
      .returning();

    // 2. Clean up absolute stale pairs untouched in 12 months (regardless of count)
    const listingPrunedAbsolute = await db.delete(listingComparisonPairs)
      .where(lte(listingComparisonPairs.updatedAt, twelveMonthsAgo))
      .returning();
      
    const projectPrunedAbsolute = await db.delete(projectComparisonPairs)
      .where(lte(projectComparisonPairs.updatedAt, twelveMonthsAgo))
      .returning();

    console.log(`[CLEANUP JOB] Finished comparison pairs cleanup successfully:`);
    console.log(` - Pruned cold listings (count=1, >30d): ${listingPrunedCold.length} pairs`);
    console.log(` - Pruned cold projects (count=1, >30d): ${projectPrunedCold.length} pairs`);
    console.log(` - Pruned absolute listings (>12m): ${listingPrunedAbsolute.length} pairs`);
    console.log(` - Pruned absolute projects (>12m): ${projectPrunedAbsolute.length} pairs`);
    
    process.exit(0);
  } catch (err) {
    console.error('[CLEANUP JOB] Error during comparison cleanup:', err);
    process.exit(1);
  }
}

cleanupStaleComparisons();
