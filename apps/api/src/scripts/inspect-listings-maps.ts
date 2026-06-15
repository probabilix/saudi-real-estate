import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.join(__dirname, '../../.env') });

async function main() {
  const { db } = await import('../db');
  const { listings } = await import('../db/schema');
  const { eq } = await import('drizzle-orm');

  console.log('Querying for listings:');
  const results = await db.select().from(listings);

  console.log(JSON.stringify(results.map(l => ({
    id: l.id,
    enTitle: l.enTitle,
    projectId: l.projectId,
    mapEmbedUrl: l.mapEmbedUrl,
    regaFalLicense: l.regaFalLicense
  })), null, 2));
}

main().catch(console.error);
