import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { authenticateJWT } from '../../middleware/auth.middleware';
import { AiService } from '../../services/ai.service';

export default async function aiRoutes(app: FastifyInstance) {

  /**
   * POST /api/v1/ai/translate
   * Task: Translate and polish a bio or listing description
   */
  app.post('/translate', { preHandler: [authenticateJWT] }, async (request, reply) => {
    const schema = z.object({
      text: z.string().min(1).max(5000),
      fromLang: z.enum(['en', 'ar']),
      toLang: z.enum(['en', 'ar']),
      context: z.enum(['bio', 'listing', 'title']).default('bio'),
    });

    const parsed = schema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ success: false, errors: parsed.error.format() });
    }

    const { text, fromLang, toLang, context } = parsed.data;

    try {
      const result = await AiService.translateAndEnhance(text, fromLang, toLang, context);
      return reply.send({ 
        success: true, 
        data: { translatedText: result } 
      });
    } catch (err) {
      app.log.error(err);
      return reply.code(500).send({ success: false, message: 'AI processing failed' });
    }
  });

  /**
   * POST /api/v1/ai/generate-title
   * Task: Generate a professional headline for a broker
   */
  app.post('/generate-title', { preHandler: [authenticateJWT] }, async (request, reply) => {
    const schema = z.object({
      languages: z.array(z.string()).default([]),
      experience: z.string().default('0'),
      areas: z.array(z.string()).default([]),
      targetLang: z.enum(['en', 'ar']).default('en'),
    });

    const parsed = schema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ success: false, errors: parsed.error.format() });
    }

    const { languages, experience, areas, targetLang } = parsed.data;

    try {
      const result = await AiService.generateProfessionalTitle(languages, experience, areas, targetLang);
      return reply.send({ 
        success: true, 
        data: { title: result } 
      });
    } catch (err) {
      app.log.error(err);
      return reply.code(500).send({ success: false, message: 'AI processing failed' });
    }
  });
}
