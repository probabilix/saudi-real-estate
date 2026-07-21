import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { authenticateJWT, requireRole, optionalAuthenticateJWT } from '../../middleware/auth.middleware';
import { NewsService } from '../../services/news.service';

export default async function newsRoutes(app: FastifyInstance) {
  
  /**
   * GET /api/v1/news
   * Public: Fetch all published news posts
   */
  app.get('/', async (request, reply) => {
    try {
      const posts = await NewsService.getPublishedNews();
      return reply.send({ success: true, data: posts });
    } catch (err) {
      app.log.error(err);
      return reply.code(500).send({ success: false, message: 'Failed to fetch news' });
    }
  });

  /**
   * GET /api/v1/news/admin
   * Admin: Fetch all news posts (including drafts)
   */
  app.get('/admin', { preHandler: [authenticateJWT, requireRole('ADMIN')] }, async (request, reply) => {
    try {
      const posts = await NewsService.getAllNews();
      return reply.send({ success: true, data: posts });
    } catch (err) {
      app.log.error(err);
      return reply.code(500).send({ success: false, message: 'Failed to fetch admin news' });
    }
  });

  /**
   * GET /api/v1/news/:slug
   * Public: Fetch single news post by slug (includes favorited status if authenticated)
   */
  app.get('/:slug', { preHandler: [optionalAuthenticateJWT] }, async (request, reply) => {
    const { slug } = request.params as { slug: string };
    const userId = request.user?.userId;
    try {
      const post = await NewsService.getNewsBySlug(slug, userId);
      if (!post) {
        return reply.code(404).send({ success: false, message: 'Post not found' });
      }
      return reply.send({ success: true, data: post });
    } catch (err) {
      app.log.error(err);
      return reply.code(500).send({ success: false, message: 'Failed to fetch post' });
    }
  });

  /**
   * POST /api/v1/news
   * Admin: Create news post
   */
  app.post('/', { preHandler: [authenticateJWT, requireRole('ADMIN')] }, async (request, reply) => {
    const user = (request as any).user;
    
    const faqItemSchema = z.object({
      questionEn: z.string().min(1, "English question is required"),
      questionAr: z.string().min(1, "Arabic question is required"),
      answerEn: z.string().min(1, "English answer is required"),
      answerAr: z.string().min(1, "Arabic answer is required"),
    });

    const schema = z.object({
      titleEn: z.string().min(1),
      titleAr: z.string().min(1),
      slug: z.string().min(1),
      contentEn: z.string().min(1),
      contentAr: z.string().min(1),
      excerptEn: z.string().optional(),
      excerptAr: z.string().optional(),
      featuredImage: z.string().optional(),
      isPublished: z.boolean().default(false),
      faqs: z.array(faqItemSchema).min(4, "Minimum 4 FAQs required").max(8, "Maximum 8 FAQs allowed").optional(),
    });

    const parsed = schema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ success: false, errors: parsed.error.format() });
    }

    try {
      const post = await NewsService.createNews({ ...parsed.data, authorId: user.userId });
      return reply.send({ success: true, data: post });
    } catch (err: any) {
      app.log.error(err);
      return reply.code(400).send({ success: false, message: err.message || 'Failed to create post' });
    }
  });

  /**
   * PATCH /api/v1/news/:id
   * Admin: Update news post
   */
  app.patch('/:id', { preHandler: [authenticateJWT, requireRole('ADMIN')] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    
    const faqItemSchema = z.object({
      questionEn: z.string().min(1, "English question is required"),
      questionAr: z.string().min(1, "Arabic question is required"),
      answerEn: z.string().min(1, "English answer is required"),
      answerAr: z.string().min(1, "Arabic answer is required"),
    });

    const schema = z.object({
      titleEn: z.string().optional(),
      titleAr: z.string().optional(),
      slug: z.string().optional(),
      contentEn: z.string().optional(),
      contentAr: z.string().optional(),
      excerptEn: z.string().optional(),
      excerptAr: z.string().optional(),
      featuredImage: z.string().optional(),
      isPublished: z.boolean().optional(),
      faqs: z.array(faqItemSchema).min(4, "Minimum 4 FAQs required").max(8, "Maximum 8 FAQs allowed").optional(),
    });

    const parsed = schema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ success: false, errors: parsed.error.format() });
    }

    try {
      const post = await NewsService.updateNews(id, parsed.data);
      return reply.send({ success: true, data: post });
    } catch (err: any) {
      app.log.error(err);
      return reply.code(400).send({ success: false, message: err.message || 'Failed to update post' });
    }
  });

  /**
   * DELETE /api/v1/news/:id
   * Admin: Delete news post
   */
  app.delete('/:id', { preHandler: [authenticateJWT, requireRole('ADMIN')] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    try {
      await NewsService.deleteNews(id);
      return reply.send({ success: true, message: 'Post deleted successfully' });
    } catch (err) {
      app.log.error(err);
      return reply.code(500).send({ success: false, message: 'Failed to delete post' });
    }
  });
}
