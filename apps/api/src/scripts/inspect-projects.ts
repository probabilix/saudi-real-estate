import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.join(__dirname, '../../.env') });

async function main() {
  const { db } = await import('../db');
  const { projects } = await import('../db/schema');

  console.log('Querying for all projects:');
  const results = await db.select().from(projects);

  console.log(JSON.stringify(results.map(p => ({
    id: p.id,
    nameEn: p.nameEn,
    city: p.city,
    district: p.district,
    brochureUrl: p.brochureUrl,
    mapEmbedUrl: p.mapEmbedUrl,
    regaFalLicense: p.regaFalLicense
  })), null, 2));
}

main().catch(console.error);
