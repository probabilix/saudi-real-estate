import { FastifyInstance } from 'fastify';
import { db } from '../../db';
import { systemSettings, users, buyerProfiles, leads, listings, chatMessages, faqs, contactSubmissions } from '../../db/schema';
import { eq, inArray, sql, and } from 'drizzle-orm';
import { SystemService } from '../../services/system.service';
import { ListingService } from '../../services/listing.service';
import { authenticateJWT, requireRole } from '../../middleware/auth.middleware';

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
        'sidebar_ad_aspect_ratio'
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
      const webhookUrl = mode === 'qualification'
        ? await SystemService.getQualificationWebhook()
        : await SystemService.getGeneralAssistantWebhook();

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
      const sparseBrief = (mode === 'qualification' && context?.id)
        ? await ListingService.getSparseBrief(context.id)
        : undefined;

      // Construct highly secure and spoof-proof context parameters for n8n
      const secureContext = {
        ...context,
        sessionId: profile.sessionId,
        buyerProfileId: profile.id,
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
      ].filter(Boolean).join('\n');

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
        languagePreference
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
      };

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
            brokerId: listing.ownerId,
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
      };

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
            brokerId: listing.ownerId,
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

      // Create or update qualified lead
      await db.insert(leads).values({
        buyerProfileId: profile.id,
        listingId: listing.id,
        brokerId: listing.ownerId,
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

      // Query chat messages for this buyer profile
      const history = await db.select()
        .from(chatMessages)
        .where(eq(chatMessages.buyerProfileId, profile.id))
        .orderBy(sql`${chatMessages.createdAt} ASC`);

      return reply.send({
        success: true,
        buyerProfileId: profile.id,
        sessionId: profile.sessionId,
        history: history.map(h => ({
          role: h.sender === 'USER' ? 'user' : 'assistant',
          content: h.content,
          timestamp: h.createdAt
        }))
      });
    } catch (err: any) {
      app.log.error(err);
      return reply.code(500).send({ success: false, message: 'Failed to fetch chat history.', error: err.message });
    }
  });
}
