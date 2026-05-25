import 'dotenv/config';
import { db } from './src/db';
import { users } from './src/db/schema';
import { inArray } from 'drizzle-orm';

async function promoteAdmins() {
  const emails = [
    'probabilix.ai@gmail.com'
  ];

  console.log('🚀 Promoting emails to ADMIN:', emails);

  try {
    const result = await db.update(users)
      .set({ role: 'ADMIN' })
      .where(inArray(users.email, emails))
      .returning({ updatedEmail: users.email });

    if (result.length === 0) {
      console.log('⚠️ No users found with those emails. Did they register yet?');
    } else {
      console.log('✅ Successfully promoted:', result.map(u => u.updatedEmail).join(', '));
    }
  } catch (error) {
    console.error('❌ Promotion failed:', error);
  } finally {
    process.exit(0);
  }
}

promoteAdmins();
