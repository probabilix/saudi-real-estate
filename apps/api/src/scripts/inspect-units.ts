import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.join(__dirname, '../../.env') });

async function main() {
  const { db } = await import('../db');
  const { projectUnits } = await import('../db/schema');

  console.log('Querying for all project units:');
  const results = await db.select().from(projectUnits);

  console.log(JSON.stringify(results.map(u => ({
    id: u.id,
    projectId: u.projectId,
    listingId: u.listingId,
    unitNumber: u.unitNumber,
    floor: u.floor,
    type: u.type,
    status: u.status,
    price: u.price
  })), null, 2));
}

main().catch(console.error);
