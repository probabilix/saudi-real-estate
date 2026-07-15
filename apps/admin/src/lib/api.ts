// ──────────────────────────────────────────────
// Admin API Client
// ──────────────────────────────────────────────

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('adminToken');
}

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<{ success: boolean; data?: T; message?: string; error?: string }> {
  try {
    const token = getToken();
    const headers: Record<string, string> = {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...(options.headers as Record<string, string> || {}),
    };

    const res = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers,
      credentials: 'include',
    });

    const json = await res.json();

    // If 401, clear token and redirect to login
    if (res.status === 401 && typeof window !== 'undefined') {
      localStorage.removeItem('adminToken');
      window.location.href = '/login';
    }

    return json;
  } catch (err: any) {
    console.error(`Admin API Error requesting ${path}:`, err);
    return {
      success: false,
      error: err?.message || 'Network error occurred',
    };
  }
}

// ── Auth ──
export const adminApi = {
  request: request,
  // Auth
  login: (email: string, password: string) =>
    request<{ accessToken: string; user: { id: string; name: string; role: string; email: string } }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  getMe: () =>
    request<{ user: { id: string; name: string; role: string; email: string } }>('/auth/me'),

  logout: () => request('/auth/logout', { method: 'POST' }),

  // ── Platform Stats (Admin) ──
  getStats: () => request<AdminStats>('/admin/stats'),

  // ── Users ──
  getUsers: (params?: { role?: string; status?: string; search?: string; page?: number; limit?: number; hasLicense?: string }) => {
    const q = new URLSearchParams();
    if (params?.role) q.set('role', params.role);
    if (params?.status) q.set('status', params.status);
    if (params?.search) q.set('search', params.search);
    if (params?.page) q.set('page', String(params.page));
    if (params?.limit) q.set('limit', String(params.limit));
    if (params?.hasLicense) q.set('hasLicense', params.hasLicense);
    return request<{ users: AdminUser[]; total: number; page: number }>(`/admin/users?${q}`);
  },

  approveUser: (userId: string) =>
    request(`/admin/users/${userId}/approve`, { method: 'POST' }),

  rejectUser: (userId: string) =>
    request(`/admin/users/${userId}/reject`, { method: 'POST' }),

  suspendUser: (userId: string) =>
    request(`/admin/users/${userId}/suspend`, { method: 'POST' }),

  updateUserCredits: (userId: string, credits: number) =>
    request(`/admin/users/${userId}/credits`, {
      method: 'PATCH',
      body: JSON.stringify({ credits }),
    }),

  updateUserSubscription: (userId: string, tier: string) =>
    request(`/admin/users/${userId}/subscription`, {
      method: 'PATCH',
      body: JSON.stringify({ tier }),
    }),

  createUser: (data: { name: string; email: string; phone?: string; role: string; password?: string; regaLicence?: string }) =>
    request<AdminUser>('/admin/users', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateUser: (userId: string, data: { name?: string; phone?: string; role?: string; password?: string; regaLicence?: string }) =>
    request<AdminUser>(`/admin/users/${userId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  // ── Listings ──
  getListings: (params?: { status?: string; isFeatured?: boolean; page?: number; limit?: number; search?: string }) => {
    const q = new URLSearchParams();
    if (params?.status) q.set('status', params.status);
    if (params?.isFeatured !== undefined) q.set('isFeatured', String(params.isFeatured));
    if (params?.page) q.set('page', String(params.page));
    if (params?.limit) q.set('limit', String(params.limit));
    if (params?.search) q.set('search', params.search);
    return request<{ listings: AdminListing[]; total: number; page: number }>(`/admin/listings?${q}`);
  },

  updateListingStatus: (listingId: string, status: string) =>
    request(`/admin/listings/${listingId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }),

  featureListing: (listingId: string, days?: number, featuredUntil?: string | null) =>
    request(`/admin/listings/${listingId}/feature`, {
      method: 'POST',
      body: JSON.stringify({ days, featuredUntil: featuredUntil === undefined ? undefined : (featuredUntil || null) }),
    }),

  unfeatureListing: (listingId: string) =>
    request(`/admin/listings/${listingId}/feature`, {
      method: 'DELETE',
    }),

  deleteListing: (listingId: string) =>
    request(`/admin/listings/${listingId}`, {
      method: 'DELETE',
    }),

  updateFeaturedOrder: (listingId: string, featuredOrder: number) =>
    request(`/admin/listings/${listingId}/featured-order`, {
      method: 'PATCH',
      body: JSON.stringify({ featuredOrder }),
    }),

  updateFeaturedExpiry: (listingId: string, featuredUntil: string | null) =>
    request(`/admin/listings/${listingId}/featured-expiry`, {
      method: 'PATCH',
      body: JSON.stringify({ featuredUntil }),
    }),

  toggleListingAI: (listingId: string, aiQualificationActive: boolean) =>
    request(`/admin/listings/${listingId}/toggle-ai`, {
      method: 'PATCH',
      body: JSON.stringify({ aiQualificationActive }),
    }),

  // ── Settings ──
  getAllSettings: () => request<SystemSetting[]>('/admin/settings'),

  updateSetting: (key: string, value: string) =>
    request(`/admin/settings/${key}`, {
      method: 'PUT',
      body: JSON.stringify({ value }),
    }),

  // ── News ──
  getAllNews: () => request<NewsPost[]>('/admin/news'),
  createNews: (data: Partial<NewsPost>) =>
    request('/admin/news', { method: 'POST', body: JSON.stringify(data) }),
  updateNews: (id: string, data: Partial<NewsPost>) =>
    request(`/admin/news/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteNews: (id: string) =>
    request(`/admin/news/${id}`, { method: 'DELETE' }),

  // ── FAQs ──
  getAllFaqs: () => request<AdminFaq[]>('/system/faqs'),
  createFaq: (data: Partial<AdminFaq>) =>
    request('/system/faqs', { method: 'POST', body: JSON.stringify(data) }),
  updateFaq: (id: string, data: Partial<AdminFaq>) =>
    request(`/system/faqs/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteFaq: (id: string) =>
    request(`/system/faqs/${id}`, { method: 'DELETE' }),

  // ── Legal Pages ──
  getLegalPages: () => request<LegalPage[]>('/admin/legal'),
  updateLegalPage: (slug: string, data: Partial<LegalPage>) =>
    request(`/admin/legal/${slug}`, { method: 'PUT', body: JSON.stringify(data) }),

  // ── Contact Submissions (Inbox) ──
  getAllSubmissions: () => request<ContactSubmission[]>('/admin/contact-submissions'),
  toggleSubmissionReplied: (id: string) =>
    request<ContactSubmission>(`/admin/contact-submissions/${id}/toggle`, {
      method: 'PATCH',
    }),
  deleteSubmission: (id: string) =>
    request(`/admin/contact-submissions/${id}`, {
      method: 'DELETE',
    }),

  // ── Leads & CRM ──
  getLeads: (params?: { status?: string; isQualified?: boolean; search?: string; page?: number; limit?: number }) => {
    const q = new URLSearchParams();
    if (params?.status) q.set('status', params.status);
    if (params?.isQualified !== undefined) q.set('isQualified', String(params.isQualified));
    if (params?.search) q.set('search', params.search);
    if (params?.page) q.set('page', String(params.page));
    if (params?.limit) q.set('limit', String(params.limit));
    return request<{ leads: AdminLead[]; total: number; page: number; stats: AdminLeadStats }>(`/admin/leads?${q}`);
  },

  getLeadChatHistory: (leadId: string) =>
    request<AdminChatMessage[]>(`/admin/leads/${leadId}/chat-history`),

  updateLeadStatus: (leadId: string, status: string) =>
    request(`/admin/leads/${leadId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }),

  // ── Projects & Inventory Units ──
  getProjects: () => request<AdminProject[]>('/listings/projects'),
  getProjectDetails: (id: string) =>
    request<{ project: AdminProject; layouts: AdminListing[] }>(`/listings/projects/${id}`),
  updateProject: (id: string, data: Partial<AdminProject>) =>
    request<{ success: boolean; data: AdminProject }>(`/listings/projects/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  patchProject: (id: string, data: Partial<AdminProject>) =>
    request<{ success: boolean; data: AdminProject }>(`/listings/projects/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
  createProject: (data: { nameEn: string; nameAr: string; descriptionEn?: string; descriptionAr?: string; city: string; district?: string; mapEmbedUrl?: string }) =>
    request<AdminProject>('/listings/projects', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  createProjectBulk: (data: {
    project: {
      nameEn: string;
      nameAr: string;
      city: string;
      district?: string;
      descriptionEn?: string;
      descriptionAr?: string;
      brochureUrl?: string;
      regaFalLicense?: string;
      amenities?: Record<string, boolean>;
      photos?: string[];
      completionStatus?: 'READY' | 'OFF_PLAN' | 'UNDER_CONSTRUCTION';
      expectedDelivery?: string;
      totalUnits?: number;
      mapEmbedUrl?: string;
    };
    layouts: Array<{
      labelEn: string;
      labelAr: string;
      price: number;
      areaSqm?: number;
      bedrooms?: number;
      bathrooms?: number;
      photos?: string[];
      completionStatus?: 'READY' | 'OFF_PLAN' | 'UNDER_CONSTRUCTION';
      descriptionEn?: string;
      descriptionAr?: string;
    }>;
    ownerId?: string;
  }) =>
    request<{ success: boolean; data: { project: AdminProject; listings: any[] } }>('/listings/projects/bulk', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  getListingUnits: (listingId: string) =>
    request<AdminProjectUnit[]>(`/listings/${listingId}/units`),
  addListingUnits: (listingId: string, units: Array<{ unitNumber: string; floor: number; type: string; status?: string; price?: number }>) =>
    request<AdminProjectUnit[]>(`/listings/${listingId}/units`, {
      method: 'POST',
      body: JSON.stringify({ units }),
    }),
  updateListingUnit: (listingId: string, unitId: string, data: { unitNumber?: string; floor?: number; type?: string; status?: string; price?: number | null }) =>
    request<AdminProjectUnit>(`/listings/${listingId}/units/${unitId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  deleteListingUnit: (listingId: string, unitId: string) =>
    request(`/listings/${listingId}/units/${unitId}`, {
      method: 'DELETE',
    }),

  // ── Mortgage Leads ──
  getMortgageLeads: (params?: {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
    bank?: string;
    isCitizen?: string;
    dateStart?: string;
    dateEnd?: string;
  }) => {
    const q = new URLSearchParams();
    if (params?.page) q.set('page', String(params.page));
    if (params?.limit) q.set('limit', String(params.limit));
    if (params?.search) q.set('search', params.search);
    if (params?.status) q.set('status', params.status);
    if (params?.bank) q.set('bank', params.bank);
    if (params?.isCitizen) q.set('isCitizen', params.isCitizen);
    if (params?.dateStart) q.set('dateStart', params.dateStart);
    if (params?.dateEnd) q.set('dateEnd', params.dateEnd);
    return request<{ leads: AdminMortgageLead[]; pagination: { total: number; page: number; limit: number; totalPages: number } }>(`/admin/mortgage-leads?${q}`);
  },

  getMortgageLead: (id: string) =>
    request<AdminMortgageLead>(`/admin/mortgage-leads/${id}`),

  updateMortgageLeadStatus: (id: string, status?: string, notes?: string) =>
    request<AdminMortgageLead>(`/admin/mortgage-leads/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status, notes }),
    }),

  getCalculatorLeads: () =>
    request<any[]>('/mortgage/calculator-leads'),

  updateCalculatorLeadStatus: (userId: string, status?: string, notes?: string) =>
    request<any>(`/mortgage/calculator-leads/${userId}`, {
      method: 'PATCH',
      body: JSON.stringify({ status, notes }),
    }),

  // ── Reported Properties ──
  getReportedProperties: () =>
    request<AdminReportedProperty[]>('/admin/reported-properties'),

  getListingReports: (listingId: string) =>
    request<AdminPropertyReport[]>(`/admin/reported-properties/${listingId}/reports`),

  updateReportsStatus: (listingId: string, status: string) =>
    request<{ success: boolean; message: string }>(`/admin/reported-properties/${listingId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }),

  deleteProject: (projectId: string) =>
    request(`/admin/projects/${projectId}`, {
      method: 'DELETE',
    }),

  // ── Credit Packages CRUD ──
  getCreditPackages: () => request<CreditPackage[]>('/admin/credit-packages'),
  createCreditPackage: (data: Partial<CreditPackage>) =>
    request<CreditPackage>('/admin/credit-packages', { method: 'POST', body: JSON.stringify(data) }),
  updateCreditPackage: (id: string, data: Partial<CreditPackage>) =>
    request<CreditPackage>(`/admin/credit-packages/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),

  // ── Credit Orders ──
  getCreditOrders: (params?: { status?: string; page?: number; brokerId?: string; limit?: number }) => {
    const q = new URLSearchParams();
    if (params?.status) q.set('status', params.status);
    if (params?.page) q.set('page', String(params.page));
    if (params?.brokerId) q.set('brokerId', params.brokerId);
    if (params?.limit) q.set('limit', String(params.limit));
    return request<{ data: AdminCreditOrder[]; total: number }>(`/admin/credit-orders?${q}`);
  },
  getCreditOrderDetails: (id: string) =>
    request<AdminCreditOrder & { metadata?: any; brokerPhone?: string; packageNameAr?: string }>(`/admin/credit-orders/${id}`),

  // ── Broker Credits Info & Allocation ──
  getBrokerCredits: (brokerId: string) =>
    request<BrokerCreditsDetail>(`/admin/brokers/${brokerId}/credits`),
  grantCredits: (brokerId: string, amount: number, description?: string) =>
    request(`/admin/brokers/${brokerId}/credits/grant`, {
      method: 'POST',
      body: JSON.stringify({ amount, description }),
    }),
};

export interface ContactSubmission {
  id: string;
  name: string;
  email: string;
  message: string;
  isReplied: boolean;
  createdAt: string;
}

export interface AdminStats {
  totalUsers: number;
  totalListings: number;
  activeListings: number;
  pendingVerifications: number;
  totalRevenueSar: number;
  newUsersToday: number;
  newListingsToday: number;
  platformHealth: 'healthy' | 'warning' | 'critical';
  usersByRole: Record<string, number>;
  listingsByStatus: Record<string, number>;
  listingsByCity: Record<string, number>;
  revenueByMonth: Array<{ month: string; revenue: number }>;
}

export interface AdminUser {
  id: string;
  name: string | null;
  email: string;
  role: string;
  phone: string | null;
  isActive: boolean;
  verificationStatus: string;
  regaLicence: string | null;
  regaVerified: boolean;
  isReapplied: boolean;
  subscriptionTier: string;
  creditsBalance: number;
  createdAt: string;
  listingCount?: number;
  projectCount?: number;
  gender?: string | null;
  nationality?: string | null;
  city?: string | null;
  bioEn?: string | null;
  bioAr?: string | null;
}

export interface AdminListing {
  id: string;
  shortId: string | null;
  arTitle: string;
  enTitle: string | null;
  city: string;
  type: string;
  purpose: string;
  status: string;
  price: number;
  isFeatured: boolean;
  featuredUntil: string | null;
  featuredOrder: number;
  verified: boolean;
  regaAdvertisingLicense: string | null;
  viewsCount: number;
  createdAt: string;
  owner: { id: string; name: string | null; email: string; role: string } | null;
  aiQualificationActive?: boolean;
  projectId?: string | null;
  foreignerEligible?: boolean;
  muslimOnly?: boolean;
}

export interface SystemSetting {
  key: string;
  value: string;
  description: string | null;
  updatedAt: string;
}

export interface NewsPost {
  id: string;
  titleEn: string;
  titleAr: string;
  slug: string;
  contentEn: string;
  contentAr: string;
  excerptEn: string | null;
  excerptAr: string | null;
  featuredImage: string | null;
  isPublished: boolean;
  publishedAt: string | null;
  createdAt: string;
}

export interface LegalPage {
  id: string;
  slug: string;
  titleEn: string;
  titleAr: string;
  contentEn: string;
  contentAr: string;
  updatedAt: string;
}

export interface AdminFaq {
  id: string;
  questionEn: string;
  questionAr: string;
  answerEn: string;
  answerAr: string;
  order: number;
  createdAt: string;
  updatedAt: string;
}

export interface AdminLead {
  id: string;
  buyerProfileId: string;
  listingId: string;
  brokerId: string;
  status: 'NEW' | 'VIEWED' | 'CONTACTED' | 'CLOSED_WON' | 'CLOSED_LOST';
  intentScoreAtCreation: number | null;
  aiSummary: string | null;
  buyerBudgetDisplay: string | null;
  buyerTimelineDisplay: string | null;
  isQualified: boolean;
  notifiedWhatsapp: boolean;
  notifiedEmail: boolean;
  notifiedAt: string | null;
  createdAt: string;
  listing: {
    id: string;
    shortId: string | null;
    arTitle: string;
    enTitle: string | null;
    price: number;
    city: string;
  } | null;
  buyer: {
    id: string;
    sessionId: string;
    intentScore: number;
    lastAiSummary: string | null;
    name: string | null;
    email: string | null;
    phone: string | null;
  } | null;
  broker: {
    id: string;
    name: string | null;
    email: string;
    phone: string | null;
  } | null;
}

export interface AdminLeadStats {
  totalLeads: number;
  qualifiedLeads: number;
  conversionRate: number;
  avgIntentScore: number;
}

export interface AdminChatMessage {
  id: string;
  buyerProfileId: string;
  sender: 'USER' | 'ASSISTANT';
  content: string;
  createdAt: string;
}

export interface AdminProject {
  id: string;
  nameEn: string;
  nameAr: string;
  descriptionEn: string | null;
  descriptionAr: string | null;
  city: string;
  district: string | null;
  mapEmbedUrl: string | null;
  brochureUrl?: string | null;
  regaFalLicense?: string | null;
  amenities?: Record<string, boolean> | null;
  photos?: string[] | null;
  completionStatus?: 'READY' | 'OFF_PLAN' | 'UNDER_CONSTRUCTION' | null;
  expectedDelivery?: string | null;
  totalUnits?: number | null;
  isFeatured?: boolean;
  featuredOrder?: number;
  foreignerEligible?: boolean;
  muslimOnly?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AdminProjectUnit {
  id: string;
  projectId: string;
  listingId: string | null;
  unitNumber: string;
  floor: number;
  type: string;
  status: string;
  price: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface AdminMortgageLead {
  id: string;
  fullName: string;
  phoneNumber: string;
  monthlyIncome: string | null;
  redfSupported: boolean | null;
  monthlyObligations: string | null;
  propertyExternalId: string;
  propertyPrice: string;
  isCitizen: boolean;
  isFirstHome: boolean | null;
  downPaymentAmount: string;
  loanPeriodYears: number;
  bankSlug: string;
  bankNameEn: string;
  appliedRatePct: string;
  monthlyInstalment: string;
  totalPayableValue: string;
  totalLoanAmount: string;
  status: string;
  notes?: { text: string; createdAt: string }[] | null;
  createdAt: string;
  targetNameEn?: string;
  targetNameAr?: string;
  email?: string | null;
  propertyType?: 'listing' | 'project';
}

export interface AdminReportedProperty {
  listingId: string | null;
  projectId: string | null;
  reportCount: number;
  pendingCount: number;
  resolvedCount: number;
  dismissedCount: number;
  shortId: string;
  enTitle: string;
  arTitle: string;
  city: string;
  price: number;
  type: 'listing' | 'project';
}

export interface AdminPropertyReport {
  id: string;
  listingId: string | null;
  projectId: string | null;
  reason: string;
  reporterName: string;
  reporterEmail: string;
  description: string | null;
  status: string;
  createdAt: string;
}

// ── Credit Billing Types ──

export interface CreditPackage {
  id: string;
  key: string;
  nameEn: string;
  nameAr: string;
  descriptionEn: string | null;
  descriptionAr: string | null;
  credits: number;
  priceSar: number;
  isPopular: boolean;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreditOrder {
  id: string;
  status: 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED';
  creditsAmount: number;
  priceSar: number;
  moyasarPaymentId: string | null;
  creditedAt: string | null;
  createdAt: string;
  packageKey: string;
  packageNameEn: string;
  packageNameAr: string;
}

export interface CreditLedgerEntry {
  id: string;
  type: 'CREDIT_PURCHASE' | 'LISTING_PUBLISH' | 'LISTING_FEATURE' | 'LISTING_BUMP' | 'ADMIN_GRANT' | 'FIRM_GRANT';
  amount: number;
  balanceAfter: number;
  description: string | null;
  refOrderId: string | null;
  refListingId: string | null;
  createdAt: string;
}

export interface AdminCreditOrder extends CreditOrder {
  brokerName: string | null;
  brokerEmail: string;
  brokerId: string;
}

export interface BrokerCreditsDetail {
  broker: { id: string; name: string | null; email: string; creditsBalance: number | null };
  orders: CreditOrder[];
  ledger: CreditLedgerEntry[];
}
