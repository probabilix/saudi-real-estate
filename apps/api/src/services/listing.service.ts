import { db } from '../db';
import { listings, users, leads, favorites } from '../db/schema';
import { eq, and, gte, lte, or, sql, desc, inArray, InferSelectModel, SQL, isNull } from 'drizzle-orm';
import { ListingSearchInput } from '@saudi-re/shared';
import { SystemService } from './system.service';


/**
 * Helper to generate a professional 6-character property ID
 * Example: SRE-4K9P2X
 */
function generateShortId(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Avoid ambiguous chars O, 0, I, 1
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `SRE-${result}`;
}

export class ListingService {
  /**
   * Helper to get all relevant IDs for a firm (Firm Owner + All Agents)
   */
  private static async getFirmCollaboratorIds(firmId: string) {
    const agents = await db.select({ id: users.id })
      .from(users)
      .where(or(eq(users.id, firmId), eq(users.firmId, firmId)));
    
    const agentIds = agents.map(a => a.id);
    return Array.from(new Set([firmId, ...agentIds]));
  }

  /**
   * Search and filter listings
   */
  static async searchListings(filters: ListingSearchInput & { ownerId?: string; firmId?: string; status?: string; q?: string; userId?: string }) {
    const { 
      city, type, purpose, minPrice, maxPrice, bedrooms, 
      foreignerEligible, isFeatured, ownerId, firmId, status, q, limit = 20, cursor, userId
    } = filters;

    const conditions: any[] = [];

    // Base filters
    if (city) conditions.push(eq(listings.city, city));
    if (type) conditions.push(eq(listings.type, type));
    if (purpose) conditions.push(eq(listings.purpose, purpose));
    if (minPrice) conditions.push(gte(listings.price, minPrice));
    if (maxPrice) conditions.push(lte(listings.price, maxPrice));
    if (bedrooms) conditions.push(gte(listings.bedrooms, bedrooms));
    if (foreignerEligible !== undefined) conditions.push(eq(listings.foreignerEligible, foreignerEligible));
    if (isFeatured !== undefined) conditions.push(eq(listings.isFeatured, isFeatured));

    // Keyword Search (Includes Short ID)
    if (q) {
      const searchPattern = `%${q}%`;
      conditions.push(or(
        sql`${listings.arTitle} ILIKE ${searchPattern}`,
        sql`${listings.enTitle} ILIKE ${searchPattern}`,
        sql`${listings.city} ILIKE ${searchPattern}`,
        sql`${listings.district} ILIKE ${searchPattern}`,
        eq(listings.shortId, q.toUpperCase()) // Direct ID match
      ));
    }

    // Owner/Firm filters
    if (ownerId) {
      conditions.push(eq(listings.ownerId, ownerId));
    } else if (firmId) {
      const allIds = await this.getFirmCollaboratorIds(firmId);
      conditions.push(inArray(listings.ownerId, allIds));
    }

    // Status filter
    if (status) {
      conditions.push(eq(listings.status, status as any));
    } else if (!ownerId && !firmId) {
      conditions.push(eq(listings.status, 'ACTIVE'));
    }
    
    conditions.push(sql`${listings.deletedAt} IS NULL`);

    // Get total count
    const countResult = await db.select({ count: sql<number>`count(*)` })
      .from(listings)
      .where(and(...conditions));
    const total = Number(countResult[0]?.count) || 0;

    // Pagination
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

    // Handle Favorites if userId is provided
    let favoritedIds: Set<string> = new Set();
    if (userId && results.length > 0) {
      try {
        const listingIds = results.map(r => r.id);
        const userFavorites = await db.query.favorites.findMany({
          where: and(
            eq(favorites.userId, userId),
            inArray(favorites.listingId, listingIds)
          ),
          columns: { listingId: true }
        });
        favoritedIds = new Set(userFavorites.map(f => f.listingId));
      } catch (err) {
        console.error('Favorites query failed (possibly table missing):', err);
      }
    }

    const items = results.slice(0, limit).map(item => ({
      ...item,
      isFavorited: favoritedIds.has(item.id)
    }));

    const hasMore = results.length > limit;
    
    const lastItem = items.length > 0 ? items[items.length - 1] : null;
    const nextCursor = (hasMore && lastItem?.createdAt) 
      ? (typeof lastItem.createdAt === 'string' ? lastItem.createdAt : lastItem.createdAt.toISOString()) 
      : null;
    
    return {
      items,
      total,
      hasMore,
      nextCursor,
    };
  }

