import { FastifyInstance } from 'fastify';
import { listingSearchSchema, createListingSchema, updateListingSchema } from '@saudi-re/shared';
import { ListingService } from '../../services/listing.service';
import { CloudinaryService } from '../../services/cloudinary.service';
import { authenticateJWT, optionalAuthenticateJWT } from '../../middleware/auth.middleware';
import { db } from '../../db';
import { leads, buyerProfiles, listings, projects, projectUnits, users } from '../../db/schema';
import { eq, and, sql, desc, asc, inArray } from 'drizzle-orm';

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
   * POST /api/v1/listings/projects
   * Create a new project
   */
  app.post('/projects', { preHandler: [authenticateJWT] }, async (request, reply) => {
    const { nameEn, nameAr, descriptionEn, descriptionAr, city, district, mapEmbedUrl, isFeatured, featuredOrder } = request.body as any;
    if (!nameEn || !nameAr || !city) {
      return reply.code(400).send({ success: false, message: 'nameEn, nameAr and city are required' });
    }
    try {
      const [newProject] = await db.insert(projects).values({
        nameEn,
        nameAr,
        descriptionEn,
        descriptionAr,
        city,
        district,
        mapEmbedUrl,
        isFeatured: isFeatured !== undefined ? !!isFeatured : false,
        featuredOrder: featuredOrder !== undefined ? (featuredOrder === '' ? 0 : Number(featuredOrder)) : 0,
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
      // Create project record
      const [newProject] = await db.insert(projects).values({
        nameEn: project.nameEn,
        nameAr: project.nameAr,
        descriptionEn: project.descriptionEn,
        descriptionAr: project.descriptionAr,
        city: project.city,
        district: project.district,
        mapEmbedUrl: project.mapEmbedUrl,
        brochureUrl: project.brochureUrl,
        regaFalLicense: project.regaFalLicense,
        amenities: project.amenities || {},
        photos: project.photos || [],
        completionStatus: project.completionStatus,
        expectedDelivery: project.expectedDelivery,
        totalUnits: project.totalUnits,
        isFeatured: project.isFeatured !== undefined ? !!project.isFeatured : false,
        featuredOrder: project.featuredOrder !== undefined ? (project.featuredOrder === null ? 0 : Number(project.featuredOrder)) : 0,
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

  /**
   * PUT /api/v1/listings/projects/:id
   * Update project details (Authenticated)
   */
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
      layouts
    } = request.body as any;

    if (!nameEn || !nameAr || !city) {
      return reply.code(400).send({ success: false, message: 'nameEn, nameAr and city are required' });
    }

    try {
      const [updatedProject] = await db.update(projects)
        .set({
          nameEn,
          nameAr,
          descriptionEn: descriptionEn || null,
          descriptionAr: descriptionAr || null,
          city,
          district: district || null,
          mapEmbedUrl: mapEmbedUrl || null,
          brochureUrl: brochureUrl || null,
          regaFalLicense: regaFalLicense || null,
          amenities: amenities || {},
          photos: photos || [],
          completionStatus: completionStatus || null,
          expectedDelivery: expectedDelivery || null,
          totalUnits: totalUnits ? Number(totalUnits) : null,
          isFeatured: isFeatured !== undefined ? !!isFeatured : undefined,
          featuredOrder: featuredOrder !== undefined ? (featuredOrder === '' ? 0 : Number(featuredOrder)) : undefined,
          updatedAt: new Date(),
        })
        .where(eq(projects.id, id))
        .returning();

      if (!updatedProject) {
        return reply.code(404).send({ success: false, message: 'Project not found' });
      }

      // Also propagate brochureUrl, regaFalLicense, city, district to all linked listings
      await db.update(listings)
        .set({
          brochureUrl: brochureUrl || null,
          regaFalLicense: regaFalLicense || null,
          city,
          district: district || null,
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
      if (body.mapEmbedUrl !== undefined) updateData.mapEmbedUrl = body.mapEmbedUrl;
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
}

