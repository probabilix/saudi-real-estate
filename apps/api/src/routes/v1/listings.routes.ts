import { FastifyInstance } from 'fastify';
import { listingSearchSchema, createListingSchema, updateListingSchema } from '@saudi-re/shared';
import { ListingService } from '../../services/listing.service';
import { CloudinaryService } from '../../services/cloudinary.service';
import { authenticateJWT, optionalAuthenticateJWT } from '../../middleware/auth.middleware';
import { db } from '../../db';
import { leads, buyerProfiles, listings } from '../../db/schema';
import { eq, and, sql } from 'drizzle-orm';

/**
 * Listings Routes
 */
export default async function listingsRoutes(app: FastifyInstance) {
  
  /**
   * GET /api/v1/listings
   * Public search with filters
   */
  app.get('/', { preHandler: [optionalAuthenticateJWT] }, async (request, reply) => {
    const query = request.query as any;
    const parsed = listingSearchSchema.safeParse(query);

    if (!parsed.success) {
      return reply.code(400).send({ success: false, errors: parsed.error.format() });
    }

    try {
      const result = await ListingService.searchListings({
        ...parsed.data,
        ownerId: query.ownerId,
        firmId: query.firmId,
        userId: request.user?.userId
      });

      return reply.send({
        success: true,
        data: result
      });
    } catch (err: any) {
      console.error('Listings search error:', err);
      return reply.status(500).send({ 
        success: false, 
        message: 'Failed to fetch listings',
        error: err.message
      });
    }
  });

  /**
   * GET /api/v1/listings/upload-signature
   * Get signed parameters for Cloudinary upload (Authenticated)
   */
  app.get('/upload-signature', { preHandler: [authenticateJWT] }, async (request, reply) => {
    try {
      const params = CloudinaryService.getSignedUploadParams('listings');
      return reply.send({
        success: true,
        data: params
      });
    } catch (err: any) {
      console.error('Cloudinary signature error:', err);
      return reply.status(500).send({ 
        success: false, 
        message: 'Failed to generate upload signature' 
      });
    }
  });

  /**
   * GET /api/v1/listings/:id
   * Public detail view
   */
  app.get('/:id', { preHandler: [optionalAuthenticateJWT] }, async (request, reply) => {
    const { id } = request.params as { id: string };

    try {
      const listing = await ListingService.getListingById(
        id, 
        request.user?.role, 
        request.user?.userId
      );

      if (!listing) {
        return reply.code(404).send({ success: false, message: 'Listing not found' });
      }

      return reply.send({
        success: true,
        data: listing
      });
    } catch (err: any) {
      console.error('Listing detail error:', err);
      return reply.status(500).send({ 
        success: false, 
        message: 'Failed to fetch listing detail',
        error: err.message
      });
    }
  });

  /**
   * POST /api/v1/listings
   * Create a new listing (Authenticated)
   */
  app.post('/', { preHandler: [authenticateJWT] }, async (request, reply) => {
    const userId = request.user?.userId;
    const parsed = createListingSchema.safeParse(request.body);

    if (!parsed.success) {
      return reply.code(400).send({ success: false, errors: parsed.error.format() });
    }

    try {
      const listing = await ListingService.createListing(userId!, parsed.data);
      return reply.code(201).send({ success: true, data: listing });
    } catch (err) {
      app.log.error(err);
      return reply.code(500).send({ success: false, message: 'Failed to create listing' });
    }
  });

  /**
   * PUT /api/v1/listings/:id
   * Update listing (Authenticated, with Ownership check)
   */
  app.put('/:id', { preHandler: [authenticateJWT] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const userId = request.user?.userId;
    const userRole = request.user?.role;
    
    // We use partial update schema
    const parsed = updateListingSchema.safeParse(request.body);

    if (!parsed.success) {
      return reply.code(400).send({ success: false, errors: parsed.error.format() });
    }

    try {
      console.log(`[ROUTE DEBUG] PUT /listings/${id} | User: ${userId}, Role: ${userRole}`);
      const listing = await ListingService.updateListing(id, userId!, userRole!, parsed.data);
      return reply.send({ success: true, data: listing });
    } catch (err: any) {
      if (err.message === 'Unauthorized to edit this listing') {
        return reply.code(403).send({ success: false, message: err.message });
      }
      if (err.message === 'Listing not found') {
        return reply.code(404).send({ success: false, message: err.message });
      }
      app.log.error(err);
      return reply.code(500).send({ success: false, message: 'Internal Server Error' });
    }
  });

  /**
   * DELETE /api/v1/listings/:id
   * Soft delete (Authenticated, with Ownership check)
   */
  app.delete('/:id', { preHandler: [authenticateJWT] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const userId = request.user?.userId;
    const userRole = request.user?.role;

    try {
      await ListingService.deleteListing(id, userId!, userRole!);
      return reply.send({ success: true, message: 'Listing deleted successfully' });
    } catch (err: any) {
      const code = err.message === 'Unauthorized to delete this listing' ? 403 : 
                   err.message === 'Listing not found' ? 404 : 500;
      return reply.code(code).send({ success: false, error: err.message });
    }
  });

  /**
   * POST /api/v1/listings/:id/publish
   * Deducts credits and sets status to FLAGGED
   */
  app.post('/:id/publish', { preHandler: [authenticateJWT] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const userId = request.user?.userId;

    try {
      const result = await ListingService.publishListing(id, userId!);
      return reply.send({ success: true, data: result });
    } catch (err: any) {
      return reply.code(400).send({ success: false, error: err.message });
    }
  });

  /**
   * POST /api/v1/listings/:id/reveal
   * Returns private contact info ONLY if user is AI-Qualified
   */
  app.post('/:id/reveal', { preHandler: [optionalAuthenticateJWT] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const userId = (request as any).user?.userId;

    if (!userId) {
      return reply.code(401).send({ success: false, message: 'Authentication required to reveal contact' });
    }

    try {
      // 1. Self-healing check (Ensures column exists in schema dynamically)
      await db.execute(sql`ALTER TABLE listings ADD COLUMN IF NOT EXISTS ai_qualification_active BOOLEAN DEFAULT true;`);

      // 2. Fetch the listing parameters
      const [listing] = await db.select({
        id: listings.id,
        ownerId: listings.ownerId,
        price: listings.price,
        aiQualificationActive: listings.aiQualificationActive
      })
      .from(listings)
      .where(eq(listings.id, id))
      .limit(1);

      if (!listing) {
        return reply.code(404).send({ success: false, message: 'Listing not found' });
      }

      let canReveal = false;

      // Bypass A: AI qualification is disabled on this property
      if (listing.aiQualificationActive === false) {
        canReveal = true;
      } else {
        // Check if user has an existing qualified lead for this listing specifically
        const [specificQualified] = await db
          .select({ leadId: leads.id })
          .from(leads)
          .innerJoin(buyerProfiles, eq(leads.buyerProfileId, buyerProfiles.id))
          .where(
            and(
              eq(buyerProfiles.userId, userId),
              eq(leads.listingId, id),
              eq(leads.isQualified, true)
            )
          )
          .limit(1);

        if (specificQualified) {
          canReveal = true;
        }
      }

      if (!canReveal) {
        return reply.code(403).send({ 
          success: false, 
          message: 'Lead qualification required to access contact details' 
        });
      }

      const contact = await ListingService.revealContactInfo(id);
      return reply.send({ success: true, data: contact });
    } catch (err: any) {
      return reply.code(500).send({ success: false, error: err.message });
    }
  });
}

