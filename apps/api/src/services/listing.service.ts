import { db } from '../db';
import { listings, users } from '../db/schema';
import { eq, and, gte, lte, or, sql, desc, inArray, InferSelectModel } from 'drizzle-orm';
import { ListingSearchInput } from '@saudi-re/shared';

export class ListingService {
  /**
   * Search and filter listings
   */
  static async searchListings(filters: ListingSearchInput & { ownerId?: string; firmId?: string }) {
    const { 
      city, type, purpose, minPrice, maxPrice, bedrooms, 
      foreignerEligible, isFeatured, ownerId, firmId, limit = 20, cursor 
    } = filters;

    const conditions = [];

    // Base filters
    if (city) conditions.push(eq(listings.city, city));
    if (type) conditions.push(eq(listings.type, type));
    if (purpose) conditions.push(eq(listings.purpose, purpose));
    if (minPrice) conditions.push(gte(listings.price, minPrice));
    if (maxPrice) conditions.push(lte(listings.price, maxPrice));
    if (bedrooms) conditions.push(gte(listings.bedrooms, bedrooms));
    if (foreignerEligible !== undefined) conditions.push(eq(listings.foreignerEligible, foreignerEligible));
    if (isFeatured !== undefined) conditions.push(eq(listings.isFeatured, isFeatured));

    // Owner/Firm filters
    if (ownerId) {
      conditions.push(eq(listings.ownerId, ownerId));
    } else if (firmId) {
      // Find all agents belonging to this firm
      const agents = await db.select({ id: users.id })
        .from(users)
        .where(eq(users.firmId, firmId));
      
      const agentIds = agents.map(a => a.id);
      if (agentIds.length > 0) {
        conditions.push(inArray(listings.ownerId, agentIds));
      } else {
        // If no agents, return no results
        return { items: [], hasMore: false, nextCursor: null };
      }
    }

    // Status filter - only active listings for public search
    conditions.push(eq(listings.status, 'ACTIVE'));
    conditions.push(sql`${listings.deletedAt} IS NULL`);

    // Pagination (simplified for now, using offset if no cursor)
    const results = await db.query.listings.findMany({
      where: and(...conditions),
      limit: limit + 1,
      with: {
        owner: {
          columns: {
            id: true,
            name: true,
            avatarUrl: true,
            role: true,
            regaVerified: true,
          }
        }
      },
      orderBy: [desc(listings.createdAt)]
    });

    const hasMore = results.length > limit;
    const items = hasMore ? results.slice(0, limit) : results;
    const lastItem = items[items.length - 1];
    
    return {
      items,
      hasMore,
      nextCursor: (hasMore && lastItem?.createdAt) ? lastItem.createdAt.toISOString() : null,
    };
  }

  /**
   * Get a single listing by ID with owner details
   */
  static async getListingById(id: string) {
    return await db.query.listings.findFirst({
      where: and(eq(listings.id, id), sql`${listings.deletedAt} IS NULL`),
      with: {
        owner: {
          with: {
            brokerProfile: true,
            firm: true,
          }
        }
      }
    });
  }

  /**
   * Get count of listings for a user or firm by status
   */
  static async getListingsCount(params: { ownerId?: string; firmId?: string; status?: string | string[] }) {
     const { ownerId, firmId, status } = params;
     const conditions: any[] = [sql`${listings.deletedAt} IS NULL`];
     
     if (status) {
       if (Array.isArray(status)) {
         conditions.push(inArray(listings.status, status as any));
       } else {
         conditions.push(eq(listings.status, status as any));
       }
     }
     
     if (ownerId) {
       conditions.push(eq(listings.ownerId, ownerId));
     } else if (firmId) {
       const agents = await db.select({ id: users.id }).from(users).where(eq(users.firmId, firmId));
       const agentIds = agents.map(a => a.id);
       if (agentIds.length > 0) {
         conditions.push(inArray(listings.ownerId, agentIds));
       } else {
         return 0;
       }
     }

     const result = await db.select({ count: sql<number>`count(*)` })
       .from(listings)
       .where(and(...conditions));
     
     return Number(result[0]?.count) || 0;
  }
}
