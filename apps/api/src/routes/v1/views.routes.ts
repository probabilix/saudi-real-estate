import { FastifyInstance } from 'fastify';
import { db } from '../../db';
import { propertyViews, listings, projects } from '../../db/schema';
import { eq, and, gte, sql } from 'drizzle-orm';
import { optionalAuthenticateJWT, authenticateJWT } from '../../middleware/auth.middleware';

/**
 * Property View Tracking Routes
 *
 * POST /api/v1/views/track        — Record a unique property view
 * POST /api/v1/views/link-session — Link pre-login views to a user after login
 * GET  /api/v1/views/stats/:id    — Daily view chart data for CRM
 */
export default async function viewsRoutes(app: FastifyInstance) {

  /**
   * POST /api/v1/views/track
   * De-duplicates by userId > sessionKey > ipAddress within 24h window.
   * Increments views_count on the parent listing or project.
   */
  app.post('/track', { preHandler: [optionalAuthenticateJWT] }, async (request, reply) => {
    const body = request.body as {
      propertyType: 'listing' | 'project';
      propertyId: string;
      sessionKey?: string;
      source?: 'web' | 'app';
    };

    const { propertyType, propertyId, sessionKey, source = 'web' } = body;

    if (!propertyType || !propertyId) {
      return reply.code(400).send({ success: false, message: 'propertyType and propertyId are required' });
    }
    if (propertyType !== 'listing' && propertyType !== 'project') {
      return reply.code(400).send({ success: false, message: 'propertyType must be listing or project' });
    }

    const userId = request.user?.userId ?? null;

    // Extract real IP from reverse-proxy headers (Vercel / Cloudflare)
    const ipAddress = (
      (request.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      (request.headers['x-real-ip'] as string) ||
      request.ip ||
      null
    );

    // 24-hour de-dup window
    const windowStart = new Date(Date.now() - 24 * 60 * 60 * 1000);

    try {
      let isDuplicate = false;

      if (userId) {
        // Logged-in: de-dup by (propertyId + userId)
        const existing = await db
          .select({ id: propertyViews.id })
          .from(propertyViews)
          .where(and(
            eq(propertyViews.propertyId, propertyId),
            eq(propertyViews.userId, userId),
            gte(propertyViews.viewedAt, windowStart)
          ))
          .limit(1);
        isDuplicate = existing.length > 0;

      } else if (sessionKey) {
        // Anonymous with session key: de-dup by (propertyId + sessionKey)
        const existing = await db
          .select({ id: propertyViews.id })
          .from(propertyViews)
          .where(and(
            eq(propertyViews.propertyId, propertyId),
            eq(propertyViews.sessionKey, sessionKey),
            gte(propertyViews.viewedAt, windowStart)
          ))
          .limit(1);
        isDuplicate = existing.length > 0;

      } else if (ipAddress) {
        // Last resort: de-dup by (propertyId + ip)
        const existing = await db
          .select({ id: propertyViews.id })
          .from(propertyViews)
          .where(and(
            eq(propertyViews.propertyId, propertyId),
            eq(propertyViews.ipAddress, ipAddress),
            gte(propertyViews.viewedAt, windowStart)
          ))
          .limit(1);
        isDuplicate = existing.length > 0;
      }

      if (isDuplicate) {
        return reply.send({ success: true, counted: false, reason: 'duplicate_within_24h' });
      }

      // Insert into ledger
      await db.insert(propertyViews).values({
        propertyType,
        propertyId,
        userId: userId ?? undefined,
        sessionKey: sessionKey ?? undefined,
        ipAddress: ipAddress ?? undefined,
        source,
      });

      // Increment counter atomically
      if (propertyType === 'listing') {
        await db
          .update(listings)
          .set({ viewsCount: sql`${listings.viewsCount} + 1` })
          .where(eq(listings.id, propertyId));
      } else {
        await db
          .update(projects)
          .set({ viewsCount: sql`${projects.viewsCount} + 1` })
          .where(eq(projects.id, propertyId));
      }

      return reply.send({ success: true, counted: true });

    } catch (err: any) {
      console.error('[views/track] Error:', err);
      return reply.code(500).send({ success: false, message: 'Failed to record view' });
    }
  });


  /**
   * POST /api/v1/views/link-session
   * Links pre-login anonymous views to the authenticated user.
   * Call this once right after a successful login.
   */
  app.post('/link-session', { preHandler: [authenticateJWT] }, async (request, reply) => {
    const { sessionKey } = request.body as { sessionKey: string };
    const userId = request.user!.userId;

    if (!sessionKey) {
      return reply.code(400).send({ success: false, message: 'sessionKey is required' });
    }

    try {
      await db
        .update(propertyViews)
        .set({ userId })
        .where(and(
          eq(propertyViews.sessionKey, sessionKey),
          sql`${propertyViews.userId} IS NULL`
        ));

      return reply.send({ success: true, linked: true });
    } catch (err: any) {
      console.error('[views/link-session] Error:', err);
      return reply.code(500).send({ success: false, message: 'Failed to link session' });
    }
  });


  /**
   * GET /api/v1/views/stats/:propertyId
   * Returns daily view counts for CRM analytics.
   * Query param: ?period=today|yesterday|7d|30d|90d  (default: 7d)
   */
  app.get('/stats/:propertyId', { preHandler: [authenticateJWT] }, async (request, reply) => {
    const { propertyId } = request.params as { propertyId: string };
    const { period = '7d' } = request.query as { period?: string };

    const periodDays: Record<string, number> = {
      today: 1,
      yesterday: 2,
      '7d': 7,
      '30d': 30,
      '90d': 90,
    };

    const days = periodDays[period] ?? 7;
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    try {
      const rows = await db
        .select({
          day: sql<string>`DATE(${propertyViews.viewedAt})`,
          views: sql<number>`COUNT(*)::int`,
        })
        .from(propertyViews)
        .where(and(
          eq(propertyViews.propertyId, propertyId),
          gte(propertyViews.viewedAt, since)
        ))
        .groupBy(sql`DATE(${propertyViews.viewedAt})`)
        .orderBy(sql`DATE(${propertyViews.viewedAt}) ASC`);

      return reply.send({ success: true, data: rows });
    } catch (err: any) {
      console.error('[views/stats] Error:', err);
      return reply.code(500).send({ success: false, message: 'Failed to fetch view stats' });
    }
  });
}
