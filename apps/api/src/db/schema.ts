// ──────────────────────────────────────────────
// Saudi Real Estate — Drizzle Schema Definition
// ──────────────────────────────────────────────

import { pgTable, uuid, varchar, timestamp, boolean, pgEnum, decimal, bigint, smallint, text, integer, jsonb, customType, index, foreignKey } from 'drizzle-orm/pg-core';
import { sql, relations } from 'drizzle-orm';

/**
 * ── Custom Types ──
 * Drizzle doesn't support 'tsvector' natively yet.
 * This helper provides full-text search capabilities for Arabic/English.
 */
export const tsvector = customType<{ data: string }>({
  dataType() {
    return 'tsvector';
  },
});

// ── Enums (Align with Master Architecture) ──
export const userRoleEnum = pgEnum('user_role', ['ADMIN', 'FIRM', 'AGENT', 'SOLO_BROKER', 'OWNER', 'BUYER']);
export const listingTypeEnum = pgEnum('listing_type', [
  'APARTMENT', 'VILLA', 'FLOOR', 'RESIDENTIAL_BUILDING', 'RESIDENTIAL_LAND', 
  'REST_HOUSE', 'CHALET', 'ROOM', 'TOWNHOUSE', 'DUPLEX',
  'OFFICE', 'COMMERCIAL_BUILDING', 'WAREHOUSE', 'COMMERCIAL_LAND', 'INDUSTRIAL_LAND', 
  'FARM', 'AGRICULTURE_PLOT', 'COMPLEX', 'HOTEL', 'WORKSHOP', 'FACTORY', 
  'SCHOOL', 'HEALTH_CENTER', 'GAS_STATION', 'SHOWROOM'
]);
export const listingStatusEnum = pgEnum('listing_status', ['ACTIVE', 'SOLD', 'RENTED', 'DRAFT', 'FLAGGED', 'REMOVED']);
export const listingPurposeEnum = pgEnum('listing_purpose', ['SALE', 'RENT', 'LEASE']);
export const translationStatusEnum = pgEnum('translation_status', ['PENDING', 'DONE', 'FAILED']);
export const leadStatusEnum = pgEnum('lead_status', ['NEW', 'VIEWED', 'CONTACTED', 'CLOSED_WON', 'CLOSED_LOST']);
export const buyerPurposeEnum = pgEnum('buyer_purpose', ['OWN_USE', 'INVESTMENT', 'RENTAL_INCOME']);
export const subscriptionTierEnum = pgEnum('subscription_tier', ['FREE', 'STARTER', 'PRO', 'ELITE']);
export const placementTypeEnum = pgEnum('placement_type', ['HOMEPAGE_BANNER', 'TOP_OF_SEARCH', 'CITY_SPOTLIGHT']);
export const languageEnum = pgEnum('language', ['ar', 'en', 'ur', 'hi']);

// Saudi Specific Specifications
export const furnishingStatusEnum = pgEnum('furnishing_status', ['UNFURNISHED', 'PARTLY_FURNISHED', 'FULLY_FURNISHED']);
export const completionStatusEnum = pgEnum('completion_status', ['READY', 'OFF_PLAN', 'UNDER_CONSTRUCTION']);
export const residenceTypeEnum = pgEnum('residence_type', ['FAMILY', 'BACHELOR']);
export const genderEnum = pgEnum('gender', ['MALE', 'FEMALE']);
export const verificationStatusEnum = pgEnum('verification_status', ['UNVERIFIED', 'PENDING', 'VERIFIED', 'REJECTED']);
export const brokerExperienceLevelEnum = pgEnum('broker_experience_level', ['0-2', '3-5', '6-10', '10+']);