  /**
   * Get a single listing by ID with full owner details and firm context
   */
  static async getListingById(id: string, requesterRole?: string, requesterId?: string) {
    const result = await db.query.listings.findFirst({
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

    if (!result) return null;

    // Firm Owner Full Access Logic
    if (requesterRole === 'FIRM' && requesterId) {
      const isOurAgent = result.owner.firmId === requesterId || result.ownerId === requesterId;
      if (isOurAgent) {
        (result as any).hasEditAccess = true;
      }
    }

    // Check if favorited by requester
    if (requesterId) {
      try {
        const favorite = await db.query.favorites.findFirst({
          where: and(
            eq(favorites.userId, requesterId),
            eq(favorites.listingId, id)
          )
        });
        (result as any).isFavorited = !!favorite;
      } catch (err) {
        console.error('Favorite check failed:', err);
        (result as any).isFavorited = false;
      }
    }

    return result;
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
       const allIds = await this.getFirmCollaboratorIds(firmId);
       conditions.push(inArray(listings.ownerId, allIds));
     }

     const result = await db.select({ count: sql<number>`count(*)` })
       .from(listings)
       .where(and(...conditions));
     
     return Number(result[0]?.count) || 0;
  }

  /**
   * Get consolidated stats for a broker's dashboard
   */
  static async getDashboardStats(params: { ownerId?: string; firmId?: string }) {
    const { ownerId, firmId } = params;
    const conditions: SQL[] = [sql`${listings.deletedAt} IS NULL`];
    
    if (ownerId) {
      conditions.push(eq(listings.ownerId, ownerId));
    } else if (firmId) {
      const allIds = await this.getFirmCollaboratorIds(firmId);
      conditions.push(inArray(listings.ownerId, allIds));
    }
    
    // 1. Get categorized counts
    const statusCounts = await db.select({
      status: listings.status,
      count: sql<number>`count(*)`
    })
    .from(listings)
    .where(and(...conditions))
    .groupBy(listings.status);

    // 2. Get total views
    const viewsResult = await db.select({
      totalViews: sql<number>`sum(${listings.viewsCount})`
    })
    .from(listings)
    .where(and(...conditions));

    // 3. Get active leads count
    let leadsConditions: SQL | undefined;
    if (ownerId) {
      leadsConditions = eq(leads.brokerId, ownerId);
    } else if (firmId) {
      const ids = [firmId];
      // In a real scenario, we might want to sum leads for all agents too
      leadsConditions = inArray(leads.brokerId, ids);
    }

    const leadsCount = leadsConditions 
      ? await db.select({ count: sql<number>`count(*)` }).from(leads).where(leadsConditions)
      : [{ count: 0 }];

    // Format counts map
    const countsMap: Record<string, number> = { ACTIVE: 0, DRAFT: 0, FLAGGED: 0, SOLD: 0, REMOVED: 0 };
    statusCounts.forEach(sc => {
      if (sc.status) countsMap[sc.status] = Number(sc.count);
    });

    return {
      statusCounts: countsMap,
      totalViews: Number(viewsResult[0]?.totalViews) || 0,
      activeLeads: Number(leadsCount[0]?.count) || 0,
      totalListings: Object.values(countsMap).reduce((a, b) => a + b, 0)
    };
  }

  /**
   * Create a new listing
   * Initial state is DRAFT or FLAGGED depending on input
   */
  static async createListing(requesterId: string, data: any) {
    const shortId = generateShortId();
    
    // Allow Firm Owners to specify a different owner (one of their agents)
    const finalOwnerId = data.ownerId || requesterId;

    const newListing = await db.insert(listings).values({
      ...data,
      id: undefined,
      ownerId: finalOwnerId,
      shortId,
      status: 'DRAFT',
      createdAt: new Date(),
      updatedAt: new Date(),
    }).returning();

    return newListing[0];
  }

  /**
   * Update an existing listing with hierarchical permission checks
   * Implements "State-Aware Legal Lock" - ignores attempts to change identity fields if verified
   */
  static async updateListing(id: string, requesterId: string, requesterRole: string, data: any) {
    // 1. Fetch current listing with full owner context
    const current = await db.query.listings.findFirst({
      where: and(eq(listings.id, id), sql`${listings.deletedAt} IS NULL`),
      with: { 
        owner: {
          columns: {
            id: true,
            firmId: true
          }
        } 
      }
    });

    if (!current) throw new Error('Listing not found');

    // 2. Permission Check: Owner OR Firm Owner
    const isOwner = current.ownerId === requesterId;
    const isFirmOwner = requesterRole === 'FIRM' && (current.owner.firmId === requesterId || current.ownerId === requesterId);

    if (!isOwner && !isFirmOwner) {
      throw new Error('Unauthorized to edit this listing');
    }

    // 3. "State-Aware Legal Lock" Logic
    // If listing is already ACTIVE or PENDING review, we LOCK the core identity
    const identityFields = [
      'type', 
      'purpose', 
      'regaAdvertisingLicense', 
      'regaFalLicense', 
      'propertyAge',
      'locationDescriptionDeedAr'
    ];

    const updateData = { ...data };
    
    if (current.status === 'ACTIVE' || current.status === 'FLAGGED') {
      identityFields.forEach(field => {
        if (updateData[field] !== undefined && updateData[field] !== (current as any)[field]) {
          delete updateData[field]; // Ignore attempts to change core identity
        }
      });
    }

    // 4. Perform Update with timestamp
    // We explicitly ensure history is passed if present in data
    const updated = await db.update(listings)
      .set({
        ...updateData,
        history: data.history !== undefined ? data.history : current.history,
        updatedAt: new Date()
      })
      .where(eq(listings.id, id))
      .returning();

    return updated[0];
  }

  /**
   * Soft Delete Listing with Ownership Verification
   */
  static async deleteListing(id: string, requesterId: string, requesterRole: string) {
    const [current] = await db.select({
      id: listings.id,
      ownerId: listings.ownerId,
      firmId: users.firmId
    })
    .from(listings)
    .innerJoin(users, eq(listings.ownerId, users.id))
    .where(and(eq(listings.id, id), isNull(listings.deletedAt)));

    if (!current) throw new Error('Listing not found');

    const isOwner = current.ownerId === requesterId;
    const isFirmOwner = requesterRole === 'FIRM' && (current.firmId === requesterId || current.ownerId === requesterId);

    if (!isOwner && !isFirmOwner) {
      throw new Error('Unauthorized to delete this listing');
    }

    await db.update(listings)
      .set({ 
        deletedAt: new Date(),
        status: 'REMOVED' // Ensure status reflects deletion
      })
      .where(eq(listings.id, id));

    return true;
  }

  /**
   * Publish a listing (Transition from DRAFT -> FLAGGED)
   * This is the moment of credit consumption.
   */
  static async publishListing(id: string, userId: string) {
    const cost = await SystemService.getListingCost();
    
    // 1. Fetch user and verify balance
    const [user] = await db.select({ 
      id: users.id, 
      creditsBalance: users.creditsBalance,
      regaVerified: users.regaVerified,
      role: users.role
    })
    .from(users)
    .where(eq(users.id, userId));

    if (!user) throw new Error('User not found');
    if (!user.regaVerified) throw new Error('Your REGA verification is required before publishing.');
    
    // 2. Verified balance check
    if ((user.creditsBalance ?? 0) < cost) {
      throw new Error(`Insufficient credits. You need ${cost} credits to publish.`);
    }

    // 3. Fetch Listing to check ownership/firm permissions
    const currentListing = await db.query.listings.findFirst({
      where: eq(listings.id, id),
      with: { owner: true }
    });

    if (!currentListing) throw new Error('Listing not found');

    const isOwner = currentListing.ownerId === userId;
    const isFirmOwner = user.role === 'FIRM' && currentListing.owner.firmId === userId;

    if (!isOwner && !isFirmOwner) {
      throw new Error('Unauthorized to publish this listing');
    }

    // 4. Update Listing Status & Deduct Credits Sequentially
    // Note: Neon HTTP driver doesn't support db.transaction()
    
    // Deduct Credits from the user performing the action
    await db.update(users)
      .set({ 
        creditsBalance: sql`${users.creditsBalance} - ${cost}`,
        updatedAt: new Date()
      })
      .where(eq(users.id, userId));

    // Update Listing
    const updated = await db.update(listings)
      .set({ 
        status: 'FLAGGED', // Pending Admin Review
        updatedAt: new Date()
      })
      .where(eq(listings.id, id))
      .returning();

    const result = updated[0];

    if (!result) throw new Error('Failed to update listing status');

    return {
      listing: result,
      newBalance: (user.creditsBalance ?? 0) - cost
    };
  }
}

