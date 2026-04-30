import { db } from '../db';
import { systemSettings } from '../db/schema';
import { eq } from 'drizzle-orm';

export class SystemService {
  /**
   * Fetch a system setting by key
   * Returns default if not found
   */
  static async getSetting(key: string, defaultValue: string): Promise<string> {
    try {
      const result = await db.select()
        .from(systemSettings)
        .where(eq(systemSettings.key, key))
        .limit(1);
      
      return result[0]?.value ?? defaultValue;
    } catch (err) {
      console.error(`Error fetching system setting [${key}]:`, err);
      return defaultValue;
    }
  }

  /**
   * Get the current cost to publish a listing in credits
   */
  static async getListingCost(): Promise<number> {
    const cost = await this.getSetting('listing_cost_credits', '10');
    return parseInt(cost, 10);
  }
}
