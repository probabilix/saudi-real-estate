// ──────────────────────────────────────────────
// Platform-wide constants
// ──────────────────────────────────────────────

export const USER_ROLES = ['ADMIN', 'FIRM', 'AGENT', 'SOLO_BROKER', 'OWNER', 'BUYER'] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const LISTING_CATEGORIES = ['RESIDENTIAL', 'COMMERCIAL'] as const;
export type ListingCategory = (typeof LISTING_CATEGORIES)[number];

export const RESIDENTIAL_TYPES = [
  'APARTMENT', 'VILLA', 'FLOOR', 'RESIDENTIAL_BUILDING', 'RESIDENTIAL_LAND', 
  'REST_HOUSE', 'CHALET', 'ROOM', 'TOWNHOUSE', 'DUPLEX'
] as const;

export const COMMERCIAL_TYPES = [
  'OFFICE', 'COMMERCIAL_BUILDING', 'WAREHOUSE', 'COMMERCIAL_LAND', 'INDUSTRIAL_LAND', 
  'FARM', 'AGRICULTURE_PLOT', 'COMPLEX', 'HOTEL', 'WORKSHOP', 'FACTORY', 
  'SCHOOL', 'HEALTH_CENTER', 'GAS_STATION', 'SHOWROOM'
] as const;

export const LISTING_TYPES = [...RESIDENTIAL_TYPES, ...COMMERCIAL_TYPES] as const;
export type ListingType = (typeof LISTING_TYPES)[number];

export const FURNISHING_STATUSES = ['UNFURNISHED', 'PARTLY_FURNISHED', 'FULLY_FURNISHED'] as const;
export type FurnishingStatus = (typeof FURNISHING_STATUSES)[number];

export const COMPLETION_STATUSES = ['READY', 'OFF_PLAN', 'UNDER_CONSTRUCTION'] as const;
export type CompletionStatus = (typeof COMPLETION_STATUSES)[number];

export const LISTING_PURPOSES = ['SALE', 'RENT', 'LEASE'] as const;
export type ListingPurpose = (typeof LISTING_PURPOSES)[number];

export const LISTING_STATUSES = ['ACTIVE', 'SOLD', 'RENTED', 'DRAFT', 'FLAGGED'] as const;
export type ListingStatus = (typeof LISTING_STATUSES)[number];

export const LEAD_STATUSES = ['NEW', 'VIEWED', 'CONTACTED', 'CLOSED_WON', 'CLOSED_LOST'] as const;
export type LeadStatus = (typeof LEAD_STATUSES)[number];

export const SUBSCRIPTION_TIERS = ['FREE', 'STARTER', 'PRO', 'ELITE'] as const;
export type SubscriptionTier = (typeof SUBSCRIPTION_TIERS)[number];

export const BUYER_PURPOSES = ['OWN_USE', 'INVESTMENT', 'RENTAL_INCOME'] as const;
export type BuyerPurpose = (typeof BUYER_PURPOSES)[number];

export const TRANSLATION_STATUSES = ['PENDING', 'DONE', 'FAILED'] as const;
export type TranslationStatus = (typeof TRANSLATION_STATUSES)[number];

export const PLACEMENT_TYPES = ['HOMEPAGE_BANNER', 'TOP_OF_SEARCH', 'CITY_SPOTLIGHT'] as const;
export type PlacementType = (typeof PLACEMENT_TYPES)[number];

export const LANGUAGES = ['ar', 'en', 'ur', 'hi'] as const;
export type Language = (typeof LANGUAGES)[number];

export const SUPPORTED_LOCALES = ['ar', 'en'] as const;
export type Locale = (typeof SUPPORTED_LOCALES)[number];
export const DEFAULT_LOCALE: Locale = 'en';

export const VERIFICATION_STATUSES = ['UNVERIFIED', 'PENDING', 'VERIFIED', 'REJECTED'] as const;
export type VerificationStatus = (typeof VERIFICATION_STATUSES)[number];

export const BROKER_EXPERIENCE_LEVELS = ['0-2', '3-5', '6-10', '10+'] as const;
export type BrokerExperienceLevel = (typeof BROKER_EXPERIENCE_LEVELS)[number];

// Saudi cities
export const CITIES = [
  'Riyadh', 'Jeddah', 'Dammam', 'Mecca', 'Medina',
  'Khobar', 'Dhahran', 'Tabuk', 'Abha', 'Jubail',
  'NEOM', 'KAEC', 'Yanbu',
] as const;
export type City = (typeof CITIES)[number];

// Popular districts
export const DISTRICTS: Record<string, string[]> = {
  Riyadh: ['Al Olaya', 'Hittin', 'KAFD', 'Al Malqa', 'Al Nakheel', 'Al Yasmin', 'Al Sahafah', 'Al Rawdah', 'King Abdullah District'],
  Jeddah: ['Al Hamra', 'Corniche', 'Obhur', 'Al Rawdah', 'Al Khalidiyyah', 'Al Shati', 'Al Andalus'],
  Dammam: ['Al Faisaliyah', 'Al Shati', 'Al Mazruiyah', 'Al Adamah'],
};

// Subscription pricing (SAR)
export const SUBSCRIPTION_PRICING: Record<Exclude<SubscriptionTier, 'FREE'>, number> = {
  STARTER: 299,
  PRO: 799,
  ELITE: 1999,
};

// Featured placement pricing range (SAR per week)
export const FEATURED_PRICING: Record<PlacementType, { min: number; max: number }> = {
  HOMEPAGE_BANNER: { min: 2000, max: 3000 },
  TOP_OF_SEARCH: { min: 1000, max: 2000 },
  CITY_SPOTLIGHT: { min: 500, max: 1000 },
};
