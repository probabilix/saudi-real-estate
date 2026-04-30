import { FastifyInstance } from 'fastify';
import { db } from '../../db';
import { favorites, listings } from '../../db/schema';
import { eq, and } from 'drizzle-orm';
import { authenticateJWT } from '../../middleware/auth.middleware';

export default async function favoritesRoutes(app: FastifyInstance) {
  
  /**
   * POST /api/v1/favorites/toggle
   * Toggles a property in the user's favorites
   */
  app.post('/toggle', { preHandler: [authenticateJWT] }, async (request, reply) => {
    const { listingId } = request.body as { listingId: string };
    const userId = request.user?.userId;

    if (!listingId) {
      return reply.code(400).send({ success: false, message: 'Listing ID is required' });
    }

    try {
      // 1. Check if it's already favorited
      const existing = await db.query.favorites.findFirst({
        where: and(
          eq(favorites.userId, userId as string),
          eq(favorites.listingId, listingId)
        ),
      });

      if (existing) {
        // Remove from favorites
        await db.delete(favorites)
          .where(and(
            eq(favorites.userId, userId as string),
            eq(favorites.listingId, listingId)
          ));
        
        return reply.send({ 
          success: true, 
          message: 'Removed from favorites',
          data: { isFavorited: false }
        });
      } else {
        // Add to favorites
        // Verify listing exists first
        const listing = await db.query.listings.findFirst({
          where: eq(listings.id, listingId)
        });

        if (!listing) {
          return reply.code(404).send({ success: false, message: 'Listing not found' });
        }

        await db.insert(favorites).values({
          userId: userId as string,
          listingId: listingId,
        });

        return reply.send({ 
          success: true, 
          message: 'Added to favorites',
          data: { isFavorited: true }
        });
      }
    } catch (err) {
      app.log.error(err);
      return reply.code(500).send({ success: false, message: 'Internal Server Error' });
    }
  });

  /**
   * GET /api/v1/favorites
   * Returns the list of favorited properties for the current user
   */
  app.get('/', { preHandler: [authenticateJWT] }, async (request, reply) => {
    const userId = request.user?.userId;

    try {
      const results = await db.query.favorites.findMany({
        where: eq(favorites.userId, userId as string),
        with: {
          listing: {
            with: {
              owner: {
                columns: {
                  id: true,
                  name: true,
                  avatarUrl: true,
                  role: true,
                }
              }
            }
          }
        },
        orderBy: (favorites, { desc }) => [desc(favorites.createdAt)]
      });

      const items = results.map(r => ({
        ...r.listing,
        isFavorited: true
      }));

      return reply.send({
        success: true,
        data: { items }
      });
    } catch (err) {
      app.log.error(err);
      return reply.code(500).send({ success: false, message: 'Failed to fetch favorites' });
    }
  });
}
