import { FastifyInstance } from 'fastify';
import { db } from '../../db';
import { mortgageBanks, mortgageLeads, listings, projects, mortgageCalculatorUsage, users } from '../../db/schema';
import { eq, and, or, isNull, desc, inArray } from 'drizzle-orm';
import { calculateMortgage } from '../../scripts/mortgage-calc';
import { authenticateJWT, optionalAuthenticateJWT, requireRole } from '../../middleware/auth.middleware';

const FALLBACK_RATE_PCT = 4.30;
const MAX_PRICE_BUFFER_PCT = 15;

function getMinDownPaymentPct({ isCitizen, isFirstHome }: { isCitizen: boolean, isFirstHome: boolean | null }): number {
  if (isCitizen && isFirstHome) return 10;
  return 30;
}

function getMaxPrice(propertyPrice: number): number {
  return Math.round(propertyPrice * (1 + MAX_PRICE_BUFFER_PCT / 100));
}

async function getPropertyBasePrice(externalId: string): Promise<number | null> {
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(externalId);

  // 1. Try listing by ID or shortId
  const listingResult = await db.select({ price: listings.price })
    .from(listings)
    .where(isUuid ? or(eq(listings.id, externalId), eq(listings.shortId, externalId)) : eq(listings.shortId, externalId))
    .limit(1);

  if (listingResult.length > 0) {
    return Number(listingResult[0].price);
  }

  // 2. Try project by ID (Projects only support UUID)
  if (isUuid) {
    const projectResult = await db.select({ id: projects.id })
      .from(projects)
      .where(eq(projects.id, externalId))
      .limit(1);

    if (projectResult.length > 0) {
      const layouts = await db.select({ price: listings.price })
        .from(listings)
        .where(and(
          eq(listings.projectId, externalId),
          eq(listings.status, 'ACTIVE'),
          isNull(listings.deletedAt)
        ));

      if (layouts.length > 0) {
        return Math.min(...layouts.map(l => Number(l.price)));
      }
    }
  }

  return null;
}

