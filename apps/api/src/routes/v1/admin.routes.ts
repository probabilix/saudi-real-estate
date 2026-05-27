import { FastifyInstance } from 'fastify';
import { db } from '../../db';
import { users, listings, systemSettings, news, legalPages, contactSubmissions } from '../../db/schema';
import { authenticateJWT, requireRole } from '../../middleware/auth.middleware';
import { eq, desc, asc, count, sql, and, or, ilike, isNull, inArray } from 'drizzle-orm';

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
    const query = request.query as { role?: string; status?: string; search?: string; page?: string; limit?: string };
    const page = parseInt(query.page || '1');
    const limit = Math.min(parseInt(query.limit || '20'), 100);
    const offset = (page - 1) * limit;

    try {
      const conditions: any[] = [];
      if (query.role) conditions.push(eq(users.role, query.role as any));
      if (query.status === 'active') conditions.push(eq(users.isActive, true));
      if (query.status === 'inactive') conditions.push(eq(users.isActive, false));
      if (query.status === 'pending') conditions.push(eq(users.verificationStatus, 'PENDING'));

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
          subscriptionTier: users.subscriptionTier,
          creditsBalance: users.creditsBalance,
          createdAt: users.createdAt,
        })
          .from(users)
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
      await db.update(users)
        .set({ isActive: true, verificationStatus: 'VERIFIED', regaVerified: true, updatedAt: new Date() })
        .where(eq(users.id, id));
      return reply.send({ success: true, message: 'User approved successfully' });
    } catch (err) {
      app.log.error(err);
      return reply.code(500).send({ success: false, message: 'Failed to approve user' });
    }
  });

  // ── Reject User ──
  app.post('/users/:id/reject', { preHandler: [authenticateJWT, requireRole('ADMIN')] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    try {
      await db.update(users)
        .set({ isActive: false, verificationStatus: 'REJECTED', updatedAt: new Date() })
        .where(eq(users.id, id));
      return reply.send({ success: true, message: 'User rejected' });
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
      await db.update(listings)
        .set({ status: status as any, updatedAt: new Date() })
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
    const { days, featuredUntil: customUntil } = request.body as { days?: number; featuredUntil?: string };
    
    let featuredUntil = new Date();
    if (customUntil) {
      featuredUntil = new Date(customUntil);
    } else {
      featuredUntil.setDate(featuredUntil.getDate() + (days || 7));
    }

    try {
      await db.update(listings)
        .set({ isFeatured: true, featuredUntil, updatedAt: new Date() })
        .where(eq(listings.id, id));
      return reply.send({ success: true, message: `Listing featured until ${featuredUntil.toISOString()}` });
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
      await db.update(listings)
        .set({ featuredOrder, updatedAt: new Date() })
        .where(eq(listings.id, id));
      return reply.send({ success: true, message: 'Featured order updated' });
    } catch (err) {
      app.log.error(err);
      return reply.code(500).send({ success: false, message: 'Failed to update featured order' });
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
}
