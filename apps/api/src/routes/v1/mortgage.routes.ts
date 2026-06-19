import { FastifyInstance } from 'fastify';
import { db } from '../../db';
import { mortgageBanks, mortgageLeads, listings, projects } from '../../db/schema';
import { eq, and, or, isNull } from 'drizzle-orm';
import { calculateMortgage } from '../../scripts/mortgage-calc';

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
  // 1. Try listing by ID or shortId
  const listingResult = await db.select({ price: listings.price })
    .from(listings)
    .where(or(
      eq(listings.id, externalId),
      eq(listings.shortId, externalId)
    ))
    .limit(1);

  if (listingResult.length > 0) {
    return Number(listingResult[0].price);
  }

  // 2. Try project by ID
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
  app.post('/leads', async (request, reply) => {
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

      // 7. Store snapshotted lead
      const [insertedLead] = await db.insert(mortgageLeads).values({
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
}
