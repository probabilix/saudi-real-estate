import { FastifyInstance } from 'fastify';
import authRoutes from './auth.routes';
import userRoutes from './user.routes';
import aiRoutes from './ai.routes';
import listingsRoutes from './listings.routes';
import firmRoutes from './firm.routes';
import favoritesRoutes from './favorites.routes';
import newsRoutes from './news.routes';
import legalRoutes from './legal.routes';
import adminRoutes from './admin.routes';
import systemRoutes from './system.routes';
import crmRoutes from './crm.routes';
import mortgageRoutes from './mortgage.routes';
import wizardRoutes from './wizard.routes';
import billingRoutes from './billing.routes';
import viewsRoutes from './views.routes';
import newsletterRoutes from './newsletter.routes';

/**
 * API v1 Route Registration
 */
export default async function v1Routes(app: FastifyInstance) {
  // ── Health Check (Overriden from root for versioning) ──
  app.get('/health', async () => {
    return { 
      success: true, 
      status: 'authenticated-core-online',
      timestamp: new Date().toISOString(),
      version: '0.1.0',
      deployment: {
        commitSha: process.env.VERCEL_GIT_COMMIT_SHA || 'dev',
        branch: process.env.VERCEL_GIT_COMMIT_REF || 'dev',
        commitMessage: process.env.VERCEL_GIT_COMMIT_MESSAGE || 'local development'
      }
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

  // ── Admin Module ──
  await app.register(adminRoutes, { prefix: '/admin' });

  // ── System Module (Public Settings) ──
  await app.register(systemRoutes, { prefix: '/system' });

  // ── CRM Module ──
  await app.register(crmRoutes, { prefix: '/crm' });

  // ── Mortgage Module ──
  await app.register(mortgageRoutes, { prefix: '/mortgage' });

  // ── Eligibility Wizard Module ──
  await app.register(wizardRoutes, { prefix: '/wizard' });

  // ── Billing & Credits Module ──
  await app.register(billingRoutes, { prefix: '/billing' });

  // ── Property View Tracking Module ──
  await app.register(viewsRoutes, { prefix: '/views' });

  // ── Newsletter Module ──
  await app.register(newsletterRoutes, { prefix: '/newsletter' });
}
