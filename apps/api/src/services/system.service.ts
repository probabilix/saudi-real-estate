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
   * Update or Insert a system setting
   */
  static async setSetting(key: string, value: string, description?: string): Promise<void> {
    try {
      await db.insert(systemSettings)
        .values({ key, value, description, updatedAt: new Date() })
        .onConflictDoUpdate({
          target: systemSettings.key,
          set: { value, description, updatedAt: new Date() }
        });
    } catch (err) {
      console.error(`Error setting system setting [${key}]:`, err);
      throw err;
    }
  }

  /**
   * Get the current cost to publish a listing in credits
   */
  static async getListingCost(): Promise<number> {
    const cost = await this.getSetting('listing_cost_credits', '10');
    return parseInt(cost, 10);
  }

  /**
   * Get the current cost to publish a project in credits (Default: 50)
   */
  static async getProjectCost(): Promise<number> {
    const cost = await this.getSetting('project_cost_credits', '50');
    return parseInt(cost, 10);
  }

  /**
   * Get the current cost to feature a project in credits (Default: 40)
   */
  static async getProjectFeatureCost(): Promise<number> {
    const cost = await this.getSetting('project_feature_cost_credits', '40');
    return parseInt(cost, 10);
  }

  static async getQualificationWebhook(): Promise<string> {
    return this.getSetting('ai_qualification_webhook', '');
  }

  static async getGeneralAssistantWebhook(): Promise<string> {
    return this.getSetting('ai_general_assistant_webhook', '');
  }
}

