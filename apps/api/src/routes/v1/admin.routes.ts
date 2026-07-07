import { FastifyInstance } from 'fastify';
import { db } from '../../db';
import { users, listings, systemSettings, news, legalPages, contactSubmissions, leads, buyerProfiles, chatMessages, brokerProfiles, mortgageLeads, projects, listingReports, creditPackages, creditOrders, creditLedger } from '../../db/schema';
import { authenticateJWT, requireRole } from '../../middleware/auth.middleware';
import { AuthService } from '../../services/auth.service';
import { EmailService } from '../../services/email.service';
import { eq, desc, asc, count, sql, and, or, ilike, isNull, inArray, gte } from 'drizzle-orm';

/**
 * Admin Routes — All protected by ADMIN role
 * Prefix: /api/v1/admin
 */
export default async function adminRoutes(app: FastifyInstance) {

  // ── Platform Stats ──
  app.get('/stats', { preHandler: [authenticateJWT, requireRole('ADMIN')] }, async (request, reply) => {
    try {
      // Parallel queries for performance
      const [
        totalUsersResult,
        totalListingsResult,
        activeListingsResult,
        pendingVerifResult,
        newUsersTodayResult,
        newListingsTodayResult,
        usersByRoleResult,
        listingsByStatusResult,
        listingsByCityResult,
      ] = await Promise.all([
        db.select({ count: count() }).from(users),
        db.select({ count: count() }).from(listings),
        db.select({ count: count() }).from(listings).where(eq(listings.status, 'ACTIVE')),
        db.select({ count: count() }).from(users).where(
          and(eq(users.verificationStatus, 'PENDING'), eq(users.isActive, false))
        ),
        db.select({ count: count() }).from(users).where(
          sql`created_at >= NOW() - INTERVAL '1 day'`
        ),
        db.select({ count: count() }).from(listings).where(
          sql`created_at >= NOW() - INTERVAL '1 day'`
        ),
        db.select({ role: users.role, count: count() }).from(users).groupBy(users.role),
        db.select({ status: listings.status, count: count() }).from(listings).groupBy(listings.status),
        db.select({ city: listings.city, count: count() }).from(listings).groupBy(listings.city).orderBy(desc(count())).limit(7),
      ]);

      const usersByRole: Record<string, number> = {};
      usersByRoleResult.forEach(r => {
        if (r.role) usersByRole[r.role] = Number(r.count);
      });

      const listingsByStatus: Record<string, number> = {};
      listingsByStatusResult.forEach(r => {
        if (r.status) listingsByStatus[r.status] = Number(r.count);
      });

      const listingsByCity: Record<string, number> = {};
      listingsByCityResult.forEach(r => {
        if (r.city) listingsByCity[r.city] = Number(r.count);
      });

      return reply.send({
        success: true,
        data: {
          totalUsers: Number(totalUsersResult[0]?.count ?? 0),
          totalListings: Number(totalListingsResult[0]?.count ?? 0),
          activeListings: Number(activeListingsResult[0]?.count ?? 0),
          pendingVerifications: Number(pendingVerifResult[0]?.count ?? 0),
          totalRevenueSar: 0, // Placeholder until payment is integrated
          newUsersToday: Number(newUsersTodayResult[0]?.count ?? 0),
          newListingsToday: Number(newListingsTodayResult[0]?.count ?? 0),
          platformHealth: 'healthy',
          usersByRole,
          listingsByStatus,
          listingsByCity,
          revenueByMonth: [], // Placeholder
        }
      });
    } catch (err) {
      app.log.error(err);
      return reply.code(500).send({ success: false, message: 'Failed to fetch admin stats' });
    }
  });

  // ── Users List ──
  app.get('/users', { preHandler: [authenticateJWT, requireRole('ADMIN')] }, async (request, reply) => {
    const query = request.query as { role?: string; status?: string; search?: string; page?: string; limit?: string; hasLicense?: string };
    const page = parseInt(query.page || '1');
    const limit = Math.min(parseInt(query.limit || '20'), 100);
    const offset = (page - 1) * limit;

    try {
      const conditions: any[] = [];
      if (query.role) conditions.push(eq(users.role, query.role as any));
      
      if (query.status) {
        if (query.status === 'active') {
          conditions.push(eq(users.isActive, true));
        } else if (query.status === 'inactive') {
          conditions.push(eq(users.isActive, false));
        } else if (['pending', 'verified', 'rejected', 'unverified'].includes(query.status.toLowerCase())) {
          conditions.push(eq(users.verificationStatus, query.status.toUpperCase() as any));
        }
      }

      if (query.hasLicense === 'true') {
        conditions.push(and(sql`${users.regaLicence} IS NOT NULL`, sql`${users.regaLicence} != ''`));
      }

      if (query.search) {
        const searchPattern = `%${query.search.toLowerCase()}%`;
        conditions.push(sql`(lower(${users.name}) LIKE ${searchPattern} OR lower(${users.email}) LIKE ${searchPattern} OR ${users.phone} LIKE ${searchPattern})`);
      }

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      const [userList, totalResult] = await Promise.all([
        db.select({
          id: users.id,
          name: users.name,
          email: users.email,
          role: users.role,
          phone: users.phone,
          isActive: users.isActive,
          verificationStatus: users.verificationStatus,
          regaLicence: users.regaLicence,
          regaVerified: users.regaVerified,
          isReapplied: users.isReapplied,
          subscriptionTier: users.subscriptionTier,
          creditsBalance: users.creditsBalance,
          createdAt: users.createdAt,
          gender: users.gender,
          nationality: users.nationality,
          city: users.city,
          bioEn: brokerProfiles.bioEn,
          bioAr: brokerProfiles.bioAr,
        })
          .from(users)
          .leftJoin(brokerProfiles, eq(users.id, brokerProfiles.userId))
          .where(whereClause)
          .orderBy(desc(users.createdAt))
          .limit(limit)
          .offset(offset),
        db.select({ count: count() }).from(users).where(whereClause),
      ]);

      return reply.send({
        success: true,
        data: {
          users: userList,
          total: Number(totalResult[0]?.count ?? 0),
          page,
        }
      });
    } catch (err) {
      app.log.error(err);
      return reply.code(500).send({ success: false, message: 'Failed to fetch users' });
    }
  });

  // ── Approve User ──
  app.post('/users/:id/approve', { preHandler: [authenticateJWT, requireRole('ADMIN')] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    try {
      const [user] = await db.select().from(users).where(eq(users.id, id)).limit(1);
      if (!user) {
        return reply.code(404).send({ success: false, message: 'User not found' });
      }

      const isUserAdmin = user.role === 'ADMIN';
      const targetRole = isUserAdmin ? 'ADMIN' : 'SOLO_BROKER';

      await db.update(users)
        .set({
          isActive: true,
          verificationStatus: 'VERIFIED',
          regaVerified: true,
          role: targetRole,
          isReapplied: false,
          updatedAt: new Date()
        })
        .where(eq(users.id, id));

      await EmailService.sendCrmAccessApprovalEmail(user.email, user.name || 'Broker');

      return reply.send({ success: true, message: 'User approved successfully and welcomed to CRM.' });
    } catch (err) {
      app.log.error(err);
      return reply.code(500).send({ success: false, message: 'Failed to approve user' });
    }
  });

  // ── Reject User ──
  app.post('/users/:id/reject', { preHandler: [authenticateJWT, requireRole('ADMIN')] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    try {
      const [user] = await db.select().from(users).where(eq(users.id, id)).limit(1);
      if (!user) {
        return reply.code(404).send({ success: false, message: 'User not found' });
      }

      // Revert broker/agent roles back to BUYER to revoke CRM and broker portal access
      const isUserAdmin = user.role === 'ADMIN';
      const targetRole = isUserAdmin ? 'ADMIN' : 'BUYER';

      await db.update(users)
        .set({ 
          isActive: true, // Rejection does not suspend the user account; they can still access as buyer
          verificationStatus: 'REJECTED', 
          regaVerified: false, // Revoke REGA verification
          role: targetRole,
          isReapplied: false,
          updatedAt: new Date() 
        })
        .where(eq(users.id, id));

      // Send rejection notification email
      await EmailService.sendRejectionEmail(user.email, user.name || 'User');

      return reply.send({ success: true, message: 'User verification rejected successfully, role reverted to BUYER' });
    } catch (err) {
      app.log.error(err);
      return reply.code(500).send({ success: false, message: 'Failed to reject user' });
    }
  });

  // ── Suspend/Unsuspend User ──
  app.post('/users/:id/suspend', { preHandler: [authenticateJWT, requireRole('ADMIN')] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    try {
      const user = await db.query.users.findFirst({ where: eq(users.id, id) });
      if (!user) return reply.code(404).send({ success: false, message: 'User not found' });
      await db.update(users)
        .set({ isActive: !user.isActive, updatedAt: new Date() })
        .where(eq(users.id, id));
      return reply.send({ success: true, message: user.isActive ? 'User suspended' : 'User reinstated' });
    } catch (err) {
      app.log.error(err);
      return reply.code(500).send({ success: false, message: 'Failed to update user' });
    }
  });

  // ── Adjust User Credits ──
  app.patch('/users/:id/credits', { preHandler: [authenticateJWT, requireRole('ADMIN')] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const { credits } = request.body as { credits: number };
    if (typeof credits !== 'number') {
      return reply.code(400).send({ success: false, message: 'credits must be a number' });
    }
    try {
      await db.update(users)
        .set({ creditsBalance: credits, updatedAt: new Date() })
        .where(eq(users.id, id));
      return reply.send({ success: true, message: 'Credits updated' });
    } catch (err) {
      app.log.error(err);
      return reply.code(500).send({ success: false, message: 'Failed to update credits' });
    }
  });

  // ── Change User Subscription Tier ──
  app.patch('/users/:id/subscription', { preHandler: [authenticateJWT, requireRole('ADMIN')] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const { tier } = request.body as { tier: string };
    try {
      await db.update(users)
        .set({ subscriptionTier: tier as any, updatedAt: new Date() })
        .where(eq(users.id, id));
      return reply.send({ success: true, message: 'Subscription updated' });
    } catch (err) {
      app.log.error(err);
      return reply.code(500).send({ success: false, message: 'Failed to update subscription' });
    }
  });

  app.get('/listings', { preHandler: [authenticateJWT, requireRole('ADMIN')] }, async (request, reply) => {
    const query = request.query as { status?: string; isFeatured?: string; page?: string; limit?: string; search?: string };
    const page = parseInt(query.page || '1');
    const limit = Math.min(parseInt(query.limit || '20'), 100);
    const offset = (page - 1) * limit;

    try {
      const conditions: any[] = [isNull(listings.deletedAt)];
      if (query.status) conditions.push(eq(listings.status, query.status as any));
      if (query.isFeatured === 'true') conditions.push(eq(listings.isFeatured, true));

      if (query.search) {
        const searchPattern = `%${query.search.toLowerCase()}%`;
        conditions.push(
          or(
            ilike(listings.arTitle, searchPattern),
            ilike(listings.enTitle, searchPattern),
            ilike(listings.shortId, searchPattern),
            ilike(listings.city, searchPattern)
          )
        );
      }

      const [listingList, totalResult] = await Promise.all([
        db.select({
          id: listings.id,
          shortId: listings.shortId,
          arTitle: listings.arTitle,
          enTitle: listings.enTitle,
          city: listings.city,
          type: listings.type,
          purpose: listings.purpose,
          status: listings.status,
          price: listings.price,
          isFeatured: listings.isFeatured,
          featuredUntil: listings.featuredUntil,
          featuredOrder: listings.featuredOrder,
          verified: listings.verified,
          regaAdvertisingLicense: listings.regaAdvertisingLicense,
          viewsCount: listings.viewsCount,
          createdAt: listings.createdAt,
          ownerId: listings.ownerId,
          aiQualificationActive: listings.aiQualificationActive,
          projectId: listings.projectId,
        })
          .from(listings)
          .where(and(...conditions))
          .orderBy(
            ...(query.isFeatured === 'true'
              ? [asc(listings.featuredOrder), desc(listings.createdAt)]
              : [desc(listings.isFeatured), desc(listings.createdAt)])
          )
          .limit(limit)
          .offset(offset),
        db.select({ count: count() }).from(listings).where(and(...conditions)),
      ]);

      // Fetch owner names in one query
      const ownerIds = [...new Set(listingList.map(l => l.ownerId))].filter(Boolean) as string[];
      const owners = ownerIds.length > 0
        ? await db.select({ id: users.id, name: users.name, email: users.email, role: users.role })
          .from(users)
          .where(inArray(users.id, ownerIds))
        : [];
      const ownerMap: Record<string, typeof owners[0]> = {};
      owners.forEach(o => { ownerMap[o.id] = o; });

      return reply.send({
        success: true,
        data: {
          listings: listingList.map(l => ({ ...l, owner: ownerMap[l.ownerId] || null })),
          total: Number(totalResult[0]?.count ?? 0),
          page,
        }
      });
    } catch (err) {
      app.log.error(err);
      return reply.code(500).send({ success: false, message: 'Failed to fetch listings' });
    }
  });

  // ── Update Listing Status ──
  app.patch('/listings/:id/status', { preHandler: [authenticateJWT, requireRole('ADMIN')] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const { status } = request.body as { status: string };
    try {
      const updateFields: any = { status: status as any, updatedAt: new Date() };
      if (status === 'ACTIVE') {
        updateFields.verified = true;
      }
      await db.update(listings)
        .set(updateFields)
        .where(eq(listings.id, id));
      return reply.send({ success: true, message: 'Listing status updated' });
    } catch (err) {
      app.log.error(err);
      return reply.code(500).send({ success: false, message: 'Failed to update listing' });
    }
  });

  // ── Toggle AI Qualification Status ──
  app.patch('/listings/:id/toggle-ai', { preHandler: [authenticateJWT, requireRole('ADMIN')] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const { aiQualificationActive } = request.body as { aiQualificationActive: boolean };
    
    if (typeof aiQualificationActive !== 'boolean') {
      return reply.code(400).send({ success: false, message: 'aiQualificationActive must be a boolean' });
    }
    
    try {
      // 1. Dynamic schema check to make sure the column exists
      await db.execute(sql`ALTER TABLE listings ADD COLUMN IF NOT EXISTS ai_qualification_active BOOLEAN DEFAULT true;`);

      // 2. Perform update
      await db.update(listings)
        .set({ aiQualificationActive, updatedAt: new Date() })
        .where(eq(listings.id, id));
        
      return reply.send({ success: true, message: `Listing AI Qualification set to ${aiQualificationActive}` });
    } catch (err) {
      app.log.error(err);
      return reply.code(500).send({ success: false, message: 'Failed to toggle AI Qualification' });
    }
  });

  // ── Feature a Listing / Edit Date ──
  app.post('/listings/:id/feature', { preHandler: [authenticateJWT, requireRole('ADMIN')] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = request.body as { days?: number; featuredUntil?: string | null };
    const { days } = body;
    // featuredUntil = null means permanent, a string means specific date, undefined means default 7 days
    const hasFeaturedUntil = Object.prototype.hasOwnProperty.call(body, 'featuredUntil');
    const customUntil = body.featuredUntil;

    let featuredUntilValue: Date | null;
    if (hasFeaturedUntil && customUntil === null) {
      // Explicitly set to null = permanent
      featuredUntilValue = null;
    } else if (hasFeaturedUntil && customUntil) {
      featuredUntilValue = new Date(customUntil);
    } else {
      // Default: feature for 7 days
      featuredUntilValue = new Date();
      featuredUntilValue.setDate(featuredUntilValue.getDate() + (days || 7));
    }

    try {
      // Auto-assign featuredOrder if not yet featured (get max current order)
      const existing = await db.select({ isFeatured: listings.isFeatured, featuredOrder: listings.featuredOrder })
        .from(listings).where(eq(listings.id, id));
      let featuredOrder = existing[0]?.featuredOrder;
      if (!existing[0]?.isFeatured || !featuredOrder) {
        const maxOrderResult = await db.select({ maxOrder: sql<number>`COALESCE(MAX(${listings.featuredOrder}), 0)` })
          .from(listings).where(eq(listings.isFeatured, true));
        featuredOrder = (Number(maxOrderResult[0]?.maxOrder) || 0) + 1;
      }

      await db.update(listings)
        .set({ isFeatured: true, featuredUntil: featuredUntilValue, featuredOrder, updatedAt: new Date() })
        .where(eq(listings.id, id));
      return reply.send({ 
        success: true, 
        message: featuredUntilValue ? `Listing featured until ${featuredUntilValue.toISOString()}` : 'Listing featured permanently'
      });
    } catch (err) {
      app.log.error(err);
      return reply.code(500).send({ success: false, message: 'Failed to feature listing' });
    }
  });

  // ── Un-feature a Listing ──
  app.delete('/listings/:id/feature', { preHandler: [authenticateJWT, requireRole('ADMIN')] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    try {
      await db.update(listings)
        .set({ isFeatured: false, featuredUntil: null, updatedAt: new Date() })
        .where(eq(listings.id, id));
      return reply.send({ success: true, message: 'Listing un-featured successfully' });
    } catch (err) {
      app.log.error(err);
      return reply.code(500).send({ success: false, message: 'Failed to un-feature listing' });
    }
  });

  // ── Update Featured Order ──
  app.patch('/listings/:id/featured-order', { preHandler: [authenticateJWT, requireRole('ADMIN')] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const { featuredOrder } = request.body as { featuredOrder: number };
    try {
      await db.execute(sql`ALTER TABLE listings ADD COLUMN IF NOT EXISTS featured_order INTEGER DEFAULT 0;`);
      await db.update(listings)
        .set({ featuredOrder, updatedAt: new Date() })
        .where(eq(listings.id, id));
      return reply.send({ success: true, message: 'Featured order updated' });
    } catch (err) {
      app.log.error(err);
      return reply.code(500).send({ success: false, message: 'Failed to update featured order' });
    }
  });

  // ── Update Featured Expiry Only ──
  app.patch('/listings/:id/featured-expiry', { preHandler: [authenticateJWT, requireRole('ADMIN')] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = request.body as { featuredUntil: string | null };
    const hasFeaturedUntil = Object.prototype.hasOwnProperty.call(body, 'featuredUntil');
    if (!hasFeaturedUntil) {
      return reply.code(400).send({ success: false, message: 'featuredUntil is required' });
    }
    const featuredUntilValue = body.featuredUntil ? new Date(body.featuredUntil) : null;
    try {
      await db.update(listings)
        .set({ featuredUntil: featuredUntilValue, updatedAt: new Date() })
        .where(eq(listings.id, id));
      return reply.send({ 
        success: true, 
        message: featuredUntilValue ? `Expiry updated to ${featuredUntilValue.toISOString()}` : 'Set to permanent'
      });
    } catch (err) {
      app.log.error(err);
      return reply.code(500).send({ success: false, message: 'Failed to update featured expiry' });
    }
  });

  // ── Delete Listing (Admin Override) ──
  app.delete('/listings/:id', { preHandler: [authenticateJWT, requireRole('ADMIN')] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    try {
      await db.update(listings)
        .set({
          deletedAt: new Date(),
          status: 'REMOVED',
          updatedAt: new Date()
        })
        .where(eq(listings.id, id));
      return reply.send({ success: true, message: 'Listing deleted successfully by administrator' });
    } catch (err) {
      app.log.error(err);
      return reply.code(500).send({ success: false, message: 'Failed to delete listing' });
    }
  });

  // ── Get All Settings ──
  app.get('/settings', { preHandler: [authenticateJWT, requireRole('ADMIN')] }, async (request, reply) => {
    try {
      const settings = await db.select().from(systemSettings).orderBy(systemSettings.key);
      return reply.send({ success: true, data: settings });
    } catch (err) {
      app.log.error(err);
      return reply.code(500).send({ success: false, message: 'Failed to fetch settings' });
    }
  });

  // ── Update a Setting ──
  app.put('/settings/:key', { preHandler: [authenticateJWT, requireRole('ADMIN')] }, async (request, reply) => {
    const { key } = request.params as { key: string };
    const { value } = request.body as { value: string };
    if (typeof value !== 'string') {
      return reply.code(400).send({ success: false, message: 'value must be a string' });
    }
    try {
      const result = await db.update(systemSettings)
        .set({ value, updatedAt: new Date() })
        .where(eq(systemSettings.key, key))
        .returning();

      if (!result.length) {
        // Insert if it doesn't exist
        const inserted = await db.insert(systemSettings)
          .values({ key, value, description: null })
          .returning();
        return reply.send({ success: true, data: inserted[0] });
      }
      return reply.send({ success: true, data: result[0] });
    } catch (err) {
      app.log.error(err);
      return reply.code(500).send({ success: false, message: 'Failed to update setting' });
    }
  });

  // ── Legal Pages ──
  app.get('/legal', { preHandler: [authenticateJWT, requireRole('ADMIN')] }, async (request, reply) => {
    try {
      const pages = await db.select().from(legalPages).orderBy(legalPages.slug);
      return reply.send({ success: true, data: pages });
    } catch (err) {
      app.log.error(err);
      return reply.code(500).send({ success: false, message: 'Failed to fetch legal pages' });
    }
  });

  app.put('/legal/:slug', { preHandler: [authenticateJWT, requireRole('ADMIN')] }, async (request, reply) => {
    const { slug } = request.params as { slug: string };
    const data = request.body as any;
    try {
      const updateData: any = {
        updatedAt: data.updatedAt ? new Date(data.updatedAt) : new Date()
      };
      if (data.titleEn !== undefined) updateData.titleEn = data.titleEn;
      if (data.titleAr !== undefined) updateData.titleAr = data.titleAr;
      if (data.contentEn !== undefined) updateData.contentEn = data.contentEn;
      if (data.contentAr !== undefined) updateData.contentAr = data.contentAr;

      const result = await db.update(legalPages)
        .set(updateData)
        .where(eq(legalPages.slug, slug))
        .returning();

      if (!result.length) {
        const insertData: any = {
          slug,
          titleEn: data.titleEn || '',
          titleAr: data.titleAr || '',
          contentEn: data.contentEn || '',
          contentAr: data.contentAr || '',
          updatedAt: data.updatedAt ? new Date(data.updatedAt) : new Date()
        };
        const inserted = await db.insert(legalPages).values(insertData).returning();
        return reply.send({ success: true, data: inserted[0] });
      }
      return reply.send({ success: true, data: result[0] });
    } catch (err) {
      app.log.error(err);
      return reply.code(500).send({ success: false, message: 'Failed to update legal page' });
    }
  });

  // ── News Management ──
  app.get('/news', { preHandler: [authenticateJWT, requireRole('ADMIN')] }, async (request, reply) => {
    try {
      const posts = await db.select().from(news).orderBy(desc(news.createdAt));
      return reply.send({ success: true, data: posts });
    } catch (err) {
      app.log.error(err);
      return reply.code(500).send({ success: false, message: 'Failed to fetch news' });
    }
  });

  app.post('/news', { preHandler: [authenticateJWT, requireRole('ADMIN')] }, async (request, reply) => {
    const body = request.body as any;
    try {
      const insertData: any = {
        titleEn: body.titleEn || '',
        titleAr: body.titleAr || '',
        slug: body.slug || '',
        contentEn: body.contentEn || '',
        contentAr: body.contentAr || '',
        excerptEn: body.excerptEn || null,
        excerptAr: body.excerptAr || null,
        featuredImage: body.featuredImage || null,
        isPublished: !!body.isPublished,
        authorId: (request.user as any).userId,
        publishedAt: body.publishedAt ? new Date(body.publishedAt) : (body.isPublished ? new Date() : null),
        createdAt: body.createdAt ? new Date(body.createdAt) : new Date()
      };

      const result = await db.insert(news).values(insertData).returning();
      return reply.send({ success: true, data: result[0] });
    } catch (err) {
      app.log.error(err);
      return reply.code(500).send({ success: false, message: 'Failed to create news post' });
    }
  });

  app.patch('/news/:id', { preHandler: [authenticateJWT, requireRole('ADMIN')] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = request.body as any;
    try {
      const existing = await db.query.news.findFirst({
        where: eq(news.id, id)
      });
      if (!existing) {
        return reply.code(404).send({ success: false, message: 'News post not found' });
      }

      const updateData: any = {
        updatedAt: new Date()
      };

      if (body.titleEn !== undefined) updateData.titleEn = body.titleEn;
      if (body.titleAr !== undefined) updateData.titleAr = body.titleAr;
      if (body.slug !== undefined) updateData.slug = body.slug;
      if (body.contentEn !== undefined) updateData.contentEn = body.contentEn;
      if (body.contentAr !== undefined) updateData.contentAr = body.contentAr;
      if (body.excerptEn !== undefined) updateData.excerptEn = body.excerptEn;
      if (body.excerptAr !== undefined) updateData.excerptAr = body.excerptAr;
      if (body.featuredImage !== undefined) updateData.featuredImage = body.featuredImage;
      
      if (body.publishedAt !== undefined) {
        updateData.publishedAt = body.publishedAt ? new Date(body.publishedAt) : null;
      }
      if (body.createdAt !== undefined) {
        updateData.createdAt = new Date(body.createdAt);
      }

      if (body.isPublished !== undefined) {
        updateData.isPublished = body.isPublished;
        if (body.publishedAt === undefined) {
          if (body.isPublished && !existing.isPublished) {
            updateData.publishedAt = new Date();
          } else if (!body.isPublished) {
            updateData.publishedAt = null;
          }
        }
      }

      const result = await db.update(news)
        .set(updateData)
        .where(eq(news.id, id))
        .returning();
      return reply.send({ success: true, data: result[0] });
    } catch (err) {
      app.log.error(err);
      return reply.code(500).send({ success: false, message: 'Failed to update news post' });
    }
  });

  app.delete('/news/:id', { preHandler: [authenticateJWT, requireRole('ADMIN')] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    try {
      await db.delete(news).where(eq(news.id, id));
      return reply.send({ success: true, message: 'News post deleted' });
    } catch (err) {
      app.log.error(err);
      return reply.code(500).send({ success: false, message: 'Failed to delete news post' });
    }
  });

  // ── Contact Submissions Management ──
  app.get('/contact-submissions', { preHandler: [authenticateJWT, requireRole('ADMIN')] }, async (request, reply) => {
    try {
      const submissions = await db.select()
        .from(contactSubmissions)
        .orderBy(desc(contactSubmissions.createdAt));
      return reply.send({ success: true, data: submissions });
    } catch (err: any) {
      app.log.error(err);
      return reply.code(500).send({ success: false, message: 'Failed to fetch contact submissions.' });
    }
  });

  app.patch('/contact-submissions/:id/toggle', { preHandler: [authenticateJWT, requireRole('ADMIN')] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    try {
      const [submission] = await db.select().from(contactSubmissions).where(eq(contactSubmissions.id, id)).limit(1);
      if (!submission) {
        return reply.code(404).send({ success: false, message: 'Submission not found.' });
      }
      const [updated] = await db.update(contactSubmissions)
        .set({ isReplied: !submission.isReplied })
        .where(eq(contactSubmissions.id, id))
        .returning();
      return reply.send({ success: true, data: updated });
    } catch (err: any) {
      app.log.error(err);
      return reply.code(500).send({ success: false, message: 'Failed to toggle replied status.' });
    }
  });

  app.delete('/contact-submissions/:id', { preHandler: [authenticateJWT, requireRole('ADMIN')] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    try {
      await db.delete(contactSubmissions).where(eq(contactSubmissions.id, id));
      return reply.send({ success: true, message: 'Submission deleted successfully.' });
    } catch (err: any) {
      app.log.error(err);
      return reply.code(500).send({ success: false, message: 'Failed to delete submission.' });
    }
  });

  // ── Leads & CRM Management Endpoints ──
  app.get('/leads', { preHandler: [authenticateJWT, requireRole('ADMIN')] }, async (request, reply) => {
    const query = request.query as { status?: string; isQualified?: string; search?: string; page?: string; limit?: string };
    const page = parseInt(query.page || '1');
    const limit = Math.min(parseInt(query.limit || '20'), 100);
    const offset = (page - 1) * limit;

    try {
      // 1. Calculate CRM Metrics
      const statsResult = await db.select({
        total: count(),
        qualified: sql<number>`COALESCE(SUM(CASE WHEN ${leads.isQualified} = true THEN 1 ELSE 0 END), 0)`,
        avgIntent: sql<number>`COALESCE(AVG(${leads.intentScoreAtCreation}), 0)`
      }).from(leads);

      const totalLeads = Number(statsResult[0]?.total ?? 0);
      const qualifiedLeads = Number(statsResult[0]?.qualified ?? 0);
      const conversionRate = totalLeads > 0 ? Math.round((qualifiedLeads / totalLeads) * 100) : 0;
      const avgIntentScore = Math.round(Number(statsResult[0]?.avgIntent ?? 0));

      // 2. Fetch Leads List
      const conditions: any[] = [];
      if (query.status) conditions.push(eq(leads.status, query.status as any));
      if (query.isQualified === 'true') conditions.push(eq(leads.isQualified, true));
      if (query.isQualified === 'false') conditions.push(eq(leads.isQualified, false));

      if (query.search) {
        const searchPattern = `%${query.search.toLowerCase()}%`;
        conditions.push(
          or(
            ilike(listings.enTitle, searchPattern),
            ilike(listings.arTitle, searchPattern),
            ilike(listings.shortId, searchPattern),
            ilike(users.name, searchPattern),
            ilike(users.email, searchPattern)
          )
        );
      }

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      const [leadsList, totalResult] = await Promise.all([
        db.select({
          id: leads.id,
          buyerProfileId: leads.buyerProfileId,
          listingId: leads.listingId,
          brokerId: leads.brokerId,
          status: leads.status,
          intentScoreAtCreation: leads.intentScoreAtCreation,
          aiSummary: leads.aiSummary,
          buyerBudgetDisplay: leads.buyerBudgetDisplay,
          buyerTimelineDisplay: leads.buyerTimelineDisplay,
          isQualified: leads.isQualified,
          notifiedWhatsapp: leads.notifiedWhatsapp,
          notifiedEmail: leads.notifiedEmail,
          notifiedAt: leads.notifiedAt,
          createdAt: leads.createdAt,
          listing: {
            id: listings.id,
            shortId: listings.shortId,
            arTitle: listings.arTitle,
            enTitle: listings.enTitle,
            price: listings.price,
            city: listings.city,
          },
          buyer: {
            id: buyerProfiles.id,
            userId: buyerProfiles.userId,
            sessionId: buyerProfiles.sessionId,
            intentScore: buyerProfiles.intentScore,
            lastAiSummary: buyerProfiles.lastAiSummary,
          }
        })
        .from(leads)
        .leftJoin(listings, eq(leads.listingId, listings.id))
        .leftJoin(buyerProfiles, eq(leads.buyerProfileId, buyerProfiles.id))
        .leftJoin(users, eq(buyerProfiles.userId, users.id)) // Joined for searching
        .where(whereClause)
        .orderBy(desc(leads.createdAt))
        .limit(limit)
        .offset(offset),
        db.select({ count: count() })
          .from(leads)
          .leftJoin(listings, eq(leads.listingId, listings.id))
          .leftJoin(buyerProfiles, eq(leads.buyerProfileId, buyerProfiles.id))
          .leftJoin(users, eq(buyerProfiles.userId, users.id))
          .where(whereClause),
      ]);

      // 3. Batch fetch Broker & Buyer User profiles for details
      const buyerUserIds = leadsList.map(l => l.buyer?.userId).filter(Boolean) as string[];
      const brokerUserIds = leadsList.map(l => l.brokerId).filter(Boolean) as string[];
      const userIds = [...new Set([...buyerUserIds, ...brokerUserIds])];

      const usersList = userIds.length > 0
        ? await db.select({ id: users.id, name: users.name, email: users.email, phone: users.phone })
            .from(users)
            .where(inArray(users.id, userIds))
        : [];

      const userMap: Record<string, typeof usersList[0]> = {};
      usersList.forEach(u => { userMap[u.id] = u; });

      const enrichedLeads = leadsList.map(l => {
        const buyerUser = l.buyer?.userId ? userMap[l.buyer.userId] : null;
        const brokerUser = l.brokerId ? userMap[l.brokerId] : null;
        return {
          ...l,
          buyer: l.buyer ? {
            id: l.buyer.id,
            sessionId: l.buyer.sessionId,
            intentScore: l.buyer.intentScore,
            lastAiSummary: l.buyer.lastAiSummary,
            name: buyerUser?.name || null,
            email: buyerUser?.email || null,
            phone: buyerUser?.phone || null,
          } : null,
          broker: brokerUser ? {
            id: brokerUser.id,
            name: brokerUser.name,
            email: brokerUser.email,
            phone: brokerUser.phone,
          } : null,
        };
      });

      return reply.send({
        success: true,
        data: {
          leads: enrichedLeads,
          total: Number(totalResult[0]?.count ?? 0),
          page,
          stats: {
            totalLeads,
            qualifiedLeads,
            conversionRate,
            avgIntentScore
          }
        }
      });
    } catch (err) {
      app.log.error(err);
      return reply.code(500).send({ success: false, message: 'Failed to fetch CRM leads' });
    }
  });

  app.get('/leads/:id/chat-history', { preHandler: [authenticateJWT, requireRole('ADMIN')] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    try {
      const lead = await db.query.leads.findFirst({
        where: eq(leads.id, id),
      });

      if (!lead) {
        return reply.code(404).send({ success: false, message: 'Lead not found' });
      }

      const messages = await db.select()
        .from(chatMessages)
        .where(eq(chatMessages.buyerProfileId, lead.buyerProfileId))
        .orderBy(asc(chatMessages.createdAt));

      return reply.send({
        success: true,
        data: messages,
      });
    } catch (err) {
      app.log.error(err);
      return reply.code(500).send({ success: false, message: 'Failed to fetch chat history' });
    }
  });

  app.patch('/leads/:id/status', { preHandler: [authenticateJWT, requireRole('ADMIN')] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const { status } = request.body as { status: string };

    if (!['NEW', 'VIEWED', 'CONTACTED', 'CLOSED_WON', 'CLOSED_LOST'].includes(status)) {
      return reply.code(400).send({ success: false, message: 'Invalid lead status' });
    }

    try {
      await db.update(leads)
        .set({ status: status as any })
        .where(eq(leads.id, id));
      return reply.send({ success: true, message: 'Lead status updated successfully' });
    } catch (err) {
      app.log.error(err);
      return reply.code(500).send({ success: false, message: 'Failed to update lead status' });
    }
  });

  // ── Create User ──
  app.post('/users', { preHandler: [authenticateJWT, requireRole('ADMIN')] }, async (request, reply) => {
    const { name, email: rawEmail, phone, role, password, regaLicence } = request.body as any;
    if (!rawEmail || !password || !role) {
      return reply.code(400).send({ success: false, message: 'Email, password, and role are required' });
    }
    const email = rawEmail.toLowerCase().trim();
    try {
      const existingUser = await db.query.users.findFirst({
        where: eq(users.email, email),
      });
      if (existingUser) {
        return reply.code(400).send({ success: false, message: 'User with this email already exists' });
      }

      const passwordHash = await AuthService.hashPassword(password);
      const newUsers = await db.insert(users).values({
        email,
        passwordHash,
        name,
        role: role as any,
        phone,
        regaLicence,
        isActive: true,
        verificationStatus: 'VERIFIED',
        regaVerified: false,
      }).returning();

      const { passwordHash: _, ...userWithoutPassword } = newUsers[0];
      return reply.send({ success: true, data: userWithoutPassword });
    } catch (err) {
      app.log.error(err);
      return reply.code(500).send({ success: false, message: 'Failed to create user' });
    }
  });

  // ── Update User Profile / Role / Password ──
  app.patch('/users/:id', { preHandler: [authenticateJWT, requireRole('ADMIN')] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const { name, phone, role, password, regaLicence } = request.body as any;
    try {
      const existingUser = await db.query.users.findFirst({
        where: eq(users.id, id),
      });
      if (!existingUser) {
        return reply.code(404).send({ success: false, message: 'User not found' });
      }

      const updateData: any = {
        updatedAt: new Date(),
      };
      if (name !== undefined) updateData.name = name;
      if (phone !== undefined) updateData.phone = phone;
      if (role !== undefined) updateData.role = role as any;
      if (regaLicence !== undefined) updateData.regaLicence = regaLicence;
      if (password) {
        updateData.passwordHash = await AuthService.hashPassword(password);
      }

      const updatedUsers = await db.update(users)
        .set(updateData)
        .where(eq(users.id, id))
        .returning();

      const { passwordHash: _, ...userWithoutPassword } = updatedUsers[0];
      return reply.send({ success: true, data: userWithoutPassword });
    } catch (err) {
      app.log.error(err);
      return reply.code(500).send({ success: false, message: 'Failed to update user' });
    }
  });

  // ── Mortgage Leads Management ──

  app.get('/mortgage-leads', { preHandler: [authenticateJWT, requireRole('ADMIN')] }, async (request, reply) => {
    const query = request.query as {
      page?: string;
      limit?: string;
      search?: string;
      status?: string;
      bank?: string;
      isCitizen?: string;
      dateStart?: string;
      dateEnd?: string;
    };
    const page = parseInt(query.page || '1');
    const limit = Math.min(parseInt(query.limit || '20'), 100);
    const offset = (page - 1) * limit;

    try {
      const conditions: any[] = [];

      if (query.status) {
        conditions.push(eq(mortgageLeads.status, query.status));
      }
      if (query.bank) {
        conditions.push(eq(mortgageLeads.bankSlug, query.bank));
      }
      if (query.isCitizen !== undefined) {
        conditions.push(eq(mortgageLeads.isCitizen, query.isCitizen === 'true'));
      }
      if (query.search) {
        const searchPattern = `%${query.search}%`;
        conditions.push(or(
          ilike(mortgageLeads.fullName, searchPattern),
          ilike(mortgageLeads.phoneNumber, searchPattern)
        ));
      }
      if (query.dateStart) {
        conditions.push(gte(mortgageLeads.createdAt, new Date(query.dateStart)));
      }
      if (query.dateEnd) {
        conditions.push(sql`${mortgageLeads.createdAt} <= ${new Date(query.dateEnd)}`);
      }

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      const totalResult = await db.select({ count: count() })
        .from(mortgageLeads)
        .where(whereClause);
      const total = Number(totalResult[0]?.count ?? 0);

      const data = await db.select()
        .from(mortgageLeads)
        .where(whereClause)
        .orderBy(desc(mortgageLeads.createdAt))
        .limit(limit)
        .offset(offset);

      // Fetch corresponding listings and projects for target name resolution
      const propertyIds = [...new Set(data.map(l => l.propertyExternalId))].filter(Boolean);

      const matchedListings = propertyIds.length > 0
        ? await db.select({ id: listings.id, shortId: listings.shortId, enTitle: listings.enTitle, arTitle: listings.arTitle })
            .from(listings)
            .where(or(
              inArray(listings.id, propertyIds),
              inArray(listings.shortId, propertyIds)
            ))
        : [];

      const matchedProjects = propertyIds.length > 0
        ? await db.select({ id: projects.id, nameEn: projects.nameEn, nameAr: projects.nameAr })
            .from(projects)
            .where(inArray(projects.id, propertyIds))
        : [];

      const listingsMap = new Map<string, typeof matchedListings[0]>();
      matchedListings.forEach(l => {
        listingsMap.set(l.id, l);
        if (l.shortId) {
          listingsMap.set(l.shortId, l);
        }
      });

      const projectsMap = new Map<string, typeof matchedProjects[0]>();
      matchedProjects.forEach(p => {
        projectsMap.set(p.id, p);
      });

      const enrichedLeads = data.map(l => {
        const listing = listingsMap.get(l.propertyExternalId);
        const project = projectsMap.get(l.propertyExternalId);

        let targetNameEn = '';
        let targetNameAr = '';

        if (listing) {
          targetNameEn = listing.enTitle || 'Untitled Listing';
          targetNameAr = listing.arTitle || 'عقار بدون عنوان';
        } else if (project) {
          targetNameEn = project.nameEn || 'Untitled Project';
          targetNameAr = project.nameAr || 'مشروع بدون عنوان';
        }

        return {
          ...l,
          targetNameEn,
          targetNameAr
        };
      });

      return reply.send({
        success: true,
        data: {
          leads: enrichedLeads,
          pagination: {
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit)
          }
        }
      });
    } catch (err: any) {
      app.log.error(err);
      return reply.code(500).send({ success: false, message: 'Failed to fetch mortgage leads' });
    }
  });

  app.get('/mortgage-leads/export', { preHandler: [authenticateJWT, requireRole('ADMIN')] }, async (request, reply) => {
    const query = request.query as {
      search?: string;
      status?: string;
      bank?: string;
      isCitizen?: string;
      dateStart?: string;
      dateEnd?: string;
    };

    try {
      const conditions: any[] = [];

      if (query.status) {
        conditions.push(eq(mortgageLeads.status, query.status));
      }
      if (query.bank) {
        conditions.push(eq(mortgageLeads.bankSlug, query.bank));
      }
      if (query.isCitizen !== undefined) {
        conditions.push(eq(mortgageLeads.isCitizen, query.isCitizen === 'true'));
      }
      if (query.search) {
        const searchPattern = `%${query.search}%`;
        conditions.push(or(
          ilike(mortgageLeads.fullName, searchPattern),
          ilike(mortgageLeads.phoneNumber, searchPattern)
        ));
      }
      if (query.dateStart) {
        conditions.push(gte(mortgageLeads.createdAt, new Date(query.dateStart)));
      }
      if (query.dateEnd) {
        conditions.push(sql`${mortgageLeads.createdAt} <= ${new Date(query.dateEnd)}`);
      }

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      const leadsData = await db.select()
        .from(mortgageLeads)
        .where(whereClause)
        .orderBy(desc(mortgageLeads.createdAt));

      // Fetch corresponding listings and projects for target name resolution in CSV export
      const propertyIds = [...new Set(leadsData.map(l => l.propertyExternalId))].filter(Boolean);

      const matchedListings = propertyIds.length > 0
        ? await db.select({ id: listings.id, shortId: listings.shortId, enTitle: listings.enTitle })
            .from(listings)
            .where(or(
              inArray(listings.id, propertyIds),
              inArray(listings.shortId, propertyIds)
            ))
        : [];

      const matchedProjects = propertyIds.length > 0
        ? await db.select({ id: projects.id, nameEn: projects.nameEn })
            .from(projects)
            .where(inArray(projects.id, propertyIds))
        : [];

      const listingsMap = new Map<string, typeof matchedListings[0]>();
      matchedListings.forEach(l => {
        listingsMap.set(l.id, l);
        if (l.shortId) {
          listingsMap.set(l.shortId, l);
        }
      });

      const projectsMap = new Map<string, typeof matchedProjects[0]>();
      matchedProjects.forEach(p => {
        projectsMap.set(p.id, p);
      });

      const headers = [
        'ID', 'Full Name', 'Phone Number', 'Monthly Income', 'REDF Supported',
        'Monthly Obligations', 'Property ID', 'Property Target Name', 'Property Price', 'Is Citizen',
        'Is First Home', 'Down Payment Amount', 'Loan Period Years', 'Bank Name',
        'Applied Rate %', 'Monthly Installment', 'Total Loan Amount', 'Total Payable Value',
        'Status', 'Created At'
      ];

      const csvRows = [headers.join(',')];

      for (const lead of leadsData) {
        const listing = listingsMap.get(lead.propertyExternalId);
        const project = projectsMap.get(lead.propertyExternalId);

        let targetName = '';
        if (listing) {
          targetName = listing.enTitle || 'Untitled Listing';
        } else if (project) {
          targetName = project.nameEn || 'Untitled Project';
        } else {
          targetName = lead.propertyExternalId;
        }

        const row = [
          lead.id,
          `"${(lead.fullName || '').replace(/"/g, '""')}"`,
          `"${(lead.phoneNumber || '').replace(/"/g, '""')}"`,
          lead.monthlyIncome || '',
          lead.redfSupported ? 'Yes' : 'No',
          lead.monthlyObligations || '',
          lead.propertyExternalId,
          `"${targetName.replace(/"/g, '""')}"`,
          lead.propertyPrice,
          lead.isCitizen ? 'Yes' : 'No',
          lead.isFirstHome === null ? 'N/A' : (lead.isFirstHome ? 'Yes' : 'No'),
          lead.downPaymentAmount,
          lead.loanPeriodYears,
          `"${(lead.bankNameEn || '').replace(/"/g, '""')}"`,
          lead.appliedRatePct,
          lead.monthlyInstalment,
          lead.totalLoanAmount,
          lead.totalPayableValue,
          lead.status,
          lead.createdAt ? new Date(lead.createdAt).toISOString() : ''
        ];
        csvRows.push(row.join(','));
      }

      const csvString = csvRows.join('\n');

      reply.header('Content-Type', 'text/csv; charset=utf-8');
      reply.header('Content-Disposition', 'attachment; filename=mortgage_leads_export.csv');
      
      return reply.send(csvString);
    } catch (err: any) {
      app.log.error(err);
      return reply.code(500).send({ success: false, message: 'Failed to export mortgage leads.' });
    }
  });

  app.get('/mortgage-leads/:id', { preHandler: [authenticateJWT, requireRole('ADMIN')] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    try {
      const [lead] = await db.select().from(mortgageLeads).where(eq(mortgageLeads.id, id)).limit(1);
      if (!lead) {
        return reply.code(404).send({ success: false, message: 'Lead not found.' });
      }

      // Fetch corresponding listing or project details
      const [listing] = lead.propertyExternalId
        ? await db.select({ enTitle: listings.enTitle, arTitle: listings.arTitle })
            .from(listings)
            .where(or(
              eq(listings.id, lead.propertyExternalId),
              eq(listings.shortId, lead.propertyExternalId)
            ))
            .limit(1)
        : [null];

      const [project] = lead.propertyExternalId && !listing
        ? await db.select({ nameEn: projects.nameEn, nameAr: projects.nameAr })
            .from(projects)
            .where(eq(projects.id, lead.propertyExternalId))
            .limit(1)
        : [null];

      let targetNameEn = '';
      let targetNameAr = '';

      if (listing) {
        targetNameEn = listing.enTitle || 'Untitled Listing';
        targetNameAr = listing.arTitle || 'عقار بدون عنوان';
      } else if (project) {
        targetNameEn = project.nameEn || 'Untitled Project';
        targetNameAr = project.nameAr || 'مشروع بدون عنوان';
      }

      const enrichedLead = {
        ...lead,
        targetNameEn,
        targetNameAr
      };

      return reply.send({ success: true, data: enrichedLead });
    } catch (err: any) {
      app.log.error(err);
      return reply.code(500).send({ success: false, message: 'Failed to fetch mortgage lead details.' });
    }
  });

  app.patch('/mortgage-leads/:id/status', { preHandler: [authenticateJWT, requireRole('ADMIN')] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const { status } = request.body as { status: string };

    if (!status) {
      return reply.code(400).send({ success: false, message: 'Status is required.' });
    }

    try {
      const [updated] = await db.update(mortgageLeads)
        .set({ status })
        .where(eq(mortgageLeads.id, id))
        .returning();

      if (!updated) {
        return reply.code(404).send({ success: false, message: 'Lead not found.' });
      }

      return reply.send({ success: true, data: updated });
    } catch (err: any) {
      app.log.error(err);
      return reply.code(500).send({ success: false, message: 'Failed to update lead status.' });
    }
  });

  /**
   * GET /api/v1/admin/reported-properties
   * Returns reported properties grouped by listing or project with report counts
   */
  app.get('/reported-properties', { preHandler: [authenticateJWT, requireRole('ADMIN')] }, async (request, reply) => {
    try {
      // 1. Group reports by listingId and projectId with counts by status
      const grouped = await db.select({
        listingId: listingReports.listingId,
        projectId: listingReports.projectId,
        count: count(listingReports.id),
        pendingCount: sql<number>`SUM(CASE WHEN ${listingReports.status} = 'PENDING' THEN 1 ELSE 0 END)::int`,
        resolvedCount: sql<number>`SUM(CASE WHEN ${listingReports.status} = 'RESOLVED' THEN 1 ELSE 0 END)::int`,
        dismissedCount: sql<number>`SUM(CASE WHEN ${listingReports.status} = 'DISMISSED' THEN 1 ELSE 0 END)::int`,
      })
        .from(listingReports)
        .groupBy(listingReports.listingId, listingReports.projectId);

      if (grouped.length === 0) {
        return reply.send({ success: true, data: [] });
      }

      const listingIds = grouped.map(g => g.listingId).filter(Boolean) as string[];
      const projectIds = grouped.map(g => g.projectId).filter(Boolean) as string[];

      // 2. Fetch details in parallel
      const [matchedListings, matchedProjects] = await Promise.all([
        listingIds.length > 0
          ? db.select({
              id: listings.id,
              shortId: listings.shortId,
              enTitle: listings.enTitle,
              arTitle: listings.arTitle,
              city: listings.city,
              price: listings.price
            })
              .from(listings)
              .where(inArray(listings.id, listingIds))
          : Promise.resolve([]),
        projectIds.length > 0
          ? db.select({
              id: projects.id,
              nameEn: projects.nameEn,
              nameAr: projects.nameAr,
              city: projects.city
            })
              .from(projects)
              .where(inArray(projects.id, projectIds))
          : Promise.resolve([])
      ]);

      const listingsMap = new Map<string, typeof matchedListings[0]>();
      matchedListings.forEach(l => listingsMap.set(l.id, l));

      const projectsMap = new Map<string, typeof matchedProjects[0]>();
      matchedProjects.forEach(p => projectsMap.set(p.id, p));

      // 3. Enrich the grouped data
      const data = grouped.map(g => {
        if (g.listingId) {
          const listing = listingsMap.get(g.listingId);
          return {
            listingId: g.listingId,
            projectId: null,
            reportCount: Number(g.count),
            pendingCount: Number(g.pendingCount),
            resolvedCount: Number(g.resolvedCount),
            dismissedCount: Number(g.dismissedCount),
            shortId: listing?.shortId || 'Unknown',
            enTitle: listing?.enTitle || 'Untitled Listing',
            arTitle: listing?.arTitle || 'عقار بدون عنوان',
            city: listing?.city || '',
            price: listing?.price || 0,
            type: 'listing',
          };
        } else {
          const project = projectsMap.get(g.projectId!);
          return {
            listingId: null,
            projectId: g.projectId,
            reportCount: Number(g.count),
            pendingCount: Number(g.pendingCount),
            resolvedCount: Number(g.resolvedCount),
            dismissedCount: Number(g.dismissedCount),
            shortId: project?.id ? project.id.slice(0, 8) : 'Unknown',
            enTitle: project?.nameEn || 'Untitled Project',
            arTitle: project?.nameAr || 'مشروع بدون عنوان',
            city: project?.city || '',
            price: 0,
            type: 'project',
          };
        }
      }).sort((a, b) => b.reportCount - a.reportCount);

      return reply.send({ success: true, data });
    } catch (err: any) {
      app.log.error(err);
      return reply.code(500).send({ success: false, message: 'Failed to fetch reported properties.' });
    }
  });

  /**
   * GET /api/v1/admin/reported-properties/:listingId/reports
   * Returns individual report list for a specific listing or project
   */
  app.get('/reported-properties/:listingId/reports', { preHandler: [authenticateJWT, requireRole('ADMIN')] }, async (request, reply) => {
    const { listingId } = request.params as { listingId: string };
    try {
      const reports = await db.select()
        .from(listingReports)
        .where(or(eq(listingReports.listingId, listingId), eq(listingReports.projectId, listingId)))
        .orderBy(desc(listingReports.createdAt));

      return reply.send({ success: true, data: reports });
    } catch (err: any) {
      app.log.error(err);
      return reply.code(500).send({ success: false, message: 'Failed to fetch listing reports.' });
    }
  });

  /**
   * PATCH /api/v1/admin/reported-properties/:listingId/status
   * Updates status of all reports for this listing or project
   */
  app.patch('/reported-properties/:listingId/status', { preHandler: [authenticateJWT, requireRole('ADMIN')] }, async (request, reply) => {
    const { listingId } = request.params as { listingId: string };
    const { status } = request.body as { status: string };

    if (!['PENDING', 'RESOLVED', 'DISMISSED'].includes(status)) {
      return reply.code(400).send({ success: false, message: 'Invalid status value.' });
    }

    try {
      await db.update(listingReports)
        .set({ status })
        .where(or(eq(listingReports.listingId, listingId), eq(listingReports.projectId, listingId)));

      return reply.send({ success: true, message: `All reports marked as ${status}.` });
    } catch (err: any) {
      app.log.error(err);
      return reply.code(500).send({ success: false, message: 'Failed to update reports status.' });
    }
  });

  /**
   * DELETE /api/v1/admin/projects/:id
   * Deletes a project completely (and all linked listings/layouts)
   */
  app.delete('/projects/:id', { preHandler: [authenticateJWT, requireRole('ADMIN')] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    try {
      // 1. Delete listings (layouts) linked to this project
      await db.delete(listings).where(eq(listings.projectId, id));

      // 2. Delete project
      const [deleted] = await db.delete(projects).where(eq(projects.id, id)).returning();
      if (!deleted) {
        return reply.code(404).send({ success: false, message: 'Project not found.' });
      }

      return reply.send({ success: true, message: 'Project and all layout listings deleted successfully.' });
    } catch (err: any) {
      app.log.error(err);
      return reply.code(500).send({ success: false, message: 'Failed to delete project.', error: err.message });
    }
  });

  // ────────────────────────────────────────────────────────
  // Credit Packages CRUD — Admin only
  // ────────────────────────────────────────────────────────

  app.get('/credit-packages', { preHandler: [authenticateJWT, requireRole('ADMIN')] }, async (_req, reply) => {
    try {
      const packages = await db.select().from(creditPackages).orderBy(creditPackages.sortOrder);
      return reply.send({ success: true, data: packages });
    } catch (err: any) {
      app.log.error(err, 'admin credit-packages list error');
      return reply.code(500).send({ success: false, message: 'Failed to load packages' });
    }
  });

  app.post('/credit-packages', { preHandler: [authenticateJWT, requireRole('ADMIN')] }, async (req, reply) => {
    const body = req.body as {
      key: string; nameEn: string; nameAr: string;
      descriptionEn?: string; descriptionAr?: string;
      credits: number; priceSar: number; isPopular?: boolean;
      isActive?: boolean; sortOrder?: number;
    };
    if (!body.key || !body.nameEn || !body.credits || !body.priceSar) {
      return reply.code(400).send({ success: false, message: 'key, nameEn, credits and priceSar are required' });
    }
    try {
      const [pkg] = await db.insert(creditPackages).values({
        key: body.key, nameEn: body.nameEn, nameAr: body.nameAr ?? body.nameEn,
        descriptionEn: body.descriptionEn, descriptionAr: body.descriptionAr,
        credits: body.credits, priceSar: body.priceSar,
        isPopular: body.isPopular ?? false, isActive: body.isActive ?? true,
        sortOrder: body.sortOrder ?? 0,
      }).returning();
      return reply.code(201).send({ success: true, data: pkg });
    } catch (err: any) {
      app.log.error(err, 'admin credit-packages create error');
      if (err.code === '23505') return reply.code(409).send({ success: false, message: 'Package key already exists' });
      return reply.code(500).send({ success: false, message: 'Failed to create package' });
    }
  });

  app.patch('/credit-packages/:id', { preHandler: [authenticateJWT, requireRole('ADMIN')] }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const body = req.body as {
      nameEn?: string; nameAr?: string; descriptionEn?: string; descriptionAr?: string;
      credits?: number; priceSar?: number; isPopular?: boolean;
      isActive?: boolean; sortOrder?: number;
    };
    try {
      const updateData: any = { updatedAt: new Date() };
      if (body.nameEn !== undefined) updateData.nameEn = body.nameEn;
      if (body.nameAr !== undefined) updateData.nameAr = body.nameAr;
      if (body.descriptionEn !== undefined) updateData.descriptionEn = body.descriptionEn;
      if (body.descriptionAr !== undefined) updateData.descriptionAr = body.descriptionAr;
      if (body.credits !== undefined) updateData.credits = body.credits;
      if (body.priceSar !== undefined) updateData.priceSar = body.priceSar;
      if (body.isPopular !== undefined) updateData.isPopular = body.isPopular;
      if (body.isActive !== undefined) updateData.isActive = body.isActive;
      if (body.sortOrder !== undefined) updateData.sortOrder = body.sortOrder;

      const [updated] = await db.update(creditPackages).set(updateData)
        .where(eq(creditPackages.id, id)).returning();
      if (!updated) return reply.code(404).send({ success: false, message: 'Package not found' });
      return reply.send({ success: true, data: updated });
    } catch (err: any) {
      app.log.error(err, 'admin credit-packages update error');
      return reply.code(500).send({ success: false, message: 'Failed to update package' });
    }
  });

  // ────────────────────────────────────────────────────────
  // Admin: All credit orders (cross-broker)
  // ────────────────────────────────────────────────────────
  app.get('/credit-orders', { preHandler: [authenticateJWT, requireRole('ADMIN')] }, async (req, reply) => {
    const query = req.query as { status?: string; page?: string; limit?: string; brokerId?: string };
    const page = Math.max(1, parseInt(query.page ?? '1', 10));
    const limit = Math.min(50, parseInt(query.limit ?? '25', 10));
    const offset = (page - 1) * limit;

    try {
      const conditions = [];
      if (query.status) conditions.push(eq(creditOrders.status, query.status as any));
      if (query.brokerId) conditions.push(eq(creditOrders.brokerId, query.brokerId));

      const orders = await db
        .select({
          id: creditOrders.id,
          status: creditOrders.status,
          creditsAmount: creditOrders.creditsAmount,
          priceSar: creditOrders.priceSar,
          moyasarPaymentId: creditOrders.moyasarPaymentId,
          creditedAt: creditOrders.creditedAt,
          createdAt: creditOrders.createdAt,
          packageKey: creditPackages.key,
          packageNameEn: creditPackages.nameEn,
          brokerName: users.name,
          brokerEmail: users.email,
          brokerId: creditOrders.brokerId,
        })
        .from(creditOrders)
        .innerJoin(creditPackages, eq(creditOrders.packageId, creditPackages.id))
        .innerJoin(users, eq(creditOrders.brokerId, users.id))
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(creditOrders.createdAt))
        .limit(limit).offset(offset);

      const [{ total }] = await db.select({ total: count() }).from(creditOrders)
        .where(conditions.length > 0 ? and(...conditions) : undefined);

      return reply.send({ success: true, data: orders, total: Number(total) });
    } catch (err: any) {
      app.log.error(err, 'admin credit-orders error');
      return reply.code(500).send({ success: false, message: 'Failed to fetch orders' });
    }
  });

  // ────────────────────────────────────────────────────────
  // Admin: Broker credit summary (balance + orders + ledger)
  // ────────────────────────────────────────────────────────
  app.get('/brokers/:id/credits', { preHandler: [authenticateJWT, requireRole('ADMIN')] }, async (req, reply) => {
    const { id } = req.params as { id: string };
    try {
      const [user] = await db.select({
        id: users.id, name: users.name, email: users.email,
        creditsBalance: users.creditsBalance,
      }).from(users).where(eq(users.id, id)).limit(1);

      if (!user) return reply.code(404).send({ success: false, message: 'Broker not found' });

      const [orders, ledgerEntries] = await Promise.all([
        db.select({
          id: creditOrders.id, status: creditOrders.status,
          creditsAmount: creditOrders.creditsAmount, priceSar: creditOrders.priceSar,
          packageNameEn: creditPackages.nameEn,
          creditedAt: creditOrders.creditedAt, createdAt: creditOrders.createdAt,
        }).from(creditOrders)
          .innerJoin(creditPackages, eq(creditOrders.packageId, creditPackages.id))
          .where(eq(creditOrders.brokerId, id))
          .orderBy(desc(creditOrders.createdAt)).limit(50),

        db.select().from(creditLedger)
          .where(eq(creditLedger.brokerId, id))
          .orderBy(desc(creditLedger.createdAt)).limit(100),
      ]);

      return reply.send({
        success: true,
        data: { broker: user, orders, ledger: ledgerEntries },
      });
    } catch (err: any) {
      app.log.error(err, 'admin broker credits error');
      return reply.code(500).send({ success: false, message: 'Failed to fetch broker credits' });
    }
  });

  // Admin grant credits to a broker (creates ledger entry + updates balance)
  app.post('/brokers/:id/credits/grant', { preHandler: [authenticateJWT, requireRole('ADMIN')] }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const adminId = (req as any).user?.id;
    const { amount, description } = req.body as { amount: number; description?: string };

    if (!amount || amount <= 0) {
      return reply.code(400).send({ success: false, message: 'amount must be a positive number' });
    }
    try {
      const [updatedUser] = await db
        .update(users)
        .set({ creditsBalance: sql`${users.creditsBalance} + ${amount}`, updatedAt: new Date() })
        .where(eq(users.id, id))
        .returning({ creditsBalance: users.creditsBalance });

      if (!updatedUser) return reply.code(404).send({ success: false, message: 'Broker not found' });

      await db.insert(creditLedger).values({
        brokerId: id,
        type: 'ADMIN_GRANT',
        amount,
        balanceAfter: updatedUser.creditsBalance ?? 0,
        description: description || `Admin credit grant: ${amount} credits`,
        performedById: adminId,
      });

      return reply.send({ success: true, data: { newBalance: updatedUser.creditsBalance } });
    } catch (err: any) {
      app.log.error(err, 'admin credit grant error');
      return reply.code(500).send({ success: false, message: 'Failed to grant credits' });
    }
  });
}
