import { FastifyInstance } from 'fastify';
import { db } from '../../db';
import { users } from '../../db/schema';
import { eq, and, sql } from 'drizzle-orm';
import { authenticateJWT } from '../../middleware/auth.middleware';
import { EmailService } from '../../services/email.service';
import { ListingService } from '../../services/listing.service';
import { brokerProfiles } from '../../db/schema';
import { updateBrokerProfileSchema, updateUserProfileSchema } from '@saudi-re/shared';

export default async function userRoutes(app: FastifyInstance) {
  
  /**
   * POST /api/v1/user/verify-professional
   * Submits AD License or Tourism Permit for manual approval
   */
  app.post('/verify-professional', { preHandler: [authenticateJWT] }, async (request, reply) => {
    const { licenseNumber, type } = request.body as { licenseNumber: string; type: 'sell' | 'daily' };
    const userId = request.user?.userId;

    if (!licenseNumber) {
      return reply.code(400).send({ success: false, message: 'License number is required' });
    }

    try {
      // 1. Update user record
      const updatedUsers = await db.update(users)
        .set({ 
          regaLicence: licenseNumber,
          verificationStatus: 'PENDING',
          updatedAt: new Date()
        })
        .where(eq(users.id, userId as string))
        .returning();

      if (updatedUsers.length === 0) {
        return reply.code(404).send({ success: false, message: 'User not found' });
      }

      const user = updatedUsers[0];

      // 2. Notify Admin
      await EmailService.sendAdminVerificationAlert({
        id: user.id,
        name: user.name || 'Unknown User',
        role: user.role,
        email: user.email,
        regaLicence: licenseNumber,
      });

      return reply.send({ 
        success: true, 
        message: 'Credentials submitted for manual verification.',
        data: { verificationStatus: 'PENDING' }
      });

    } catch (err) {
      app.log.error(err);
      return reply.code(500).send({ success: false, message: 'Internal Server Error' });
    }
  });

  /**
   * GET /api/v1/user/dashboard-stats
   * Consolidated metrics for the dashboard overview and listings page
   */
  app.get('/dashboard-stats', { preHandler: [authenticateJWT] }, async (request, reply) => {
    const userId = request.user?.userId;
    const userRole = request.user?.role;

    try {
      const isFirm = userRole === 'FIRM';
      const stats = await ListingService.getDashboardStats(
        isFirm ? { firmId: userId } : { ownerId: userId }
      );

      return reply.send({
        success: true,
        data: stats
      });
    } catch (err: any) {
      console.error('Dashboard stats error:', err);
      return reply.status(500).send({ 
        success: false, 
        message: 'Failed to fetch dashboard stats',
        error: err.message
      });
    }
  });

  /**
   * GET /api/v1/user/profile
   * Comprehensive user profile with verification status
   */
  app.get('/profile', { preHandler: [authenticateJWT] }, async (request, reply) => {
    const userId = request.user?.userId;

    try {
      // Unified query with left join for maximum compatibility

      // Unified query with left join
      const results = await db.select()
        .from(users)
        .leftJoin(brokerProfiles, eq(users.id, brokerProfiles.userId))
        .where(eq(users.id, userId as string))
        .limit(1);

      if (results.length === 0) {
        return reply.code(404).send({ success: false, message: 'User not found' });
      }

      const { users: userData, broker_profiles: brokerData } = results[0] as any;

      return reply.send({
        success: true,
        data: {
          user: {
            id: userData.id,
            name: userData.name,
            email: userData.email,
            role: userData.role,
            phone: userData.phone,
            // Personal profile fields on users table — available for ALL roles
            gender: userData.gender || null,
            nationality: userData.nationality || null,
            city: userData.city || null,
            verificationStatus: userData.verificationStatus,
            regaLicence: userData.regaLicence,
            subscriptionTier: userData.subscriptionTier,
            avatarUrl: userData.avatarUrl,
          },
          // Broker-specific extras — only populated if user has a broker_profiles row
          profile: brokerData || null
        }
      });
    } catch (err) {
      app.log.error(err);
      return reply.code(500).send({ success: false, message: 'Internal Server Error' });
    }
  });

  /**
   * PATCH /api/v1/user/profile
   * Universal profile update — saves personal fields to users table for ALL roles.
   * If the user is a broker/agent, also upserts broker-specific extras to broker_profiles.
   */
  app.patch('/profile', { preHandler: [authenticateJWT] }, async (request, reply) => {
    const userId = request.user?.userId;
    const userRole = request.user?.role;
    app.log.info('[UPDATE PROFILE] Request body received: %j', request.body as any);

    // Step 1: Validate & save personal fields to users table (ALL roles)
    const userParsed = updateUserProfileSchema.safeParse(request.body);
    if (!userParsed.success) {
      app.log.error('[UPDATE PROFILE] User schema validation failed: %j', userParsed.error.format());
      return reply.code(400).send({ success: false, errors: userParsed.error.format() });
    }

    try {
      const { name, phone, gender, nationality, city, avatarUrl } = userParsed.data;
      const userUpdate: Record<string, any> = { updatedAt: new Date() };
      if (name !== undefined)        userUpdate.name = name;
      if (phone !== undefined)       userUpdate.phone = phone;
      if (gender !== undefined)      userUpdate.gender = gender;
      if (nationality !== undefined) userUpdate.nationality = nationality;
      if (city !== undefined)        userUpdate.city = city;
      if (avatarUrl !== undefined)   userUpdate.avatarUrl = avatarUrl;

      const updatedUsers = await db.update(users)
        .set(userUpdate)
        .where(eq(users.id, userId as string))
        .returning();

      app.log.info('[UPDATE PROFILE] users table updated row: %j', updatedUsers[0] || null);

      // Step 2: If user has a broker/agent role, also upsert broker-specific extras
      const brokerRoles = ['SOLO_BROKER', 'AGENT', 'FIRM', 'OWNER', 'ADMIN'];
      if (brokerRoles.includes(userRole as string)) {
        const brokerParsed = updateBrokerProfileSchema.safeParse(request.body);
        if (brokerParsed.success && Object.keys(brokerParsed.data).length > 0) {
          app.log.info('[UPDATE PROFILE] Broker parsed data: %j', brokerParsed.data);
          const brokerCleanData = { ...brokerParsed.data } as any;
          delete brokerCleanData.gender;
          delete brokerCleanData.nationality;
          delete brokerCleanData.city;
          delete brokerCleanData.whatsapp;
          
          const brokerData = {
            ...brokerCleanData,
            userId: userId as string,
            updatedAt: new Date(),
          };

          const existingProfile = await db.query.brokerProfiles.findFirst({
            where: eq(brokerProfiles.userId, userId as string),
          });

          if (existingProfile) {
            await db.update(brokerProfiles)
              .set(brokerData)
              .where(eq(brokerProfiles.userId, userId as string));
          } else {
            await db.insert(brokerProfiles).values({
              ...brokerData,
              id: undefined,
            });
          }
          app.log.info('[UPDATE PROFILE] broker_profiles upserted for userId: %s', userId);
        }
      }

      return reply.send({ success: true, message: 'Profile updated successfully' });
    } catch (err) {
      app.log.error(err);
      return reply.code(500).send({ success: false, message: 'Internal Server Error' });
    }
  });

  /**
   * GET /api/v1/user/public-broker/:id
   * Public profile for an individual broker
   */
  app.get('/public-broker/:id', async (request, reply) => {
    const { id } = request.params as { id: string };

    try {
      const result = await db.query.users.findFirst({
        where: eq(users.id, id),
        with: {
          brokerProfile: true,
          firm: {
            columns: {
              id: true,
              name: true,
              avatarUrl: true
            }
          }
        }
      });

      if (!result) {
        return reply.code(404).send({ success: false, message: 'Broker not found' });
      }

      // Calculate stats (Active vs Sold/Rented)
      const activeCount = await ListingService.getListingsCount({ ownerId: id, status: 'ACTIVE' });
      const successCount = await ListingService.getListingsCount({ 
        ownerId: id, 
        status: ['SOLD', 'RENTED'] 
      });

      return reply.send({
        success: true,
        data: {
          broker: result,
          stats: {
            activeListings: activeCount,
            successListings: successCount,
          }
        }
      });
    } catch (err) {
      app.log.error(err);
      return reply.code(500).send({ success: false, message: 'Internal Server Error' });
    }
  });

  /**
   * GET /api/v1/user/public-firm/:id
   * Public profile for a real estate firm
   */
  app.get('/public-firm/:id', async (request, reply) => {
    const { id } = request.params as { id: string };

    try {
      const firm = await db.query.users.findFirst({
        where: and(eq(users.id, id), eq(users.role, 'FIRM'))
      });

      if (!firm) {
        return reply.code(404).send({ success: false, message: 'Firm not found' });
      }

      // Get agents under this firm
      const agents = await db.query.users.findMany({
        where: and(eq(users.firmId, id), eq(users.isActive, true)),
        columns: {
          id: true,
          name: true,
          avatarUrl: true,
          role: true,
          regaVerified: true
        }
      });

      // Calculate stats
      const activeCount = await ListingService.getListingsCount({ firmId: id, status: 'ACTIVE' });
      const successCount = await ListingService.getListingsCount({ 
        firmId: id, 
        status: ['SOLD', 'RENTED'] 
      });

      return reply.send({
        success: true,
        data: {
          firm,
          agents,
          stats: {
            activeListings: activeCount,
            successListings: successCount,
            agentsCount: agents.length
          }
        }
      });
    } catch (err) {
      app.log.error(err);
      return reply.code(500).send({ success: false, message: 'Internal Server Error' });
    }
  });
}
