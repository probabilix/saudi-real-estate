// ──────────────────────────────────────────────
// Saudi Real Estate — Drizzle Schema Definition
// ──────────────────────────────────────────────

import { pgTable, uuid, varchar, timestamp, boolean, pgEnum, decimal, bigint, smallint, text, integer, jsonb, customType, index, foreignKey, unique } from 'drizzle-orm/pg-core';
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
export const userRoleEnum = pgEnum('user_role', ['ADMIN', 'FIRM', 'AGENT', 'SOLO_BROKER', 'OWNER', 'BUYER', 'SALES_AGENT']);
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
export const leadStatusEnum = pgEnum('lead_status', [
  'NEW',
  'VIEWED',
  'CONTACTED',
  'ATTEMPTED_CONTACT',
  'AGENT_CONTACTED',
  'SITE_VISIT_SCHEDULED',
  'PROPERTY_VIEWING',
  'OFFER_SUBMITTED',
  'CLOSED_WON',
  'CLOSED_LOST',
  'AI_DISQUALIFIED'
]);
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
export const senderTypeEnum = pgEnum('sender_type', ['USER', 'ASSISTANT']);
export const chatTypeEnum = pgEnum('chat_type', ['GENERAL', 'LISTING']);

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
  isReapplied: boolean('is_reapplied').default(false),
  subscriptionTier: subscriptionTierEnum('subscription_tier').default('FREE'),
  subscriptionUntil: timestamp('subscription_until', { withTimezone: true }),
  avatarUrl: text('avatar_url'),
  verificationStatus: verificationStatusEnum('verification_status').default('UNVERIFIED'),
  isActive: boolean('is_active').default(true),
  creditsBalance: integer('credits_balance').default(0),
  rating: decimal('rating', { precision: 3, scale: 2 }).default('0'),
  reviewCount: integer('review_count').default(0),
  // Personal profile fields — available to ALL user roles (buyer, broker, owner, etc.)
  gender: varchar('gender', { length: 10 }),
  nationality: varchar('nationality', { length: 100 }),
  city: varchar('city', { length: 100 }),
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
  nationality: varchar('nationality', { length: 100 }),
  city: varchar('city', { length: 100 }),
  
  // Timestamps
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

// ── Projects Table ──
export const projects = pgTable('projects', {
  id: uuid('id').primaryKey().defaultRandom(),
  nameEn: varchar('name_en', { length: 255 }).notNull(),
  nameAr: varchar('name_ar', { length: 255 }).notNull(),
  descriptionEn: text('description_en'),
  descriptionAr: text('description_ar'),
  city: varchar('city', { length: 100 }).notNull(),
  district: varchar('district', { length: 100 }),
  mapEmbedUrl: text('map_embed_url'),

  // ── Project-level shared fields (uploaded once, inherited by all layouts) ──
  brochureUrl: text('brochure_url'),
  regaFalLicense: varchar('rega_fal_license', { length: 100 }),
  amenities: jsonb('amenities').default({}),
  photos: text('photos').array().default(sql`'{}'::text[]`),
  completionStatus: completionStatusEnum('completion_status'),
  expectedDelivery: varchar('expected_delivery', { length: 50 }),
  totalUnits: integer('total_units'),

  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  isFeatured: boolean('is_featured').default(false),
  featuredOrder: integer('featured_order').default(0),
});

