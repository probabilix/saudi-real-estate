/**
 * backfill-lat-lng.ts
 * ──────────────────────────────────────────────────────────────────────────
 * One-time migration script to populate lat/lng from existing mapEmbedUrl
 * values in both the listings and projects tables.
 *
 * Run with:
 *   npx tsx apps/api/src/scripts/backfill-lat-lng.ts
 * ──────────────────────────────────────────────────────────────────────────
 */

import 'dotenv/config';
import { db } from '../db';
import { listings, projects } from '../db/schema';
import { isNull, isNotNull, and, or, sql } from 'drizzle-orm';
import { extractLatLng, isShortGoogleMapsUrl } from '@saudi-re/shared';


async function backfillTable(
  tableName: 'listings' | 'projects',
  table: typeof listings | typeof projects
) {
  console.log(`\n── Backfilling ${tableName} ──────────────────────────────────`);

  // Fetch rows where mapEmbedUrl is set but lat/lng are missing
  const rows = await db
    .select({
      id:          table.id,
      mapEmbedUrl: table.mapEmbedUrl,
    })
    .from(table as any)
    .where(
      and(
        isNotNull((table as any).mapEmbedUrl),
        or(
          isNull((table as any).lat),
          isNull((table as any).lng)
        )
      )
    );


  console.log(`  Found ${rows.length} rows to process`);

  let success = 0;
  let skippedShortUrl = 0;
  let failed = 0;

  for (const row of rows) {
    if (!row.mapEmbedUrl) {
      failed++;
      continue;
    }

    if (isShortGoogleMapsUrl(row.mapEmbedUrl)) {
      skippedShortUrl++;
      console.log(`  [SKIP-SHORT] ${row.id} — maps.app.goo.gl link, needs manual resolution`);
      continue;
    }

    const coords = extractLatLng(row.mapEmbedUrl);
    if (!coords) {
      failed++;
      console.log(`  [FAIL] ${row.id} — could not parse URL: ${row.mapEmbedUrl.substring(0, 80)}...`);
      continue;
    }

    try {
      await db
        .update(table as any)
        .set({
          lat: String(coords.lat),
          lng: String(coords.lng),
          updatedAt: new Date(),
        })
        .where(sql`id = ${row.id}`);

      success++;
      console.log(`  [OK] ${row.id} → lat: ${coords.lat}, lng: ${coords.lng}`);
    } catch (err: any) {
      failed++;
      console.error(`  [ERROR] ${row.id}:`, err.message);
    }
  }

  console.log(`\n  Results for ${tableName}:`);
  console.log(`    ✅ Success:         ${success}`);
  console.log(`    ⚠️  Short URLs:     ${skippedShortUrl} (need manual pin-drop)`);
  console.log(`    ❌ Failed to parse: ${failed}`);

  return { success, skippedShortUrl, failed };
}

async function main() {
  console.log('🗺️  Starting lat/lng backfill...');
  console.log(`   Timestamp: ${new Date().toISOString()}`);

  const listingResults  = await backfillTable('listings', listings);
  const projectResults  = await backfillTable('projects', projects);

  console.log('\n═══════════════════════════════════════════════════════');
  console.log('  BACKFILL COMPLETE');
  console.log(`  Listings  — ${listingResults.success} ✅  ${listingResults.skippedShortUrl} ⚠️  ${listingResults.failed} ❌`);
  console.log(`  Projects  — ${projectResults.success} ✅  ${projectResults.skippedShortUrl} ⚠️  ${projectResults.failed} ❌`);
  console.log('═══════════════════════════════════════════════════════\n');

  process.exit(0);
}

main().catch(err => {
  console.error('Fatal backfill error:', err);
  process.exit(1);
});
