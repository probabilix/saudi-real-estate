import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.join(__dirname, '../../.env') });

async function main() {
  const { db } = await import('../db');
  const { users } = await import('../db/schema');
  const { eq, or } = await import('drizzle-orm');

  console.log('Querying for users with verificationStatus = REJECTED or isActive = false:');
  const results = await db.select().from(users).where(
    or(
      eq(users.verificationStatus, 'REJECTED'),
      eq(users.isActive, false)
    )
  );

  console.table(results.map(u => ({
    id: u.id,
    email: u.email,
    name: u.name,
    role: u.role,
    isActive: u.isActive,
    regaVerified: u.regaVerified,
    verificationStatus: u.verificationStatus,
    updatedAt: u.updatedAt
  })));
}

main().catch(console.error);
