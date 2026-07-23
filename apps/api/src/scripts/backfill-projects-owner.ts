import { db } from '../db';
import { projects, users } from '../db/schema';
import { isNull, eq } from 'drizzle-orm';
import dotenv from 'dotenv';
import path from 'path';

// Load env vars
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

async function backfill() {
  console.log('Starting projects owner backfill...');
  
  try {
    // 1. Find the first admin user
    const [adminUser] = await db
      .select({ id: users.id, email: users.email })
      .from(users)
      .where(eq(users.role, 'ADMIN'))
      .limit(1);

    if (!adminUser) {
      console.error('CRITICAL: No ADMIN user found in the database. Cannot backfill ownerId.');
      process.exit(1);
    }

    console.log(`Found Admin User: ${adminUser.email} (ID: ${adminUser.id})`);

    // 2. Find projects where ownerId is null or empty string
    const projectsToUpdate = await db
      .select({ id: projects.id, nameEn: projects.nameEn })
      .from(projects)
      .where(isNull(projects.ownerId));

    console.log(`Found ${projectsToUpdate.length} projects without an ownerId.`);

    if (projectsToUpdate.length === 0) {
      console.log('No projects need backfilling. Done!');
      process.exit(0);
    }

    // 3. Update the projects
    let updatedCount = 0;
    for (const proj of projectsToUpdate) {
      await db
        .update(projects)
        .set({ ownerId: adminUser.id, updatedAt: new Date() })
        .where(eq(projects.id, proj.id));
      
      console.log(`- Updated project "${proj.nameEn}" (ID: ${proj.id}) owner to Admin.`);
      updatedCount++;
    }

    console.log(`Successfully backfilled ${updatedCount} projects with Admin ownerId!`);
    process.exit(0);
  } catch (err) {
    console.error('Error during backfill:', err);
    process.exit(1);
  }
}

backfill();
