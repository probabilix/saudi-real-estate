import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { db } from '../../db';
import { wizardLeads } from '../../db/schema';
import { authenticateJWT, requireRole } from '../../middleware/auth.middleware';
import { eq, desc, and, or, ilike, count, sql } from 'drizzle-orm';

const WIZARD_ID = 'buy-in-saudi-eligibility';

// Simple in-memory rate limiter (per IP, 10 req/min)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + 60_000 });
    return true;
  }
  if (entry.count >= 10) return false;
  entry.count++;
  return true;
}

export default async function wizardRoutes(app: FastifyInstance) {

  // ─────────────────────────────────────────────────────────
  // POST /wizard/start  — creates in_progress lead (public)
  // ─────────────────────────────────────────────────────────
  app.post('/start', async (req, reply) => {
    const ip = req.ip || 'unknown';
    if (!checkRateLimit(ip)) {
      return reply.code(429).send({ success: false, message: 'Too many requests. Please try again shortly.' });
    }

    const schema = z.object({
      fullName: z.string().min(2).max(255),
      email: z.string().email(),
      phone: z.string().min(5).max(30),
      citizenship: z.string().min(2).max(100),
      consent: z.literal(true, { errorMap: () => ({ message: 'Consent is required' }) }),
    });

    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ success: false, message: 'Validation failed', errors: parsed.error.flatten() });
    }

    const { fullName, email, phone, citizenship, consent } = parsed.data;
    const normalizedEmail = email.toLowerCase().trim();

    try {
      // Upsert: if same email+wizardId exists within 24h, update instead of duplicate
      const existing = await db.select({ id: wizardLeads.id, status: wizardLeads.status })
        .from(wizardLeads)
        .where(and(
          eq(wizardLeads.email, normalizedEmail),
          eq(wizardLeads.wizardId, WIZARD_ID),
          sql`${wizardLeads.createdAt} > now() - interval '24 hours'`
        ))
        .limit(1);

      if (existing.length > 0) {
        const leadId = existing[0].id;
        // Update with fresh data
        await db.update(wizardLeads)
          .set({ fullName, phone, citizenship, updatedAt: new Date() })
          .where(eq(wizardLeads.id, leadId));
        return reply.send({ success: true, data: { leadId } });
      }

      const [lead] = await db.insert(wizardLeads).values({
        wizardId: WIZARD_ID,
        status: 'in_progress',
        fullName,
        email: normalizedEmail,
        phone,
        citizenship,
        consent,
        answers: {},
        source: WIZARD_ID,
      }).returning({ id: wizardLeads.id });

      return reply.code(201).send({ success: true, data: { leadId: lead.id } });
    } catch (err: any) {
      app.log.error('wizard /start error:', err);
      return reply.code(500).send({ success: false, message: 'Failed to create lead' });
    }
  });

  // ─────────────────────────────────────────────────────────
  // PATCH /wizard/:leadId/answer  — append step answer (public)
  // ─────────────────────────────────────────────────────────
  app.patch('/:leadId/answer', async (req, reply) => {
    const { leadId } = req.params as { leadId: string };

    const schema = z.object({
      stepId: z.string(),
      value: z.string(),
    });

    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ success: false, message: 'Validation failed' });
    }

    const { stepId, value } = parsed.data;

    try {
      const [lead] = await db.select({ answers: wizardLeads.answers })
        .from(wizardLeads)
        .where(eq(wizardLeads.id, leadId))
        .limit(1);

      if (!lead) return reply.code(404).send({ success: false, message: 'Lead not found' });

      const updatedAnswers = { ...(lead.answers as Record<string, string> || {}), [stepId]: value };

      await db.update(wizardLeads)
        .set({ answers: updatedAnswers, updatedAt: new Date() })
        .where(eq(wizardLeads.id, leadId));

      return reply.send({ success: true });
    } catch (err: any) {
      app.log.error({ err }, 'wizard /answer error');
      return reply.code(500).send({ success: false, message: 'Failed to record answer' });
    }
  });

  // ─────────────────────────────────────────────────────────
  // POST /wizard/:leadId/complete  — finalize lead (public)
  // ─────────────────────────────────────────────────────────
  app.post('/:leadId/complete', async (req, reply) => {
    const { leadId } = req.params as { leadId: string };

    const schema = z.object({
      resultKey: z.enum(['resident', 'nonresident-id', 'nonresident-noid']),
    });

    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ success: false, message: 'Invalid resultKey' });
    }

    const tagMap: Record<string, string[]> = {
      'resident':          ['individual', 'resident'],
      'nonresident-id':    ['individual', 'non-resident', 'has-digital-id'],
      'nonresident-noid':  ['individual', 'non-resident', 'needs-digital-id'],
    };

    try {
      await db.update(wizardLeads)
        .set({
          status: 'completed',
          resultKey: parsed.data.resultKey,
          leadTags: tagMap[parsed.data.resultKey],
          crmSyncedAt: null, // mark for CRM sync
          updatedAt: new Date(),
        })
        .where(eq(wizardLeads.id, leadId));

      return reply.send({ success: true });
    } catch (err: any) {
      app.log.error({ err }, 'wizard /complete error');
      return reply.code(500).send({ success: false, message: 'Failed to complete lead' });
    }
  });

  // ─────────────────────────────────────────────────────────
  // GET /wizard/leads  — admin list (ADMIN only)
  // ─────────────────────────────────────────────────────────
  app.get('/leads', { preHandler: [authenticateJWT, requireRole('ADMIN')] }, async (req, reply) => {
    const query = req.query as Record<string, string>;
    const page = Math.max(1, parseInt(query.page || '1', 10));
    const limit = Math.min(50, parseInt(query.limit || '25', 10));
    const offset = (page - 1) * limit;

    const conditions: any[] = [];
    if (query.status) conditions.push(eq(wizardLeads.status, query.status as any));
    if (query.leadStage) conditions.push(eq(wizardLeads.leadStage, query.leadStage));
    if (query.resultKey) conditions.push(eq(wizardLeads.resultKey, query.resultKey));
    if (query.search) {
      conditions.push(or(
        ilike(wizardLeads.fullName, `%${query.search}%`),
        ilike(wizardLeads.email, `%${query.search}%`),
      ));
    }

    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const [leads, [{ total }]] = await Promise.all([
      db.select().from(wizardLeads).where(where).orderBy(desc(wizardLeads.createdAt)).limit(limit).offset(offset),
      db.select({ total: count() }).from(wizardLeads).where(where),
    ]);

    return reply.send({ success: true, data: { leads, total, page } });
  });

  // ─────────────────────────────────────────────────────────
  // GET /wizard/leads/:id  — admin single lead detail (ADMIN only)
  // ─────────────────────────────────────────────────────────
  app.get('/leads/:id', { preHandler: [authenticateJWT, requireRole('ADMIN')] }, async (req, reply) => {
    const { id } = req.params as { id: string };

    const [lead] = await db.select().from(wizardLeads).where(eq(wizardLeads.id, id)).limit(1);

    if (!lead) return reply.code(404).send({ success: false, message: 'Lead not found' });

    return reply.send({ success: true, data: lead });
  });

  // ─────────────────────────────────────────────────────────
  // PATCH /wizard/leads/:id/stage  — update lead stage (ADMIN only)
  // ─────────────────────────────────────────────────────────
  app.patch('/leads/:id/stage', { preHandler: [authenticateJWT, requireRole('ADMIN')] }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const { stage } = req.body as { stage: string };

    const allowedStages = ['NEW', 'CONTACTED', 'ATTEMPTED_CONTACT', 'FOLLOW_UP', 'CLOSED_WON', 'CLOSED_LOST'];
    if (!allowedStages.includes(stage)) {
      return reply.code(400).send({ success: false, message: 'Invalid stage' });
    }

    try {
      const [updated] = await db.update(wizardLeads)
        .set({ leadStage: stage, updatedAt: new Date() })
        .where(eq(wizardLeads.id, id))
        .returning();

      if (!updated) return reply.code(404).send({ success: false, message: 'Lead not found' });

      return reply.send({ success: true, data: updated });
    } catch (err: any) {
      app.log.error({ err }, 'wizard stage update error');
      return reply.code(500).send({ success: false, message: 'Failed to update stage' });
    }
  });

  // ─────────────────────────────────────────────────────────
  // POST /wizard/leads/:id/notes  — add a note to lead (ADMIN only)
  // ─────────────────────────────────────────────────────────
  app.post('/leads/:id/notes', { preHandler: [authenticateJWT, requireRole('ADMIN')] }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const { content } = req.body as { content: string };

    if (!content?.trim()) {
      return reply.code(400).send({ success: false, message: 'Content is required' });
    }

    try {
      const [lead] = await db.select({ notes: wizardLeads.notes })
        .from(wizardLeads)
        .where(eq(wizardLeads.id, id))
        .limit(1);

      if (!lead) return reply.code(404).send({ success: false, message: 'Lead not found' });

      const currentNotes = Array.isArray(lead.notes) ? lead.notes : [];
      const newNote = {
        id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 11),
        content: content.trim(),
        createdAt: new Date().toISOString(),
      };

      const updatedNotes = [newNote, ...currentNotes];

      await db.update(wizardLeads)
        .set({ notes: updatedNotes, updatedAt: new Date() })
        .where(eq(wizardLeads.id, id));

      return reply.send({ success: true, data: newNote });
    } catch (err: any) {
      app.log.error({ err }, 'wizard note addition error');
      return reply.code(500).send({ success: false, message: 'Failed to add note' });
    }
  });
}