export default async function mortgageRoutes(app: FastifyInstance) {
  /**
   * GET /api/v1/mortgage/banks
   * Returns active banks with their rate tables.
   */
  app.get('/banks', async (request, reply) => {
    try {
      const activeBanks = await db.query.mortgageBanks.findMany({
        where: eq(mortgageBanks.isActive, true),
        with: {
          rates: true,
        },
      });

      const formatted = activeBanks.map(bank => {
        const interestDetails = bank.rates.length > 0
          ? bank.rates.map(r => ({
              years: r.loanPeriodYears,
              ratePct: parseFloat(r.annualRatePct),
            })).sort((a, b) => a.years - b.years)
          : null;

        return {
          slug: bank.slug,
          externalId: bank.externalId,
          nameEn: bank.nameEn,
          nameAr: bank.nameAr,
          interestDetails,
        };
      });

      return reply.send({ success: true, data: formatted });
    } catch (err: any) {
      app.log.error(err);
      return reply.code(500).send({ success: false, message: 'Failed to fetch mortgage banks' });
    }
  });

  /**
   * GET /api/v1/mortgage/config
   * Returns constants used to bound and configure the client UI.
   */
  app.get('/config', async (request, reply) => {
    return reply.send({
      success: true,
      data: {
        minDownPaymentPctFirstHomeCitizen: 10,
        minDownPaymentPctDefault: 30,
        maxDownPaymentPct: 90,
        minLoanPeriodYears: 5,
        maxLoanPeriodYears: 25,
        defaultLoanPeriodYears: 15,
        maxPriceBufferPct: MAX_PRICE_BUFFER_PCT,
      },
    });
  });

  /**
   * POST /api/v1/mortgage/calculate
   * Recompute calculator values server-side for safety.
   */
  app.post('/calculate', async (request, reply) => {
    try {
      const {
        propertyExternalId,
        price,
        isCitizen,
        isFirstHome,
        downPaymentAmount,
        loanPeriodYears,
        bankSlug,
      } = request.body as {
        propertyExternalId: string;
        price: number;
        isCitizen: boolean;
        isFirstHome: boolean | null;
        downPaymentAmount: number;
        loanPeriodYears: number;
        bankSlug: string;
      };

      // 1. Inputs validation
      if (!propertyExternalId || !bankSlug || price === undefined || downPaymentAmount === undefined || loanPeriodYears === undefined) {
        return reply.code(400).send({ success: false, message: 'Required fields are missing.' });
      }

      if (loanPeriodYears < 5 || loanPeriodYears > 25) {
        return reply.code(400).send({ success: false, message: 'Loan period must be between 5 and 25 years.' });
      }

      // 2. Fetch baseline property price
      const basePrice = await getPropertyBasePrice(propertyExternalId);
      if (basePrice === null) {
        return reply.code(404).send({ success: false, message: 'Property or Project not found.' });
      }

      // 3. Validate price cap with 15% buffer
      const maxAllowedPrice = getMaxPrice(basePrice);
      if (price > maxAllowedPrice) {
        return reply.code(400).send({ success: false, message: `Price exceeds the maximum allowed buffer (${maxAllowedPrice} SAR).` });
      }

      // 4. Validate down payment percentage bounds
      const minDownPaymentPct = getMinDownPaymentPct({ isCitizen, isFirstHome });
      const minDownPaymentAllowed = price * minDownPaymentPct / 100;
      const maxDownPaymentAllowed = price * 0.90; // max 90%

      if (downPaymentAmount < minDownPaymentAllowed) {
        return reply.code(400).send({ success: false, message: `Down payment must be at least ${minDownPaymentPct}% of the price (${minDownPaymentAllowed} SAR).` });
      }
      if (downPaymentAmount > maxDownPaymentAllowed) {
        return reply.code(400).send({ success: false, message: `Down payment cannot exceed 90% of the price (${maxDownPaymentAllowed} SAR).` });
      }

      // 5. Look up bank and rate
      const bank = await db.query.mortgageBanks.findFirst({
        where: and(
          eq(mortgageBanks.slug, bankSlug),
          eq(mortgageBanks.isActive, true)
        ),
        with: {
          rates: true,
        },
      });

      if (!bank) {
        return reply.code(400).send({ success: false, message: 'Selected bank is invalid or inactive.' });
      }

      let appliedRatePct = FALLBACK_RATE_PCT;
      const rateEntry = bank.rates.find(r => r.loanPeriodYears === loanPeriodYears);
      if (rateEntry) {
        appliedRatePct = parseFloat(rateEntry.annualRatePct);
      }

      // 6. Perform mortgage calculation
      const calculated = calculateMortgage({
        price,
        downPaymentAmount,
        loanPeriodYears,
        annualRatePct: appliedRatePct,
      });

      return reply.send({
        success: true,
        data: {
          totalLoanAmount: calculated.totalLoanAmount,
          totalPayableValue: calculated.totalPayableValue,
          monthlyInstalment: calculated.monthlyInstalment,
          bankProfitPercentage: calculated.bankProfitPercentage,
          downPaymentAmount: calculated.downPaymentAmount,
          appliedRatePct,
        },
      });
    } catch (err: any) {
      app.log.error(err);
      return reply.code(500).send({ success: false, message: 'Calculation failed.', error: err.message });
    }
  });

  /**
   * POST /api/v1/mortgage/leads
   * Submit mortgage calculator lead. Re-computes metrics server-side and stores snapshot.
   */
  app.post('/leads', { preHandler: [optionalAuthenticateJWT] }, async (request, reply) => {
    try {
      const body = request.body as {
        fullName: string;
        phoneNumber: string;
        monthlyIncome: number | null;
        redfSupported: boolean | null;
        monthlyObligations: number | null;
        propertyExternalId: string;
        price: number;
        isCitizen: boolean;
        isFirstHome: boolean | null;
        downPaymentAmount: number;
        loanPeriodYears: number;
        bankSlug: string;
      };

      const {
        fullName,
        phoneNumber,
        monthlyIncome,
        redfSupported,
        monthlyObligations,
        propertyExternalId,
        price,
        isCitizen,
        isFirstHome,
        downPaymentAmount,
        loanPeriodYears,
        bankSlug,
      } = body;

      // 1. Inputs validation
      if (!fullName || !phoneNumber || !propertyExternalId || !bankSlug || price === undefined || downPaymentAmount === undefined || loanPeriodYears === undefined) {
        return reply.code(400).send({ success: false, message: 'All required fields must be supplied.' });
      }

      if (loanPeriodYears < 5 || loanPeriodYears > 25) {
        return reply.code(400).send({ success: false, message: 'Loan period must be between 5 and 25 years.' });
      }

      // 2. Fetch baseline property price
      const basePrice = await getPropertyBasePrice(propertyExternalId);
      if (basePrice === null) {
        return reply.code(404).send({ success: false, message: 'Property or Project not found.' });
      }



      // 4. Validate down payment percentage bounds
      const minDownPaymentPct = getMinDownPaymentPct({ isCitizen, isFirstHome });
      const minDownPaymentAllowed = price * minDownPaymentPct / 100;
      const maxDownPaymentAllowed = price * 0.90; // max 90%

      if (downPaymentAmount < minDownPaymentAllowed) {
        return reply.code(400).send({ success: false, message: `Down payment must be at least ${minDownPaymentPct}% of the price (${minDownPaymentAllowed} SAR).` });
      }
      if (downPaymentAmount > maxDownPaymentAllowed) {
        return reply.code(400).send({ success: false, message: `Down payment cannot exceed 90% of the price (${maxDownPaymentAllowed} SAR).` });
      }

      // 5. Look up bank and rate
      const bank = await db.query.mortgageBanks.findFirst({
        where: and(
          eq(mortgageBanks.slug, bankSlug),
          eq(mortgageBanks.isActive, true)
        ),
        with: {
          rates: true,
        },
      });

      if (!bank) {
        return reply.code(400).send({ success: false, message: 'Selected bank is invalid or inactive.' });
      }

      let appliedRatePct = FALLBACK_RATE_PCT;
      const rateEntry = bank.rates.find(r => r.loanPeriodYears === loanPeriodYears);
      if (rateEntry) {
        appliedRatePct = parseFloat(rateEntry.annualRatePct);
      }

      // 6. Perform mortgage calculation snapshot
      const calculated = calculateMortgage({
        price,
        downPaymentAmount,
        loanPeriodYears,
        annualRatePct: appliedRatePct,
      });

      const loggedInUser = (request as any).user;
      const userId = loggedInUser?.userId || null;

      // 7. Store snapshotted lead
      const [insertedLead] = await db.insert(mortgageLeads).values({
        userId,
        fullName,
        phoneNumber,
        monthlyIncome: monthlyIncome !== null && monthlyIncome !== undefined ? monthlyIncome.toString() : null,
        redfSupported: redfSupported !== null && redfSupported !== undefined ? redfSupported : true,
        monthlyObligations: monthlyObligations !== null && monthlyObligations !== undefined ? monthlyObligations.toString() : null,
        propertyExternalId,
        propertyPrice: price.toString(),
        isCitizen,
        isFirstHome,
        downPaymentAmount: calculated.downPaymentAmount.toString(),
        loanPeriodYears,
        bankSlug,
        bankNameEn: bank.nameEn,
        appliedRatePct: appliedRatePct.toString(),
        monthlyInstalment: calculated.monthlyInstalment.toString(),
        totalPayableValue: calculated.totalPayableValue.toString(),
        totalLoanAmount: calculated.totalLoanAmount.toString(),
        status: 'new',
      }).returning();

      // 8. Auto-clean up cold lead calculator usage logs
      try {
        const loggedInUser = (request as any).user;
        let deleteUserId: string | null = loggedInUser?.userId || null;

        if (!deleteUserId) {
          // Look up user by phone number
          const [dbUser] = await db.select({ id: users.id })
            .from(users)
            .where(eq(users.phone, phoneNumber))
            .limit(1);
          if (dbUser) {
            deleteUserId = dbUser.id;
          }
        }

        if (deleteUserId) {
          await db.delete(mortgageCalculatorUsage)
            .where(eq(mortgageCalculatorUsage.userId, deleteUserId));
        }
      } catch (err) {
        app.log.error(err, 'Failed to clean up calculator usage log');
      }

      return reply.send({
        success: true,
        data: {
          id: insertedLead.id,
          status: insertedLead.status,
          createdAt: insertedLead.createdAt,
        },
      });
    } catch (err: any) {
      app.log.error(err);
      return reply.code(500).send({ success: false, message: 'Failed to submit mortgage lead.', error: err.message });
    }
  });

  /**
   * POST /api/v1/mortgage/calculator-log
   * Logs a logged-in user's calculator interaction (once per property page view).
   */
  app.post('/calculator-log', { preHandler: [authenticateJWT] }, async (request, reply) => {
    const user = (request as any).user;
    const userId = user.userId;
    const { propertyExternalId, propertyType } = request.body as {
      propertyExternalId: string;
      propertyType: 'listing' | 'project';
    };

    if (!propertyExternalId || !propertyType) {
      return reply.code(400).send({ success: false, message: 'propertyExternalId and propertyType are required.' });
    }

    try {
      // If they are already a hot lead, do not log their calculator usage
      const [existingHotLead] = await db.select({ id: mortgageLeads.id })
        .from(mortgageLeads)
        .where(eq(mortgageLeads.userId, userId))
        .limit(1);

      if (existingHotLead) {
        return reply.send({ success: true, message: 'User is already a hot lead. Ignored.' });
      }

      await db.insert(mortgageCalculatorUsage).values({
        userId,
        propertyExternalId,
        propertyType,
      }).onConflictDoNothing();

      return reply.send({ success: true });
    } catch (err: any) {
      request.log.error(err);
      return reply.code(500).send({ success: false, message: 'Failed to log calculator usage.', error: err.message });
    }
  });

  /**
   * GET /api/v1/mortgage/calculator-leads
   * Returns a grouped view of users who used the calculator and the properties they calculated on.
   */
  app.get('/calculator-leads', { preHandler: [authenticateJWT] }, async (request, reply) => {
    try {
      // 1. Fetch all calculator usage entries joined with user profiles
      const usages = await db.select({
        userId: users.id,
        userName: users.name,
        userEmail: users.email,
        userPhone: users.phone,
        propertyExternalId: mortgageCalculatorUsage.propertyExternalId,
        propertyType: mortgageCalculatorUsage.propertyType,
        createdAt: mortgageCalculatorUsage.createdAt,
        status: mortgageCalculatorUsage.status,
        notes: mortgageCalculatorUsage.notes,
      })
        .from(mortgageCalculatorUsage)
        .innerJoin(users, eq(mortgageCalculatorUsage.userId, users.id))
        .orderBy(desc(mortgageCalculatorUsage.createdAt));

      // 2. Group by user
      const groupedLeads: Record<string, {
        userId: string;
        name: string;
        email: string;
        phone: string;
        lastActiveAt: Date;
        status: string;
        notes: any[];
        interactions: Array<{
          propertyExternalId: string;
          propertyType: string;
          createdAt: Date;
          titleEn: string;
          titleAr: string;
          city: string;
          price: number | null;
        }>;
      }> = {};

      for (const row of usages) {
        const userId = row.userId;
        if (!groupedLeads[userId]) {
          groupedLeads[userId] = {
            userId,
            name: row.userName || 'Unnamed User',
            email: row.userEmail,
            phone: row.userPhone || 'N/A',
            lastActiveAt: row.createdAt,
            status: row.status || 'new',
            notes: row.notes || [],
            interactions: [],
          };
        }

        // Keep the latest timestamp as lastActiveAt
        if (row.createdAt > groupedLeads[userId].lastActiveAt) {
          groupedLeads[userId].lastActiveAt = row.createdAt;
        }

        // Fetch details of property / project
        let titleEn = 'Unknown Property';
        let titleAr = 'عقار غير معروف';
        let city = 'Saudi Arabia';
        let price: number | null = null;

        if (row.propertyType === 'listing') {
          const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(row.propertyExternalId || '');
          const [listing] = await db.select({
            enTitle: listings.enTitle,
            arTitle: listings.arTitle,
            city: listings.city,
            price: listings.price,
          })
            .from(listings)
            .where(isUuid ? or(eq(listings.id, row.propertyExternalId), eq(listings.shortId, row.propertyExternalId)) : eq(listings.shortId, row.propertyExternalId))
            .limit(1);

          if (listing) {
            titleEn = listing.enTitle || listing.arTitle || 'Untitled Property';
            titleAr = listing.arTitle || 'عقار بدون عنوان';
            city = listing.city || 'Saudi Arabia';
            price = listing.price ? Number(listing.price) : null;
          }
        } else {
          const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(row.propertyExternalId || '');
          if (isUuid) {
            const [project] = await db.select({
              nameEn: projects.nameEn,
              nameAr: projects.nameAr,
              city: projects.city,
            })
              .from(projects)
              .where(eq(projects.id, row.propertyExternalId))
              .limit(1);

            if (project) {
              titleEn = project.nameEn || project.nameAr || 'Untitled Project';
              titleAr = project.nameAr || 'مشروع بدون عنوان';
              city = project.city || 'Saudi Arabia';

              // Query layouts/listings for minPrice
              const layouts = await db.select({ price: listings.price })
                .from(listings)
                .where(and(eq(listings.projectId, row.propertyExternalId), eq(listings.status, 'ACTIVE')));
              const prices = layouts.map(l => Number(l.price));
              price = prices.length > 0 ? Math.min(...prices) : null;
            }
          }
        }

        groupedLeads[userId].interactions.push({
          propertyExternalId: row.propertyExternalId,
          propertyType: row.propertyType,
          createdAt: row.createdAt,
          titleEn,
          titleAr,
          city,
          price,
        });
      }

      // Convert to array and sort by lastActiveAt descending
      const data = Object.values(groupedLeads).sort((a, b) => b.lastActiveAt.getTime() - a.lastActiveAt.getTime());

      return reply.send({ success: true, data });
    } catch (err: any) {
      request.log.error(err);
      return reply.code(500).send({ success: false, message: 'Failed to fetch calculator leads.', error: err.message });
    }
  });

  app.patch('/calculator-leads/:userId', { preHandler: [authenticateJWT] }, async (request, reply) => {
    const { userId } = request.params as { userId: string };
    const { status, notes } = request.body as { status?: string; notes?: string };

    try {
      const updateObj: any = {
        updatedAt: new Date()
      };
      if (status !== undefined) updateObj.status = status;

      if (notes !== undefined && notes.trim() !== '') {
        const [existingRow] = await db.select({ notes: mortgageCalculatorUsage.notes })
          .from(mortgageCalculatorUsage)
          .where(eq(mortgageCalculatorUsage.userId, userId))
          .limit(1);

        const notesArray = existingRow?.notes || [];
        notesArray.push({
          text: notes,
          createdAt: new Date().toISOString(),
        });
        updateObj.notes = notesArray;
      }

      await db.update(mortgageCalculatorUsage)
        .set(updateObj)
        .where(eq(mortgageCalculatorUsage.userId, userId));

      return reply.send({ success: true });
    } catch (err: any) {
      request.log.error(err);
      return reply.code(500).send({ success: false, message: 'Failed to update calculator lead status/notes.', error: err.message });
    }
  });
}
