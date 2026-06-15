import { db } from '../db';
import { projects, users, projectFavorites } from '../db/schema';
import { eq, and, inArray } from 'drizzle-orm';
import { AuthService } from '../services/auth.service';

async function testSync() {
  console.log('--- Testing Project Favorites Sync API ---');
  try {
    // 1. Fetch or create a test user
    const testEmail = 'favorite-tester@example.com';
    let [user] = await db.select().from(users).where(eq(users.email, testEmail)).limit(1);
    if (!user) {
      console.log('Creating test user...');
      const [newUser] = await db.insert(users).values({
        email: testEmail,
        name: 'Favorite Tester',
        role: 'BUYER',
        passwordHash: 'test-hash'
      }).returning();
      user = newUser;
    }

    // 2. Fetch a project
    const [project] = await db.select().from(projects).limit(1);
    if (!project) {
      console.error('FAIL: No projects found in database to run favorite tests on.');
      process.exit(1);
    }
    console.log(`Testing with Project: ${project.nameEn} (ID: ${project.id})`);

    // 3. Ensure clean slate: remove from favorites first
    await db.delete(projectFavorites)
      .where(and(eq(projectFavorites.userId, user.id), eq(projectFavorites.projectId, project.id)));

    // 4. Generate access token
    const token = AuthService.generateAccessToken({ userId: user.id, role: 'BUYER' });

    // 5. Query /system/projects (using fetch) and verify isFavorited is false
    console.log('Querying projects with auth token (should be false)...');
    let res = await fetch('http://localhost:3001/api/v1/system/projects', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    let data = await res.json() as any;
    if (!data.success) {
      throw new Error(`API failed: ${data.message}`);
    }
    
    let matchedItem = data.data.items.find((item: any) => item.id === project.id);
    if (!matchedItem) {
      console.warn(`Warning: Tested project compound not in the first page of results.`);
    } else {
      console.log(`Initial status isFavorited: ${matchedItem.isFavorited}`);
      if (matchedItem.isFavorited !== false) {
        throw new Error('Expected initial isFavorited to be false');
      }
    }

    // 6. Toggle Favorite to True (Add to projectFavorites)
    console.log('Adding project to favorites in DB...');
    await db.insert(projectFavorites).values({
      userId: user.id,
      projectId: project.id
    });

    // 7. Query /system/projects and verify isFavorited is true
    console.log('Querying projects with auth token (should be true)...');
    res = await fetch('http://localhost:3001/api/v1/system/projects', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    data = await res.json() as any;
    matchedItem = data.data.items.find((item: any) => item.id === project.id);
    if (matchedItem) {
      console.log(`After favoriting, status isFavorited: ${matchedItem.isFavorited}`);
      if (matchedItem.isFavorited !== true) {
        throw new Error('Expected isFavorited to be true after saving');
      }
    }

    // 8. Cleanup and toggle off
    console.log('Removing project from favorites in DB (cleanup)...');
    await db.delete(projectFavorites)
      .where(and(eq(projectFavorites.userId, user.id), eq(projectFavorites.projectId, project.id)));

    // 9. Query /system/projects one final time and verify it is false again
    console.log('Querying projects again (should be false after cleanup)...');
    res = await fetch('http://localhost:3001/api/v1/system/projects', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    data = await res.json() as any;
    matchedItem = data.data.items.find((item: any) => item.id === project.id);
    if (matchedItem) {
      console.log(`After cleanup, status isFavorited: ${matchedItem.isFavorited}`);
      if (matchedItem.isFavorited !== false) {
        throw new Error('Expected isFavorited to return to false');
      }
    }

    console.log('✅ ALL API SYNC TESTS PASSED SUCCESSFULLY!');
  } catch (err: any) {
    console.error('❌ TEST FAILED:', err.message || err);
    process.exit(1);
  }
  process.exit(0);
}

testSync();
