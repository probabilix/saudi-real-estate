import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { authenticateJWT } from '../../middleware/auth.middleware';
import { FirmService } from '../../services/firm.service';

export default async function firmRoutes(app: FastifyInstance) {
  
  /**
   * GET /api/v1/firm/brokers
   * Task: List all brokers belonging to the firm with their stats
   */
  app.get('/brokers', { preHandler: [authenticateJWT] }, async (request, reply) => {
    const user = (request as any).user;
    
    if (user.role !== 'FIRM') {
      return reply.code(403).send({ success: false, message: 'Unauthorized. Firm owner access only.' });
    }

    try {
      const brokers = await FirmService.getFirmBrokers(user.userId);
      return reply.send({ success: true, data: brokers });
    } catch (err) {
      app.log.error(err);
      return reply.code(500).send({ success: false, message: 'Failed to fetch brokers' });
    }
  });

  /**
   * POST /api/v1/firm/brokers/:id/credits
   * Task: Transfer credits from firm to a specific broker
   */
  app.post('/brokers/:id/credits', { preHandler: [authenticateJWT] }, async (request, reply) => {
    const user = (request as any).user;
    const { id: brokerId } = request.params as { id: string };
    
    const schema = z.object({
      amount: z.number().positive(),
    });

    const parsed = schema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ success: false, errors: parsed.error.format() });
    }

    if (user.role !== 'FIRM') {
      return reply.code(403).send({ success: false, message: 'Unauthorized.' });
    }

    try {
      const result = await FirmService.transferCredits(user.userId, brokerId, parsed.data.amount);
      return reply.send(result);
    } catch (err: any) {
      app.log.error(err);
      return reply.code(400).send({ success: false, message: err.message || 'Transfer failed' });
    }
  });

  /**
   * POST /api/v1/firm/brokers/:id/reclaim
   * Task: Reclaim credits from a specific broker back to firm balance
   */
  app.post('/brokers/:id/reclaim', { preHandler: [authenticateJWT] }, async (request, reply) => {
    const user = (request as any).user;
    const { id: brokerId } = request.params as { id: string };
    
    const schema = z.object({
      amount: z.number().positive(),
    });

    const parsed = schema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ success: false, errors: parsed.error.format() });
    }

    if (user.role !== 'FIRM') {
      return reply.code(403).send({ success: false, message: 'Unauthorized.' });
    }

    try {
      const result = await FirmService.reclaimCredits(user.userId, brokerId, parsed.data.amount);
      return reply.send(result);
    } catch (err: any) {
      app.log.error(err);
      return reply.code(400).send({ success: false, message: err.message || 'Reclaim failed' });
    }
  });
}
