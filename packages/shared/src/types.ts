// ──────────────────────────────────────────────
// TypeScript interfaces for all entities
// ──────────────────────────────────────────────

import type {
  UserRole, ListingType, ListingPurpose, ListingStatus,
  LeadStatus, SubscriptionTier, BuyerPurpose, TranslationStatus,
  PlacementType, Language, FurnishingStatus, CompletionStatus,
  VerificationStatus,
} from './constants';

export interface PropertyHistoryEvent {
  year: number;
  event: 'SOLD' | 'LISTED' | 'PRICE_DROP' | 'RENTED';
  price: number;
  date: string;
  dateDisplay?: string;
  agencyName: string | null;
  photosCount: number;
  floorplansCount: number;
  thumbnailUrl: string | null;
}

// ── User ──
export interface User {
  id: string;
  email: string;
  phone: string | null;
  role: UserRole;
  firmId: string | null;
  name: string;
  regaLicence: string | null;
  regaVerified: boolean;
  verificationStatus: VerificationStatus;
  subscriptionTier: SubscriptionTier;
  subscriptionUntil: string | null;
  avatarUrl: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// User returned from API
export type PublicUser = Omit<User, never>;

// ── Broker Profile ──
export interface BrokerProfile {
  id: string;
  userId: string;
  titleEn: string | null;
  titleAr: string | null;
  bioEn: string | null;
  bioAr: string | null;
  whatsapp: string | null;
  nationalId: string | null;
  regaLicenseNumber: string | null;
  experienceLevel: '0-2' | '3-5' | '6-10' | '10+' | null;
  languages: string[];
  serviceAreas: string[];
  gender: 'MALE' | 'FEMALE' | null;
  nationalShortAddress: string | null;
  address: string | null;
  createdAt: string;
  updatedAt: string;
}

// ── Firm & Expanded Types ──
export interface FirmWithAgents extends User {
  agents: User[];
}

export interface BrokerWithProfile extends User {
  profile: BrokerProfile | null;
  firm: Pick<User, 'id' | 'name' | 'avatarUrl'> | null;
}

// ── Listing ──
export interface Listing {
  id: string;
  ownerId: string;
  type: ListingType;
  purpose: ListingPurpose;
  status: ListingStatus;
  city: string;
  arCity: string;
  district: string | null;
  arDistrict: string | null;
  lat: number | null;
  lng: number | null;
  price: number;
  areaSqm: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  floor: number | null;
  arTitle: string;
  arDescription: string | null;
  enTitle: string | null;
  enDescription: string | null;
  translationStatus: TranslationStatus;
  photos: string[];
  amenities: Record<string, boolean>;
  foreignerEligible: boolean;
  isFreehold: boolean;
  isFeatured: boolean;
  featuredUntil: string | null;
  verified: boolean;
  regaAdvertisingLicense: string | null;
  regaFalLicense: string | null;
  regaLicenseIssueDate: string | null;
  regaLicenseExpiryDate: string | null;
  locationDescriptionDeedAr: string | null;
  propertyAge: number | null;
  furnishingStatus: FurnishingStatus | null;
  completionStatus: CompletionStatus | null;
  residenceType: 'FAMILY' | 'BACHELOR' | null;
  truCheckTimestamp: string | null;
  addedOn: string;
  bayutId: string | null;
  history: PropertyHistoryEvent[];
  mandateDocUrl: string | null;
  viewsCount: number;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

// Listing with owner details
export interface ListingWithOwner extends Listing {
  owner: Pick<User, 'id' | 'name' | 'avatarUrl' | 'phone' | 'role' | 'regaVerified'>;
}

// ── Buyer Profile ──
export interface BuyerProfile {
  id: string;
  sessionId: string;
  userId: string | null;
  budgetMin: number | null;
  budgetMax: number | null;
  cityPreference: string | null;
  propertyType: string[] | null;
  purpose: BuyerPurpose | null;
  timelineMonths: number | null;
  intentScore: number;
  listingsViewed: string[];
  shortlisted: string[];
  contactProvided: boolean;
  languagePreference: Language;
  lastSeen: string;
  createdAt: string;
}

// ── Lead ──
export interface Lead {
  id: string;
  buyerProfileId: string;
  listingId: string;
  brokerId: string;
  status: LeadStatus;
  intentScoreAtCreation: number;
  aiSummary: string | null;
  buyerBudgetDisplay: string | null;
  buyerTimelineDisplay: string | null;
  notifiedWhatsapp: boolean;
  notifiedEmail: boolean;
  notifiedAt: string | null;
  createdAt: string;
}

export interface LeadWithDetails extends Lead {
  listing: Pick<Listing, 'id' | 'arTitle' | 'enTitle' | 'city' | 'district' | 'price' | 'type' | 'photos'>;
  buyerProfile: Pick<BuyerProfile, 'budgetMin' | 'budgetMax' | 'cityPreference' | 'propertyType' | 'purpose' | 'timelineMonths' | 'intentScore'>;
}

// ── Subscription ──
export interface Subscription {
  id: string;
  userId: string;
  tier: Exclude<SubscriptionTier, 'FREE'>;
  priceSar: number;
  startedAt: string;
  expiresAt: string;
  paymentReference: string | null;
  isActive: boolean;
}

// ── API Response wrappers ──
export interface ApiSuccess<T> {
  success: true;
  data: T;
}

export interface ApiError {
  success: false;
  error: {
    code: string;
    message: string;
  };
}

export type ApiResponse<T> = ApiSuccess<T> | ApiError;

// ── Pagination ──
export interface PaginatedResponse<T> {
  items: T[];
  nextCursor: string | null;
  hasMore: boolean;
  total?: number;
}

// ── Chat ──
export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
}

export interface ChatSession {
  sessionId: string;
  messages: ChatMessage[];
  profileExtracted: boolean;
}

// ── Dashboard Stats ──
export interface BrokerDashboardStats {
  newLeadsCount: number;
  totalLeadsCount: number;
  activeListingsCount: number;
  totalViewsCount: number;
  conversionRate: number;
  subscriptionTier: SubscriptionTier;
  subscriptionDaysRemaining: number | null;
}

