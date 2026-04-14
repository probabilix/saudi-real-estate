import { FastifyInstance } from 'fastify';
import { listingSearchSchema } from '@saudi-re/shared';
import { ListingService } from '../../services/listing.service';

/**
 * Listings Routes
 */
export default async function listingsRoutes(app: FastifyInstance) {
  
  /**
   * GET /api/v1/listings
   * Public search with filters
   */
  app.get('/', async (request, reply) => {
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
      });

      return reply.send({
        success: true,
        data: result
      });
    } catch (err) {
      app.log.error(err);
      return reply.code(500).send({ success: false, message: 'Failed to fetch listings' });
    }
  });

  /**
   * GET /api/v1/listings/:id
   * Public detail view
   */
  app.get('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };

    try {
      const listing = await ListingService.getListingById(id);

      if (!listing) {
        return reply.code(404).send({ success: false, message: 'Listing not found' });
      }

      return reply.send({
        success: true,
        data: listing
      });
    } catch (err) {
      app.log.error(err);
      return reply.code(500).send({ success: false, message: 'Internal Server Error' });
    }
  });
}
