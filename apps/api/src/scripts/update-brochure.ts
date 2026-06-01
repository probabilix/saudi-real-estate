import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.join(__dirname, '../../.env') });

import { db } from '../db';
import { listings } from '../db/schema';
import { eq } from 'drizzle-orm';

async function updateBrochure() {
  try {
    const targetId = 'ab39caca-855d-4b13-878d-97ba2587071a';
    const cloudinaryUrl = 'https://res.cloudinary.com/dmfv1fyhp/image/upload/v1779889702/saudi-re/listings/wncueufq0puxwteqtjl6.pdf';
    
    console.log(`Updating brochureUrl for listing ${targetId} to ${cloudinaryUrl}...`);
    
    await db.update(listings)
      .set({ brochureUrl: cloudinaryUrl, updatedAt: new Date() })
      .where(eq(listings.id, targetId));
      
    console.log('Update successful!');
    
    // Read it back to verify
    const result = await db.select().from(listings).where(eq(listings.id, targetId));
    console.log('Verified Result brochureUrl:', result[0]?.brochureUrl);
    
    process.exit(0);
  } catch (err) {
    console.error('Error updating database:', err);
    process.exit(1);
  }
}

updateBrochure();
