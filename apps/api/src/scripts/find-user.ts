import { db } from '../db';
import { users } from '../db/schema';
import { ilike } from 'drizzle-orm';

async function findUser() {
  const result = await db.select().from(users).where(ilike(users.name, '%Nabeel%'));
  console.log(JSON.stringify(result, null, 2));
  process.exit(0);
}

findUser();
