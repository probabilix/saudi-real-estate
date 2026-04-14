import { FastifyInstance } from 'fastify';
import { db } from '../../db';
import { users } from '../../db/schema';
import { eq, and, sql } from 'drizzle-orm';
import { authenticateJWT } from '../../middleware/auth.middleware';
import { EmailService } from '../../services/email.service';
import { ListingService } from '../../services/listing.service';
import { brokerProfiles } from '../../db/schema';
import { updateBrokerProfileSchema } from '@saudi-re/shared';

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

      const { users: userData, broker_profiles: brokerData } = results[0];

      return reply.send({
        success: true,
        data: {
          user: {
            id: userData.id,
            name: userData.name,
            email: userData.email,
            role: userData.role,
            phone: userData.phone,
            verificationStatus: userData.verificationStatus,
            regaLicence: userData.regaLicence,
            subscriptionTier: userData.subscriptionTier,
            avatarUrl: userData.avatarUrl,
          },
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
   * Updates or creates a broker profile
   */
  app.patch('/profile', { preHandler: [authenticateJWT] }, async (request, reply) => {
    const userId = request.user?.userId;
    const parsed = updateBrokerProfileSchema.safeParse(request.body);

    if (!parsed.success) {
      return reply.code(400).send({ success: false, errors: parsed.error.format() });
    }

    try {
      // Upsert logic for broker profile
      const dataToUpdate = {
        ...parsed.data,
        userId: userId as string,
        updatedAt: new Date(),
      };

      const existingProfile = await db.query.brokerProfiles.findFirst({
        where: eq(brokerProfiles.userId, userId as string),
      });

      if (existingProfile) {
        await db.update(brokerProfiles)
          .set(dataToUpdate)
          .where(eq(brokerProfiles.userId, userId as string));
      } else {
        await db.insert(brokerProfiles).values({
          ...dataToUpdate,
          id: undefined, // Let DB generate ID
        });
      }

      // Also allow updating name/avatar on the main user record
      const { name, avatarUrl } = request.body as any;
      if (name || avatarUrl) {
        await db.update(users)
          .set({ 
            ...(name && { name }), 
            ...(avatarUrl && { avatarUrl }),
            updatedAt: new Date() 
          })
          .where(eq(users.id, userId as string));
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
