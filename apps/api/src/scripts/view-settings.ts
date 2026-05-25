import 'dotenv/config';
import { db } from '../db';
import { systemSettings } from '../db/schema';

async function viewSettings() {
  try {
    const settings = await db.select().from(systemSettings);
    console.log('--- Current DB System Settings ---');
    console.log(JSON.stringify(settings, null, 2));
    process.exit(0);
  } catch (err) {
    console.error('Error fetching settings:', err);
    process.exit(1);
  }
}

viewSettings();