// ── Listings Table ──
export const listings = pgTable('listings', {
  id: uuid('id').primaryKey().defaultRandom(),
  ownerId: uuid('owner_id').references(() => users.id).notNull(),
  projectId: uuid('project_id').references(() => projects.id, { onDelete: 'set null' }),
  type: listingTypeEnum('type').notNull(),
  purpose: listingPurposeEnum('purpose').notNull(),
  status: listingStatusEnum('status').default('DRAFT'),
  
  // Location
  city: varchar('city', { length: 100 }).notNull(),
  district: varchar('district', { length: 100 }),
  arCity: varchar('ar_city', { length: 100 }),
  arDistrict: varchar('ar_district', { length: 100 }),
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
  brochureUrl: text('brochure_url'), // Cloudinary PDF Brochure link
  mapEmbedUrl: text('map_embed_url'), // Interactive Google Maps Embed link/HTML
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
  featuredOrder: integer('featured_order').default(0),
  verified: boolean('verified').default(false),
  truCheckVerified: boolean('tru_check_verified').default(false),
  aiQualificationActive: boolean('ai_qualification_active').default(true),
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

// ── Project Units Table ──
export const projectUnits = pgTable('project_units', {
  id: uuid('id').primaryKey().defaultRandom(),
  projectId: uuid('project_id').references(() => projects.id, { onDelete: 'cascade' }).notNull(),
  listingId: uuid('listing_id').references(() => listings.id, { onDelete: 'cascade' }),
  unitNumber: varchar('unit_number', { length: 50 }).notNull(),
  floor: smallint('floor').notNull(),
  type: varchar('type', { length: 50 }).notNull(), // e.g. '3BHK', '4BHK', 'Studio', 'Penthouse'
  status: varchar('status', { length: 50 }).default('AVAILABLE').notNull(), // 'AVAILABLE', 'RESERVED', 'SOLD'
  price: bigint('price', { mode: 'number' }), // Specific price override for this unit
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

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
  lastAiSummary: text('last_ai_summary'),
  summaryUpdatedAt: timestamp('summary_updated_at', { withTimezone: true }),

  // ── New qualification preference fields (collected by AI before qualifying) ──
  completionStatusPreference: varchar('completion_status_preference', { length: 50 }),
  // Values: 'READY' | 'OFF_PLAN' | null (not yet specified)
  districtPreference: varchar('district_preference', { length: 100 }),
  // Specific district within city, e.g. 'Al Malqa', 'Hittin'

  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

// ── Chat Messages Table ──
export const chatMessages = pgTable('chat_messages', {
  id: uuid('id').primaryKey().defaultRandom(),
  buyerProfileId: uuid('buyer_profile_id').references(() => buyerProfiles.id).notNull(),
  sender: senderTypeEnum('sender').notNull(),
  content: text('content').notNull(),
  chatType: chatTypeEnum('chat_type').default('LISTING').notNull(),

  // ── Property context tagging (fixes CRM mixed chat history bug) ──
  // listingId: set when buyer is on a specific layout/listing page
  // projectId: set for both project-page chats AND layout-page chats (if listing belongs to a project)
  listingId: uuid('listing_id').references(() => listings.id, { onDelete: 'set null' }),
  projectId: uuid('project_id').references(() => projects.id, { onDelete: 'set null' }),

  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
}, (table) => ({
  buyerProfileIdx: index('chat_msg_buyer_profile_idx').on(table.buyerProfileId),
  listingIdx: index('chat_msg_listing_idx').on(table.listingId),
  projectIdx: index('chat_msg_project_idx').on(table.projectId),
}));

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
  isQualified: boolean('is_qualified').default(false),
  notifiedWhatsapp: boolean('notified_whatsapp').default(false),
  notifiedEmail: boolean('notified_email').default(false),
  notifiedAt: timestamp('notified_at', { withTimezone: true }),

  // ── Project linkage (for project-level leads) ──
  projectId: uuid('project_id').references(() => projects.id, { onDelete: 'set null' }),

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

// ── News Favorites Table ──
export const newsFavorites = pgTable('news_favorites', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id).notNull(),
  newsId: uuid('news_id').references(() => news.id).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
}, (table) => ({
  userNewsIdx: index('user_news_idx').on(table.userId, table.newsId),
}));

// ── Project Favorites Table ──
export const projectFavorites = pgTable('project_favorites', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id).notNull(),
  projectId: uuid('project_id').references(() => projects.id).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
}, (table) => ({
  userProjectIdx: index('user_project_idx').on(table.userId, table.projectId),
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
  newsFavorites: many(newsFavorites),
  projectFavorites: many(projectFavorites),
}));

