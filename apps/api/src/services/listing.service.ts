import { db } from '../db';
import { listings, users, leads, favorites, buyerProfiles, creditLedger } from '../db/schema';
import { eq, and, gte, lte, or, sql, desc, asc, inArray, InferSelectModel, SQL, isNull } from 'drizzle-orm';
import { ListingSearchInput, extractLatLng } from '@saudi-re/shared';
import { SystemService } from './system.service';
import { CloudinaryService } from './cloudinary.service';



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
  static async searchListings(filters: ListingSearchInput & { ownerId?: string; firmId?: string; status?: string; q?: string; userId?: string; requesterRole?: string; requesterId?: string; excludeProjects?: string }) {
    const {
      city, type, purpose, minPrice, maxPrice, bedrooms,
      foreignerEligible, muslimOnly, isFeatured, ownerId, firmId, status, q, limit = 20, cursor, userId,
      requesterRole, requesterId, excludeProjects
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
    if (muslimOnly !== undefined) conditions.push(eq(listings.muslimOnly, muslimOnly));
    if (isFeatured !== undefined) conditions.push(eq(listings.isFeatured, isFeatured));
    if (excludeProjects !== 'false') conditions.push(isNull(listings.projectId));

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

    // Enforce visibility permissions:
    // If not ADMIN, requester can only see ACTIVE listings, OR listings they own, OR listings in their firm
    if (requesterRole !== 'ADMIN') {
      const visibilityOrs: SQL[] = [eq(listings.status, 'ACTIVE')];
      
      if (requesterId) {
        visibilityOrs.push(eq(listings.ownerId, requesterId));
        if (requesterRole === 'FIRM') {
          const firmCollaborators = await this.getFirmCollaboratorIds(requesterId);
          if (firmCollaborators.length > 0) {
            visibilityOrs.push(inArray(listings.ownerId, firmCollaborators));
          }
        }
      }
      
      conditions.push(or(...visibilityOrs));
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
      offset: (filters.page && filters.page > 1) ? (filters.page - 1) * limit : undefined,
      with: {
        owner: {
          columns: {
            id: true,
            name: true,
            avatarUrl: true,
            role: true,
          }
        },
        project: true
      },
      orderBy: (() => {
        const order: any[] = [
          desc(listings.isFeatured),
          asc(listings.featuredOrder),
        ];
        if (filters.sortBy === 'price_asc') {
          order.push(asc(listings.price));
        } else if (filters.sortBy === 'price_desc') {
          order.push(desc(listings.price));
        } else if (filters.sortBy === 'beds_asc') {
          order.push(asc(listings.bedrooms));
        } else if (filters.sortBy === 'beds_desc') {
          order.push(desc(listings.bedrooms));
        } else {
          order.push(desc(listings.createdAt));
        }
        return order;
      })()
    });

    // Filter out listings whose featuredUntil has passed (expired promotions)
    // Only apply this filter when specifically querying featured listings
    const now = new Date();
    const filteredResults = isFeatured
      ? results.filter(l =>
          !l.featuredUntil || new Date(l.featuredUntil) >= now
        )
      : results;

    // Handle Favorites if userId is provided
    let favoritedIds: Set<string> = new Set();
    if (userId && filteredResults.length > 0) {
      try {
        const listingIds = filteredResults.map(r => r.id);
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

    const items = filteredResults.slice(0, limit).map(item => ({
      ...item,
      isFavorited: favoritedIds.has(item.id)
    }));

    const hasMore = filteredResults.length > limit;

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
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
    const result = await db.query.listings.findFirst({
      where: and(
        isUuid ? eq(listings.id, id) : eq(listings.shortId, id),
        sql`${listings.deletedAt} IS NULL`
      ),
      with: {
        owner: {
          columns: {
            id: true,
            name: true,
            avatarUrl: true,
            role: true,
            regaVerified: true,
            firmId: true,
          },
          with: {
            brokerProfile: true,
            firm: true,
          }
        },
        project: true
      }
    });

    if (!result) return null;

    // Security check: if listing is not ACTIVE, only the owner, firm collaborator, or admin can access it.
    if (result.status !== 'ACTIVE') {
      const isOwner = requesterId && result.ownerId === requesterId;
      const isFirmOwner = requesterRole === 'FIRM' && requesterId && (result.owner.firmId === requesterId || result.ownerId === requesterId);
      const isAdmin = requesterRole === 'ADMIN';

      if (!isOwner && !isFirmOwner && !isAdmin) {
        return null;
      }
    }

    // Firm Owner Full Access Logic
    if (requesterRole === 'FIRM' && requesterId) {
      const isOurAgent = result.owner.firmId === requesterId || result.ownerId === requesterId;
      if (isOurAgent) {
        (result as any).hasEditAccess = true;
      }
    }

    // Check if favorited or qualified by requester
    if (requesterId) {
      try {
        // 1. Check Favorite
        const favorite = await db.query.favorites.findFirst({
          where: and(
            eq(favorites.userId, requesterId),
            eq(favorites.listingId, id)
          )
        });
        (result as any).isFavorited = !!favorite;

        // 2. Check AI Qualification Status
        // Specific qualification check
        const qualifiedLeads = await db.select({ id: leads.id })
          .from(leads)
          .innerJoin(buyerProfiles, eq(leads.buyerProfileId, buyerProfiles.id))
          .where(
            and(
              eq(buyerProfiles.userId, requesterId),
              eq(leads.listingId, id),
              eq(leads.isQualified, true)
            )
          )
          .limit(1);

        let isQualified = qualifiedLeads.length > 0;

        // Shared compound qualification check: if they qualify for any layout in the compound, they qualify for all layouts
        if (!isQualified && result.projectId) {
          const qualifiedProjectLeads = await db.select({ id: leads.id })
            .from(leads)
            .innerJoin(buyerProfiles, eq(leads.buyerProfileId, buyerProfiles.id))
            .where(
              and(
                eq(buyerProfiles.userId, requesterId),
                eq(leads.projectId, result.projectId),
                eq(leads.isQualified, true)
              )
            )
            .limit(1);
          isQualified = qualifiedProjectLeads.length > 0;
        }

        (result as any).isQualified = isQualified;
      } catch (err) {
        console.error('Security check failed:', err);
        (result as any).isFavorited = false;
        (result as any).isQualified = false;
      }
    }

    // Direct Toggle Bypass: If AI qualification is explicitly disabled for this listing, auto-reveal for everyone
    const isAiActive = (result as any).aiQualificationActive ?? true;
    if (isAiActive === false) {
      (result as any).isQualified = true;
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
     * Helper to automatically process and convert external PDF or Google Drive links
     * into a Cloudinary URL to enable the dynamic 3D booklet page-turning reader.
     */
    private static async processBrochureUrl(url: string | null | undefined): Promise<string | null | undefined> {
      if (!url || url.trim() === '') return url;
      
      // If it's already a Cloudinary URL, bypass conversion
      if (url.includes('res.cloudinary.com')) return url;
      
      // Auto-detect Google Drive or direct PDF links
      if (url.includes('drive.google.com') || url.toLowerCase().endsWith('.pdf') || url.includes('/uc?')) {
        console.log(`[BROCHURE CONVERTER] Auto-detecting external PDF/Drive link: ${url}`);
        
        let downloadUrl = url;
        if (url.includes('drive.google.com')) {
          const match = url.match(/\/d\/([a-zA-Z0-9-_]+)/);
          if (match && match[1]) {
            downloadUrl = `https://docs.google.com/uc?export=download&id=${match[1]}`;
          } else {
            const idMatch = url.match(/[?&]id=([a-zA-Z0-9-_]+)/);
            if (idMatch && idMatch[1]) {
              downloadUrl = `https://docs.google.com/uc?export=download&id=${idMatch[1]}`;
            }
          }
        }
        
        try {
          const cloudinaryUrl = await CloudinaryService.uploadFromUrl(downloadUrl);
          if (cloudinaryUrl) {
            console.log(`[BROCHURE CONVERTER] Successfully converted external PDF to Cloudinary: ${cloudinaryUrl}`);
            return cloudinaryUrl;
          }
        } catch (err) {
          console.error('[BROCHURE CONVERTER] Conversion failed, falling back to original link', err);
        }
      }
      
      return url;
    }

    /**
     * Create a new listing
     * Initial state is DRAFT or FLAGGED depending on input
     */
    static async createListing(requesterId: string, data: any) {
      const shortId = generateShortId();

      // Check if creator is an ADMIN
      const [dbUser] = await db.select({ role: users.role }).from(users).where(eq(users.id, requesterId));
      const isCreatorAdmin = dbUser?.role === 'ADMIN';

      // Allow Firm Owners to specify a different owner (one of their agents)
      const finalOwnerId = data.ownerId || requesterId;

      let processedBrochureUrl = data.brochureUrl;
      if (processedBrochureUrl) {
        processedBrochureUrl = await this.processBrochureUrl(processedBrochureUrl);
      }

      // ── Auto-parse lat/lng from mapEmbedUrl if not explicitly provided ──
      let lat = data.lat != null ? data.lat : null;
      let lng = data.lng != null ? data.lng : null;
      if ((lat == null || lng == null) && data.mapEmbedUrl) {
        const parsed = extractLatLng(data.mapEmbedUrl);
        if (parsed) {
          lat = String(parsed.lat);
          lng = String(parsed.lng);
        }
      }

      const newListing = await db.insert(listings).values({
        ...data,
        brochureUrl: processedBrochureUrl,
        lat,
        lng,
        id: undefined,
        ownerId: finalOwnerId,
        shortId,
        status: 'DRAFT',
        verified: isCreatorAdmin ? true : (data.verified !== undefined ? Boolean(data.verified) : false),
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

    // 2. Permission Check: Owner OR Firm Owner OR Admin
    const isOwner = current.ownerId === requesterId;
    const isFirmOwner = requesterRole === 'FIRM' && (current.owner.firmId === requesterId || current.ownerId === requesterId);

    // Fetch current database role/email to bypass stale JWT issues
    const [dbUser] = await db.select({ role: users.role, email: users.email }).from(users).where(eq(users.id, requesterId));

    const userEmail = dbUser?.email?.toLowerCase();
    const isAdmin = dbUser?.role === 'ADMIN' || requesterRole === 'ADMIN';

    console.log(`[AUTH DEBUG] User: ${requesterId}, Role: ${requesterRole}, DB Role: ${dbUser?.role}, Email: ${userEmail}, isAdmin: ${isAdmin}`);

    if (!isOwner && !isFirmOwner && !isAdmin) {
      console.warn(`[AUTH FAILURE] Unauthorized edit attempt by ${requesterId} (${userEmail}) on listing ${id}`);
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

    // Process brochure URL if updated
    if (updateData.brochureUrl !== undefined && updateData.brochureUrl !== current.brochureUrl) {
      updateData.brochureUrl = await this.processBrochureUrl(updateData.brochureUrl);
    }

    // ── Auto-parse lat/lng from mapEmbedUrl if it changed and no explicit coords given ──
    if (updateData.mapEmbedUrl !== undefined && updateData.mapEmbedUrl !== current.mapEmbedUrl) {
      const explicitLat = updateData.lat != null;
      const explicitLng = updateData.lng != null;
      if (!explicitLat || !explicitLng) {
        const parsed = extractLatLng(updateData.mapEmbedUrl);
        if (parsed) {
          if (!explicitLat) updateData.lat = String(parsed.lat);
          if (!explicitLng) updateData.lng = String(parsed.lng);
        }
      }
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
    const isAdmin = requesterRole === 'ADMIN';

    if (!isOwner && !isFirmOwner && !isAdmin) {
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
    const isAdmin = user.role === 'ADMIN';
    if (!user.regaVerified && !isAdmin) throw new Error('Your REGA verification is required before publishing.');

    // 2. Count user's total non-deleted listings (including this draft one)
    const listingsCountResult = await db.select({ count: sql<number>`count(*)` })
      .from(listings)
      .where(and(eq(listings.ownerId, userId), isNull(listings.deletedAt)));
    const countVal = Number(listingsCountResult[0]?.count) || 0;

    // Check if free postings limit applies (default to 3)
    const freePostingsLimitStr = await SystemService.getSetting('free_postings_limit', '3');
    const freePostingsLimit = parseInt(freePostingsLimitStr, 10);

    const isFree = countVal <= freePostingsLimit;
    const finalCost = isFree ? 0 : cost;

    // Verified balance check
    if ((user.creditsBalance ?? 0) < finalCost && !isAdmin) {
      throw new Error(`Insufficient credits. You need ${finalCost} credits to publish.`);
    }

    // 3. Fetch Listing to check ownership/firm permissions
    const currentListing = await db.query.listings.findFirst({
      where: eq(listings.id, id),
      with: { owner: true }
    });

    if (!currentListing) throw new Error('Listing not found');

    const isOwner = currentListing.ownerId === userId;
    const isFirmOwner = user.role === 'FIRM' && currentListing.owner.firmId === userId;

    if (!isOwner && !isFirmOwner && !isAdmin) {
      throw new Error('Unauthorized to publish this listing');
    }

    // 4. Update Listing Status & Deduct Credits Sequentially
    // Note: Neon HTTP driver doesn't support db.transaction()

    // Deduct Credits from the user performing the action (Skip for ADMIN or Free)
    let updatedBalance = user.creditsBalance ?? 0;
    if (!isAdmin && finalCost > 0) {
      updatedBalance = (user.creditsBalance ?? 0) - finalCost;
      await db.update(users)
        .set({
          creditsBalance: updatedBalance,
          updatedAt: new Date()
        })
        .where(eq(users.id, userId));
    }

    // Update Listing
    const updated = await db.update(listings)
      .set({
        status: isAdmin ? 'ACTIVE' : 'FLAGGED', // Bypass review for ADMIN
        verified: isAdmin ? true : undefined,
        updatedAt: new Date()
      })
      .where(eq(listings.id, id))
      .returning();

    const result = updated[0];

    if (!result) throw new Error('Failed to update listing status');

    // Log to spend ledger (Only if credits were actually deducted)
    if (!isAdmin && finalCost > 0) {
      const listingTitle = result.enTitle || result.arTitle || 'Untitled Property';
      await db.insert(creditLedger).values({
        brokerId: userId,
        type: 'LISTING_PUBLISH',
        amount: -finalCost,
        balanceAfter: updatedBalance,
        refListingId: result.id,
        description: `Published standard listing: "${listingTitle}"`,
        performedById: userId,
      });
    }

    return {
      listing: result,
      newBalance: updatedBalance
    };
  }

  /**
   * Securely fetch contact info for a listing (to be called after qualification)
   */
  static async revealContactInfo(id: string) {
    const result = await db.query.listings.findFirst({
      where: eq(listings.id, id),
      with: {
        owner: {
          columns: {
            phone: true,
            email: true,
          }
        }
      }
    });

    if (!result) throw new Error('Listing not found');
    return result.owner;
  }

  /**
   * Generates a concise, high-density 150-token brief of the listing to optimize n8n LLM token costs.
   */
  static generateSparseBrief(listing: any): string {
    if (!listing) return 'No property context available.';
    
    // Parse amenities if present and convert to a clean list
    let amenitiesList = 'None';
    if (listing.amenities) {
      try {
        const ams = typeof listing.amenities === 'string' 
          ? JSON.parse(listing.amenities) 
          : listing.amenities;
        if (typeof ams === 'object' && ams !== null) {
          const activeAmenities = Object.entries(ams)
            .filter(([_, v]) => v === true || v === 'true')
            .map(([k]) => k);
          if (activeAmenities.length > 0) {
            amenitiesList = activeAmenities.join(', ');
          }
        }
      } catch (err) {
        console.error('Failed to parse amenities for brief:', err);
      }
    }

    return `Property Brief:
- ID: ${listing.shortId || listing.id || 'N/A'}
- Title: ${listing.enTitle || listing.arTitle || 'N/A'}
- Type & Purpose: ${listing.type || 'N/A'} for ${listing.purpose || 'N/A'}
- Price: SAR ${(listing.price || 0).toLocaleString()}
- Location: ${listing.district || 'N/A'}, ${listing.city || 'N/A'}
- Specs: ${listing.bedrooms || 0} Beds, ${listing.bathrooms || 0} Baths, ${listing.areaSqm || 0} Sqm
- Status: ${listing.completionStatus || 'N/A'} (${listing.furnishingStatus || 'UNFURNISHED'})
- REGA License: ${listing.regaFalLicense || 'N/A'}
- Amenities: ${amenitiesList}`;
  }

  /**
   * Fetches a listing and generates its sparse brief
   */
  static async getSparseBrief(id: string): Promise<string> {
    try {
      const listing = await db.query.listings.findFirst({
        where: and(eq(listings.id, id), sql`${listings.deletedAt} IS NULL`),
      });
      return this.generateSparseBrief(listing);
    } catch (err) {
      console.error(`Error generating brief for listing ${id}:`, err);
      return 'Failed to generate property brief.';
    }
  }
}

