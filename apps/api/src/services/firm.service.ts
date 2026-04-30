import { db } from '../db';
import { users, listings, leads } from '../db/schema';
import { eq, and, sql, desc, count } from 'drizzle-orm';

export class FirmService {
  /**
   * Get all brokers associated with a firm, including performance stats
   */
  static async getFirmBrokers(firmId: string) {
    // Fetch all users associated with this firm
    const brokers = await db.select({
      id: users.id,
      name: users.name,
      email: users.email,
      avatarUrl: users.avatarUrl,
      role: users.role,
      creditsBalance: users.creditsBalance,
      regaVerified: users.regaVerified,
      createdAt: users.createdAt,
    })
    .from(users)
    .where(eq(users.firmId, firmId))
    .orderBy(users.name);

    // For each broker, get their specific stats
    const brokersWithStats = await Promise.all(brokers.map(async (broker) => {
      // Get listing counts (Active)
      const listingCountRes = await db.select({
        count: count()
      })
      .from(listings)
      .where(and(eq(listings.ownerId, broker.id), eq(listings.status, 'ACTIVE'), sql`${listings.deletedAt} IS NULL`));

      // Get lead counts
      const leadCountRes = await db.select({
        count: count()
      })
      .from(leads)
      .where(eq(leads.brokerId, broker.id));

      // Get total views from their listings
      const viewsRes = await db.select({
        total: sql<number>`sum(${listings.viewsCount})`
      })
      .from(listings)
      .where(and(eq(listings.ownerId, broker.id), sql`${listings.deletedAt} IS NULL`));

      return {
        ...broker,
        stats: {
          activeListings: Number(listingCountRes[0]?.count) || 0,
          totalLeads: Number(leadCountRes[0]?.count) || 0,
          totalViews: Number(viewsRes[0]?.total) || 0
        }
      };
    }));

    return brokersWithStats;
  }

  /**
   * Transfer credits from firm owner to a broker
   */
  static async transferCredits(firmOwnerId: string, brokerId: string, amount: number) {
    if (amount <= 0) throw new Error('Amount must be positive');

    // 1. Fetch firm owner balance to verify
    const [firmOwner] = await db.select({ credits: users.creditsBalance })
      .from(users)
      .where(eq(users.id, firmOwnerId));

    if (!firmOwner || (firmOwner.credits ?? 0) < amount) {
      throw new Error('Insufficient firm balance');
    }

    // 2. Performance Deduction (Deduct from firm owner)
    await db.update(users)
      .set({ 
        creditsBalance: sql`${users.creditsBalance} - ${amount}`,
        updatedAt: new Date()
      })
      .where(eq(users.id, firmOwnerId));

    // 3. Add to broker
    await db.update(users)
      .set({ 
        creditsBalance: sql`${users.creditsBalance} + ${amount}`,
        updatedAt: new Date()
      })
      .where(eq(users.id, brokerId));

    // 4. Fetch new balances to return
    const [updatedOwner] = await db.select({ credits: users.creditsBalance }).from(users).where(eq(users.id, firmOwnerId));
    const [updatedBroker] = await db.select({ credits: users.creditsBalance }).from(users).where(eq(users.id, brokerId));

    return { 
      success: true, 
      ownerBalance: updatedOwner?.credits || 0,
      brokerBalance: updatedBroker?.credits || 0
    };
  }

  /**
   * Reclaim credits from a broker back to the firm owner
   */
  static async reclaimCredits(firmOwnerId: string, brokerId: string, amount: number) {
    if (amount <= 0) throw new Error('Amount must be positive');

    // 1. Fetch broker balance to verify they have enough to be reclaimed
    const [broker] = await db.select({ credits: users.creditsBalance })
      .from(users)
      .where(eq(users.id, brokerId));

    if (!broker || (broker.credits ?? 0) < amount) {
      throw new Error('Insufficient agent balance to reclaim');
    }

    // 2. Deduct from broker
    await db.update(users)
      .set({ 
        creditsBalance: sql`${users.creditsBalance} - ${amount}`,
        updatedAt: new Date()
      })
      .where(eq(users.id, brokerId));

    // 3. Add back to firm owner
    await db.update(users)
      .set({ 
        creditsBalance: sql`${users.creditsBalance} + ${amount}`,
        updatedAt: new Date()
      })
      .where(eq(users.id, firmOwnerId));

    // 4. Fetch new balances to return
    const [updatedOwner] = await db.select({ credits: users.creditsBalance }).from(users).where(eq(users.id, firmOwnerId));
    const [updatedBroker] = await db.select({ credits: users.creditsBalance }).from(users).where(eq(users.id, brokerId));

    return { 
      success: true, 
      ownerBalance: updatedOwner?.credits || 0,
      brokerBalance: updatedBroker?.credits || 0
    };
  }
}
