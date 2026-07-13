import { FastifyInstance } from 'fastify';
import { db } from '../../db';
import { systemSettings, users, buyerProfiles, leads, listings, chatMessages, faqs, contactSubmissions, projects, projectUnits, projectFavorites, listingReports, projectComparisonPairs } from '../../db/schema';
import { eq, inArray, sql, and, or, desc, gte, isNull, lte } from 'drizzle-orm';
import { SystemService } from '../../services/system.service';
import { ListingService } from '../../services/listing.service';
import { authenticateJWT, requireRole, optionalAuthenticateJWT } from '../../middleware/auth.middleware';

/**
 * System Settings Routes
 */
export default async function systemRoutes(app: FastifyInstance) {
  // ...

  // Public settings
  app.get('/settings', async (request, reply) => {
    try {
      const keys = [
        'social_links',
        'contact_phone',
        'contact_location',
        'contact_email',
        'subscription_plans',
        'HOMEPAGE_FEATURED_LIMIT',
        'homepage_featured_articles',
        'homepage_stats',
        'sidebar_ad_image',
        'sidebar_ad_link',
        'sidebar_ad_aspect_ratio',
        'logo_url',
        'favicon_url'
      ];
      const settings = await db.select()
        .from(systemSettings)
        .where(inArray(systemSettings.key, keys));

      const settingsMap: Record<string, any> = {};
      settings.forEach(s => {
        try {
          settingsMap[s.key] = JSON.parse(s.value);
        } catch {
          settingsMap[s.key] = s.value;
        }
      });

      return reply.send({ success: true, data: settingsMap });
    } catch (err) {
      app.log.error(err);
      return reply.code(500).send({ success: false, message: 'Failed to fetch public settings' });
    }
  });

  // ── Public FAQs Endpoint ──
  app.get('/faqs', async (request, reply) => {
    try {
      const faqList = await db.select()
        .from(faqs)
        .orderBy(sql`faqs.order ASC`);
      return reply.send({ success: true, data: faqList });
    } catch (err: any) {
      app.log.error(err);
      return reply.code(500).send({ success: false, message: 'Failed to fetch FAQs' });
    }
  });

  // ── Public Contact Submissions Endpoint ──
  app.post('/contact', async (request, reply) => {
    try {
      const { name, email, message } = request.body as { name: string; email: string; message: string };
      if (!name || !email || !message) {
        return reply.code(400).send({ success: false, message: 'All fields (name, email, message) are required.' });
      }

      const [newSubmission] = await db.insert(contactSubmissions).values({
        name,
        email,
        message
      }).returning();

      return reply.send({ success: true, data: newSubmission });
    } catch (err: any) {
      app.log.error(err);
      return reply.code(500).send({ success: false, message: 'Failed to submit contact request.' });
    }
  });

  // ── Admin Create FAQ (Admin only) ──
  app.post('/faqs', { preHandler: [authenticateJWT] }, async (request, reply) => {
    try {
      const user = request.user;
      if (!user || user.role !== 'ADMIN') {
        return reply.code(403).send({ success: false, message: 'Unauthorized. Admin only.' });
      }
      const { questionEn, questionAr, answerEn, answerAr, order } = request.body as any;
      const [newFaq] = await db.insert(faqs).values({
        questionEn,
        questionAr,
        answerEn,
        answerAr,
        order: Number(order) || 0
      }).returning();
      return reply.send({ success: true, data: newFaq });
    } catch (err: any) {
      app.log.error(err);
      return reply.code(500).send({ success: false, message: 'Failed to create FAQ' });
    }
  });

  // ── Admin Update FAQ (Admin only) ──
  app.put('/faqs/:id', { preHandler: [authenticateJWT] }, async (request, reply) => {
    try {
      const user = request.user;
      if (!user || user.role !== 'ADMIN') {
        return reply.code(403).send({ success: false, message: 'Unauthorized. Admin only.' });
      }
      const { id } = request.params as { id: string };
      const { questionEn, questionAr, answerEn, answerAr, order } = request.body as any;
      const [updatedFaq] = await db.update(faqs)
        .set({
          questionEn,
          questionAr,
          answerEn,
          answerAr,
          order: order !== undefined ? Number(order) : undefined,
          updatedAt: new Date()
        })
        .where(eq(faqs.id, id))
        .returning();
      return reply.send({ success: true, data: updatedFaq });
    } catch (err: any) {
      app.log.error(err);
      return reply.code(500).send({ success: false, message: 'Failed to update FAQ' });
    }
  });

  // ── Admin Delete FAQ (Admin only) ──
  app.delete('/faqs/:id', { preHandler: [authenticateJWT] }, async (request, reply) => {
    try {
      const user = request.user;
      if (!user || user.role !== 'ADMIN') {
        return reply.code(403).send({ success: false, message: 'Unauthorized. Admin only.' });
      }
      const { id } = request.params as { id: string };
      await db.delete(faqs).where(eq(faqs.id, id));
      return reply.send({ success: true, message: 'FAQ deleted successfully' });
    } catch (err: any) {
      app.log.error(err);
      return reply.code(500).send({ success: false, message: 'Failed to delete FAQ' });
    }
  });

  // Admin Update Settings
  app.post('/settings', async (request, reply) => {
    try {
      const user = (request as any).user;
      if (!user || user.role !== 'ADMIN') {
        return reply.code(403).send({ success: false, message: 'Unauthorized. Admin only.' });
      }

      const { settings } = request.body as { settings: { key: string; value: string; description?: string }[] };

      for (const s of settings) {
        await SystemService.setSetting(s.key, s.value, s.description);
      }

      return reply.send({ success: true, message: 'Settings updated successfully' });
    } catch (err) {
      app.log.error(err);
      return reply.code(500).send({ success: false, message: 'Failed to update settings' });
    }
  });

  // ── Chat Proxy (Securely hides n8n URLs from frontend) ──
  app.post('/chat', { preHandler: [authenticateJWT] }, async (request, reply) => {
    const { mode, message, history, locale, context } = request.body as any;
    const user = request.user;

    if (!user) {
      return reply.code(401).send({ success: false, message: 'Unauthorized. Please sign in to chat.' });
    }

    try {
      const webhookUrl = mode === 'project_qualification'
        ? await SystemService.getSetting('ai_project_qualification_webhook', '')
        : (mode === 'qualification'
            ? await SystemService.getQualificationWebhook()
            : await SystemService.getGeneralAssistantWebhook());

      if (!webhookUrl) {
        return reply.status(404).send({
          success: false,
          error: 'Chat assistant is not configured on the server.'
        });
      }

      const webhookSecret = await SystemService.getSetting('n8n_webhook_secret', 'saudi_re_n8n_secure_webhook_secret_2026');

      // Fetch or self-heal the user's database-backed buyer profile (guaranteed by database triggers)
      let [profile] = await db.select().from(buyerProfiles).where(eq(buyerProfiles.userId, user.userId)).limit(1);
      if (!profile) {
        // Fallback fallback: self-heal instantly if not present
        const [inserted] = await db.insert(buyerProfiles).values({
          userId: user.userId,
          sessionId: user.userId, // session_id defaults to user_id
          lastSeen: new Date()
        }).returning();
        profile = inserted;
      }

      // Fetch a low-token sparse listing brief to minimize n8n context overhead
      const sparseBrief = ((mode === 'qualification' || mode === 'project_qualification') && context?.id)
        ? await ListingService.getSparseBrief(context.id)
        : undefined;

      // Dynamically resolve the caller origin for environment-agnostic link generation
      const originHeader = request.headers.origin as string;
      const refererHeader = request.headers.referer as string;
      let baseUrl = 'http://localhost:3000';
      if (originHeader) {
        baseUrl = originHeader;
      } else if (refererHeader) {
        try {
          baseUrl = new URL(refererHeader).origin;
        } catch { /* ignore parsing errors */ }
      }

      let projectId: string | null = context?.projectId || null;
      if (context?.id && !projectId) {
        const [listing] = await db.select({ projectId: listings.projectId })
          .from(listings)
          .where(eq(listings.id, context.id))
          .limit(1);
        if (listing?.projectId) {
          projectId = listing.projectId;
        }
      }

      // Construct highly secure and spoof-proof context parameters for n8n
      const secureContext = {
        ...context,
        sessionId: profile.sessionId,
        buyerProfileId: profile.id,
        projectId,
        baseUrl,
      };

      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Secret': webhookSecret,
        },
        body: JSON.stringify({
          message,
          history,
          locale,
          mode,
          context: secureContext,
          sparseBrief,
          timestamp: new Date().toISOString(),
        }),
      });

      if (!response.ok) {
        throw new Error(`AI service responded with status: ${response.status}`);
      }

      const data = await response.json();
      return { success: true, data };
    } catch (error: any) {
      request.log.error(error);
      return reply.status(500).send({
        success: false,
        error: 'Failed to communicate with AI assistant.'
      });
    }
  });

  // ── GET User Context (Pre-conversation context for n8n AI Agent) ──
  // Called by n8n BEFORE the AI Agent node so Gemini knows who the user is
  app.get('/user-context', async (request, reply) => {
    try {
      const clientSecret = request.headers['x-webhook-secret'];
      const webhookSecret = await SystemService.getSetting('n8n_webhook_secret', 'saudi_re_n8n_secure_webhook_secret_2026');
      if (!clientSecret || clientSecret !== webhookSecret) {
        return reply.code(401).send({ success: false, message: 'Unauthorized.' });
      }

      const { sessionId } = request.query as { sessionId?: string };
      if (!sessionId) {
        return reply.code(400).send({ success: false, message: 'sessionId query param is required.' });
      }

      // Find buyer profile by sessionId
      const [profile] = await db.select()
        .from(buyerProfiles)
        .where(eq(buyerProfiles.sessionId, sessionId))
        .limit(1);

      if (!profile) {
        // Return empty context — this is a brand new user, no error
        return reply.send({
          success: true,
          isNewUser: true,
          buyerProfile: null,
          lastAiSummary: null,
          recentHistory: [],
          contextString: 'This is a new buyer. No previous interaction recorded. Start fresh and introduce yourself warmly.'
        });
      }

      // Fetch last 20 messages for context
      const recentHistory = await db.select()
        .from(chatMessages)
        .where(eq(chatMessages.buyerProfileId, profile.id))
        .orderBy(sql`${chatMessages.createdAt} DESC`)
        .limit(20);

      // Format into readable context string for the system prompt
      const historyText = recentHistory.length > 0
        ? recentHistory
            .reverse()
            .map(m => `${m.sender}: ${m.content}`)
            .join('\n')
        : 'No previous messages.';

      const contextString = `
RETURNING BUYER CONTEXT:
- Budget Range: SAR ${profile.budgetMin?.toLocaleString() ?? 'Unknown'} – SAR ${profile.budgetMax?.toLocaleString() ?? 'Unknown'}
- Preferred City: ${profile.cityPreference ?? 'Not specified'}
- Property Type Preference: ${Array.isArray(profile.propertyType) ? profile.propertyType.join(', ') : (profile.propertyType ?? 'Not specified')}
- Purchase Purpose: ${profile.purpose ?? 'Not specified'}
- Timeline: ${profile.timelineMonths ? `${profile.timelineMonths} months` : 'Not specified'}
- Intent Score: ${profile.intentScore ?? 'Unknown'}/100
- AI Summary of Past Interactions: ${profile.lastAiSummary ?? 'Not yet summarized.'}

RECENT CONVERSATION HISTORY:
${historyText}
`.trim();

      // Return ONLY the contextString — AI reads it contextually, no raw DB dump needed
      return reply.send({
        success: true,
        isNewUser: false,
        contextString,
      });
    } catch (err: any) {
      app.log.error(err);
      return reply.code(500).send({ success: false, message: 'Failed to fetch user context.', error: err.message });
    }
  });

  // ── GET Listing Details (On-demand property data tool for n8n AI Agent) ──
  // AI Agent calls this tool when user asks specific property questions
  app.get('/listing-details/:id', async (request, reply) => {
    try {
      const clientSecret = request.headers['x-webhook-secret'];
      const webhookSecret = await SystemService.getSetting('n8n_webhook_secret', 'saudi_re_n8n_secure_webhook_secret_2026');
      if (!clientSecret || clientSecret !== webhookSecret) {
        return reply.code(401).send({ success: false, message: 'Unauthorized.' });
      }

      const { id } = request.params as { id: string };
      if (!id) {
        return reply.code(400).send({ success: false, message: 'Listing ID is required.' });
      }

      const [listing] = await db.select().from(listings).where(eq(listings.id, id)).limit(1);

      if (!listing) {
        return reply.code(404).send({ success: false, message: 'Listing not found.' });
      }

      // Parse amenities into a readable list
      let amenitiesList = 'None specified';
      if (listing.amenities) {
        try {
          const ams = typeof listing.amenities === 'string'
            ? JSON.parse(listing.amenities)
            : listing.amenities;
          const active = Object.entries(ams)
            .filter(([_, v]) => v === true || v === 'true')
            .map(([k]) => k);
          if (active.length > 0) amenitiesList = active.join(', ');
        } catch { /* ignore parse errors */ }
      }

      let siblingLayoutsText = '';
      if (listing.projectId) {
        const [project] = await db.select({ nameEn: projects.nameEn, nameAr: projects.nameAr })
          .from(projects)
          .where(eq(projects.id, listing.projectId))
          .limit(1);
        const projectName = project?.nameEn || 'This Project';

        const siblings = await db.select()
          .from(listings)
          .where(and(
            eq(listings.projectId, listing.projectId),
            eq(listings.status, 'ACTIVE'),
            sql`id != ${listing.id}`
          ));

        if (siblings.length > 0) {
          siblingLayoutsText = `\nOTHER LAYOUTS IN THIS PROJECT (${projectName}):\n` +
            siblings.map(sib => `- ${sib.enTitle || sib.arTitle || 'Layout'}: ${sib.areaSqm || 0} sqm | SAR ${sib.price?.toLocaleString() || 0} (ID: ${sib.shortId || sib.id})`).join('\n');
        }
      }

      // Build concise AI-readable fact sheet — AI contextually picks what it needs
      const factSheet = [
        `PROPERTY FACT SHEET (ID: ${listing.shortId}):`,
        `- Title: ${listing.enTitle ?? listing.arTitle ?? 'N/A'}`,
        `- Type: ${listing.type ?? 'N/A'} for ${listing.purpose ?? 'N/A'}`,
        `- Price: SAR ${listing.price?.toLocaleString() ?? 'N/A'}`,
        `- Location: ${listing.district ?? 'N/A'}, ${listing.city ?? 'N/A'}`,
        `- Size: ${listing.bedrooms ?? 0} Beds | ${listing.bathrooms ?? 0} Baths | ${listing.areaSqm ?? 0} Sqm`,
        `- Completion: ${listing.completionStatus ?? 'N/A'} | Furnished: ${listing.furnishingStatus ?? 'N/A'}`,
        `- Foreigner Eligible: ${listing.foreignerEligible ? 'Yes' : 'No'}`,
        `- REGA License: ${listing.regaFalLicense ?? 'N/A'}`,
        `- Amenities: ${amenitiesList}`,
        listing.enDescription ? `- Description: ${listing.enDescription.slice(0, 300)}` : '',
      ].filter(Boolean).join('\n') + (siblingLayoutsText ? '\n' + siblingLayoutsText : '');

      // Return ONLY the factSheet — AI reads what it needs contextually, no raw DB dump
      return reply.send({ success: true, factSheet });
    } catch (err: any) {
      app.log.error(err);
      return reply.code(500).send({ success: false, message: 'Failed to fetch listing details.', error: err.message });
    }
  });

  // ── Create or Update Buyer Profile (for n8n callback) ──
  app.post('/buyer-profile', async (request, reply) => {
    try {
      const clientSecret = request.headers['x-webhook-secret'];
      const webhookSecret = await SystemService.getSetting('n8n_webhook_secret', 'saudi_re_n8n_secure_webhook_secret_2026');
      if (!clientSecret || clientSecret !== webhookSecret) {
        return reply.code(401).send({ success: false, message: 'Unauthorized callback.' });
      }

      const {
        sessionId,
        userId,
        budgetMin,
        budgetMax,
        cityPreference,
        propertyType,
        purpose,
        timelineMonths,
        intentScore,
        languagePreference,
        completionStatusPreference,
        districtPreference
      } = request.body as any;

      if (!sessionId) {
        return reply.code(400).send({ success: false, message: 'sessionId is required.' });
      }

      const [existingProfile] = await db.select()
        .from(buyerProfiles)
        .where(eq(buyerProfiles.sessionId, sessionId))
        .limit(1);

      const valuesToSet = {
        userId: userId || undefined,
        budgetMin: budgetMin !== undefined ? Number(budgetMin) : undefined,
        budgetMax: budgetMax !== undefined ? Number(budgetMax) : undefined,
        cityPreference: cityPreference || undefined,
        propertyType: propertyType || undefined,
        purpose: purpose || undefined,
        timelineMonths: timelineMonths !== undefined ? Number(timelineMonths) : undefined,
        intentScore: intentScore !== undefined ? Number(intentScore) : undefined,
        languagePreference: languagePreference || undefined,
        completionStatusPreference: completionStatusPreference || undefined,
        districtPreference: districtPreference || undefined,
        lastSeen: new Date(),
      };

      let profile;
      if (existingProfile) {
        const updated = await db.update(buyerProfiles)
          .set(valuesToSet)
          .where(eq(buyerProfiles.sessionId, sessionId))
          .returning();
        profile = updated[0];
      } else {
        const inserted = await db.insert(buyerProfiles)
          .values({
            sessionId,
            ...valuesToSet
          })
          .returning();
        profile = inserted[0];
      }

      return reply.send({ success: true, profile });
    } catch (err: any) {
      app.log.error(err);
      return reply.code(500).send({ success: false, message: 'Failed to process buyer profile.', error: err.message });
    }
  });

  // ── Qualify Lead Callback (for n8n callback) ──
  app.post('/qualify-lead', async (request, reply) => {
    try {
      const clientSecret = request.headers['x-webhook-secret'];
      const webhookSecret = await SystemService.getSetting('n8n_webhook_secret', 'saudi_re_n8n_secure_webhook_secret_2026');
      if (!clientSecret || clientSecret !== webhookSecret) {
        return reply.code(401).send({ success: false, message: 'Unauthorized callback.' });
      }

      const {
        sessionId,
        listingId,
        aiSummary,
        buyerBudgetDisplay,
        buyerTimelineDisplay
      } = request.body as any;

      if (!sessionId || !listingId) {
        return reply.code(400).send({ success: false, message: 'sessionId and listingId are required.' });
      }

      const [profile] = await db.select()
        .from(buyerProfiles)
        .where(eq(buyerProfiles.sessionId, sessionId))
        .limit(1);

      if (!profile) {
        return reply.code(404).send({ success: false, message: 'Buyer profile not found for the given sessionId.' });
      }

      const [listing] = await db.select()
        .from(listings)
        .where(eq(listings.id, listingId))
        .limit(1);

      if (!listing) {
        return reply.code(404).send({ success: false, message: 'Listing not found.' });
      }

      // Self-healing columns check
      await db.execute(sql`ALTER TABLE leads ADD COLUMN IF NOT EXISTS is_qualified BOOLEAN DEFAULT false;`);

      const [existingLead] = await db.select()
        .from(leads)
        .where(and(
          eq(leads.buyerProfileId, profile.id),
          eq(leads.listingId, listingId)
        ))
        .limit(1);

      const valuesToSet = {
        isQualified: true,
        status: 'CONTACTED' as const,
        aiSummary: aiSummary || undefined,
        buyerBudgetDisplay: buyerBudgetDisplay || undefined,
        buyerTimelineDisplay: buyerTimelineDisplay || undefined,
        intentScoreAtCreation: profile.intentScore || undefined,
        projectId: listing.projectId || undefined,
      };

      // Default website leads to the first active ADMIN
      const [adminUser] = await db.select({ id: users.id })
        .from(users)
        .where(and(eq(users.role, 'ADMIN'), eq(users.isActive, true)))
        .limit(1);
      const targetBrokerId = adminUser ? adminUser.id : listing.ownerId;

      let lead;
      if (existingLead) {
        const updated = await db.update(leads)
          .set(valuesToSet)
          .where(eq(leads.id, existingLead.id))
          .returning();
        lead = updated[0];
      } else {
        const inserted = await db.insert(leads)
          .values({
            buyerProfileId: profile.id,
            listingId,
            brokerId: targetBrokerId,
            ...valuesToSet
          })
          .returning();
        lead = inserted[0];
      }

      return reply.send({ success: true, lead });
    } catch (err: any) {
      app.log.error(err);
      return reply.code(500).send({ success: false, message: 'Failed to qualify lead.', error: err.message });
    }
  });

  // ── Mismatch Profile Callback (for n8n callback) ──
  app.post('/mismatch-profile', async (request, reply) => {
    try {
      const clientSecret = request.headers['x-webhook-secret'];
      const webhookSecret = await SystemService.getSetting('n8n_webhook_secret', 'saudi_re_n8n_secure_webhook_secret_2026');
      if (!clientSecret || clientSecret !== webhookSecret) {
        return reply.code(401).send({ success: false, message: 'Unauthorized callback.' });
      }

      const {
        sessionId,
        listingId,
        mismatchReasons,
        buyerBudgetDisplay,
        buyerTimelineDisplay
      } = request.body as any;

      if (!sessionId || !listingId) {
        return reply.code(400).send({ success: false, message: 'sessionId and listingId are required.' });
      }

      const [profile] = await db.select()
        .from(buyerProfiles)
        .where(eq(buyerProfiles.sessionId, sessionId))
        .limit(1);

      if (!profile) {
        return reply.code(404).send({ success: false, message: 'Buyer profile not found for the given sessionId.' });
      }

      const [listing] = await db.select()
        .from(listings)
        .where(eq(listings.id, listingId))
        .limit(1);

      if (!listing) {
        return reply.code(404).send({ success: false, message: 'Listing not found.' });
      }

      const [existingLead] = await db.select()
        .from(leads)
        .where(and(
          eq(leads.buyerProfileId, profile.id),
          eq(leads.listingId, listingId)
        ))
        .limit(1);

      const summaryText = `Unqualified Attempt (Mismatch Parameters):\n${Array.isArray(mismatchReasons) ? mismatchReasons.join(', ') : (mismatchReasons || 'No reason provided')
        }`;

      const valuesToSet = {
        isQualified: false,
        status: 'CLOSED_LOST' as const,
        aiSummary: summaryText,
        buyerBudgetDisplay: buyerBudgetDisplay || undefined,
        buyerTimelineDisplay: buyerTimelineDisplay || undefined,
        intentScoreAtCreation: profile.intentScore || undefined,
        projectId: listing.projectId || undefined,
      };

      // Default website leads to the first active ADMIN
      const [adminUser] = await db.select({ id: users.id })
        .from(users)
        .where(and(eq(users.role, 'ADMIN'), eq(users.isActive, true)))
        .limit(1);
      const targetBrokerId = adminUser ? adminUser.id : listing.ownerId;

      let lead;
      if (existingLead) {
        const updated = await db.update(leads)
          .set(valuesToSet)
          .where(eq(leads.id, existingLead.id))
          .returning();
        lead = updated[0];
      } else {
        const inserted = await db.insert(leads)
          .values({
            buyerProfileId: profile.id,
            listingId,
            brokerId: targetBrokerId,
            ...valuesToSet
          })
          .returning();
        lead = inserted[0];
      }

      return reply.send({ success: true, lead });
    } catch (err: any) {
      app.log.error(err);
      return reply.code(500).send({ success: false, message: 'Failed to process mismatch profile.', error: err.message });
    }
  });

  // ── Security Test Route (Temporary) ──
  app.get('/test-qualify', { preHandler: [authenticateJWT, requireRole('ADMIN')] }, async (request, reply) => {
    const EMAIL = 'probabilix.ai@gmail.com';
    const LISTING_ID = '00bb83aa-2e9e-47a2-a004-c83982fd5ff7';

    try {
      // Self-healing: Ensure column exists
      await db.execute(sql`ALTER TABLE leads ADD COLUMN IF NOT EXISTS is_qualified BOOLEAN DEFAULT false;`);

      const [user] = await db.select().from(users).where(eq(users.email, EMAIL)).limit(1);
      if (!user) throw new Error('User not found');

      let [profile] = await db.select().from(buyerProfiles).where(eq(buyerProfiles.userId, user.id)).limit(1);
      if (!profile) {
        const newProfile = await db.insert(buyerProfiles).values({
          userId: user.id,
          sessionId: 'test-session',
          lastSeen: new Date()
        }).returning();
        profile = newProfile[0];
      }

      const [listing] = await db.select().from(listings).where(eq(listings.id, LISTING_ID)).limit(1);
      if (!listing) throw new Error('Listing not found');

      // Default website leads to the first active ADMIN
      const [adminUser] = await db.select({ id: users.id })
        .from(users)
        .where(and(eq(users.role, 'ADMIN'), eq(users.isActive, true)))
        .limit(1);
      const targetBrokerId = adminUser ? adminUser.id : listing.ownerId;

      // Create or update qualified lead
      await db.insert(leads).values({
        buyerProfileId: profile.id,
        listingId: listing.id,
        brokerId: targetBrokerId,
        isQualified: true,
        status: 'CONTACTED'
      });

      return {
        success: true,
        message: `User ${EMAIL} is now QUALIFIED for property ${LISTING_ID}. You can now test the reveal button.`
      };
    } catch (err: any) {
      return reply.status(500).send({ success: false, error: err.message });
    }
  });

  // ── Logging Chat Messages Endpoint (Secure n8n Callback) ──
  app.post('/chat/log', async (request, reply) => {
    try {
      const clientSecret = request.headers['x-webhook-secret'];
      const webhookSecret = await SystemService.getSetting('n8n_webhook_secret', 'saudi_re_n8n_secure_webhook_secret_2026');
      if (!clientSecret || clientSecret !== webhookSecret) {
        return reply.code(401).send({ success: false, message: 'Unauthorized callback.' });
      }

      const { buyerProfileId, sessionId, messages } = request.body as {
        buyerProfileId?: string;
        sessionId?: string;
        messages: Array<{ sender: 'USER' | 'ASSISTANT'; content: string }>;
      };

      let resolvedProfileId = buyerProfileId;
      if (!resolvedProfileId && sessionId) {
        const [profile] = await db.select().from(buyerProfiles).where(eq(buyerProfiles.sessionId, sessionId)).limit(1);
        if (profile) {
          resolvedProfileId = profile.id;
        }
      }

      if (!resolvedProfileId || !Array.isArray(messages) || messages.length === 0) {
        return reply.code(400).send({ success: false, message: 'Valid buyerProfileId/sessionId and non-empty messages array are required.' });
      }

      // Check if buyer profile exists
      const [profile] = await db.select().from(buyerProfiles).where(eq(buyerProfiles.id, resolvedProfileId)).limit(1);
      if (!profile) {
        return reply.code(404).send({ success: false, message: 'Buyer profile not found.' });
      }

      // Batch insert messages
      const insertValues = messages.map(m => ({
        buyerProfileId: resolvedProfileId!,
        sender: m.sender,
        content: m.content,
      }));

      await db.insert(chatMessages).values(insertValues);

      return reply.send({ success: true, message: 'Chat messages logged successfully.' });
    } catch (err: any) {
      app.log.error(err);
      return reply.code(500).send({ success: false, message: 'Failed to log chat messages.', error: err.message });
    }
  });

  // ── Buyer Profile AI Summary Callback Endpoint (Secure n8n Callback) ──
  app.patch('/buyer-profile/:id/summary', async (request, reply) => {
    try {
      const clientSecret = request.headers['x-webhook-secret'];
      const webhookSecret = await SystemService.getSetting('n8n_webhook_secret', 'saudi_re_n8n_secure_webhook_secret_2026');
      if (!clientSecret || clientSecret !== webhookSecret) {
        return reply.code(401).send({ success: false, message: 'Unauthorized callback.' });
      }

      const { id } = request.params as { id: string };
      const { lastAiSummary } = request.body as { lastAiSummary: string };

      if (!lastAiSummary) {
        return reply.code(400).send({ success: false, message: 'lastAiSummary is required.' });
      }

      // Try by ID first, then by sessionId
      let profile;
      const [profileById] = await db.select().from(buyerProfiles).where(eq(buyerProfiles.id, id)).limit(1);
      if (profileById) {
        profile = profileById;
      } else {
        const [profileBySession] = await db.select().from(buyerProfiles).where(eq(buyerProfiles.sessionId, id)).limit(1);
        profile = profileBySession;
      }

      if (!profile) {
        return reply.code(404).send({ success: false, message: 'Buyer profile not found.' });
      }

      await db.update(buyerProfiles)
        .set({
          lastAiSummary,
          summaryUpdatedAt: new Date(),
        })
        .where(eq(buyerProfiles.id, profile.id));

      return reply.send({ success: true, message: 'Buyer profile AI summary updated successfully.' });
    } catch (err: any) {
      app.log.error(err);
      return reply.code(500).send({ success: false, message: 'Failed to update buyer profile summary.', error: err.message });
    }
  });

  // ── Fetch Chat History for Authenticated User (Client Endpoint) ──
  app.get('/chat/history', { preHandler: [authenticateJWT] }, async (request, reply) => {
    try {
      const user = request.user;
      if (!user) {
        return reply.code(401).send({ success: false, message: 'Unauthorized.' });
      }

      const query = request.query as { projectId?: string; listingId?: string };
      const projectId = query.projectId;
      const listingId = query.listingId;

      // Find the buyer profile associated with this user
      let [profile] = await db.select().from(buyerProfiles).where(eq(buyerProfiles.userId, user.userId)).limit(1);

      if (!profile) {
        // If no profile exists yet, create one for this user dynamically
        const newProfile = await db.insert(buyerProfiles).values({
          userId: user.userId,
          sessionId: `session-${user.userId}-${Date.now()}`,
          lastSeen: new Date()
        }).returning();
        profile = newProfile[0];
      }

      // Filter by context and restrict to last 24 hours
      const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const conditions = [
        eq(chatMessages.buyerProfileId, profile.id),
        gte(chatMessages.createdAt, dayAgo)
      ];

      if (projectId) {
        conditions.push(eq(chatMessages.projectId, projectId));
      } else if (listingId) {
        conditions.push(eq(chatMessages.listingId, listingId));
      } else {
        conditions.push(isNull(chatMessages.projectId));
        conditions.push(isNull(chatMessages.listingId));
      }

      // Query chat messages for this buyer profile matching conditions
      const history = await db.select()
        .from(chatMessages)
        .where(and(...conditions))
        .orderBy(sql`${chatMessages.createdAt} ASC`);

      return reply.send({
        success: true,
        data: {
          buyerProfileId: profile.id,
          sessionId: profile.sessionId,
          history: history.map(h => ({
            role: h.sender === 'USER' ? 'user' : 'assistant',
            content: h.content,
            timestamp: h.createdAt
          }))
        }
      });
    } catch (err: any) {
      app.log.error(err);
      return reply.code(500).send({ success: false, message: 'Failed to fetch chat history.', error: err.message });
    }
  });

  // ── GET Public Projects Batch (For Comparison) ──
  app.get('/projects/batch', { preHandler: [optionalAuthenticateJWT] }, async (request: any, reply) => {
    const { ids } = request.query as { ids?: string };
    if (!ids) {
      return reply.code(400).send({ success: false, message: 'Missing ids query parameter' });
    }
    const idsArray = ids.split(',').filter(Boolean);
    if (idsArray.length === 0 || idsArray.length > 4) {
      return reply.code(400).send({ success: false, message: 'Must provide between 1 and 4 IDs' });
    }

    try {
      const allProjects = await db.select()
        .from(projects)
        .where(inArray(projects.id, idsArray));

      if (allProjects.length === 0) {
        return reply.send({ success: true, data: [] });
      }

      const projectIds = allProjects.map(p => p.id);
      const layoutsMap: Record<string, any[]> = {};
      const favoritedProjectIds = new Set<string>();

      // Fetch layouts to compute price range & bedroom bounds
      const layouts = await db.select()
        .from(listings)
        .where(and(
          inArray(listings.projectId, projectIds),
          eq(listings.status, 'ACTIVE'),
          sql`${listings.deletedAt} IS NULL`
        ));

      layouts.forEach(l => {
        if (l.projectId) {
          if (!layoutsMap[l.projectId]) {
            layoutsMap[l.projectId] = [];
          }
          layoutsMap[l.projectId].push(l);
        }
      });

      // Check favorites
      const userId = request.user?.userId;
      if (userId && projectIds.length > 0) {
        const userFavs = await db.select({ projectId: projectFavorites.projectId })
          .from(projectFavorites)
          .where(and(
            eq(projectFavorites.userId, userId),
            inArray(projectFavorites.projectId, projectIds)
          ));
        userFavs.forEach(f => favoritedProjectIds.add(f.projectId));
      }

      const data = allProjects.map(p => {
        const projLayouts = layoutsMap[p.id] || [];
        const layoutCount = projLayouts.length;
        const prices = projLayouts.map(l => Number(l.price));
        const minPrice = prices.length > 0 ? Math.min(...prices) : 0;
        const maxPrice = prices.length > 0 ? Math.max(...prices) : 0;
        const beds = projLayouts.map(l => l.bedrooms).filter(b => b !== null && b !== undefined) as number[];
        const uniqueBedrooms = Array.from(new Set(beds)).sort((a, b) => a - b);
        const minBedrooms = uniqueBedrooms.length > 0 ? uniqueBedrooms[0] : undefined;
        const maxBedrooms = uniqueBedrooms.length > 0 ? uniqueBedrooms[uniqueBedrooms.length - 1] : undefined;

        return {
          ...p,
          layoutCount,
          minPrice,
          maxPrice,
          minBedrooms,
          maxBedrooms,
          bedroomsList: uniqueBedrooms,
          isFavorited: favoritedProjectIds.has(p.id)
        };
      });

      return reply.send({ success: true, data });
    } catch (err: any) {
      app.log.error(err);
      return reply.code(500).send({ success: false, message: 'Failed to fetch batch projects', error: err.message });
    }
  });

  // ── POST Log Project Comparison ──
  app.post('/projects/compare/log', async (request, reply) => {
    const { ids } = request.body as { ids?: string[] };
    if (!ids || !Array.isArray(ids) || ids.length < 2 || ids.length > 4) {
      return reply.code(400).send({ success: false, message: 'Invalid payload: ids must be an array of 2 to 4 UUIDs' });
    }

    try {
      const uniqueIds = Array.from(new Set(ids));
      const pairs: [string, string][] = [];
      for (let i = 0; i < uniqueIds.length; i++) {
        for (let j = i + 1; j < uniqueIds.length; j++) {
          const idA = uniqueIds[i];
          const idB = uniqueIds[j];
          if (idA < idB) {
            pairs.push([idA, idB]);
          } else {
            pairs.push([idB, idA]);
          }
        }
      }

      for (const [idA, idB] of pairs) {
        // Validate existence
        const [projA] = await db.select({ id: projects.id }).from(projects).where(eq(projects.id, idA)).limit(1);
        const [projB] = await db.select({ id: projects.id }).from(projects).where(eq(projects.id, idB)).limit(1);
        if (projA && projB) {
          await db.insert(projectComparisonPairs)
            .values({ projectIdA: idA, projectIdB: idB, count: 1 })
            .onConflictDoUpdate({
              target: [projectComparisonPairs.projectIdA, projectComparisonPairs.projectIdB],
              set: { 
                count: sql`${projectComparisonPairs.count} + 1`,
                updatedAt: new Date()
              }
            });
        }
      }

      return reply.send({ success: true });
    } catch (err: any) {
      app.log.error(err);
      return reply.code(500).send({ success: false, message: 'Failed to log project comparison pairs', error: err.message });
    }
  });

  // ── GET Public Project Details and Layouts ──
  app.get('/projects/:id', { preHandler: [optionalAuthenticateJWT] }, async (request: any, reply) => {
    try {
      const { id } = request.params as { id: string };
      const userId = request.user?.userId;

      if (!id) {
        return reply.code(400).send({ success: false, message: 'Project ID is required.' });
      }

      const [project] = await db.select().from(projects).where(eq(projects.id, id)).limit(1);
      if (!project) {
        return reply.code(404).send({ success: false, message: 'Project not found.' });
      }

      const layouts = await db.select()
        .from(listings)
        .where(and(
          eq(listings.projectId, id),
          eq(listings.status, 'ACTIVE'),
          sql`${listings.deletedAt} IS NULL`
        ));

      // Fetch the broker (owner) of the layouts in this project
      let owner = null;
      if (layouts.length > 0) {
        const owners = await db.select({
          id: users.id,
          name: users.name,
          avatarUrl: users.avatarUrl,
          role: users.role
        })
        .from(users)
        .where(eq(users.id, layouts[0].ownerId))
        .limit(1);
        owner = owners[0] || null;
      }

      // Check if user is qualified for this project specifically
      let isQualified = false;
      let isFavorited = false;
      if (userId) {
        const [projectLead] = await db.select({ leadId: leads.id })
          .from(leads)
          .innerJoin(buyerProfiles, eq(leads.buyerProfileId, buyerProfiles.id))
          .where(
            and(
              eq(buyerProfiles.userId, userId),
              eq(leads.projectId, id),
              eq(leads.isQualified, true)
            )
          )
          .limit(1);
        isQualified = !!projectLead;

        const [existingFav] = await db.select({ id: projectFavorites.id })
          .from(projectFavorites)
          .where(
            and(
              eq(projectFavorites.userId, userId),
              eq(projectFavorites.projectId, id)
            )
          )
          .limit(1);
        isFavorited = !!existingFav;
      }

      const units = await db.select()
        .from(projectUnits)
        .where(eq(projectUnits.projectId, id));

      return reply.send({
        success: true,
        data: {
          project,
          layouts: layouts.map(l => ({
            id: l.id,
            shortId: l.shortId,
            titleEn: l.enTitle,
            titleAr: l.arTitle,
            type: l.type,
            price: l.price,
            areaSqm: l.areaSqm,
            bedrooms: l.bedrooms,
            bathrooms: l.bathrooms,
            completionStatus: l.completionStatus,
            photos: l.photos,
            descriptionEn: l.enDescription,
            descriptionAr: l.arDescription,
            units: units.filter(u => u.listingId === l.id)
          })),
          owner,
          isQualified,
          isFavorited,
          projectUnits: units
        }
      });
    } catch (err: any) {
      app.log.error(err);
      return reply.code(500).send({ success: false, message: 'Failed to fetch project details.', error: err.message });
    }
  });

  // ── GET Public Projects List (Search/List) ──
  app.get('/projects', { preHandler: [optionalAuthenticateJWT] }, async (request: any, reply) => {
    try {
      const query = request.query as any;
      const city = query.city as string;
      const q = query.q as string;
      const isFeatured = query.isFeatured === 'true';
      const page = Number(query.page || 1);
      const limit = Number(query.limit || 20);

      const completionStatus = query.completionStatus as string;
      const expectedDelivery = query.expectedDelivery as string;

      const conditions: any[] = [];
      if (city) {
        conditions.push(eq(projects.city, city));
      }
      if (isFeatured) {
        conditions.push(eq(projects.isFeatured, true));
      }
      if (completionStatus) {
        conditions.push(eq(projects.completionStatus, completionStatus as any));
      }
      if (expectedDelivery) {
        if (expectedDelivery === 'AFTER_Q4_2027') {
          conditions.push(sql`${projects.expectedDelivery} NOT ILIKE '%2024%' AND ${projects.expectedDelivery} NOT ILIKE '%2025%' AND ${projects.expectedDelivery} NOT ILIKE '%2026%' AND ${projects.expectedDelivery} NOT ILIKE '%2027%'`);
        } else {
          conditions.push(sql`${projects.expectedDelivery} ILIKE ${`%${expectedDelivery}%`}`);
        }
      }
      if (q) {
        const searchPattern = `%${q}%`;
        conditions.push(or(
          sql`${projects.nameEn} ILIKE ${searchPattern}`,
          sql`${projects.nameAr} ILIKE ${searchPattern}`,
          sql`${projects.city} ILIKE ${searchPattern}`,
          sql`${projects.district} ILIKE ${searchPattern}`
        ));
      }

      // Layout specific conditions (EXISTS subquery for maximum performance)
      const layoutConditions: any[] = [
        eq(listings.projectId, projects.id),
        eq(listings.status, 'ACTIVE'),
        isNull(listings.deletedAt),
      ];

      let hasLayoutFilter = false;

      if (query.type) {
        layoutConditions.push(eq(listings.type, query.type as any));
        hasLayoutFilter = true;
      }
      if (query.purpose) {
        layoutConditions.push(eq(listings.purpose, query.purpose as any));
        hasLayoutFilter = true;
      }
      if (query.minPrice) {
        layoutConditions.push(gte(listings.price, Number(query.minPrice)));
        hasLayoutFilter = true;
      }
      if (query.maxPrice) {
        layoutConditions.push(sql`${listings.price} <= ${Number(query.maxPrice)}`);
        hasLayoutFilter = true;
      }

      if (hasLayoutFilter) {
        conditions.push(sql`EXISTS (
          SELECT 1 FROM listings 
          WHERE ${and(...layoutConditions)}
        )`);
      }

      // Count total
      const countResult = await db.select({ count: sql<number>`count(*)` })
        .from(projects)
        .where(conditions.length > 0 ? and(...conditions) : undefined);
      const total = Number(countResult[0]?.count) || 0;

      // Select projects
      const allProjects = await db.select()
        .from(projects)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .limit(limit)
        .offset((page - 1) * limit)
        .orderBy(
          desc(projects.isFeatured),
          sql`CASE WHEN ${projects.featuredOrder} > 0 THEN ${projects.featuredOrder} ELSE 999999 END ASC`,
          desc(projects.createdAt)
        );

      const projectIds = allProjects.map(p => p.id);
      const layoutsMap: Record<string, any[]> = {};
      const favoritedProjectIds = new Set<string>();

      if (projectIds.length > 0) {
        // Fetch all active listings/layouts for these projects to find minPrice and bedroom bounds
        const layouts = await db.select()
          .from(listings)
          .where(and(
            inArray(listings.projectId, projectIds),
            eq(listings.status, 'ACTIVE'),
            sql`${listings.deletedAt} IS NULL`
          ));

        layouts.forEach(l => {
          if (l.projectId) {
            if (!layoutsMap[l.projectId]) {
              layoutsMap[l.projectId] = [];
            }
            layoutsMap[l.projectId].push(l);
          }
        });

        // Check which projects are favorited if user is authenticated
        const userId = request.user?.userId;
        if (userId) {
          const userFavs = await db.select({ projectId: projectFavorites.projectId })
            .from(projectFavorites)
            .where(
              and(
                eq(projectFavorites.userId, userId),
                inArray(projectFavorites.projectId, projectIds)
              )
            );
          userFavs.forEach(f => favoritedProjectIds.add(f.projectId));
        }
      }

      const data = allProjects.map(p => {
        const projLayouts = layoutsMap[p.id] || [];
        const layoutCount = projLayouts.length;
        const prices = projLayouts.map(l => Number(l.price));
        const minPrice = prices.length > 0 ? Math.min(...prices) : 0;
        const beds = projLayouts.map(l => l.bedrooms).filter(b => b !== null && b !== undefined) as number[];
        const minBedrooms = beds.length > 0 ? Math.min(...beds) : undefined;
        const maxBedrooms = beds.length > 0 ? Math.max(...beds) : undefined;

        return {
          ...p,
          layoutCount,
          minPrice,
          minBedrooms,
          maxBedrooms,
          isFavorited: favoritedProjectIds.has(p.id)
        };
      });

      return reply.send({
        success: true,
        data: {
          items: data,
          total
        }
      });
    } catch (err: any) {
      app.log.error(err);
      return reply.code(500).send({ success: false, message: 'Failed to fetch projects list', error: err.message });
    }
  });

  // ── POST Reveal Project Contact Info ──
  app.post('/projects/:id/reveal', { preHandler: [authenticateJWT] }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const user = request.user;
      if (!user) {
        return reply.code(401).send({ success: false, message: 'Unauthorized. Please sign in.' });
      }
      const userId = user.userId;

      // Check if user is qualified for this project
      const [projectQualified] = await db
        .select({ leadId: leads.id })
        .from(leads)
        .innerJoin(buyerProfiles, eq(leads.buyerProfileId, buyerProfiles.id))
        .where(
          and(
            eq(buyerProfiles.userId, userId),
            eq(leads.projectId, id),
            eq(leads.isQualified, true)
          )
        )
        .limit(1);

      if (!projectQualified) {
        return reply.code(403).send({
          success: false,
          message: 'Lead qualification required to access contact details'
        });
      }

      // Fetch the owner of any layout in this project
      const [firstLayout] = await db.select({ ownerId: listings.ownerId })
        .from(listings)
        .where(and(eq(listings.projectId, id), eq(listings.status, 'ACTIVE')))
        .limit(1);

      if (!firstLayout) {
        return reply.code(404).send({ success: false, message: 'No active broker found for this project.' });
      }

      const owners = await db.select({
        phone: users.phone,
        email: users.email
      })
      .from(users)
      .where(eq(users.id, firstLayout.ownerId))
      .limit(1);
      const owner = owners[0] || null;

      return reply.send({ success: true, data: owner });
    } catch (err: any) {
      return reply.code(500).send({ success: false, error: err.message });
    }
  });

  // ── GET Project Layouts Endpoint (New 2C) ──
  app.get('/project-layouts/:projectId', async (request, reply) => {
    try {
      const clientSecret = request.headers['x-webhook-secret'];
      const webhookSecret = await SystemService.getSetting('n8n_webhook_secret', 'saudi_re_n8n_secure_webhook_secret_2026');
      if (!clientSecret || clientSecret !== webhookSecret) {
        return reply.code(401).send({ success: false, message: 'Unauthorized.' });
      }

      const { projectId } = request.params as { projectId: string };
      if (!projectId) {
        return reply.code(400).send({ success: false, message: 'Project ID is required.' });
      }

      const layouts = await db.select()
        .from(listings)
        .where(and(
          eq(listings.projectId, projectId),
          eq(listings.status, 'ACTIVE')
        ));

      const summaries = layouts.map(l => ({
        id: l.id,
        shortId: l.shortId,
        labelEn: l.enTitle,
        labelAr: l.arTitle,
        price: l.price,
        areaSqm: l.areaSqm,
        bedrooms: l.bedrooms,
        bathrooms: l.bathrooms,
        completionStatus: l.completionStatus,
        photos: l.photos
      }));

      return reply.send({ success: true, layouts: summaries });
    } catch (err: any) {
      app.log.error(err);
      return reply.code(500).send({ success: false, message: 'Failed to fetch project layouts.', error: err.message });
    }
  });

  // ── GET Search Alternatives Endpoint (New 2D) ──
  app.get('/search-alternatives', async (request, reply) => {
    try {
      const clientSecret = request.headers['x-webhook-secret'];
      const webhookSecret = await SystemService.getSetting('n8n_webhook_secret', 'saudi_re_n8n_secure_webhook_secret_2026');
      if (!clientSecret || clientSecret !== webhookSecret) {
        return reply.code(401).send({ success: false, message: 'Unauthorized.' });
      }

      const { budgetMin, budgetMax, city, completionStatus, exclude } = request.query as any;

      const conditions: any[] = [
        eq(listings.status, 'ACTIVE'),
        sql`${listings.projectId} IS NULL`
      ];

      if (budgetMin) {
        conditions.push(sql`${listings.price} >= ${Math.round(Number(budgetMin) * 0.85)}`);
      }
      if (budgetMax) {
        conditions.push(sql`${listings.price} <= ${Math.round(Number(budgetMax) * 1.15)}`);
      }
      if (city) {
        conditions.push(sql`LOWER(${listings.city}) = LOWER(${city})`);
      }
      if (completionStatus) {
        conditions.push(eq(listings.completionStatus, completionStatus));
      }
      if (exclude) {
        conditions.push(sql`${listings.id} != ${exclude}::uuid`);
      }

      const results = await db.select()
        .from(listings)
        .where(and(...conditions))
        .limit(3);

      const summaries = results.map(l => ({
        id: l.id,
        shortId: l.shortId,
        titleEn: l.enTitle,
        titleAr: l.arTitle,
        price: l.price,
        areaSqm: l.areaSqm,
        bedrooms: l.bedrooms,
        bathrooms: l.bathrooms,
        city: l.city,
        district: l.district,
        completionStatus: l.completionStatus
      }));

      return reply.send({ success: true, listings: summaries });
    } catch (err: any) {
      app.log.error(err);
      return reply.code(500).send({ success: false, message: 'Failed to search alternative listings.', error: err.message });
    }
  });

  // ── POST Recalculate Intent Score Endpoint (New 2E) ──
  app.post('/intent-score/recalculate', async (request, reply) => {
    try {
      const clientSecret = request.headers['x-webhook-secret'];
      const webhookSecret = await SystemService.getSetting('n8n_webhook_secret', 'saudi_re_n8n_secure_webhook_secret_2026');
      if (!clientSecret || clientSecret !== webhookSecret) {
        return reply.code(401).send({ success: false, message: 'Unauthorized.' });
      }

      const { buyerProfileId } = request.body as { buyerProfileId: string };
      if (!buyerProfileId) {
        return reply.code(400).send({ success: false, message: 'buyerProfileId is required.' });
      }

      const [profile] = await db.select()
        .from(buyerProfiles)
        .where(eq(buyerProfiles.id, buyerProfileId))
        .limit(1);

      if (!profile) {
        return reply.code(404).send({ success: false, message: 'Buyer profile not found.' });
      }

      let score = 0;

      // 1. Budget specified: +35
      if (profile.budgetMin !== null || profile.budgetMax !== null) {
        score += 35;
      }

      // 2. City specified: +15
      if (profile.cityPreference && profile.cityPreference.trim() !== '') {
        score += 15;
      }

      // 3. Completion preference specified: +15
      if (profile.completionStatusPreference && profile.completionStatusPreference.trim() !== '') {
        score += 15;
      }

      // 4. Message count engagement: +1 per 2 messages, up to 20
      const messagesCountResult = await db.select({ count: sql<number>`count(*)::integer` })
        .from(chatMessages)
        .where(eq(chatMessages.buyerProfileId, buyerProfileId));
      const messageCount = messagesCountResult[0]?.count || 0;
      score += Math.min(20, Math.floor(messageCount / 2));

      // 5. Qualified before: +15
      const qualifiedLeads = await db.select({ count: sql<number>`count(*)::integer` })
        .from(leads)
        .where(and(
          eq(leads.buyerProfileId, buyerProfileId),
          eq(leads.isQualified, true)
        ));
      if ((qualifiedLeads[0]?.count || 0) > 0) {
        score += 15;
      }

      await db.update(buyerProfiles)
        .set({ intentScore: score })
        .where(eq(buyerProfiles.id, buyerProfileId));

      return reply.send({ success: true, intentScore: score });
    } catch (err: any) {
      app.log.error(err);
      return reply.code(500).send({ success: false, message: 'Failed to recalculate intent score.', error: err.message });
    }
  });

  /**
   * POST /api/v1/system/projects/:id/report
   * Report a project for violations or inaccuracies
   */
  app.post('/projects/:id/report', async (request, reply) => {
    const { id } = request.params as { id: string };
    const { reason, reporterName, reporterEmail, description } = request.body as {
      reason: string;
      reporterName: string;
      reporterEmail: string;
      description?: string;
    };

    if (!reason || !reporterName || !reporterEmail) {
      return reply.code(400).send({ success: false, message: 'Reason, reporter name, and email are required fields.' });
    }

    try {
      // 1. Verify project exists
      const [project] = await db.select({ id: projects.id })
        .from(projects)
        .where(eq(projects.id, id))
        .limit(1);

      if (!project) {
        return reply.code(404).send({ success: false, message: 'Project not found' });
      }

      // 2. Insert report entry
      const [report] = await db.insert(listingReports)
        .values({
          projectId: project.id,
          reason,
          reporterName,
          reporterEmail,
          description: description || null,
        })
        .returning();

      return reply.send({
        success: true,
        message: 'Project report submitted successfully. Thank you for your feedback.',
        data: report
      });
    } catch (err: any) {
      console.error('Report project error:', err);
      return reply.status(500).send({ success: false, message: 'Failed to submit report', error: err.message });
    }
  });
}
