import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.join(__dirname, '../../.env') });

async function main() {
  const { db } = await import('../db');
  const { projects } = await import('../db/schema');
  const { eq } = await import('drizzle-orm');

  console.log('Updating project data...');

  // Update Rehab Project (Riyadh, Al Yasmin)
  await db.update(projects)
    .set({
      mapEmbedUrl: 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d115867.75549065972!2d46.541315830911765!3d24.825642921509618!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3e2ee3269ef55f75%3A0xe54fb72566c5d9f0!2sAl%20Yasmin%2C%20Riyadh%20Saudi%20Arabia!5e0!3m2!1sen!2sin!4v1780987300000!5m2!1sen!2sin',
      regaFalLicense: '1200001234'
    })
    .where(eq(projects.id, '8035a194-0a50-4580-95d8-e1ee76ed1dc9'));

  // Update Suhail Compound (Madinah)
  await db.update(projects)
    .set({
      brochureUrl: 'https://res.cloudinary.com/dmfv1fyhp/image/upload/v1779889702/saudi-re/listings/wncueufq0puxwteqtjl6.pdf',
      regaFalLicense: '1200001234'
    })
    .where(eq(projects.id, 'fc045e83-cd32-49da-865c-9d80f8daccb3'));

  console.log('Update finished successfully.');
}

main().catch(console.error);