// ── Users Table ──
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: varchar('email', { length: 255 }).unique().notNull(),
  phone: varchar('phone', { length: 30 }),
  passwordHash: varchar('password_hash', { length: 255 }).notNull(),
  role: userRoleEnum('role').notNull(),
  firmId: uuid('firm_id'), // Self-reference handled via manual constraints or logic for TS safety
  googleId: varchar('google_id', { length: 255 }).unique(),
  name: varchar('name', { length: 255 }),
  regaLicence: varchar('rega_licence', { length: 100 }),
  regaVerified: boolean('rega_verified').default(false),
  subscriptionTier: subscriptionTierEnum('subscription_tier').default('FREE'),
  subscriptionUntil: timestamp('subscription_until', { withTimezone: true }),
  avatarUrl: text('avatar_url'),
  verificationStatus: verificationStatusEnum('verification_status').default('UNVERIFIED'),
  isActive: boolean('is_active').default(true),
  creditsBalance: integer('credits_balance').default(0),
  rating: decimal('rating', { precision: 3, scale: 2 }).default('0'),
  reviewCount: integer('review_count').default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

// ── Broker Profiles Table ──
export const brokerProfiles = pgTable('broker_profiles', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id).notNull().unique(),
  
  // Basic Info (Bilingual)
  titleEn: varchar('title_en', { length: 255 }),
  titleAr: varchar('title_ar', { length: 255 }),
  bioEn: text('bio_en'),
  bioAr: text('bio_ar'),
  
  // Contact & Identity
  whatsapp: varchar('whatsapp', { length: 30 }),
  nationalId: varchar('national_id', { length: 50 }),
  regaLicenseNumber: varchar('rega_license_number', { length: 100 }),
  
  // Metadata
  experienceLevel: brokerExperienceLevelEnum('experience_level'),
  languages: text('languages').array().default(sql`'{}'::text[]`),
  serviceAreas: text('service_areas').array().default(sql`'{}'::text[]`),
  gender: genderEnum('gender'),
  
  // Address
  nationalShortAddress: varchar('national_short_address', { length: 255 }),
  address: text('address'),
  
  // Timestamps
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

// ── Listings Table ──
export const listings = pgTable('listings', {
  id: uuid('id').primaryKey().defaultRandom(),
  ownerId: uuid('owner_id').references(() => users.id).notNull(),
  type: listingTypeEnum('type').notNull(),
  purpose: listingPurposeEnum('purpose').notNull(),
  status: listingStatusEnum('status').default('DRAFT'),
  
  // Location
  city: varchar('city', { length: 100 }).notNull(),
  district: varchar('district', { length: 100 }),
  lat: decimal('lat', { precision: 10, scale: 7 }),
  lng: decimal('lng', { precision: 10, scale: 7 }),
  
  // Pricing & Area
  price: bigint('price', { mode: 'number' }).notNull(),
  areaSqm: decimal('area_sqm', { precision: 10, scale: 2 }),
  bedrooms: smallint('bedrooms'),
  bathrooms: smallint('bathrooms'),
  floor: smallint('floor'),
  
  // Content (Bilingual)
  arTitle: varchar('ar_title', { length: 500 }).notNull(),
  arDescription: text('ar_description'),
  enTitle: varchar('en_title', { length: 500 }),
  enDescription: text('en_description'),
  translationStatus: translationStatusEnum('translation_status').default('PENDING'),
  
  // Media & Extras
  photos: text('photos').array().notNull(),
  youtubeUrl: varchar('youtube_url', { length: 255 }),
  videoUrl: text('video_url'), // Cloudinary video link
  amenities: jsonb('amenities').default({}),
  history: jsonb('history').default([]),
  foreignerEligible: boolean('foreigner_eligible').default(false),
  isFreehold: boolean('is_freehold').default(true),
  
  // REGA Compliance & Legal (Saudi Specific)
  regaAdvertisingLicense: varchar('rega_advertising_license', { length: 100 }),
  regaFalLicense: varchar('rega_fal_license', { length: 100 }),
  regaLicenseIssueDate: varchar('rega_license_issue_date', { length: 100 }),
  regaLicenseExpiryDate: varchar('rega_license_expiry_date', { length: 100 }),
  locationDescriptionDeedAr: text('location_description_deed_ar'),
  
  // Specifications
  propertyAge: smallint('property_age'),
  furnishingStatus: furnishingStatusEnum('furnishing_status'),
  completionStatus: completionStatusEnum('completion_status'),
  residenceType: residenceTypeEnum('residence_type'),
  regaVerifiedAt: timestamp('rega_verified_at', { withTimezone: true }),

  // Visibility & Search
  isFeatured: boolean('is_featured').default(false),
  featuredUntil: timestamp('featured_until', { withTimezone: true }),
  verified: boolean('verified').default(false),
  truCheckVerified: boolean('tru_check_verified').default(false),
  mandateDocUrl: text('mandate_doc_url'),
  viewsCount: integer('views_count').default(0),
  searchVector: tsvector('search_vector'), // Full text search
  
  // Custom Identity
  shortId: varchar('short_id', { length: 20 }).unique(),
  
  // Timestamps
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
}, (table) => ({
  searchVectorIdx: index('search_vector_idx').using('gin', table.searchVector),
  shortIdIdx: index('short_id_idx').on(table.shortId),
}));

