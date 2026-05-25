import 'dotenv/config';
import { db } from '../db';
import { systemSettings } from '../db/schema';
import { eq } from 'drizzle-orm';

async function setWebhook() {
  try {
    const key = 'ai_qualification_webhook';
    const value = 'https://studio.adonixai.cloud/webhook/live-chat';
    
    await db.insert(systemSettings)
      .values({
        key,
        value,
        description: 'N8N Webhook URL for lead qualification chat. Used on property detail pages.',
        updatedAt: new Date()
      })
      .onConflictDoUpdate({
        target: systemSettings.key,
        set: { value, updatedAt: new Date() }
      });
      
    console.log(`Successfully updated ${key} to ${value}`);
    process.exit(0);
  } catch (err) {
    console.error('Error updating webhook:', err);
    process.exit(1);
  }
}

setWebhook();
