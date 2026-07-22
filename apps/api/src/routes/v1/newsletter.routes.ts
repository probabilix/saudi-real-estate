import { FastifyInstance } from 'fastify';
import { db } from '../../db';
import { newsletterSubscribers, users } from '../../db/schema';
import { eq, desc } from 'drizzle-orm';
import { authenticateJWT, requireRole } from '../../middleware/auth.middleware';

export default async function newsletterRoutes(app: FastifyInstance) {
  /**
   * POST /api/v1/newsletter/subscribe
   * Public: Subscribe an email to the newsletter
   */
  app.post('/subscribe', async (request, reply) => {
    const { email, name } = request.body as { email: string; name?: string };
    if (!email || !email.includes('@')) {
      return reply.code(400).send({ success: false, message: 'Invalid email address' });
    }

    try {
      const sanitizedEmail = email.trim().toLowerCase();

      // Check if subscriber already exists
      const [existing] = await db.select().from(newsletterSubscribers)
        .where(eq(newsletterSubscribers.email, sanitizedEmail))
        .limit(1);

      let subscriberName = name?.trim();
      if (!subscriberName) {
        // Auto-lookup registered user name
        const [regUser] = await db.select({ name: users.name }).from(users)
          .where(eq(users.email, sanitizedEmail))
          .limit(1);
        if (regUser?.name) {
          subscriberName = regUser.name;
        }
      }

      if (existing) {
        if (existing.status === 'ACTIVE') {
          // If name is provided or updated, update it
          if (subscriberName && existing.name !== subscriberName) {
            await db.update(newsletterSubscribers)
              .set({ name: subscriberName, updatedAt: new Date() })
              .where(eq(newsletterSubscribers.id, existing.id));
          }
          return reply.send({ success: true, message: 'You are already subscribed!' });
        }
        
        // Re-activate subscription if it was unsubscribed or requested
        const updatePayload: any = { status: 'ACTIVE', updatedAt: new Date() };
        if (subscriberName) {
          updatePayload.name = subscriberName;
        }

        const updated = await db.update(newsletterSubscribers)
          .set(updatePayload)
          .where(eq(newsletterSubscribers.id, existing.id))
          .returning();
        return reply.send({ success: true, data: updated[0], message: 'Subscription reactivated!' });
      }

      const inserted = await db.insert(newsletterSubscribers)
        .values({
          email: sanitizedEmail,
          name: subscriberName || null,
          status: 'ACTIVE',
        })
        .returning();

      return reply.code(201).send({ success: true, data: inserted[0], message: 'Subscribed successfully!' });
    } catch (err) {
      app.log.error(err);
      return reply.code(500).send({ success: false, message: 'Failed to subscribe' });
    }
  });

  /**
   * GET /api/v1/newsletter/check-status?email=...
   * Public: Check if an email is actively subscribed
   */
  app.get('/check-status', async (request, reply) => {
    const { email } = request.query as { email?: string };
    if (!email || !email.includes('@')) {
      return reply.send({ isSubscribed: false });
    }

    try {
      const sanitizedEmail = email.trim().toLowerCase();
      const [existing] = await db.select({ status: newsletterSubscribers.status }).from(newsletterSubscribers)
        .where(eq(newsletterSubscribers.email, sanitizedEmail))
        .limit(1);

      return reply.send({
        success: true,
        isSubscribed: existing?.status === 'ACTIVE',
        status: existing?.status || 'NOT_SUBSCRIBED',
      });
    } catch {
      return reply.send({ isSubscribed: false });
    }
  });

  /**
   * POST /api/v1/newsletter/unsubscribe-request
   * Public: Submit unsubscribe request
   */
  app.post('/unsubscribe-request', async (request, reply) => {
    const { email } = request.body as { email: string };
    if (!email || !email.includes('@')) {
      return reply.code(400).send({ success: false, message: 'Invalid email address' });
    }

    try {
      const sanitizedEmail = email.trim().toLowerCase();

      const [existing] = await db.select().from(newsletterSubscribers)
        .where(eq(newsletterSubscribers.email, sanitizedEmail))
        .limit(1);

      if (!existing) {
        return reply.code(404).send({ success: false, message: 'Email address not found in our subscribers list' });
      }

      if (existing.status === 'UNSUBSCRIBE_REQUESTED') {
        return reply.send({ success: true, message: 'Unsubscribe request already submitted' });
      }

      const updated = await db.update(newsletterSubscribers)
        .set({ status: 'UNSUBSCRIBE_REQUESTED', updatedAt: new Date() })
        .where(eq(newsletterSubscribers.id, existing.id))
        .returning();

      return reply.send({ success: true, data: updated[0], message: 'Unsubscribe request submitted successfully' });
    } catch (err) {
      app.log.error(err);
      return reply.code(500).send({ success: false, message: 'Failed to submit unsubscribe request' });
    }
  });

  /**
   * GET /api/v1/newsletter/admin/list
   * Admin: Get all subscribers and stats
   */
  app.get('/admin/list', { preHandler: [authenticateJWT, requireRole('ADMIN')] }, async (request, reply) => {
    try {
      const list = await db.select().from(newsletterSubscribers)
        .orderBy(desc(newsletterSubscribers.createdAt));

      // Fetch stats directly from status values
      const activeCount = list.filter(s => s.status === 'ACTIVE').length;
      const requestCount = list.filter(s => s.status === 'UNSUBSCRIBE_REQUESTED').length;
      const unsubscribedCount = list.filter(s => s.status === 'UNSUBSCRIBED').length;

      return reply.send({
        success: true,
        data: {
          subscribers: list,
          stats: {
            active: activeCount,
            requested: requestCount,
            unsubscribed: unsubscribedCount,
          }
        }
      });
    } catch (err) {
      app.log.error(err);
      return reply.code(500).send({ success: false, message: 'Failed to fetch subscribers' });
    }
  });

  /**
   * PATCH /api/v1/newsletter/admin/:id/status
   * Admin: Update subscriber status
   */
  app.patch('/admin/:id/status', { preHandler: [authenticateJWT, requireRole('ADMIN')] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const { status } = request.body as { status: string };

    if (!['ACTIVE', 'UNSUBSCRIBE_REQUESTED', 'UNSUBSCRIBED'].includes(status)) {
      return reply.code(400).send({ success: false, message: 'Invalid status value' });
    }

    try {
      const [existing] = await db.select().from(newsletterSubscribers)
        .where(eq(newsletterSubscribers.id, id))
        .limit(1);

      if (!existing) {
        return reply.code(404).send({ success: false, message: 'Subscriber not found' });
      }

      const updated = await db.update(newsletterSubscribers)
        .set({ status, updatedAt: new Date() })
        .where(eq(newsletterSubscribers.id, id))
        .returning();

      return reply.send({ success: true, data: updated[0], message: `Subscriber marked as ${status}` });
    } catch (err) {
      app.log.error(err);
      return reply.code(500).send({ success: false, message: 'Failed to update subscriber status' });
    }
  });

  /**
   * DELETE /api/v1/newsletter/admin/:id
   * Admin: Permanently delete subscriber row
   */
  app.delete('/admin/:id', { preHandler: [authenticateJWT, requireRole('ADMIN')] }, async (request, reply) => {
    const { id } = request.params as { id: string };

    try {
      const [existing] = await db.select().from(newsletterSubscribers)
        .where(eq(newsletterSubscribers.id, id))
        .limit(1);

      if (!existing) {
        return reply.code(404).send({ success: false, message: 'Subscriber not found' });
      }

      await db.delete(newsletterSubscribers)
        .where(eq(newsletterSubscribers.id, id));

      return reply.send({ success: true, message: 'Subscriber permanently deleted' });
    } catch (err) {
      app.log.error(err);
      return reply.code(500).send({ success: false, message: 'Failed to delete subscriber' });
    }
  });
}
