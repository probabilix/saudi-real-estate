import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.join(__dirname, '../../.env') });

async function main() {
  const { db } = await import('../db');
  const { sql } = await import('drizzle-orm');

  console.log('Starting dummy listings cleanup...');
  console.log('This will delete all standalone (dummy) listings where project_id IS NULL, along with their related favorites, leads, featured placements, and polymorphic CRM logs.');

  // 1. Delete CRM followups referencing website leads belonging to dummy listings
  await db.execute(sql`
    DELETE FROM crm_followups
    WHERE lead_type = 'WEBSITE'
      AND lead_id IN (
        SELECT id FROM leads
        WHERE listing_id IN (SELECT id FROM listings WHERE project_id IS NULL)
      );
  `);
  console.log('- Cleared polymorphic CRM followups.');

  // 2. Delete CRM activities referencing website leads belonging to dummy listings
  await db.execute(sql`
    DELETE FROM crm_activities
    WHERE lead_type = 'WEBSITE'
      AND lead_id IN (
        SELECT id FROM leads
        WHERE listing_id IN (SELECT id FROM listings WHERE project_id IS NULL)
      );
  `);
  console.log('- Cleared polymorphic CRM activities.');

  // 3. Delete CRM notes referencing website leads belonging to dummy listings
  await db.execute(sql`
    DELETE FROM crm_notes
    WHERE lead_type = 'WEBSITE'
      AND lead_id IN (
        SELECT id FROM leads
        WHERE listing_id IN (SELECT id FROM listings WHERE project_id IS NULL)
      );
  `);
  console.log('- Cleared polymorphic CRM notes.');

  // 4. Delete favorites referencing dummy listings
  await db.execute(sql`
    DELETE FROM favorites
    WHERE listing_id IN (SELECT id FROM listings WHERE project_id IS NULL);
  `);
  console.log('- Cleared favorites.');

  // 5. Delete leads referencing dummy listings
  await db.execute(sql`
    DELETE FROM leads
    WHERE listing_id IN (SELECT id FROM listings WHERE project_id IS NULL);
  `);
  console.log('- Cleared leads.');

  // 6. Delete featured placements referencing dummy listings
  await db.execute(sql`
    DELETE FROM featured_placements
    WHERE listing_id IN (SELECT id FROM listings WHERE project_id IS NULL);
  `);
  console.log('- Cleared featured placements.');

  // 7. Delete listings where project_id IS NULL
  const deleteListings = await db.execute(sql`
    DELETE FROM listings
    WHERE project_id IS NULL;
  `);
  
  // Drizzle execute returns pg result or similar; checking rowCount if present
  const affectedCount = (deleteListings as any).rowCount ?? 'all matching';
  console.log(`- Successfully deleted ${affectedCount} standalone dummy listings!`);
  console.log('Project-related listing layouts (project_id IS NOT NULL) remain completely untouched.');
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Error during cleanup:', err);
    process.exit(1);
  });
