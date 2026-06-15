import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { db } from '../../db';
import {
  crmLeads, crmNotes, crmActivities, crmFollowups,
  leads, buyerProfiles, chatMessages, listings, users, projects
} from '../../db/schema';
import { authenticateJWT, requireRole } from '../../middleware/auth.middleware';
import {
  eq, desc, asc, and, or, ilike, isNull, isNotNull, count, sql, inArray, ne,
} from 'drizzle-orm';

// ── Helpers ──
async function logActivity(
  leadId: string,
  leadType: 'WEBSITE' | 'CAMPAIGN',
  activityType: string,
  performedById: string | null,
  metadata?: Record<string, unknown>
) {
  await db.insert(crmActivities).values({
    leadId,
    leadType,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    activityType: activityType as any,
    performedById,
    metadata: metadata ?? null,
  });
}

/**
 * CRM Routes — /api/v1/crm
 * Auth: requires JWT. Role determines data scope.
 * ADMIN: full access to all leads
 * AGENT: only their assigned leads
 */
export default async function crmRoutes(app: FastifyInstance) {

  // ──────────────────────────────────────────────────────────
  // SHARED UTILITIES
  // ──────────────────────────────────────────────────────────

  /** GET /crm/agents — agent list for assignment dropdowns (admin only) */
  app.get('/agents', { preHandler: [authenticateJWT, requireRole('ADMIN')] }, async (req, reply) => {
    const agents = await db
      .select({ id: users.id, name: users.name, email: users.email, role: users.role })
      .from(users)
      .where(and(
        eq(users.isActive, true),
        inArray(users.role, ['AGENT', 'SOLO_BROKER', 'ADMIN', 'SALES_AGENT'])
      ))
      .orderBy(asc(users.name));
    return reply.send({ success: true, data: agents });
  });


  /** GET /crm/followups/today — tasks due today (role-scoped) */
  app.get('/followups/today', { preHandler: [authenticateJWT] }, async (req, reply) => {
    const user = (req as any).user;
    const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
    const todayEnd   = new Date(); todayEnd.setHours(23, 59, 59, 999);

    const cond = and(
      eq(crmFollowups.isCompleted, false),
      sql`${crmFollowups.scheduledAt} >= ${todayStart.toISOString()}`,
      sql`${crmFollowups.scheduledAt} <= ${todayEnd.toISOString()}`,
      user.role !== 'ADMIN' ? eq(crmFollowups.agentId, user.userId) : undefined,
    );

    const followups = await db.select().from(crmFollowups).where(cond).orderBy(asc(crmFollowups.scheduledAt));

    const enrichedFollowups = await Promise.all(followups.map(async (fu) => {
      let leadName = null;
      let propertyName = null;

      if (fu.leadType === 'WEBSITE') {
        const [row] = await db.select({
          buyerProfileId: leads.buyerProfileId,
          enTitle: listings.enTitle,
          arTitle: listings.arTitle
        })
          .from(leads)
          .leftJoin(listings, eq(leads.listingId, listings.id))
          .where(eq(leads.id, fu.leadId))
          .limit(1);

        if (row) {
          propertyName = row.enTitle || row.arTitle || null;
          if (row.buyerProfileId) {
            const bp = await db.query.buyerProfiles.findFirst({
              where: eq(buyerProfiles.id, row.buyerProfileId)
            });
            if (bp?.userId) {
              const u = await db.query.users.findFirst({
                where: eq(users.id, bp.userId)
              });
              if (u) {
                leadName = u.name;
              }
            }
          }
        }
      } else {
        const [lead] = await db.select({
          name: crmLeads.name,
          propertyInterest: crmLeads.propertyInterest
        })
          .from(crmLeads)
          .where(eq(crmLeads.id, fu.leadId))
          .limit(1);

        if (lead) {
          leadName = lead.name;
          propertyName = lead.propertyInterest;
        }
      }

      return {
        ...fu,
        leadName: leadName || 'Anonymous',
        propertyName: propertyName || null,
      };
    }));

    return reply.send({ success: true, data: enrichedFollowups });
  });

  /** PATCH /crm/followups/:id/complete */
  app.patch('/followups/:id/complete', { preHandler: [authenticateJWT] }, async (req, reply) => {
    const { id } = req.params as { id: string };
    await db.update(crmFollowups)
      .set({ isCompleted: true, completedAt: new Date() })
      .where(eq(crmFollowups.id, id));
    const user = (req as any).user;
    // Log — find the followup first for leadId/leadType
    const [fu] = await db.select().from(crmFollowups).where(eq(crmFollowups.id, id)).limit(1);
    if (fu) await logActivity(fu.leadId, fu.leadType, 'FOLLOWUP_COMPLETED', user.userId);
    return reply.send({ success: true });
  });

  // ──────────────────────────────────────────────────────────
  // WEBSITE LEADS (existing `leads` table — extended via CRM)
  // ──────────────────────────────────────────────────────────

  /** GET /crm/website-leads */
  app.get('/website-leads', { preHandler: [authenticateJWT] }, async (req, reply) => {
    const user = (req as any).user;
    const { status, isQualified, search, page = '1', limit = '25' } = req.query as Record<string, string>;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    const conditions = [];
    if (status) conditions.push(eq(leads.status, status as any));
    if (isQualified === 'true')  conditions.push(eq(leads.isQualified, true));
    if (isQualified === 'false') conditions.push(eq(leads.isQualified, false));
    if (user.role !== 'ADMIN')   conditions.push(eq(leads.brokerId, user.userId));

    const where = conditions.length ? and(...conditions) : undefined;

    const [rows, [{ total }]] = await Promise.all([
      db.select({
        lead: leads,
        listing: {
          id: listings.id, shortId: listings.shortId, arTitle: listings.arTitle,
          enTitle: listings.enTitle, price: listings.price, city: listings.city,
          photos: listings.photos,
        },
        buyer: {
          id: buyerProfiles.id, sessionId: buyerProfiles.sessionId,
          intentScore: buyerProfiles.intentScore, lastAiSummary: buyerProfiles.lastAiSummary,
          contactProvided: buyerProfiles.contactProvided,
        },
        agent: { id: users.id, name: users.name, email: users.email },
        project: { id: projects.id, nameEn: projects.nameEn, nameAr: projects.nameAr },
      })
        .from(leads)
        .leftJoin(listings, eq(leads.listingId, listings.id))
        .leftJoin(buyerProfiles, eq(leads.buyerProfileId, buyerProfiles.id))
        .leftJoin(users, eq(leads.brokerId, users.id))
        .leftJoin(projects, eq(leads.projectId, projects.id))
        .where(where)
        .orderBy(desc(leads.createdAt))
        .limit(parseInt(limit))
        .offset(offset),
      db.select({ total: count() }).from(leads).where(where),
    ]);

    const enrichedRows = await Promise.all(rows.map(async (row) => {
      let buyerName = null;
      let buyerEmail = null;
      let buyerPhone = null;
      
      if (row.buyer?.id) {
        const bp = await db.query.buyerProfiles.findFirst({
          where: eq(buyerProfiles.id, row.buyer.id)
        });
        if (bp?.userId) {
          const u = await db.query.users.findFirst({
            where: eq(users.id, bp.userId)
          });
          if (u) {
            buyerName = u.name;
            buyerEmail = u.email;
            buyerPhone = u.phone;
          }
        }
      }
      return {
        ...row,
        buyer: row.buyer ? {
          ...row.buyer,
          name: buyerName,
          email: buyerEmail,
          phone: buyerPhone,
        } : null
      };
    }));

    return reply.send({ success: true, data: { leads: enrichedRows, total: Number(total), page: parseInt(page) } });
  });

  /** GET /crm/website-leads/:id */
  app.get('/website-leads/:id', { preHandler: [authenticateJWT] }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const user = (req as any).user;

    const [row] = await db.select({
      lead: leads,
      listing: {
        id: listings.id, shortId: listings.shortId, arTitle: listings.arTitle,
        enTitle: listings.enTitle, price: listings.price, city: listings.city,
        district: listings.district, type: listings.type, photos: listings.photos,
        regaAdvertisingLicense: listings.regaAdvertisingLicense,
        projectId: listings.projectId,
      },
      buyer: {
        id: buyerProfiles.id, sessionId: buyerProfiles.sessionId,
        intentScore: buyerProfiles.intentScore, lastAiSummary: buyerProfiles.lastAiSummary,
        budgetMin: buyerProfiles.budgetMin, budgetMax: buyerProfiles.budgetMax,
        cityPreference: buyerProfiles.cityPreference, contactProvided: buyerProfiles.contactProvided,
        timelineMonths: buyerProfiles.timelineMonths,
        purpose: buyerProfiles.purpose, propertyType: buyerProfiles.propertyType,
        completionStatusPreference: buyerProfiles.completionStatusPreference,
        districtPreference: buyerProfiles.districtPreference,
      },
      agent: { id: users.id, name: users.name, email: users.email, phone: users.phone },
      project: { id: projects.id, nameEn: projects.nameEn, nameAr: projects.nameAr },
    })
      .from(leads)
      .leftJoin(listings, eq(leads.listingId, listings.id))
      .leftJoin(buyerProfiles, eq(leads.buyerProfileId, buyerProfiles.id))
      .leftJoin(users, eq(leads.brokerId, users.id))
      .leftJoin(projects, eq(leads.projectId, projects.id))
      .where(eq(leads.id, id))
      .limit(1);

    if (!row) return reply.code(404).send({ success: false, message: 'Lead not found' });
    if (user.role !== 'ADMIN' && row.lead.brokerId !== user.userId)
      return reply.code(403).send({ success: false, message: 'Forbidden' });

    let buyerName = null;
    let buyerEmail = null;
    let buyerPhone = null;
    
    if (row.buyer?.id) {
      const bp = await db.query.buyerProfiles.findFirst({
        where: eq(buyerProfiles.id, row.buyer.id)
      });
      if (bp?.userId) {
        const u = await db.query.users.findFirst({
          where: eq(users.id, bp.userId)
        });
        if (u) {
          buyerName = u.name;
          buyerEmail = u.email;
          buyerPhone = u.phone;
        }
      }
    }

    const enrichedBuyer = row.buyer ? {
      ...row.buyer,
      name: buyerName,
      email: buyerEmail,
      phone: buyerPhone,
    } : null;

    const [chatHistory, projectChatHistory, notes, activities, followups] = await Promise.all([
      db.select().from(chatMessages)
        .where(and(
          eq(chatMessages.buyerProfileId, row.lead.buyerProfileId),
          eq(chatMessages.listingId, row.lead.listingId)
        ))
        .orderBy(asc(chatMessages.createdAt)),
      row.listing?.projectId
        ? db.select().from(chatMessages)
            .where(and(
              eq(chatMessages.buyerProfileId, row.lead.buyerProfileId),
              eq(chatMessages.projectId, row.listing.projectId!)
            ))
            .orderBy(asc(chatMessages.createdAt))
        : Promise.resolve([]),
      db.select().from(crmNotes)
        .where(and(eq(crmNotes.leadId, id), eq(crmNotes.leadType, 'WEBSITE')))
        .orderBy(desc(crmNotes.createdAt)),
      db.select().from(crmActivities)
        .where(and(eq(crmActivities.leadId, id), eq(crmActivities.leadType, 'WEBSITE')))
        .orderBy(desc(crmActivities.createdAt)),
      db.select().from(crmFollowups)
        .where(and(eq(crmFollowups.leadId, id), eq(crmFollowups.leadType, 'WEBSITE')))
        .orderBy(asc(crmFollowups.scheduledAt)),
    ]);

    return reply.send({ success: true, data: { ...row, buyer: enrichedBuyer, chatHistory, projectChatHistory, notes, activities, followups } });
  });

  /** PATCH /crm/website-leads/:id/status */
  app.patch('/website-leads/:id/status', { preHandler: [authenticateJWT] }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const user = (req as any).user;
    const { status } = req.body as { status: string };

    const [existing] = await db.select().from(leads).where(eq(leads.id, id)).limit(1);
    if (!existing) return reply.code(404).send({ success: false, message: 'Not found' });
    if (user.role !== 'ADMIN' && existing.brokerId !== user.userId)
      return reply.code(403).send({ success: false, message: 'Forbidden' });

    await db.update(leads).set({ status: status as any }).where(eq(leads.id, id));
    await logActivity(id, 'WEBSITE', 'STATUS_CHANGE', user.userId, { from: existing.status, to: status });
    return reply.send({ success: true });
  });

  /** PATCH /crm/website-leads/:id/assign (Admin only) */
  app.patch('/website-leads/:id/assign', { preHandler: [authenticateJWT, requireRole('ADMIN')] }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const user = (req as any).user;
    const { agentId } = req.body as { agentId: string };
    await db.update(leads).set({ brokerId: agentId }).where(eq(leads.id, id));
    await logActivity(id, 'WEBSITE', 'ASSIGNED', user.userId, { assignedTo: agentId });
    return reply.send({ success: true });
  });

  /** POST /crm/website-leads/:id/notes */
  app.post('/website-leads/:id/notes', { preHandler: [authenticateJWT] }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const user = (req as any).user;
    const { content } = req.body as { content: string };
    if (!content?.trim()) return reply.code(400).send({ success: false, message: 'Note content required' });

    const [note] = await db.insert(crmNotes).values({ leadId: id, leadType: 'WEBSITE', agentId: user.userId, content }).returning();
    await logActivity(id, 'WEBSITE', 'NOTE_ADDED', user.userId);
    return reply.send({ success: true, data: note });
  });

  /** PATCH /crm/notes/:id */
  app.patch('/notes/:id', { preHandler: [authenticateJWT] }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const user = (req as any).user;
    const { content } = req.body as { content: string };
    if (!content?.trim()) return reply.code(400).send({ success: false, message: 'Note content required' });

    const [existing] = await db.select().from(crmNotes).where(eq(crmNotes.id, id)).limit(1);
    if (!existing) return reply.code(404).send({ success: false, message: 'Note not found' });

    let isAssignedAgent = false;
    if (existing.leadType === 'WEBSITE') {
      const [lead] = await db.select({ brokerId: leads.brokerId }).from(leads).where(eq(leads.id, existing.leadId)).limit(1);
      if (lead && lead.brokerId === user.userId) {
        isAssignedAgent = true;
      }
    } else {
      const [lead] = await db.select({ assignedAgentId: crmLeads.assignedAgentId }).from(crmLeads).where(eq(crmLeads.id, existing.leadId)).limit(1);
      if (lead && lead.assignedAgentId === user.userId) {
        isAssignedAgent = true;
      }
    }

    if (user.role !== 'ADMIN' && existing.agentId !== user.userId && !isAssignedAgent)
      return reply.code(403).send({ success: false, message: 'Forbidden' });

    const [updated] = await db.update(crmNotes)
      .set({ content })
      .where(eq(crmNotes.id, id))
      .returning();

    await logActivity(existing.leadId, existing.leadType, 'NOTE_ADDED', user.userId, { edited: true });
    return reply.send({ success: true, data: updated });
  });

  /** POST /crm/website-leads/:id/followups */
  app.post('/website-leads/:id/followups', { preHandler: [authenticateJWT] }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const user = (req as any).user;
    const { scheduledAt, note } = req.body as { scheduledAt: string; note?: string };
    const [fu] = await db.insert(crmFollowups).values({
      leadId: id, leadType: 'WEBSITE', agentId: user.userId,
      scheduledAt: new Date(scheduledAt), note,
    }).returning();
    await logActivity(id, 'WEBSITE', 'FOLLOWUP_SCHEDULED', user.userId, { scheduledAt });
    return reply.send({ success: true, data: fu });
  });

  /** POST /crm/website-leads/:id/whatsapp — log WA contact attempt */
  app.post('/website-leads/:id/whatsapp', { preHandler: [authenticateJWT] }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const user = (req as any).user;
    await logActivity(id, 'WEBSITE', 'WHATSAPP_CONTACT', user.userId);
    return reply.send({ success: true });
  });

  // ──────────────────────────────────────────────────────────
  // CAMPAIGN LEADS (crm_leads table)
  // ──────────────────────────────────────────────────────────

  /** GET /crm/campaign-leads */
  app.get('/campaign-leads', { preHandler: [authenticateJWT] }, async (req, reply) => {
    const user = (req as any).user;
    const { status, source, search, assigned, page = '1', limit = '50' } = req.query as Record<string, string>;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    const conditions = [];
    if (status)  conditions.push(eq(crmLeads.status, status as any));
    if (source)  conditions.push(eq(crmLeads.source, source as any));
    if (assigned === 'false') conditions.push(isNull(crmLeads.assignedAgentId));
    if (search) {
      conditions.push(or(
        ilike(crmLeads.name, `%${search}%`),
        ilike(crmLeads.phone, `%${search}%`),
        ilike(crmLeads.email, `%${search}%`),
      ));
    }
    if (user.role !== 'ADMIN') conditions.push(eq(crmLeads.assignedAgentId, user.userId));

    const where = conditions.length ? and(...conditions) : undefined;

    const [rows, [{ total }], [{ unassigned }]] = await Promise.all([
      db.select({
        lead: crmLeads,
        agent: { id: users.id, name: users.name, email: users.email },
      })
        .from(crmLeads)
        .leftJoin(users, eq(crmLeads.assignedAgentId, users.id))
        .where(where)
        .orderBy(desc(crmLeads.createdAt))
        .limit(parseInt(limit))
        .offset(offset),
      db.select({ total: count() }).from(crmLeads).where(where),
      db.select({ unassigned: count() }).from(crmLeads).where(isNull(crmLeads.assignedAgentId)),
    ]);

    return reply.send({ success: true, data: { leads: rows, total: Number(total), unassigned: Number(unassigned), page: parseInt(page) } });
  });

  /** POST /crm/campaign-leads — manual entry */
  app.post('/campaign-leads', { preHandler: [authenticateJWT] }, async (req, reply) => {
    const schema = z.object({
      name: z.string().min(1).max(255),
      phone: z.string().min(5).max(30),
      email: z.string().email().optional(),
      cityPreference: z.string().max(100).optional(),
      propertyInterest: z.string().max(100).optional(),
      source: z.enum(['META_ADS', 'SNAPCHAT', 'TIKTOK', 'WHATSAPP', 'MANUAL']).default('MANUAL'),
      assignedAgentId: z.string().uuid().optional(),
      campaignDetails: z.record(z.unknown()).optional(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ success: false, errors: parsed.error.format() });

    const user = (req as any).user;
    const d = parsed.data;

    // Duplicate check
    const [existing] = await db.select({ id: crmLeads.id })
      .from(crmLeads).where(eq(crmLeads.phone, d.phone)).limit(1);

    const [lead] = await db.insert(crmLeads).values({
      ...d,
      isDuplicate: !!existing,
    }).returning();

    await logActivity(lead.id, 'CAMPAIGN', 'CREATED', user.userId, { source: d.source });
    if (d.assignedAgentId) {
      await logActivity(lead.id, 'CAMPAIGN', 'ASSIGNED', user.userId, { assignedTo: d.assignedAgentId });
    }

    return reply.code(201).send({ success: true, data: lead, isDuplicate: !!existing, existingId: existing?.id });
  });

  /** GET /crm/campaign-leads/:id */
  app.get('/campaign-leads/:id', { preHandler: [authenticateJWT] }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const user = (req as any).user;

    const [row] = await db.select({
      lead: crmLeads,
      agent: { id: users.id, name: users.name, email: users.email, phone: users.phone },
    })
      .from(crmLeads)
      .leftJoin(users, eq(crmLeads.assignedAgentId, users.id))
      .where(eq(crmLeads.id, id))
      .limit(1);

    if (!row) return reply.code(404).send({ success: false, message: 'Lead not found' });
    if (user.role !== 'ADMIN' && row.lead.assignedAgentId !== user.userId)
      return reply.code(403).send({ success: false, message: 'Forbidden' });

    const [notes, activities, followups] = await Promise.all([
      db.select().from(crmNotes)
        .where(and(eq(crmNotes.leadId, id), eq(crmNotes.leadType, 'CAMPAIGN')))
        .orderBy(desc(crmNotes.createdAt)),
      db.select().from(crmActivities)
        .where(and(eq(crmActivities.leadId, id), eq(crmActivities.leadType, 'CAMPAIGN')))
        .orderBy(desc(crmActivities.createdAt)),
      db.select().from(crmFollowups)
        .where(and(eq(crmFollowups.leadId, id), eq(crmFollowups.leadType, 'CAMPAIGN')))
        .orderBy(asc(crmFollowups.scheduledAt)),
    ]);

    return reply.send({ success: true, data: { ...row, notes, activities, followups } });
  });

  /** PATCH /crm/campaign-leads/:id/status */
  app.patch('/campaign-leads/:id/status', { preHandler: [authenticateJWT] }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const user = (req as any).user;
    const { status } = req.body as { status: string };

    const [existing] = await db.select().from(crmLeads).where(eq(crmLeads.id, id)).limit(1);
    if (!existing) return reply.code(404).send({ success: false, message: 'Not found' });
    if (user.role !== 'ADMIN' && existing.assignedAgentId !== user.userId)
      return reply.code(403).send({ success: false, message: 'Forbidden' });

    await db.update(crmLeads).set({ status: status as any, updatedAt: new Date() }).where(eq(crmLeads.id, id));
    await logActivity(id, 'CAMPAIGN', 'STATUS_CHANGE', user.userId, { from: existing.status, to: status });
    return reply.send({ success: true });
  });

  /** PATCH /crm/campaign-leads/:id/assign (Admin only) */
  app.patch('/campaign-leads/:id/assign', { preHandler: [authenticateJWT, requireRole('ADMIN')] }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const user = (req as any).user;
    const { agentId } = req.body as { agentId: string | null };
    await db.update(crmLeads).set({ assignedAgentId: agentId, updatedAt: new Date() }).where(eq(crmLeads.id, id));
    await logActivity(id, 'CAMPAIGN', 'ASSIGNED', user.userId, { assignedTo: agentId });
    return reply.send({ success: true });
  });

  /** PATCH /crm/campaign-leads/:id/score */
  app.patch('/campaign-leads/:id/score', { preHandler: [authenticateJWT] }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const user = (req as any).user;
    const { score } = req.body as { score: number };
    if (score < 0 || score > 5) return reply.code(400).send({ success: false, message: 'Score must be 0-5' });
    await db.update(crmLeads).set({ leadScore: score, updatedAt: new Date() }).where(eq(crmLeads.id, id));
    await logActivity(id, 'CAMPAIGN', 'SCORE_UPDATED', user.userId, { score });
    return reply.send({ success: true });
  });

  /** POST /crm/campaign-leads/:id/notes */
  app.post('/campaign-leads/:id/notes', { preHandler: [authenticateJWT] }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const user = (req as any).user;
    const { content } = req.body as { content: string };
    if (!content?.trim()) return reply.code(400).send({ success: false, message: 'Note content required' });

    const [note] = await db.insert(crmNotes).values({ leadId: id, leadType: 'CAMPAIGN', agentId: user.userId, content }).returning();
    await logActivity(id, 'CAMPAIGN', 'NOTE_ADDED', user.userId);
    return reply.send({ success: true, data: note });
  });

  /** POST /crm/campaign-leads/:id/followups */
  app.post('/campaign-leads/:id/followups', { preHandler: [authenticateJWT] }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const user = (req as any).user;
    const { scheduledAt, note } = req.body as { scheduledAt: string; note?: string };
    const [fu] = await db.insert(crmFollowups).values({
      leadId: id, leadType: 'CAMPAIGN', agentId: user.userId,
      scheduledAt: new Date(scheduledAt), note,
    }).returning();
    await logActivity(id, 'CAMPAIGN', 'FOLLOWUP_SCHEDULED', user.userId, { scheduledAt });
    return reply.send({ success: true, data: fu });
  });

  /** POST /crm/campaign-leads/:id/whatsapp */
  app.post('/campaign-leads/:id/whatsapp', { preHandler: [authenticateJWT] }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const user = (req as any).user;
    await logActivity(id, 'CAMPAIGN', 'WHATSAPP_CONTACT', user.userId);
    return reply.send({ success: true });
  });

  /** DELETE /crm/campaign-leads/:id (Admin only) */
  app.delete('/campaign-leads/:id', { preHandler: [authenticateJWT, requireRole('ADMIN')] }, async (req, reply) => {
    const { id } = req.params as { id: string };
    await db.delete(crmLeads).where(eq(crmLeads.id, id));
    return reply.send({ success: true });
  });

  // ──────────────────────────────────────────────────────────
  // ANALYTICS DASHBOARD
  // ──────────────────────────────────────────────────────────

  /** GET /crm/dashboard */
  app.get('/dashboard', { preHandler: [authenticateJWT] }, async (req, reply) => {
    const user = (req as any).user;
    const isAdmin = user.role === 'ADMIN';

    const agentFilter = isAdmin ? undefined : eq(crmLeads.assignedAgentId, user.userId);
    const leadsAgentFilter = isAdmin ? undefined : eq(leads.brokerId, user.userId);

    const [
      campaignByStatus,
      campaignBySource,
      websiteByStatus,
      unassignedCount,
      todayFollowupCount,
      agentLeaderboard,
    ] = await Promise.all([
      // Campaign leads by pipeline stage
      db.select({ status: crmLeads.status, count: count() })
        .from(crmLeads)
        .where(agentFilter)
        .groupBy(crmLeads.status),

      // Campaign leads by source
      db.select({ source: crmLeads.source, count: count() })
        .from(crmLeads)
        .where(agentFilter)
        .groupBy(crmLeads.source),

      // Website leads by status
      db.select({ status: leads.status, count: count() })
        .from(leads)
        .where(leadsAgentFilter)
        .groupBy(leads.status),

      // Unassigned campaign leads (admin only)
      isAdmin
        ? db.select({ count: count() }).from(crmLeads).where(isNull(crmLeads.assignedAgentId))
        : Promise.resolve([{ count: 0 }]),

      // Today's followups
      db.select({ count: count() }).from(crmFollowups).where(and(
        eq(crmFollowups.isCompleted, false),
        sql`DATE(${crmFollowups.scheduledAt}) = CURRENT_DATE`,
        isAdmin ? undefined : eq(crmFollowups.agentId, user.userId),
      )),

      // Agent leaderboard (admin only)
      isAdmin
        ? db.select({
            agentId: crmLeads.assignedAgentId,
            agentName: users.name,
            total: count(),
            won: sql<number>`SUM(CASE WHEN ${crmLeads.status} = 'CLOSED_WON' THEN 1 ELSE 0 END)`.as('won'),
          })
          .from(crmLeads)
          .leftJoin(users, eq(crmLeads.assignedAgentId, users.id))
          .where(isNotNull(crmLeads.assignedAgentId))
          .groupBy(crmLeads.assignedAgentId, users.name)
          .orderBy(desc(sql`won`))
          .limit(10)
        : Promise.resolve([]),
    ]);

    return reply.send({
      success: true,
      data: {
        campaignByStatus,
        campaignBySource,
        websiteByStatus,
        unassignedCount: Number((unassignedCount as any)[0]?.count ?? 0),
        todayFollowupCount: Number(todayFollowupCount[0]?.count ?? 0),
        agentLeaderboard,
      },
    });
  });

  // ──────────────────────────────────────────────────────────
  // WEBHOOK SETTINGS
  // ──────────────────────────────────────────────────────────

  /** GET /crm/settings (Admin only) */
  app.get('/settings', { preHandler: [authenticateJWT, requireRole('ADMIN')] }, async (req, reply) => {
    const { systemSettings } = await import('../../db/schema');
    const rows = await db.select().from(systemSettings)
      .where(
        or(
          eq(systemSettings.key, 'META_VERIFY_TOKEN'),
          eq(systemSettings.key, 'META_PAGE_ACCESS_TOKEN'),
          eq(systemSettings.key, 'SNAPCHAT_ACCESS_TOKEN'),
          eq(systemSettings.key, 'TIKTOK_ACCESS_TOKEN'),
        )
      );
    return reply.send({ success: true, data: rows });
  });

  /** PUT /crm/settings/:key (Admin only) */
  app.put('/settings/:key', { preHandler: [authenticateJWT, requireRole('ADMIN')] }, async (req, reply) => {
    const { key } = req.params as { key: string };
    const { value } = req.body as { value: string };
    const allowedKeys = ['META_VERIFY_TOKEN', 'META_PAGE_ACCESS_TOKEN', 'SNAPCHAT_ACCESS_TOKEN', 'TIKTOK_ACCESS_TOKEN'];
    if (!allowedKeys.includes(key)) return reply.code(400).send({ success: false, message: 'Invalid key' });

    const { systemSettings } = await import('../../db/schema');
    await db.insert(systemSettings)
      .values({ key, value, description: `CRM webhook token for ${key}` })
      .onConflictDoUpdate({ target: systemSettings.key, set: { value, updatedAt: new Date() } });
    return reply.send({ success: true });
  });

  // ──────────────────────────────────────────────────────────
  // META WEBHOOK (public — no JWT, signature verified)
  // ──────────────────────────────────────────────────────────

  /** GET /crm/webhooks/meta — Hub challenge verification */
  app.get('/webhooks/meta', async (req, reply) => {
    const { 'hub.mode': mode, 'hub.verify_token': token, 'hub.challenge': challenge } = req.query as Record<string, string>;
    const { db: database } = await import('../../db');
    const { systemSettings } = await import('../../db/schema');
    const [setting] = await database.select().from(systemSettings)
      .where(eq(systemSettings.key, 'META_VERIFY_TOKEN')).limit(1);
    const verifyToken = setting?.value;

    if (mode === 'subscribe' && token === verifyToken) {
      return reply.type('text/plain').send(challenge);
    }
    return reply.code(403).send('Forbidden');
  });

  /** POST /crm/webhooks/meta — Lead Ads payload */
  app.post('/webhooks/meta', async (req, reply) => {
    try {
      const body = req.body as any;
      const { systemSettings } = await import('../../db/schema');
      const [pageSetting] = await db.select().from(systemSettings)
        .where(eq(systemSettings.key, 'META_PAGE_ACCESS_TOKEN')).limit(1);
      const pageToken = pageSetting?.value;
      if (!pageToken) {
        app.log.warn('Meta webhook received but META_PAGE_ACCESS_TOKEN not configured');
        return reply.send('EVENT_RECEIVED');
      }

      // Parse Meta Lead Ads structure
      for (const entry of (body.entry ?? [])) {
        for (const change of (entry.changes ?? [])) {
          if (change.field === 'leadgen' && change.value?.leadgen_id) {
            const leadgenId = change.value.leadgen_id;
            const campaignName = change.value.campaign_name ?? '';
            const adsetName = change.value.adset_name ?? '';
            const formId = change.value.form_id ?? '';

            // Fetch lead details from Meta Graph API with explicit fields
            try {
              const metaRes = await fetch(
                `https://graph.facebook.com/v19.0/${leadgenId}?fields=id,created_time,field_data,campaign_id,campaign_name,adset_id,adset_name,ad_id,ad_name,form_id&access_token=${pageToken}`
              );
              const metaData = await metaRes.json();

              const fields: Record<string, string> = {};
              for (const f of (metaData.field_data ?? [])) {
                fields[f.name] = f.values?.[0] ?? '';
              }

              const name  = fields['full_name'] || fields['first_name'] ? `${fields['first_name'] ?? ''} ${fields['last_name'] ?? ''}`.trim() : 'Unknown';
              let phone = fields['phone_number'] || fields['phone'] || '';
              if (phone.length > 30) {
                phone = phone.substring(0, 30);
              }
              const email = fields['email'] || undefined;

              if (!phone && !email) continue; // Skip if no contact info

              // Duplicate check
              const [dup] = phone
                ? await db.select({ id: crmLeads.id }).from(crmLeads).where(eq(crmLeads.phone, phone)).limit(1)
                : [];

              // Look up ad creative if ad_id is present
              let facebookPostUrl = '';
              let instagramPostUrl = '';
              const adId = metaData.ad_id;
              if (adId) {
                try {
                  const adRes = await fetch(
                    `https://graph.facebook.com/v19.0/${adId}?fields=creative&access_token=${pageToken}`
                  );
                  if (adRes.ok) {
                    const adData = await adRes.json();
                    const creativeId = adData.creative?.id;
                    if (creativeId) {
                      const creativeRes = await fetch(
                        `https://graph.facebook.com/v19.0/${creativeId}?fields=effective_object_story_id,instagram_permalink_url&access_token=${pageToken}`
                      );
                      if (creativeRes.ok) {
                        const creativeData = await creativeRes.json();
                        if (creativeData.effective_object_story_id) {
                          facebookPostUrl = `https://facebook.com/${creativeData.effective_object_story_id}`;
                        }
                        if (creativeData.instagram_permalink_url) {
                          instagramPostUrl = creativeData.instagram_permalink_url;
                        }
                      }
                    }
                  }
                } catch (adErr) {
                  app.log.error(adErr as any, 'Meta Graph API ad creative fetch error');
                }
              }

              const [lead] = await db.insert(crmLeads).values({
                source: 'META_ADS',
                name,
                phone: phone || '',
                email,
                isDuplicate: !!dup,
                campaignDetails: {
                  leadgen_id: leadgenId,
                  campaign_name: metaData.campaign_name || campaignName || 'Live Campaign',
                  ad_set_name: metaData.adset_name || adsetName || 'Live Adset',
                  ad_name: metaData.ad_name || 'Live Ad',
                  ad_id: adId || '',
                  form_id: metaData.form_id || formId || 'live_form',
                  page_id: entry.id || 'live_page',
                  facebook_post_url: facebookPostUrl,
                  instagram_post_url: instagramPostUrl,
                  answers: fields, // Store the custom form responses!
                },
              }).returning();

              await logActivity(lead.id, 'CAMPAIGN', 'CREATED', null, { source: 'META_ADS', leadgenId });
              app.log.info(`Meta lead ingested: ${lead.id} — ${name}`);
            } catch (fetchErr) {
              app.log.error(fetchErr as any, 'Meta Graph API fetch error');
            }
          }
        }
      }
    } catch (err) {
      app.log.error(err as any, 'Meta webhook processing error');
    }

    return reply.send('EVENT_RECEIVED');
  });
}
