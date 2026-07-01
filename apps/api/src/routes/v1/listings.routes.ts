import { FastifyInstance } from 'fastify';
import { listingSearchSchema, createListingSchema, updateListingSchema, extractLatLng } from '@saudi-re/shared';
import { ListingService } from '../../services/listing.service';
import { SystemService } from '../../services/system.service';
import { CloudinaryService } from '../../services/cloudinary.service';
import { authenticateJWT, optionalAuthenticateJWT } from '../../middleware/auth.middleware';
import { db } from '../../db';
import { leads, buyerProfiles, listings, projects, projectUnits, users, listingReports } from '../../db/schema';
import { eq, and, sql, desc, asc, inArray, or, gte, lte, isNull } from 'drizzle-orm';


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
        userId: request.user?.userId,
        requesterRole: request.user?.role,
        requesterId: request.user?.userId
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
   * GET /api/v1/listings/expand-url
   * Expand short maps.app.goo.gl URLs by following redirects
   */
  app.get('/expand-url', async (request, reply) => {
    const { url } = request.query as { url: string };
    if (!url) {
      return reply.code(400).send({ success: false, message: 'URL is required' });
    }
    try {
      const response = await fetch(url, { method: 'HEAD', redirect: 'follow' });
      return reply.send({ success: true, url: response.url });
    } catch (err: any) {
      return reply.status(500).send({ success: false, message: 'Failed to expand URL', error: err.message });
    }
  });

  /**
   * GET /api/v1/listings/maps-config
   * Fetch map configurations dynamically from database settings
   */
  app.get('/maps-config', async (request, reply) => {
    try {
      const mapboxToken = await SystemService.getSetting('mapbox_public_token', process.env.NEXT_PUBLIC_MAPBOX_TOKEN || '');
      const googleMapsKey = await SystemService.getSetting('google_maps_public_key', process.env.GOOGLE_MAPS_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '');
      return reply.send({ success: true, mapboxToken, googleMapsKey });
    } catch (err: any) {
      return reply.status(500).send({ success: false, message: 'Failed to fetch maps config', error: err.message });
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
        status: listings.status,
        aiQualificationActive: listings.aiQualificationActive
      })
      .from(listings)
      .where(eq(listings.id, id))
      .limit(1);

      if (!listing) {
        return reply.code(404).send({ success: false, message: 'Listing not found' });
      }

      // Check visibility if not active
      if (listing.status !== 'ACTIVE') {
        const isOwner = userId && listing.ownerId === userId;
        const isAdmin = request.user?.role === 'ADMIN';
        if (!isOwner && !isAdmin) {
          return reply.code(404).send({ success: false, message: 'Listing not found' });
        }
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

  /**
   * GET /api/v1/listings/projects
   * List all projects
   */
  app.get('/projects', { preHandler: [authenticateJWT] }, async (request, reply) => {
    try {
      const allProjects = await db.select().from(projects).orderBy(desc(projects.createdAt));
      
      const projectIds = allProjects.map(p => p.id);
      const layoutCounts: Record<string, number> = {};
      const leadCounts: Record<string, number> = {};
      
      if (projectIds.length > 0) {
        // Count listings (layouts) per project
        const layouts = await db
          .select({
            id: listings.id,
            projectId: listings.projectId,
          })
          .from(listings)
          .where(and(
            inArray(listings.projectId, projectIds),
            sql`deleted_at IS NULL`
          ));
          
        layouts.forEach(l => {
          if (l.projectId) {
            layoutCounts[l.projectId] = (layoutCounts[l.projectId] || 0) + 1;
          }
        });

        // Count leads per project
        const projectLeads = await db
          .select({
            id: leads.id,
            projectId: leads.projectId,
          })
          .from(leads)
          .where(inArray(leads.projectId, projectIds));

        projectLeads.forEach(lead => {
          if (lead.projectId) {
            leadCounts[lead.projectId] = (leadCounts[lead.projectId] || 0) + 1;
          }
        });
      }

      const data = allProjects.map(p => ({
        ...p,
        layoutCount: layoutCounts[p.id] || 0,
        leadCount: leadCounts[p.id] || 0,
      }));

      return reply.send({ success: true, data });
    } catch (err: any) {
      console.error('List projects error:', err);
      return reply.status(500).send({ success: false, message: 'Failed to list projects', error: err.message });
    }
  });

  /**
   * GET /api/v1/listings/map
   * ─────────────────────────────────────────────────────────────────────────
   * Viewport-bound map data endpoint. Returns:
   *   - projects (1 pin per project)
   *   - standalone listings (project_id IS NULL — layouts excluded)
   *
   * Deduplication guarantee: layouts (listings with projectId) are NEVER
   * returned here — they're represented by their parent project pin instead.
   *
   * Query params:
   *   north, south, east, west  — bounding box (required for viewport mode)
   *   price_min, price_max      — SAR price range
   *   type                      — listing type enum
   *   beds                      — min bedrooms
   *   purpose                   — SALE | RENT | LEASE
   */
  app.get('/map', { preHandler: [optionalAuthenticateJWT] }, async (request, reply) => {
    const q = request.query as any;

    const north = q.north ? parseFloat(q.north) : null;
    const south = q.south ? parseFloat(q.south) : null;
    const east  = q.east  ? parseFloat(q.east)  : null;
    const west  = q.west  ? parseFloat(q.west)  : null;
    const priceMin = q.price_min ? parseInt(q.price_min) : null;
    const priceMax = q.price_max ? parseInt(q.price_max) : null;
    const type    = q.type    || null;
    const beds    = q.beds    ? parseInt(q.beds)    : null;
    const purpose = q.purpose || null;
    const foreignerEligible = q.foreignerEligible === 'true' || q.foreigner_eligible === 'true';

    try {
      // ── Standalone Listings (project_id IS NULL) ──────────────────────────
      const listingConditions: any[] = [
        eq(listings.status, 'ACTIVE'),
        isNull(listings.projectId),          // EXCLUDE layouts
        isNull(listings.deletedAt),
        sql`${listings.lat} IS NOT NULL AND ${listings.lng} IS NOT NULL`,
      ];

      if (north !== null && south !== null) {
        listingConditions.push(sql`CAST(${listings.lat} AS DECIMAL) BETWEEN ${south} AND ${north}`);
      }
      if (east !== null && west !== null) {
        listingConditions.push(sql`CAST(${listings.lng} AS DECIMAL) BETWEEN ${west} AND ${east}`);
      }
      if (priceMin !== null) listingConditions.push(gte(listings.price, priceMin));
      if (priceMax !== null) listingConditions.push(lte(listings.price, priceMax));
      if (type)    listingConditions.push(eq(listings.type, type));
      if (beds)    listingConditions.push(sql`${listings.bedrooms} >= ${beds}`);
      if (purpose) listingConditions.push(eq(listings.purpose, purpose));
      if (foreignerEligible) listingConditions.push(eq(listings.foreignerEligible, true));

      const standalonePins = await db.select({
        id:        listings.id,
        shortId:   listings.shortId,
        lat:       listings.lat,
        lng:       listings.lng,
        price:     listings.price,
        type:      listings.type,
        purpose:   listings.purpose,
        bedrooms:  listings.bedrooms,
        city:      listings.city,
        district:  listings.district,
        enTitle:   listings.enTitle,
        arTitle:   listings.arTitle,
        thumb:     sql<string>`(${listings.photos})[1]`,
        isFeatured: listings.isFeatured,
        foreignerEligible: listings.foreignerEligible,
        muslimOnly: listings.muslimOnly,
      })
      .from(listings)
      .where(and(...listingConditions))
      .limit(500);   // Safety cap — Supercluster handles this client-side

      // ── Projects ──────────────────────────────────────────────────────────
      const projectConditions: any[] = [
        sql`${projects.lat} IS NOT NULL AND ${projects.lng} IS NOT NULL`,
      ];

      if (north !== null && south !== null) {
        projectConditions.push(sql`CAST(${projects.lat} AS DECIMAL) BETWEEN ${south} AND ${north}`);
      }
      if (east !== null && west !== null) {
        projectConditions.push(sql`CAST(${projects.lng} AS DECIMAL) BETWEEN ${west} AND ${east}`);
      }
      if (foreignerEligible) projectConditions.push(eq(projects.foreignerEligible, true));

      if (priceMin !== null || priceMax !== null || type || beds || purpose) {
        projectConditions.push(sql`EXISTS (
          SELECT 1 FROM ${listings} 
          WHERE ${listings.projectId} = ${projects.id}
            AND ${listings.status} = 'ACTIVE'
            AND ${listings.deletedAt} IS NULL
            ${priceMin !== null ? sql`AND ${listings.price} >= ${priceMin}` : sql``}
            ${priceMax !== null ? sql`AND ${listings.price} <= ${priceMax}` : sql``}
            ${type ? sql`AND ${listings.type} = ${type}` : sql``}
            ${beds ? sql`AND ${listings.bedrooms} >= ${beds}` : sql``}
            ${purpose ? sql`AND ${listings.purpose} = ${purpose}` : sql``}
        )`);
      }

      const projectPins = await db.select({
        id:          projects.id,
        nameEn:      projects.nameEn,
        nameAr:      projects.nameAr,
        lat:         projects.lat,
        lng:         projects.lng,
        city:        projects.city,
        district:    projects.district,
        thumb:       sql<string>`(${projects.photos})[1]`,
        isFeatured:  projects.isFeatured,
        completionStatus: projects.completionStatus,
        foreignerEligible: projects.foreignerEligible,
        muslimOnly: projects.muslimOnly,
      })
      .from(projects)
      .where(and(...projectConditions))
      .limit(200);

      return reply.send({
        success: true,
        data: {
          listings: standalonePins.map(l => ({
            ...l,
            lat: l.lat ? parseFloat(l.lat as string) : null,
            lng: l.lng ? parseFloat(l.lng as string) : null,
            kind: 'listing' as const,
          })),
          projects: projectPins.map(p => ({
            ...p,
            lat: p.lat ? parseFloat(p.lat as string) : null,
            lng: p.lng ? parseFloat(p.lng as string) : null,
            kind: 'project' as const,
          })),
        }
      });

    } catch (err: any) {
      console.error('Map data error:', err);
      return reply.status(500).send({ success: false, message: 'Failed to fetch map data', error: err.message });
    }
  });

  /**
   * POST /api/v1/listings/drive-time
   * ─────────────────────────────────────────────────────────────────────────
   * Search and filter properties by drive time isochrone from Point A (and Point B).
   * Calculates polygon client/server-side using OpenRouteService.
   */
  app.post('/drive-time', { preHandler: [optionalAuthenticateJWT] }, async (request, reply) => {
    const body = request.body as any;
    const pointA = body.pointA as { lat: number; lng: number };
    const pointB = body.pointB as { lat: number; lng: number } | undefined;
    const minutes = body.minutes ? parseInt(body.minutes) : 30;
    const mode = body.mode || 'balanced'; // 'balanced' | 'nearestA' | 'nearestB'
    const filters = body.filters || {};

    if (!pointA || pointA.lat == null || pointA.lng == null) {
      return reply.code(400).send({ success: false, message: 'pointA {lat, lng} is required' });
    }

    const priceMin = filters.priceMin ? parseInt(filters.priceMin) : null;
    const priceMax = filters.priceMax ? parseInt(filters.priceMax) : null;
    const type = filters.type || null;
    const beds = filters.beds ? parseInt(filters.beds) : null;
    const purpose = filters.purpose || null;

    try {
      const googleMapsKey = await SystemService.getSetting('google_maps_public_key', process.env.GOOGLE_MAPS_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '');
      if (!googleMapsKey) {
        return reply.code(400).send({ success: false, message: 'Google Maps API key is not configured in settings.' });
      }

      // ── 1. Calculate spatial bounding box pre-filter from database ──────────
      // Dynamic bounding box pre-filter radius based on minutes to accommodate longer commutes (up to 120 mins)
      const radiusKm = Math.max(35, Math.ceil(minutes * 0.9));
      const dLat = radiusKm / 111;
      const dLngA = radiusKm / (111 * Math.cos(pointA.lat * Math.PI / 180));

      let minLat = pointA.lat - dLat;
      let maxLat = pointA.lat + dLat;
      let minLng = pointA.lng - dLngA;
      let maxLng = pointA.lng + dLngA;

      if (pointB && pointB.lat != null && pointB.lng != null) {
        const dLngB = radiusKm / (111 * Math.cos(pointB.lat * Math.PI / 180));
        minLat = Math.min(minLat, pointB.lat - dLat);
        maxLat = Math.max(maxLat, pointB.lat + dLat);
        minLng = Math.min(minLng, pointB.lng - dLngB);
        maxLng = Math.max(maxLng, pointB.lng + dLngB);
      }

      const bbox = { minLat, maxLat, minLng, maxLng };

      // ── 2. Query properties within bounds from database ──────────────────
      const listingConditions: any[] = [
        eq(listings.status, 'ACTIVE'),
        isNull(listings.projectId), // Exclude layouts to prevent duplicate pins
        isNull(listings.deletedAt),
        sql`CAST(${listings.lat} AS DECIMAL) BETWEEN ${bbox.minLat} AND ${bbox.maxLat}`,
        sql`CAST(${listings.lng} AS DECIMAL) BETWEEN ${bbox.minLng} AND ${bbox.maxLng}`,
      ];

      if (priceMin !== null) listingConditions.push(gte(listings.price, priceMin));
      if (priceMax !== null) listingConditions.push(lte(listings.price, priceMax));
      if (type) listingConditions.push(eq(listings.type, type));
      if (beds) listingConditions.push(sql`${listings.bedrooms} >= ${beds}`);
      if (purpose) listingConditions.push(eq(listings.purpose, purpose));

      const candidateListings = await db.select({
        id: listings.id,
        shortId: listings.shortId,
        lat: listings.lat,
        lng: listings.lng,
        price: listings.price,
        type: listings.type,
        purpose: listings.purpose,
        bedrooms: listings.bedrooms,
        city: listings.city,
        district: listings.district,
        enTitle: listings.enTitle,
        arTitle: listings.arTitle,
        thumb: sql<string>`(${listings.photos})[1]`,
        isFeatured: listings.isFeatured,
        foreignerEligible: listings.foreignerEligible,
        muslimOnly: listings.muslimOnly,
      })
      .from(listings)
      .where(and(...listingConditions));

      const projectConditions: any[] = [
        sql`CAST(${projects.lat} AS DECIMAL) BETWEEN ${bbox.minLat} AND ${bbox.maxLat}`,
        sql`CAST(${projects.lng} AS DECIMAL) BETWEEN ${bbox.minLng} AND ${bbox.maxLng}`,
      ];

      const candidateProjects = await db.select({
        id: projects.id,
        nameEn: projects.nameEn,
        nameAr: projects.nameAr,
        lat: projects.lat,
        lng: projects.lng,
        city: projects.city,
        district: projects.district,
        thumb: sql<string>`(${projects.photos})[1]`,
        isFeatured: projects.isFeatured,
        completionStatus: projects.completionStatus,
        foreignerEligible: projects.foreignerEligible,
        muslimOnly: projects.muslimOnly,
      })
      .from(projects)
      .where(and(...projectConditions));

      // Merge and map
      const mergedCandidates = [
        ...candidateListings.map(l => ({ ...l, kind: 'listing' as const })),
        ...candidateProjects.map(p => ({ ...p, kind: 'project' as const }))
      ].filter(item => item.lat && item.lng);

      // Helper: Haversine distance
      const getDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
        const R = 6371; // Earth's radius in km
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
          Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
          Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
      };

      // ── 3. Sort candidates by straight-line distance to Point A ─────────
      // We limit to top 75 closest candidates to keep API request overhead minimal and performance extremely fast
      const closestCandidates = mergedCandidates
        .map(item => {
          const lat = parseFloat(item.lat as string);
          const lng = parseFloat(item.lng as string);
          return {
            ...item,
            lat,
            lng,
            straightDist: getDistance(lat, lng, pointA.lat, pointA.lng)
          };
        })
        .sort((a, b) => a.straightDist - b.straightDist)
        .slice(0, 75);

      if (closestCandidates.length === 0) {
        return reply.send({ success: true, data: [], polygons: { polyA: null, polyB: null } });
      }

      // ── 4. Query Google Distance Matrix in batches of 25 ─────────────────
      const getGoogleTravelTimes = async (
        origin: { lat: number; lng: number },
        destList: { lat: number; lng: number }[]
      ) => {
        const results: { duration: number; distance: number }[] = [];
        const batchSize = 25;
        for (let i = 0; i < destList.length; i += batchSize) {
          const batch = destList.slice(i, i + batchSize);
          const destString = batch.map(d => `${d.lat},${d.lng}`).join('|');
          const url = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${origin.lat},${origin.lng}&destinations=${encodeURIComponent(destString)}&mode=driving&departure_time=now&key=${googleMapsKey}`;
          
          try {
            const response = await fetch(url);
            if (!response.ok) throw new Error(`HTTP error ${response.status}`);
            const data = await response.json();
            if (data.status !== 'OK') throw new Error(`API status ${data.status}`);
            
            const elements = data.rows[0].elements;
            elements.forEach((el: any) => {
              if (el.status === 'OK') {
                results.push({
                  duration: Math.round(el.duration.value / 60), // minutes
                  distance: el.distance.value / 1000 // km
                });
              } else {
                results.push({ duration: 999, distance: 999 }); // unreachable fallback
              }
            });
          } catch (err: any) {
            console.error(`[GOOGLE-MATRIX-ERROR] Batch starting at ${i} failed:`, err.message);
            // Haversine fallback duration: average city speed 40km/h with 30% traffic overhead
            batch.forEach(d => {
              const dist = getDistance(d.lat, d.lng, origin.lat, origin.lng);
              const duration = Math.round((dist / 40) * 60 * 1.3);
              results.push({ duration, distance: dist });
            });
          }
        }
        return results;
      };

      const travelTimesA = await getGoogleTravelTimes(pointA, closestCandidates);
      let travelTimesB: { duration: number; distance: number }[] | null = null;
      if (pointB && pointB.lat != null && pointB.lng != null) {
        travelTimesB = await getGoogleTravelTimes(pointB, closestCandidates);
      }

      // ── 5. Filter items within drive limits and map to response array ────
      const finalItems: any[] = [];
      closestCandidates.forEach((item, index) => {
        const timeA = travelTimesA[index]?.duration ?? 999;
        const timeB = travelTimesB ? (travelTimesB[index]?.duration ?? 999) : null;

        // Must be within Point A commute time, AND if Point B is provided, must be within Point B commute time too
        const matchA = timeA <= minutes;
        const matchB = pointB ? (timeB !== null && timeB <= minutes) : true;

        if (matchA && matchB) {
          finalItems.push({
            ...item,
            driveTimeA: timeA,
            driveTimeB: timeB,
          });
        }
      });

      // ── 6. Sort final results based on commute mode ──────────────────────
      if (mode === 'nearestA') {
        finalItems.sort((a, b) => a.driveTimeA - b.driveTimeA);
      } else if (mode === 'nearestB') {
        finalItems.sort((a, b) => (a.driveTimeB || 999) - (b.driveTimeB || 999));
      } else {
        // Balanced (Minimize combined A + B time)
        finalItems.sort((a, b) => {
          const totalA = a.driveTimeA + (a.driveTimeB || a.driveTimeA);
          const totalB = b.driveTimeA + (b.driveTimeB || b.driveTimeA);
          return totalA - totalB;
        });
      }

      return reply.send({
        success: true,
        data: finalItems,
        polygons: {
          polyA: null,
          polyB: null,
        }
      });

    } catch (err: any) {
      console.error('Drive time search error:', err);
      return reply.status(500).send({ success: false, message: 'Failed to process drive time search', error: err.message });
    }
  });


  /**
   * POST /api/v1/listings/projects
   * Create a new project
   */

  app.post('/projects', { preHandler: [authenticateJWT] }, async (request, reply) => {
    const { nameEn, nameAr, descriptionEn, descriptionAr, city, district, mapEmbedUrl, isFeatured, featuredOrder, foreignerEligible, muslimOnly } = request.body as any;
    if (!nameEn || !nameAr || !city) {
      return reply.code(400).send({ success: false, message: 'nameEn, nameAr and city are required' });
    }
    try {
      // Auto-parse lat/lng from mapEmbedUrl
      const coords = mapEmbedUrl ? extractLatLng(mapEmbedUrl) : null;

      const [newProject] = await db.insert(projects).values({
        nameEn,
        nameAr,
        descriptionEn,
        descriptionAr,
        city,
        district,
        mapEmbedUrl,
        lat: coords ? String(coords.lat) : null,
        lng: coords ? String(coords.lng) : null,
        isFeatured: isFeatured !== undefined ? !!isFeatured : false,
        featuredOrder: featuredOrder !== undefined ? (featuredOrder === '' ? 0 : Number(featuredOrder)) : 0,
        foreignerEligible: foreignerEligible !== undefined ? !!foreignerEligible : false,
        muslimOnly: muslimOnly !== undefined ? !!muslimOnly : false,
      }).returning();
      return reply.code(201).send({ success: true, data: newProject });
    } catch (err: any) {
      console.error('Create project error:', err);
      return reply.status(500).send({ success: false, message: 'Failed to create project', error: err.message });
    }
  });


  /**
   * POST /api/v1/listings/projects/bulk
   * Bulk create project and layouts (Authenticated)
   */
  app.post('/projects/bulk', { preHandler: [authenticateJWT] }, async (request, reply) => {
    const { project, layouts, ownerId } = request.body as {
      project: {
        nameEn: string;
        nameAr: string;
        city: string;
        district?: string;
        descriptionEn?: string;
        descriptionAr?: string;
        brochureUrl?: string;
        regaFalLicense?: string;
        amenities?: Record<string, boolean>;
        photos?: string[];
        completionStatus?: 'READY' | 'OFF_PLAN' | 'UNDER_CONSTRUCTION';
        expectedDelivery?: string;
        totalUnits?: number;
        mapEmbedUrl?: string;
        isFeatured?: boolean;
        featuredOrder?: number;
        foreignerEligible?: boolean;
        muslimOnly?: boolean;
      };
      layouts: Array<{
        labelEn: string;
        labelAr: string;
        price: number;
        areaSqm?: number;
        bedrooms?: number;
        bathrooms?: number;
        photos?: string[];
        completionStatus?: 'READY' | 'OFF_PLAN' | 'UNDER_CONSTRUCTION';
        descriptionEn?: string;
        descriptionAr?: string;
      }>;
      ownerId?: string;
    };

    const finalOwnerId = ownerId || request.user?.userId;
    if (!finalOwnerId) {
      return reply.code(400).send({ success: false, message: 'Owner ID is required' });
    }

    if (!project || !project.nameEn || !project.nameAr || !project.city) {
      return reply.code(400).send({ success: false, message: 'Project data with nameEn, nameAr, and city is required' });
    }

    if (!Array.isArray(layouts) || layouts.length === 0) {
      return reply.code(400).send({ success: false, message: 'At least one layout must be specified' });
    }

    try {
      // Auto-parse lat/lng from project mapEmbedUrl
      const projectCoords = project.mapEmbedUrl ? extractLatLng(project.mapEmbedUrl) : null;

      // Create project record
      const [newProject] = await db.insert(projects).values({
        nameEn: project.nameEn,
        nameAr: project.nameAr,
        descriptionEn: project.descriptionEn,
        descriptionAr: project.descriptionAr,
        city: project.city,
        district: project.district,
        mapEmbedUrl: project.mapEmbedUrl,
        lat: projectCoords ? String(projectCoords.lat) : null,
        lng: projectCoords ? String(projectCoords.lng) : null,
        brochureUrl: project.brochureUrl,
        regaFalLicense: project.regaFalLicense,
        amenities: project.amenities || {},
        photos: project.photos || [],
        completionStatus: project.completionStatus,
        expectedDelivery: project.expectedDelivery,
        totalUnits: project.totalUnits,
        isFeatured: project.isFeatured !== undefined ? !!project.isFeatured : false,
        featuredOrder: project.featuredOrder !== undefined ? (project.featuredOrder === null ? 0 : Number(project.featuredOrder)) : 0,
        foreignerEligible: project.foreignerEligible !== undefined ? !!project.foreignerEligible : false,
        muslimOnly: project.muslimOnly !== undefined ? !!project.muslimOnly : false,
        createdAt: new Date(),
        updatedAt: new Date(),
      }).returning();


      // Helper to generate SRE short id
      const generateLocalShortId = () => {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        let result = '';
        for (let i = 0; i < 6; i++) {
          result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return `SRE-${result}`;
      };

      const createdListings: any[] = [];

      for (const layout of layouts) {
        const shortId = generateLocalShortId();
        const [newListing] = await db.insert(listings).values({
          ownerId: finalOwnerId,
          projectId: newProject.id,
          type: 'APARTMENT', // Default layout type
          purpose: 'SALE', // Default layout purpose
          status: 'ACTIVE', // Default bulk layouts to ACTIVE so they show on public frontend
          city: project.city,
          district: project.district || null,
          arTitle: `${project.nameAr} - ${layout.labelAr}`,
          enTitle: `${project.nameEn} - ${layout.labelEn}`,
          arDescription: layout.descriptionAr || project.descriptionAr || null,
          enDescription: layout.descriptionEn || project.descriptionEn || null,
          price: Number(layout.price),
          areaSqm: layout.areaSqm ? String(layout.areaSqm) : null,
          bedrooms: layout.bedrooms || null,
          bathrooms: layout.bathrooms || null,
          photos: layout.photos && layout.photos.length > 0 ? layout.photos : (project.photos || []),
          brochureUrl: project.brochureUrl || null,
          regaFalLicense: project.regaFalLicense || null,
          regaAdvertisingLicense: project.regaFalLicense || null, // inherits project license
          amenities: project.amenities || {},
          foreignerEligible: project.foreignerEligible !== undefined ? !!project.foreignerEligible : false,
          muslimOnly: project.muslimOnly !== undefined ? !!project.muslimOnly : false,
          completionStatus: layout.completionStatus || project.completionStatus || null,
          aiQualificationActive: true,
          verified: true,
          shortId,
          createdAt: new Date(),
          updatedAt: new Date(),
        }).returning();

        createdListings.push(newListing);
      }

      return reply.code(201).send({
        success: true,
        project: newProject,
        listings: createdListings
      });
    } catch (err: any) {
      console.error('Bulk project creation error:', err);
      return reply.status(500).send({
        success: false,
        message: 'Failed to bulk create project and layouts',
        error: err.message
      });
    }
  });

  /**
   * GET /api/v1/listings/projects/:id
   * Fetch project details and ALL layouts (Authenticated)
   */
  app.get('/projects/:id', { preHandler: [authenticateJWT] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    try {
      const [project] = await db.select().from(projects).where(eq(projects.id, id)).limit(1);
      if (!project) {
        return reply.code(404).send({ success: false, message: 'Project not found' });
      }

      const layouts = await db.select()
        .from(listings)
        .where(and(
          eq(listings.projectId, id),
          sql`deleted_at IS NULL`
        ))
        .orderBy(desc(listings.createdAt));

      return reply.send({
        success: true,
        data: {
          project,
          layouts
        }
      });
    } catch (err: any) {
      console.error('Fetch project detail error:', err);
      return reply.status(500).send({ success: false, message: 'Failed to fetch project detail', error: err.message });
    }
  });

  app.put('/projects/:id', { preHandler: [authenticateJWT] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const {
      nameEn,
      nameAr,
      descriptionEn,
      descriptionAr,
      city,
      district,
      mapEmbedUrl,
      brochureUrl,
      regaFalLicense,
      amenities,
      photos,
      completionStatus,
      expectedDelivery,
      totalUnits,
      isFeatured,
      featuredOrder,
      layouts,
      foreignerEligible,
      muslimOnly
    } = request.body as any;

    if (!nameEn || !nameAr || !city) {
      return reply.code(400).send({ success: false, message: 'nameEn, nameAr and city are required' });
    }

    try {
      // Auto-parse lat/lng if mapEmbedUrl provided and no explicit coords given
      let latVal = null;
      let lngVal = null;
      if (mapEmbedUrl) {
        const coords = extractLatLng(mapEmbedUrl);
        if (coords) {
          latVal = String(coords.lat);
          lngVal = String(coords.lng);
        }
      }

      const [updatedProject] = await db.update(projects)
        .set({
          nameEn,
          nameAr,
          descriptionEn: descriptionEn || null,
          descriptionAr: descriptionAr || null,
          city,
          district: district || null,
          mapEmbedUrl: mapEmbedUrl || null,
          lat: latVal,
          lng: lngVal,
          brochureUrl: brochureUrl || null,
          regaFalLicense: regaFalLicense || null,
          amenities: amenities || {},
          photos: photos || [],
          completionStatus: completionStatus || null,
          expectedDelivery: expectedDelivery || null,
          totalUnits: totalUnits ? Number(totalUnits) : null,
          isFeatured: isFeatured !== undefined ? !!isFeatured : undefined,
          featuredOrder: featuredOrder !== undefined ? (featuredOrder === '' ? 0 : Number(featuredOrder)) : undefined,
          foreignerEligible: foreignerEligible !== undefined ? !!foreignerEligible : undefined,
          muslimOnly: muslimOnly !== undefined ? !!muslimOnly : undefined,
          updatedAt: new Date(),
        })
        .where(eq(projects.id, id))
        .returning();


      if (!updatedProject) {
        return reply.code(404).send({ success: false, message: 'Project not found' });
      }

      // Also propagate brochureUrl, regaFalLicense, city, district, foreignerEligible, muslimOnly to all linked listings
      await db.update(listings)
        .set({
          brochureUrl: brochureUrl || null,
          regaFalLicense: regaFalLicense || null,
          city,
          district: district || null,
          foreignerEligible: foreignerEligible !== undefined ? !!foreignerEligible : undefined,
          muslimOnly: muslimOnly !== undefined ? !!muslimOnly : undefined,
          updatedAt: new Date(),
        })
        .where(eq(listings.projectId, id));

      // If layouts list is supplied, synchronize listings
      if (Array.isArray(layouts)) {
        // Fetch existing layouts
        const existing = await db.select({ id: listings.id })
          .from(listings)
          .where(and(eq(listings.projectId, id), sql`deleted_at IS NULL`));
        const existingIds = existing.map(e => e.id);

        const incomingIds = layouts.map(l => l.id).filter(Boolean) as string[];

        // 1. Delete layouts that are no longer in the list (soft delete)
        const toDelete = existingIds.filter(eid => !incomingIds.includes(eid));
        if (toDelete.length > 0) {
          await db.update(listings)
            .set({
              deletedAt: new Date(),
              status: 'REMOVED',
              updatedAt: new Date()
            })
            .where(inArray(listings.id, toDelete));
        }

        // Helper to generate SRE short id
        const generateLocalShortId = () => {
          const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
          let result = '';
          for (let i = 0; i < 6; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
          }
          return `SRE-${result}`;
        };

        const finalOwnerId = request.user?.userId;

        // 2. Update existing & insert new layouts
        for (const layout of layouts) {
          if (layout.id && existingIds.includes(layout.id)) {
            // Update existing layout
            await db.update(listings)
              .set({
                arTitle: `${nameAr} - ${layout.labelAr}`,
                enTitle: `${nameEn} - ${layout.labelEn}`,
                arDescription: layout.descriptionAr || descriptionAr || null,
                enDescription: layout.descriptionEn || descriptionEn || null,
                price: Number(layout.price),
                areaSqm: layout.areaSqm ? String(layout.areaSqm) as any : null,
                bedrooms: layout.bedrooms ? Number(layout.bedrooms) : null,
                bathrooms: layout.bathrooms ? Number(layout.bathrooms) : null,
                photos: layout.photos || [],
                completionStatus: layout.completionStatus || completionStatus,
                brochureUrl: brochureUrl || null,
                regaFalLicense: regaFalLicense || null,
                city,
                district: district || null,
                updatedAt: new Date()
              })
              .where(eq(listings.id, layout.id));
          } else {
            // Insert new layout
            const shortId = generateLocalShortId();
            await db.insert(listings).values({
              ownerId: finalOwnerId!,
              projectId: id,
              type: 'APARTMENT',
              purpose: 'SALE',
              status: 'ACTIVE',
              city,
              district: district || null,
              arTitle: `${nameAr} - ${layout.labelAr}`,
              enTitle: `${nameEn} - ${layout.labelEn}`,
              arDescription: layout.descriptionAr || descriptionAr || null,
              enDescription: layout.descriptionEn || descriptionEn || null,
              price: Number(layout.price),
              areaSqm: layout.areaSqm ? String(layout.areaSqm) as any : null,
              bedrooms: layout.bedrooms ? Number(layout.bedrooms) : null,
              bathrooms: layout.bathrooms ? Number(layout.bathrooms) : null,
              photos: layout.photos || [],
              completionStatus: layout.completionStatus || completionStatus,
              regaFalLicense: regaFalLicense || null,
              brochureUrl: brochureUrl || null,
              shortId,
              createdAt: new Date(),
              updatedAt: new Date()
            });
          }
        }
      }

      return reply.send({ success: true, data: updatedProject });
    } catch (err: any) {
      console.error('Update project error:', err);
      return reply.status(500).send({ success: false, message: 'Failed to update project', error: err.message });
    }
  });

  /**
   * PATCH /api/v1/listings/projects/:id
   * Partial update project details (Authenticated)
   */
  app.patch('/projects/:id', { preHandler: [authenticateJWT] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = request.body as any;

    try {
      const [existing] = await db.select().from(projects).where(eq(projects.id, id)).limit(1);
      if (!existing) {
        return reply.code(404).send({ success: false, message: 'Project not found' });
      }

      const updateData: any = {
        updatedAt: new Date()
      };

      if (body.nameEn !== undefined) updateData.nameEn = body.nameEn;
      if (body.nameAr !== undefined) updateData.nameAr = body.nameAr;
      if (body.descriptionEn !== undefined) updateData.descriptionEn = body.descriptionEn;
      if (body.descriptionAr !== undefined) updateData.descriptionAr = body.descriptionAr;
      if (body.city !== undefined) updateData.city = body.city;
      if (body.district !== undefined) updateData.district = body.district;
      if (body.mapEmbedUrl !== undefined) {
        updateData.mapEmbedUrl = body.mapEmbedUrl;
        // Auto-parse lat/lng when mapEmbedUrl changes (unless explicit coords provided)
        if (body.lat == null && body.lng == null && body.mapEmbedUrl) {
          const coords = extractLatLng(body.mapEmbedUrl);
          if (coords) {
            updateData.lat = String(coords.lat);
            updateData.lng = String(coords.lng);
          }
        }
      }
      if (body.lat !== undefined) updateData.lat = body.lat;
      if (body.lng !== undefined) updateData.lng = body.lng;

      if (body.brochureUrl !== undefined) updateData.brochureUrl = body.brochureUrl;
      if (body.regaFalLicense !== undefined) updateData.regaFalLicense = body.regaFalLicense;
      if (body.amenities !== undefined) updateData.amenities = body.amenities;
      if (body.photos !== undefined) updateData.photos = body.photos;
      if (body.completionStatus !== undefined) updateData.completionStatus = body.completionStatus;
      if (body.expectedDelivery !== undefined) updateData.expectedDelivery = body.expectedDelivery;
      if (body.totalUnits !== undefined) updateData.totalUnits = body.totalUnits !== null && body.totalUnits !== '' ? Number(body.totalUnits) : null;
      if (body.isFeatured !== undefined) updateData.isFeatured = !!body.isFeatured;
      if (body.featuredOrder !== undefined) updateData.featuredOrder = body.featuredOrder !== null && body.featuredOrder !== '' ? Number(body.featuredOrder) : 0;

      const [updatedProject] = await db.update(projects)
        .set(updateData)
        .where(eq(projects.id, id))
        .returning();

      // propagate city, district, regaFalLicense, brochureUrl to all linked listings if changed
      const propagateData: any = {};
      if (body.city !== undefined) propagateData.city = body.city;
      if (body.district !== undefined) propagateData.district = body.district;
      if (body.regaFalLicense !== undefined) propagateData.regaFalLicense = body.regaFalLicense;
      if (body.brochureUrl !== undefined) propagateData.brochureUrl = body.brochureUrl;

      if (Object.keys(propagateData).length > 0) {
        propagateData.updatedAt = new Date();
        await db.update(listings)
          .set(propagateData)
          .where(eq(listings.projectId, id));
      }

      return reply.send({ success: true, data: updatedProject });
    } catch (err: any) {
      console.error('Patch project error:', err);
      return reply.status(500).send({ success: false, message: 'Failed to patch project', error: err.message });
    }
  });

  /**
   * GET /api/v1/listings/:id/units
   * Fetch units for listing
   */
  app.get('/:id/units', { preHandler: [optionalAuthenticateJWT] }, async (request, reply) => {
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

      const units = await db.select().from(projectUnits).where(eq(projectUnits.listingId, id)).orderBy(asc(projectUnits.floor), asc(projectUnits.unitNumber));
      return reply.send({ success: true, data: units });
    } catch (err: any) {
      console.error('Fetch units error:', err);
      return reply.status(500).send({ success: false, message: 'Failed to fetch units', error: err.message });
    }
  });

  /**
   * POST /api/v1/listings/:id/units
   * Bulk add / add units for listing
   */
  app.post('/:id/units', { preHandler: [authenticateJWT] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const { units } = request.body as { units: Array<{ unitNumber: string; floor: number; type: string; status?: string; price?: number }> };
    
    if (!Array.isArray(units) || units.length === 0) {
      return reply.code(400).send({ success: false, message: 'units array is required and cannot be empty' });
    }

    try {
      // Find listing to get its projectId
      const [listing] = await db.select({ projectId: listings.projectId }).from(listings).where(eq(listings.id, id)).limit(1);
      if (!listing) {
        return reply.code(404).send({ success: false, message: 'Listing not found' });
      }
      if (!listing.projectId) {
        return reply.code(400).send({ success: false, message: 'Listing must be linked to a project first before adding inventory units' });
      }

      const insertValues = units.map(u => ({
        projectId: listing.projectId!,
        listingId: id,
        unitNumber: u.unitNumber,
        floor: u.floor,
        type: u.type,
        status: u.status || 'AVAILABLE',
        price: u.price || null,
      }));

      const newUnits = await db.insert(projectUnits).values(insertValues).returning();
      return reply.code(201).send({ success: true, data: newUnits });
    } catch (err: any) {
      console.error('Add units error:', err);
      return reply.status(500).send({ success: false, message: 'Failed to add units', error: err.message });
    }
  });

  /**
   * PUT /api/v1/listings/:id/units/:unitId
   * Edit unit status or details
   */
  app.put('/:id/units/:unitId', { preHandler: [authenticateJWT] }, async (request, reply) => {
    const { unitId } = request.params as { unitId: string };
    const { unitNumber, floor, type, status, price } = request.body as any;
    try {
      const [updatedUnit] = await db.update(projectUnits)
        .set({
          ...(unitNumber !== undefined && { unitNumber }),
          ...(floor !== undefined && { floor }),
          ...(type !== undefined && { type }),
          ...(status !== undefined && { status }),
          ...(price !== undefined && { price: price || null }),
          updatedAt: new Date(),
        })
        .where(eq(projectUnits.id, unitId))
        .returning();

      if (!updatedUnit) {
        return reply.code(404).send({ success: false, message: 'Unit not found' });
      }

      return reply.send({ success: true, data: updatedUnit });
    } catch (err: any) {
      console.error('Update unit error:', err);
      return reply.status(500).send({ success: false, message: 'Failed to update unit', error: err.message });
    }
  });

  /**
   * DELETE /api/v1/listings/:id/units/:unitId
   * Delete unit from inventory
   */
  app.delete('/:id/units/:unitId', { preHandler: [authenticateJWT] }, async (request, reply) => {
    const { unitId } = request.params as { unitId: string };
    try {
      const [deletedUnit] = await db.delete(projectUnits).where(eq(projectUnits.id, unitId)).returning();
      if (!deletedUnit) {
        return reply.code(404).send({ success: false, message: 'Unit not found' });
      }
      return reply.send({ success: true, message: 'Unit deleted successfully' });
    } catch (err: any) {
      console.error('Delete unit error:', err);
      return reply.status(500).send({ success: false, message: 'Failed to delete unit', error: err.message });
    }
  });

  /**
   * POST /api/v1/listings/:id/feature
   * Buy a featured listing upgrade using credits
   */
  app.post('/:id/feature', { preHandler: [authenticateJWT] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const { days } = request.body as { days: number };
    const userId = request.user?.userId;

    if (![7, 30].includes(days)) {
      return reply.code(400).send({ success: false, message: 'Invalid duration. Only 7 or 30 days are supported.' });
    }

    const creditCost = days === 7 ? 15 : 40;

    try {
      // 1. Fetch user and balance
      const [user] = await db.select({
        id: users.id,
        creditsBalance: users.creditsBalance,
        role: users.role
      })
        .from(users)
        .where(eq(users.id, userId as string));

      if (!user) {
        return reply.code(404).send({ success: false, message: 'User not found' });
      }

      if ((user.creditsBalance ?? 0) < creditCost) {
        return reply.code(400).send({ success: false, message: `Insufficient credits. You need ${creditCost} credits.` });
      }

      // 2. Fetch listing
      const [listing] = await db.select({
        id: listings.id,
        ownerId: listings.ownerId,
        isFeatured: listings.isFeatured,
        featuredUntil: listings.featuredUntil,
      })
        .from(listings)
        .where(eq(listings.id, id))
        .limit(1);

      if (!listing) {
        return reply.code(404).send({ success: false, message: 'Listing not found' });
      }

      // Enforce ownership
      if (listing.ownerId !== userId && user.role !== 'ADMIN') {
        return reply.code(403).send({ success: false, message: 'Unauthorized' });
      }

      // 3. Deduct credits and set featured status
      const featuredUntilDate = new Date();
      featuredUntilDate.setDate(featuredUntilDate.getDate() + days);

      await db.update(users)
        .set({
          creditsBalance: sql`${users.creditsBalance} - ${creditCost}`,
          updatedAt: new Date(),
        })
        .where(eq(users.id, userId as string));

      const [updatedListing] = await db.update(listings)
        .set({
          isFeatured: true,
          featuredUntil: featuredUntilDate,
          updatedAt: new Date(),
        })
        .where(eq(listings.id, id))
        .returning();

      return reply.send({
        success: true,
        message: `Listing successfully featured for ${days} days!`,
        data: {
          listing: updatedListing,
          newBalance: (user.creditsBalance ?? 0) - creditCost
        }
      });
    } catch (err: any) {
      console.error('Feature listing error:', err);
      return reply.status(500).send({ success: false, message: 'Failed to feature listing', error: err.message });
    }
  });

  /**
   * POST /api/v1/listings/:id/report
   * Report a listing for violations or inaccuracies
   */
  app.post('/:id/report', async (request, reply) => {
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
      // 1. Verify listing exists (match by ID or shortId)
      const [listing] = await db.select({ id: listings.id })
        .from(listings)
        .where(or(eq(listings.id, id), eq(listings.shortId, id)))
        .limit(1);

      if (!listing) {
        return reply.code(404).send({ success: false, message: 'Listing not found' });
      }

      // 2. Insert report entry
      const [report] = await db.insert(listingReports)
        .values({
          listingId: listing.id,
          reason,
          reporterName,
          reporterEmail,
          description: description || null,
        })
        .returning();

      return reply.send({
        success: true,
        message: 'Property report submitted successfully. Thank you for your feedback.',
        data: report
      });
    } catch (err: any) {
      console.error('Report property error:', err);
      return reply.status(500).send({ success: false, message: 'Failed to submit report', error: err.message });
    }
  });
}
