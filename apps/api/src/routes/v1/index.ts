import { FastifyInstance } from 'fastify';
import authRoutes from './auth.routes';
import userRoutes from './user.routes';
import aiRoutes from './ai.routes';
import listingsRoutes from './listings.routes';
import firmRoutes from './firm.routes';
import favoritesRoutes from './favorites.routes';
import newsRoutes from './news.routes';
import legalRoutes from './legal.routes';

/**
 * API v1 Route Registration
 */
export default async function v1Routes(app: FastifyInstance) {
  // ── Health Check (Overriden from root for versioning) ──
  app.get('/health', async () => {
    return { 
      success: true, 
      status: 'authenticated-core-online',
      timestamp: new Date().toISOString()
    };
  });

  // ── Auth Module ──
  await app.register(authRoutes, { prefix: '/auth' });

  // ── User Module (Professional Profiles) ──
  await app.register(userRoutes, { prefix: '/user' });

  // ── AI Module (Translation & Generation) ──
  await app.register(aiRoutes, { prefix: '/ai' });

  // ── Listings Module ──
  await app.register(listingsRoutes, { prefix: '/listings' });

  // ── Firm Management Module ──
  await app.register(firmRoutes, { prefix: '/firm' });

  // ── Favorites Module ──
  await app.register(favoritesRoutes, { prefix: '/favorites' });

  // ── News Module ──
  await app.register(newsRoutes, { prefix: '/news' });

  // ── Legal Module ──
  await app.register(legalRoutes, { prefix: '/legal' });

  // ── Lead Module (Placeholder for next implementation) ──
  // app.register(leadRoutes, { prefix: '/leads' });
}