export const brokerProfilesRelations = relations(brokerProfiles, ({ one }) => ({
  user: one(users, {
    fields: [brokerProfiles.userId],
    references: [users.id],
  }),
}));

export const projectsRelations = relations(projects, ({ many }) => ({
  listings: many(listings),
  units: many(projectUnits),
  projectFavorites: many(projectFavorites),
}));

export const listingsRelations = relations(listings, ({ one, many }) => ({
  owner: one(users, {
    fields: [listings.ownerId],
    references: [users.id],
  }),
  project: one(projects, {
    fields: [listings.projectId],
    references: [projects.id],
  }),
  units: many(projectUnits),
  leads: many(leads),
  featuredPlacements: many(featuredPlacements),
  favorites: many(favorites),
}));

export const projectUnitsRelations = relations(projectUnits, ({ one }) => ({
  project: one(projects, {
    fields: [projectUnits.projectId],
    references: [projects.id],
  }),
  listing: one(listings, {
    fields: [projectUnits.listingId],
    references: [listings.id],
  }),
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

export const newsFavoritesRelations = relations(newsFavorites, ({ one }) => ({
  user: one(users, {
    fields: [newsFavorites.userId],
    references: [users.id],
  }),
  news: one(news, {
    fields: [newsFavorites.newsId],
    references: [news.id],
  }),
}));

export const projectFavoritesRelations = relations(projectFavorites, ({ one }) => ({
  user: one(users, {
    fields: [projectFavorites.userId],
    references: [users.id],
  }),
  project: one(projects, {
    fields: [projectFavorites.projectId],
    references: [projects.id],
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
  project: one(projects, {
    fields: [leads.projectId],
    references: [projects.id],
  }),
}));

export const buyerProfilesRelations = relations(buyerProfiles, ({ one, many }) => ({
  user: one(users, {
    fields: [buyerProfiles.userId],
    references: [users.id],
  }),
  leads: many(leads),
  chatMessages: many(chatMessages),
}));

export const chatMessagesRelations = relations(chatMessages, ({ one }) => ({
  buyerProfile: one(buyerProfiles, {
    fields: [chatMessages.buyerProfileId],
    references: [buyerProfiles.id],
  }),
  listing: one(listings, {
    fields: [chatMessages.listingId],
    references: [listings.id],
  }),
  project: one(projects, {
    fields: [chatMessages.projectId],
    references: [projects.id],
  }),
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

export const newsRelations = relations(news, ({ one, many }) => ({
  author: one(users, {
    fields: [news.authorId],
    references: [users.id],
  }),
  userFavorites: many(newsFavorites),
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

// ── FAQs Table (Saudi RE Premium Settings) ──
export const faqs = pgTable('faqs', {
  id: uuid('id').defaultRandom().primaryKey(),
  questionEn: text('question_en').notNull(),
  questionAr: text('question_ar').notNull(),
  answerEn: text('answer_en').notNull(),
  answerAr: text('answer_ar').notNull(),
  order: integer('order').default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

// ── Contact Submissions Table ──
export const contactSubmissions = pgTable('contact_submissions', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  email: varchar('email', { length: 255 }).notNull(),
  message: text('message').notNull(),
  isReplied: boolean('is_replied').default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

// ── Mortgage Calculator Tables ──

export const mortgageBanks = pgTable('mortgage_banks', {
  id: uuid('id').primaryKey().defaultRandom(),
  slug: varchar('slug', { length: 100 }).unique().notNull(),
  externalId: varchar('external_id', { length: 50 }).notNull(),
  nameEn: varchar('name_en', { length: 255 }).notNull(),
  nameAr: varchar('name_ar', { length: 255 }).notNull(),
  isActive: boolean('is_active').default(true).notNull(),
});

export const mortgageBankRates = pgTable('mortgage_bank_rates', {
  id: uuid('id').primaryKey().defaultRandom(),
  bankId: uuid('bank_id').references(() => mortgageBanks.id, { onDelete: 'cascade' }).notNull(),
  loanPeriodYears: integer('loan_period_years').notNull(),
  annualRatePct: decimal('annual_rate_pct', { precision: 5, scale: 2 }).notNull(),
}, (table) => ({
  bankYearIdx: index('bank_year_idx').on(table.bankId, table.loanPeriodYears),
  unq: unique('unique_bank_year').on(table.bankId, table.loanPeriodYears),
}));

export const mortgageLeads = pgTable('mortgage_leads', {
  id: uuid('id').primaryKey().defaultRandom(),
  fullName: varchar('full_name', { length: 255 }).notNull(),
  phoneNumber: varchar('phone_number', { length: 50 }).notNull(),
  monthlyIncome: decimal('monthly_income', { precision: 12, scale: 2 }),
  redfSupported: boolean('redf_supported').default(true),
  monthlyObligations: decimal('monthly_obligations', { precision: 12, scale: 2 }),
  propertyExternalId: varchar('property_external_id', { length: 100 }).notNull(),
  propertyPrice: decimal('property_price', { precision: 12, scale: 2 }).notNull(),
  isCitizen: boolean('is_citizen').notNull(),
  isFirstHome: boolean('is_first_home'),
  downPaymentAmount: decimal('down_payment_amount', { precision: 12, scale: 2 }).notNull(),
  loanPeriodYears: integer('loan_period_years').notNull(),
  bankSlug: varchar('bank_slug', { length: 100 }).notNull(),
  bankNameEn: varchar('bank_name_en', { length: 255 }).notNull(),
  appliedRatePct: decimal('applied_rate_pct', { precision: 5, scale: 2 }).notNull(),
  monthlyInstalment: decimal('monthly_instalment', { precision: 12, scale: 2 }).notNull(),
  totalPayableValue: decimal('total_payable_value', { precision: 12, scale: 2 }).notNull(),
  totalLoanAmount: decimal('total_loan_amount', { precision: 12, scale: 2 }).notNull(),
  status: varchar('status', { length: 50 }).default('new').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const mortgageBanksRelations = relations(mortgageBanks, ({ many }) => ({
  rates: many(mortgageBankRates),
}));

export const mortgageBankRatesRelations = relations(mortgageBankRates, ({ one }) => ({
  bank: one(mortgageBanks, {
    fields: [mortgageBankRates.bankId],
    references: [mortgageBanks.id],
  }),
}));



// ─────────────────────────────────────────────────────────────
// ── CRM Module Tables ──
// SEPARATE from the existing `leads` table (website AI-qualified leads).
// crm_leads       = external campaign leads (Meta, Snapchat, TikTok, Manual)
// crm_notes       = polymorphic notes (shared by website AND campaign leads)
// crm_activities  = polymorphic audit trail
// crm_followups   = polymorphic scheduled tasks
// ─────────────────────────────────────────────────────────────

export const crmLeadSourceEnum = pgEnum('crm_lead_source', [
  'META_ADS', 'SNAPCHAT', 'TIKTOK', 'WHATSAPP', 'MANUAL',
]);

export const crmLeadStatusEnum = pgEnum('crm_lead_status', [
  'NEW',
  'ATTEMPTED_CONTACT',
  'CONTACTED',
  'SITE_VISIT_SCHEDULED',
  'PROPERTY_VIEWING',
  'OFFER_SUBMITTED',
  'CLOSED_WON',
  'CLOSED_LOST',
]);

export const crmActivityTypeEnum = pgEnum('crm_activity_type', [
  'CREATED',
  'STATUS_CHANGE',
  'ASSIGNED',
  'NOTE_ADDED',
  'FOLLOWUP_SCHEDULED',
  'FOLLOWUP_COMPLETED',
  'WHATSAPP_CONTACT',
  'SCORE_UPDATED',
]);

export const crmLeadTypeEnum = pgEnum('crm_lead_type', ['WEBSITE', 'CAMPAIGN']);

// ── Campaign Leads Table ──
export const crmLeads = pgTable('crm_leads', {
  id: uuid('id').primaryKey().defaultRandom(),
  source: crmLeadSourceEnum('source').notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  phone: varchar('phone', { length: 30 }).notNull(),
  email: varchar('email', { length: 255 }),
  cityPreference: varchar('city_preference', { length: 100 }),
  propertyInterest: varchar('property_interest', { length: 100 }),
  status: crmLeadStatusEnum('status').default('NEW').notNull(),
  leadScore: smallint('lead_score').default(0), // 0-5 manual agent rating
  assignedAgentId: uuid('assigned_agent_id').references(() => users.id),
  campaignDetails: jsonb('campaign_details'), // ad_id, campaign_name, ad_set_name, form_id
  isDuplicate: boolean('is_duplicate').default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
}, (table) => ({
  phoneIdx:  index('crm_lead_phone_idx').on(table.phone),
  sourceIdx: index('crm_lead_source_idx').on(table.source),
  statusIdx: index('crm_lead_status_idx').on(table.status),
  agentIdx:  index('crm_lead_agent_idx').on(table.assignedAgentId),
}));

// ── CRM Notes (polymorphic — website AND campaign leads) ──
export const crmNotes = pgTable('crm_notes', {
  id: uuid('id').primaryKey().defaultRandom(),
  leadId: uuid('lead_id').notNull(),           // refs leads.id OR crm_leads.id
  leadType: crmLeadTypeEnum('lead_type').notNull(),
  agentId: uuid('agent_id').references(() => users.id),
  content: text('content').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
}, (table) => ({
  leadIdx: index('crm_note_lead_idx').on(table.leadId, table.leadType),
}));

// ── CRM Activities (polymorphic audit trail) ──
export const crmActivities = pgTable('crm_activities', {
  id: uuid('id').primaryKey().defaultRandom(),
  leadId: uuid('lead_id').notNull(),
  leadType: crmLeadTypeEnum('lead_type').notNull(),
  performedById: uuid('performed_by_id').references(() => users.id),
  activityType: crmActivityTypeEnum('activity_type').notNull(),
  metadata: jsonb('metadata'), // { from: 'NEW', to: 'CONTACTED' } etc.
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
}, (table) => ({
  leadIdx: index('crm_activity_lead_idx').on(table.leadId, table.leadType),
}));

// ── CRM Follow-ups (polymorphic scheduled tasks) ──
export const crmFollowups = pgTable('crm_followups', {
  id: uuid('id').primaryKey().defaultRandom(),
  leadId: uuid('lead_id').notNull(),
  leadType: crmLeadTypeEnum('lead_type').notNull(),
  agentId: uuid('agent_id').references(() => users.id),
  scheduledAt: timestamp('scheduled_at', { withTimezone: true }).notNull(),
  note: text('note'),
  isCompleted: boolean('is_completed').default(false),
  completedAt: timestamp('completed_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
}, (table) => ({
  leadIdx:      index('crm_followup_lead_idx').on(table.leadId, table.leadType),
  scheduledIdx: index('crm_followup_sched_idx').on(table.scheduledAt),
}));

// ── CRM Relations ──
export const crmLeadsRelations = relations(crmLeads, ({ one }) => ({
  assignedAgent: one(users, {
    fields: [crmLeads.assignedAgentId],
    references: [users.id],
  }),
}));

// ── Property/Listing Reports Table ──
export const listingReports = pgTable('listing_reports', {
  id: uuid('id').primaryKey().defaultRandom(),
  listingId: uuid('listing_id').references(() => listings.id, { onDelete: 'cascade' }).notNull(),
  reason: varchar('reason', { length: 255 }).notNull(),
  reporterName: varchar('reporter_name', { length: 255 }).notNull(),
  reporterEmail: varchar('reporter_email', { length: 255 }).notNull(),
  description: text('description'),
  status: varchar('status', { length: 50 }).default('PENDING').notNull(), // 'PENDING', 'RESOLVED', 'DISMISSED'
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const listingReportsRelations = relations(listingReports, ({ one }) => ({
  listing: one(listings, {
    fields: [listingReports.listingId],
    references: [listings.id],
  }),
}));





