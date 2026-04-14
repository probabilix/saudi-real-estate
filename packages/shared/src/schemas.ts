// ──────────────────────────────────────────────
// Zod validation schemas — shared between client & server
// ──────────────────────────────────────────────

import { z } from 'zod';
import {
  USER_ROLES, LISTING_TYPES, LISTING_PURPOSES, LISTING_STATUSES,
  LEAD_STATUSES, SUBSCRIPTION_TIERS, BUYER_PURPOSES,
  PLACEMENT_TYPES, LANGUAGES, FURNISHING_STATUSES, COMPLETION_STATUSES,
} from './constants';

// ── Auth schemas ──
export const registerSchema = z.object({
  email: z.string().email().max(255),
  password: z.string().min(8).max(128),
  name: z.string().min(1).max(255),
  role: z.enum(USER_ROLES),
  phone: z.string().regex(/^\+[1-9]\d{1,14}$/).optional(),
  regaLicence: z.string().max(100).optional(),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(8).max(128),
});

// ── Listing schemas ──
export const createListingSchema = z.object({
  type: z.enum(LISTING_TYPES),
  purpose: z.enum(LISTING_PURPOSES),
  city: z.string().min(1).max(100),
  district: z.string().max(100).optional(),
  lat: z.number().min(-90).max(90).optional(),
  lng: z.number().min(-180).max(180).optional(),
  price: z.number().int().positive(),
  areaSqm: z.number().positive().optional(),
  bedrooms: z.number().int().min(0).max(50).optional(),
  bathrooms: z.number().int().min(0).max(50).optional(),
  floor: z.number().int().optional(),
  arTitle: z.string().min(1).max(500),
  arDescription: z.string().optional(),
  enTitle: z.string().max(500).optional(),
  enDescription: z.string().optional(),
  photos: z.array(z.string().url()).min(3, 'Minimum 3 photos required'),
  amenities: z.record(z.boolean()).default({}),
  foreignerEligible: z.boolean().default(false),
  isFreehold: z.boolean().default(true),
  regaAdvertisingLicense: z.string().max(100).optional(),
  regaFalLicense: z.string().max(100).optional(),
  regaLicenseIssueDate: z.string().optional(),
  regaLicenseExpiryDate: z.string().optional(),
  locationDescriptionDeedAr: z.string().optional(),
  propertyAge: z.number().int().min(0).max(200).optional(),
  furnishingStatus: z.enum(FURNISHING_STATUSES).optional(),
  completionStatus: z.enum(COMPLETION_STATUSES).optional(),
  residenceType: z.enum(['FAMILY', 'BACHELOR']).optional().nullable(),
  truCheckTimestamp: z.string().optional().nullable(),
  addedOn: z.string().optional(),
  bayutId: z.string().max(50).optional(),
  history: z.array(z.object({
    year: z.number(),
    event: z.enum(['SOLD', 'LISTED', 'PRICE_DROP', 'RENTED']),
    price: z.number(),
    dateDisplay: z.string(),
    agencyName: z.string().nullable(),
    photosCount: z.number(),
    floorplansCount: z.number(),
    thumbnailUrl: z.string().nullable(),
  })).default([]),
});

export const updateListingSchema = createListingSchema.partial();

export const listingSearchSchema = z.object({
  city: z.string().optional(),
  type: z.enum(LISTING_TYPES).optional(),
  purpose: z.enum(LISTING_PURPOSES).optional(),
  minPrice: z.preprocess((val) => (val ? parseInt(val as string, 10) : undefined), z.number().int().positive().optional()),
  maxPrice: z.preprocess((val) => (val ? parseInt(val as string, 10) : undefined), z.number().int().positive().optional()),
  bedrooms: z.preprocess((val) => (val ? parseInt(val as string, 10) : undefined), z.number().int().min(0).optional()),
  foreignerEligible: z.preprocess((val) => val === 'true', z.boolean().optional()),
  isFeatured: z.preprocess((val) => val === 'true', z.boolean().optional()),
  lang: z.enum(['ar', 'en']).default('en'),
  cursor: z.string().optional(),
  limit: z.preprocess((val) => (val ? parseInt(val as string, 10) : 20), z.number().int().min(1).max(100).default(20)),
  q: z.string().max(200).optional(), // free text search
});

// ── Buyer profile schemas ──
export const buyerProfileSchema = z.object({
  budgetMin: z.number().int().positive().optional(),
  budgetMax: z.number().int().positive().optional(),
  cityPreference: z.string().max(100).optional(),
  propertyType: z.array(z.enum(LISTING_TYPES)).optional(),
  purpose: z.enum(BUYER_PURPOSES).optional(),
  timelineMonths: z.number().int().min(1).max(60).optional(),
  languagePreference: z.enum(LANGUAGES).default('en'),
});

// ── Broker profile schemas ──
export const brokerProfileSchema = z.object({
  titleEn: z.string().max(255).optional(),
  titleAr: z.string().max(255).optional(),
  bioEn: z.string().max(5000).optional(),
  bioAr: z.string().max(5000).optional(),
  whatsapp: z.string().regex(/^\+[1-9]\d{1,14}$/).optional(),
  nationalId: z.string().max(50).optional(),
  regaLicenseNumber: z.string().max(100).optional(),
  experienceLevel: z.enum(['0-2', '3-5', '6-10', '10+']).optional(),
  languages: z.array(z.string()).default([]),
  serviceAreas: z.array(z.string()).default([]),
  gender: z.enum(['MALE', 'FEMALE']).optional(),
  nationalShortAddress: z.string().max(255).optional(),
  address: z.string().max(500).optional(),
  avatarUrl: z.string().url().optional().nullable(),
});

export const updateBrokerProfileSchema = brokerProfileSchema.partial();

// ── Chat schemas ──
export const chatMessageSchema = z.object({
  sessionId: z.string().min(1).max(255),
  message: z.string().min(1).max(2000),
});

// ── Lead schemas ──
export const updateLeadStatusSchema = z.object({
  status: z.enum(LEAD_STATUSES),
});

// ── Upload schemas ──
export const signedUrlSchema = z.object({
  folder: z.enum(['listings', 'avatars', 'mandates']).default('listings'),
  resourceType: z.enum(['image', 'raw']).default('image'),
});

// ── Admin schemas ──
export const verifyRegaSchema = z.object({
  regaVerified: z.boolean(),
});

export const updateUserStatusSchema = z.object({
  isActive: z.boolean(),
});

export const createFeaturedPlacementSchema = z.object({
  listingId: z.string().uuid(),
  placementType: z.enum(PLACEMENT_TYPES),
  priceSar: z.number().int().positive(),
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime(),
});

// ── Create agent (by FIRM) ──
export const createAgentSchema = z.object({
  email: z.string().email().max(255),
  password: z.string().min(8).max(128),
  name: z.string().min(1).max(255),
  phone: z.string().regex(/^\+[1-9]\d{1,14}$/).optional(),
  regaLicence: z.string().max(100).optional(),
});

// Export inferred types for form usage
export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type CreateListingInput = z.infer<typeof createListingSchema>;
export type UpdateListingInput = z.infer<typeof updateListingSchema>;
export type ListingSearchInput = z.infer<typeof listingSearchSchema>;
export type BuyerProfileInput = z.infer<typeof buyerProfileSchema>;
export type ChatMessageInput = z.infer<typeof chatMessageSchema>;
export type CreateAgentInput = z.infer<typeof createAgentSchema>;
export type BrokerProfileInput = z.infer<typeof brokerProfileSchema>;
export type UpdateBrokerProfileInput = z.infer<typeof updateBrokerProfileSchema>;
