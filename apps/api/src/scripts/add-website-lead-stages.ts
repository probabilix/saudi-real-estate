import 'dotenv/config';
import { db } from '../db';
import { sql } from 'drizzle-orm';

async function run() {
  console.log('Adding new stages and AI_DISQUALIFIED to lead_status enum...');
  const newStages = [
    'SITE_VISIT_SCHEDULED',
    'PROPERTY_VIEWING',
    'OFFER_SUBMITTED',
    'AI_DISQUALIFIED'
  ];

  for (const stage of newStages) {
    try {
      await db.execute(sql`ALTER TYPE lead_status ADD VALUE IF NOT EXISTS ${sql.raw(`'${stage}'`)}`);
      console.log(`Successfully processed enum value: ${stage}`);
    } catch (err: any) {
      if (err.message.includes('already exists')) {
        console.log(`Value ${stage} already exists in enum.`);
      } else {
        console.error(`Error adding ${stage}:`, err.message);
      }
    }
  }
  console.log('Done!');
}

run().then(() => process.exit(0)).catch(err => {
  console.error('Fatal execution error:', err);
  process.exit(1);
});