// ── Buyer Profiles Table ──
export const buyerProfiles = pgTable('buyer_profiles', {
  id: uuid('id').primaryKey().defaultRandom(),
  sessionId: varchar('session_id', { length: 255 }).notNull(),
  userId: uuid('user_id').references(() => users.id),
  budgetMin: bigint('budget_min', { mode: 'number' }),
  budgetMax: bigint('budget_max', { mode: 'number' }),
  cityPreference: varchar('city_preference', { length: 100 }),
  propertyType: text('property_type').array(),
  purpose: buyerPurposeEnum('purpose'),
  timelineMonths: smallint('timeline_months'),
  intentScore: smallint('intent_score').default(0),
  listingsViewed: uuid('listings_viewed').array(),
  shortlisted: uuid('shortlisted').array(),
  contactProvided: boolean('contact_provided').default(false),
  languagePreference: languageEnum('language_preference').default('en'),
  lastSeen: timestamp('last_seen', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

// ── Leads Table ──
export const leads = pgTable('leads', {
  id: uuid('id').primaryKey().defaultRandom(),
  buyerProfileId: uuid('buyer_profile_id').references(() => buyerProfiles.id).notNull(),
  listingId: uuid('listing_id').references(() => listings.id).notNull(),
  brokerId: uuid('broker_id').references(() => users.id).notNull(),
  status: leadStatusEnum('status').default('NEW'),
  intentScoreAtCreation: smallint('intent_score_at_creation'),
  aiSummary: text('ai_summary'),
  buyerBudgetDisplay: varchar('buyer_budget_display', { length: 100 }),
  buyerTimelineDisplay: varchar('buyer_timeline_display', { length: 100 }),
  notifiedWhatsapp: boolean('notified_whatsapp').default(false),
  notifiedEmail: boolean('notified_email').default(false),
  notifiedAt: timestamp('notified_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

// ── Subscriptions Table ──
export const subscriptions = pgTable('subscriptions', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id).notNull(),
  tier: subscriptionTierEnum('tier').notNull(),
  priceSar: integer('price_sar').notNull(),
  startedAt: timestamp('started_at', { withTimezone: true }),
  expiresAt: timestamp('expires_at', { withTimezone: true }),
  paymentReference: varchar('payment_reference', { length: 255 }),
  isActive: boolean('is_active').default(true),
});

// ── Featured Placements Table ──
export const featuredPlacements = pgTable('featured_placements', {
  id: uuid('id').primaryKey().defaultRandom(),
  listingId: uuid('listing_id').references(() => listings.id).notNull(),
  brokerId: uuid('broker_id').references(() => users.id).notNull(),
  placementType: placementTypeEnum('placement_type').notNull(),
  priceSar: integer('price_sar'),
  startsAt: timestamp('starts_at', { withTimezone: true }),
  endsAt: timestamp('ends_at', { withTimezone: true }),
  isActive: boolean('is_active').default(true),
});

// ── System Settings Table ──
export const systemSettings = pgTable('system_settings', {
  key: varchar('key', { length: 255 }).primaryKey(),
  value: text('value').notNull(),
  description: text('description'),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});


// ── News Table ──
export const news = pgTable('news', {
  id: uuid('id').primaryKey().defaultRandom(),
  titleEn: varchar('title_en', { length: 500 }).notNull(),
  titleAr: varchar('title_ar', { length: 500 }).notNull(),
  slug: varchar('slug', { length: 500 }).unique().notNull(),
  contentEn: text('content_en').notNull(),
  contentAr: text('content_ar').notNull(),
  excerptEn: text('excerpt_en'),
  excerptAr: text('excerpt_ar'),
  featuredImage: text('featured_image'),
  authorId: uuid('author_id').references(() => users.id),
  isPublished: boolean('is_published').default(false),
  publishedAt: timestamp('published_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});


// ── Favorites Table ──
export const favorites = pgTable('favorites', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id).notNull(),
  listingId: uuid('listing_id').references(() => listings.id).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
}, (table) => ({
  userListingIdx: index('user_listing_idx').on(table.userId, table.listingId),
}));


// ── Relations ──

export const usersRelations = relations(users, ({ one, many }) => ({
  brokerProfile: one(brokerProfiles, {
    fields: [users.id],
    references: [brokerProfiles.userId],
  }),
  listings: many(listings),
  firm: one(users, {
    fields: [users.firmId],
    references: [users.id],
    relationName: 'firm_agents',
  }),
  agents: many(users, {
    relationName: 'firm_agents',
  }),
  leads: many(leads),
  subscriptions: many(subscriptions),
  featuredPlacements: many(featuredPlacements),
  favorites: many(favorites),
}));

export const brokerProfilesRelations = relations(brokerProfiles, ({ one }) => ({
  user: one(users, {
    fields: [brokerProfiles.userId],
    references: [users.id],
  }),
}));

export const listingsRelations = relations(listings, ({ one, many }) => ({
  owner: one(users, {
    fields: [listings.ownerId],
    references: [users.id],
  }),
  leads: many(leads),
  featuredPlacements: many(featuredPlacements),
  favorites: many(favorites),
}));

export const favoritesRelations = relations(favorites, ({ one }) => ({
  user: one(users, {
    fields: [favorites.userId],
    references: [users.id],
  }),
  listing: one(listings, {
    fields: [favorites.listingId],
    references: [listings.id],
  }),
}));

export const leadsRelations = relations(leads, ({ one }) => ({
  buyerProfile: one(buyerProfiles, {
    fields: [leads.buyerProfileId],
    references: [buyerProfiles.id],
  }),
  listing: one(listings, {
    fields: [leads.listingId],
    references: [listings.id],
  }),
  broker: one(users, {
    fields: [leads.brokerId],
    references: [users.id],
  }),
}));

export const buyerProfilesRelations = relations(buyerProfiles, ({ one, many }) => ({
  user: one(users, {
    fields: [buyerProfiles.userId],
    references: [users.id],
  }),
  leads: many(leads),
}));

export const subscriptionsRelations = relations(subscriptions, ({ one }) => ({
  user: one(users, {
    fields: [subscriptions.userId],
    references: [users.id],
  }),
}));

export const featuredPlacementsRelations = relations(featuredPlacements, ({ one }) => ({
  listing: one(listings, {
    fields: [featuredPlacements.listingId],
    references: [listings.id],
  }),
  broker: one(users, {
    fields: [featuredPlacements.brokerId],
    references: [users.id],
  }),
}));

export const newsRelations = relations(news, ({ one }) => ({
  author: one(users, {
    fields: [news.authorId],
    references: [users.id],
  }),
}));

export const legalPages = pgTable('legal_pages', {
  id: uuid('id').defaultRandom().primaryKey(),
  slug: varchar('slug', { length: 100 }).notNull().unique(),
  titleEn: varchar('title_en', { length: 500 }).notNull(),
  titleAr: varchar('title_ar', { length: 500 }).notNull(),
  contentEn: text('content_en').notNull(),
  contentAr: text('content_ar').notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});
