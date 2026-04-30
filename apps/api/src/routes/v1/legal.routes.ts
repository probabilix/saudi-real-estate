import { FastifyInstance } from 'fastify';
import { authenticateJWT, requireRole } from '../../middleware/auth.middleware';
import { db } from '../../db';
import { legalPages } from '../../db/schema';
import { eq } from 'drizzle-orm';

export default async function legalRoutes(app: FastifyInstance) {
  /**
   * GET /api/v1/legal/:slug
   * Public: Fetch a legal page by slug
   */
  app.get('/:slug', async (request, reply) => {
    const { slug } = request.params as { slug: string };
    try {
      const result = await db.select().from(legalPages).where(eq(legalPages.slug, slug)).limit(1);
      const page = result[0];
      if (!page) {
        return reply.code(404).send({ success: false, message: 'Legal page not found' });
      }
      return reply.send({ success: true, data: page });
    } catch (err) {
      app.log.error(err);
      return reply.code(500).send({ success: false, message: 'Failed to fetch legal page' });
    }
  });

  /**
   * PUT /api/v1/legal/:slug
   * Admin: Update a legal page content
   */
  app.put('/:slug', { preHandler: [authenticateJWT, requireRole('ADMIN')] }, async (request, reply) => {
    const { slug } = request.params as { slug: string };
    const body = request.body as any;
    try {
      const result = await db.update(legalPages)
        .set({ ...body, updatedAt: new Date() })
        .where(eq(legalPages.slug, slug))
        .returning();

      if (!result.length) {
        return reply.code(404).send({ success: false, message: 'Legal page not found' });
      }
      return reply.send({ success: true, data: result[0] });
    } catch (err) {
      app.log.error(err);
      return reply.code(500).send({ success: false, message: 'Failed to update legal page' });
    }
  });
}
