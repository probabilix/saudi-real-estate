// ──────────────────────────────────────────────
// CRM API Client
// ──────────────────────────────────────────────

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('crmToken');
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

    const res = await fetch(`${API_BASE}${path}`, { ...options, headers, credentials: 'include' });
    const json = await res.json();

    if (res.status === 401 && typeof window !== 'undefined') {
      localStorage.removeItem('crmToken');
      window.location.href = '/login';
    }
    return json;
  } catch (err: any) {
    console.error(`CRM API Error requesting ${path}:`, err);
    return {
      success: false,
      error: err?.message || 'Network error occurred',
    };
  }
}

export const crmApi = {
  request,

  // ── Auth ──
  login: (email: string, password: string) =>
    request<{ accessToken: string; user: CrmUserDTO }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),
  getMe: () => request<{ user: CrmUserDTO }>('/auth/me'),
  logout: () => request('/auth/logout', { method: 'POST' }),

  // ── Shared Utilities ──
  getAgents: () => request<CrmAgent[]>('/crm/agents'),

  getDashboard: () => request<CrmDashboardData>('/crm/dashboard'),

  getTodayFollowups: () => request<CrmFollowup[]>('/crm/followups/today'),

  completeFollowup: (id: string) =>
    request(`/crm/followups/${id}/complete`, { method: 'PATCH' }),

  // ── Website Leads ──
  getWebsiteLeads: (params?: {
    status?: string; isQualified?: boolean; search?: string; page?: number; limit?: number;
  }) => {
    const q = new URLSearchParams();
    if (params?.status) q.set('status', params.status);
    if (params?.isQualified !== undefined) q.set('isQualified', String(params.isQualified));
    if (params?.search) q.set('search', params.search);
    if (params?.page) q.set('page', String(params.page));
    if (params?.limit) q.set('limit', String(params.limit));
    return request<WebsiteLeadsResponse>(`/crm/website-leads?${q}`);
  },

  getWebsiteLead: (id: string) => request<WebsiteLeadDetail>(`/crm/website-leads/${id}`),

  updateWebsiteLeadStatus: (id: string, status: string) =>
    request(`/crm/website-leads/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),

  updateWizardLeadStage: (id: string, stage: string) =>
    request(`/wizard/leads/${id}/stage`, { method: 'PATCH', body: JSON.stringify({ stage }) }),

  addWizardLeadNote: (id: string, content: string) =>
    request(`/wizard/leads/${id}/notes`, { method: 'POST', body: JSON.stringify({ content }) }),

  assignWebsiteLead: (id: string, agentId: string) =>
    request(`/crm/website-leads/${id}/assign`, { method: 'PATCH', body: JSON.stringify({ agentId }) }),

  addWebsiteLeadNote: (id: string, content: string) =>
    request(`/crm/website-leads/${id}/notes`, { method: 'POST', body: JSON.stringify({ content }) }),

  addWebsiteLeadFollowup: (id: string, scheduledAt: string, note?: string) =>
    request(`/crm/website-leads/${id}/followups`, { method: 'POST', body: JSON.stringify({ scheduledAt, note }) }),

  logWebsiteLeadWhatsapp: (id: string) =>
    request(`/crm/website-leads/${id}/whatsapp`, { method: 'POST' }),

  // ── Campaign Leads ──
  getCampaignLeads: (params?: {
    status?: string; source?: string; search?: string; assigned?: string; page?: number; limit?: number;
  }) => {
    const q = new URLSearchParams();
    if (params?.status) q.set('status', params.status);
    if (params?.source) q.set('source', params.source);
    if (params?.search) q.set('search', params.search);
    if (params?.assigned !== undefined) q.set('assigned', params.assigned);
    if (params?.page) q.set('page', String(params.page));
    if (params?.limit) q.set('limit', String(params.limit));
    return request<CampaignLeadsResponse>(`/crm/campaign-leads?${q}`);
  },

  getCampaignLead: (id: string) => request<CampaignLeadDetail>(`/crm/campaign-leads/${id}`),

  createCampaignLead: (data: CreateCampaignLeadInput) =>
    request<CrmLead>('/crm/campaign-leads', { method: 'POST', body: JSON.stringify(data) }),

  updateCampaignLeadStatus: (id: string, status: string) =>
    request(`/crm/campaign-leads/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),

  assignCampaignLead: (id: string, agentId: string | null) =>
    request(`/crm/campaign-leads/${id}/assign`, { method: 'PATCH', body: JSON.stringify({ agentId }) }),

  updateCampaignLeadScore: (id: string, score: number) =>
    request(`/crm/campaign-leads/${id}/score`, { method: 'PATCH', body: JSON.stringify({ score }) }),

  addCampaignLeadNote: (id: string, content: string) =>
    request(`/crm/campaign-leads/${id}/notes`, { method: 'POST', body: JSON.stringify({ content }) }),

  addCampaignLeadFollowup: (id: string, scheduledAt: string, note?: string) =>
    request(`/crm/campaign-leads/${id}/followups`, { method: 'POST', body: JSON.stringify({ scheduledAt, note }) }),

  logCampaignLeadWhatsapp: (id: string) =>
    request(`/crm/campaign-leads/${id}/whatsapp`, { method: 'POST' }),

  deleteCampaignLead: (id: string) =>
    request(`/crm/campaign-leads/${id}`, { method: 'DELETE' }),

  // ── Settings ──
  getCrmSettings: () => request<SystemSetting[]>('/crm/settings'),
  updateCrmSetting: (key: string, value: string) =>
    request(`/crm/settings/${key}`, { method: 'PUT', body: JSON.stringify({ value }) }),
  updateNote: (id: string, content: string) =>
    request<CrmNote>(`/crm/notes/${id}`, { method: 'PATCH', body: JSON.stringify({ content }) }),
  getProfile: () => request<{ user: any; profile: any }>('/user/profile', { method: 'GET' }),
  updateProfile: (data: any) => request('/user/profile', { method: 'PATCH', body: JSON.stringify(data) }),
  purchaseCredits: (credits: number) => request<{ newBalance: number }>('/user/purchase-credits', {
    method: 'POST',
    body: JSON.stringify({ credits }),
  }),

  // ── Project Inventory Units ──
  getListingUnits: (listingId: string) =>
    request<CrmProjectUnit[]>(`/listings/${listingId}/units`),
  updateListingUnit: (listingId: string, unitId: string, data: { status: string }) =>
    request<CrmProjectUnit>(`/listings/${listingId}/units/${unitId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  // ── Listings Management (Broker Cockpit) ──
  getListings: (params?: { status?: string; page?: number; limit?: number; search?: string; ownerId?: string }) => {
    const q = new URLSearchParams();
    if (params?.status) q.set('status', params.status);
    if (params?.page) q.set('page', String(params.page));
    if (params?.limit) q.set('limit', String(params.limit));
    if (params?.search) q.set('search', params.search);
    if (params?.ownerId) q.set('ownerId', params.ownerId);
    return request<CrmListingsResponse>(`/listings?${q}`);
  },

  deleteListing: (listingId: string) =>
    request(`/listings/${listingId}`, {
      method: 'DELETE',
    }),

  getListingById: (id: string) => request<CrmListingDetail>(`/listings/${id}?t=${Date.now()}`),

  createListing: (data: any) =>
    request('/listings', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateListing: (id: string, data: any) =>
    request(`/listings/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  publishListing: (id: string) =>
    request(`/listings/${id}/publish`, {
      method: 'POST',
    }),

  featureListing: (id: string, days: number) =>
    request(`/listings/${id}/feature`, {
      method: 'POST',
      body: JSON.stringify({ days }),
    }),

  linkListingProject: (listingId: string, projectId: string | null) =>
    request(`/listings/${listingId}`, {
      method: 'PUT',
      body: JSON.stringify({ projectId }),
    }),

  getProjects: () => request<CrmProject[]>('/listings/projects'),

  addListingUnits: (listingId: string, units: Array<{ unitNumber: string; floor: number; type: string; status?: string; price?: number }>) =>
    request<CrmProjectUnit[]>(`/listings/${listingId}/units`, {
      method: 'POST',
      body: JSON.stringify({ units }),
    }),

  deleteListingUnit: (listingId: string, unitId: string) =>
    request(`/listings/${listingId}/units/${unitId}`, {
      method: 'DELETE',
    }),

  // ── Billing / Credits ──
  getBillingPackages: () => request<CreditPackage[]>('/billing/packages'),
  getCreditBalance: () => request<{ balance: number }>('/billing/balance'),
  getCreditOrders: () => request<CreditOrder[]>('/billing/orders'),
  getCreditLedger: (page?: number) =>
    request<CreditLedgerEntry[]>(`/billing/ledger?page=${page ?? 1}`),
  initCheckout: (packageKey: string) =>
    request<CheckoutInitResponse>('/billing/checkout', {
      method: 'POST',
      body: JSON.stringify({ packageKey }),
    }),
  confirmPayment: (paymentId: string) =>
    request<{ newBalance?: number }>('/billing/confirm', {
      method: 'POST',
      body: JSON.stringify({ paymentId }),
    }),

  // ── Admin: Credit Packages ──
  adminGetCreditPackages: () => request<CreditPackage[]>('/admin/credit-packages'),
  adminCreateCreditPackage: (data: Partial<CreditPackage>) =>
    request<CreditPackage>('/admin/credit-packages', { method: 'POST', body: JSON.stringify(data) }),
  adminUpdateCreditPackage: (id: string, data: Partial<CreditPackage>) =>
    request<CreditPackage>(`/admin/credit-packages/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),

  // ── Admin: Credit Orders ──
  adminGetCreditOrders: (params?: { status?: string; page?: number; brokerId?: string }) => {
    const q = new URLSearchParams();
    if (params?.status) q.set('status', params.status);
    if (params?.page) q.set('page', String(params.page));
    if (params?.brokerId) q.set('brokerId', params.brokerId);
    return request<{ data: AdminCreditOrder[]; total: number }>(`/admin/credit-orders?${q}`);
  },

  // ── Admin: Broker Credit Details ──
  adminGetBrokerCredits: (brokerId: string) =>
    request<BrokerCreditsDetail>(`/admin/brokers/${brokerId}/credits`),
  adminGrantCredits: (brokerId: string, amount: number, description?: string) =>
    request(`/admin/brokers/${brokerId}/credits/grant`, {
      method: 'POST',
      body: JSON.stringify({ amount, description }),
    }),
};

// ── Types ──

export interface CrmUserDTO {
  id: string;
  name: string;
  email: string;
  role: string;
}

export interface CrmAgent {
  id: string;
  name: string | null;
  email: string;
  role: string;
}

export interface CrmLead {
  id: string;
  source: 'META_ADS' | 'SNAPCHAT' | 'TIKTOK' | 'WHATSAPP' | 'MANUAL';
  name: string;
  phone: string;
  email: string | null;
  cityPreference: string | null;
  propertyInterest: string | null;
  status: CrmLeadStatus;
  leadScore: number;
  assignedAgentId: string | null;
  campaignDetails: Record<string, unknown> | null;
  isDuplicate: boolean;
  createdAt: string;
  updatedAt: string;
}

export type CrmLeadStatus =
  | 'NEW'
  | 'AI_ATTEMPTING'
  | 'AI_QUALIFIED'
  | 'AI_DISQUALIFIED'
  | 'AI_UNREACHED'
  | 'ATTEMPTED_CONTACT'
  | 'CONTACTED'
  | 'SITE_VISIT_SCHEDULED'
  | 'PROPERTY_VIEWING'
  | 'OFFER_SUBMITTED'
  | 'CLOSED_WON'
  | 'CLOSED_LOST';

export const CRM_STAGES: { key: CrmLeadStatus; label: string; colorClass: string; dotColor: string }[] = [
  { key: 'NEW',                   label: 'New',                  colorClass: 'stage-new',            dotColor: '#6366f1' },
  { key: 'AI_ATTEMPTING',         label: 'AI Attempting',        colorClass: 'stage-ai-attempting',  dotColor: '#f59e0b' },
  { key: 'AI_QUALIFIED',          label: 'AI Qualified',         colorClass: 'stage-ai-qualified',   dotColor: '#10b981' },
  { key: 'AI_DISQUALIFIED',       label: 'AI Disqualified',      colorClass: 'stage-ai-disqualified',dotColor: '#ef4444' },
  { key: 'AI_UNREACHED',          label: 'AI Unreached',         colorClass: 'stage-ai-unreached',   dotColor: '#9ca3af' },
  { key: 'ATTEMPTED_CONTACT',     label: 'Attempted Contact',    colorClass: 'stage-attempted',      dotColor: '#f97316' },
  { key: 'CONTACTED',             label: 'Contacted',            colorClass: 'stage-contacted',      dotColor: '#3b82f6' },
  { key: 'SITE_VISIT_SCHEDULED',  label: 'Site Visit',           colorClass: 'stage-visit',          dotColor: '#8b5cf6' },
  { key: 'PROPERTY_VIEWING',      label: 'Viewing',              colorClass: 'stage-viewing',        dotColor: '#ec4899' },
  { key: 'OFFER_SUBMITTED',       label: 'Offer Submitted',      colorClass: 'stage-offer',          dotColor: '#f97316' },
  { key: 'CLOSED_WON',            label: 'Closed Won',           colorClass: 'stage-won',            dotColor: '#10b981' },
  { key: 'CLOSED_LOST',           label: 'Closed Lost',          colorClass: 'stage-lost',           dotColor: '#6b7280' },
];

export const WEBSITE_LEAD_STATUSES = [
  { key: 'CONTACTED',             label: 'AI Qualified (Awaiting Agent)', color: '#f59e0b' },
  { key: 'ATTEMPTED_CONTACT',     label: 'Agent Attempted Contact',       color: '#f87171' },
  { key: 'AGENT_CONTACTED',       label: 'Agent Contacted',               color: '#3b82f6' },
  { key: 'SITE_VISIT_SCHEDULED',  label: 'Site Visit Scheduled',          color: '#8b5cf6' },
  { key: 'PROPERTY_VIEWING',      label: 'Property Viewing',              color: '#ec4899' },
  { key: 'OFFER_SUBMITTED',       label: 'Offer Submitted',               color: '#f97316' },
  { key: 'CLOSED_WON',            label: 'Closed Won',                    color: '#10b981' },
  { key: 'CLOSED_LOST',           label: 'Closed Lost',                   color: '#ef4444' },
  { key: 'AI_DISQUALIFIED',       label: 'AI Disqualified',               color: '#6b7280' },
];

export interface CrmNote {
  id: string;
  leadId: string;
  leadType: string;
  agentId: string | null;
  content: string;
  createdAt: string;
}

export interface CrmActivity {
  id: string;
  leadId: string;
  leadType: string;
  performedById: string | null;
  activityType: string;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

export interface CrmFollowup {
  id: string;
  leadId: string;
  leadType: string;
  agentId: string | null;
  scheduledAt: string;
  note: string | null;
  isCompleted: boolean;
  completedAt: string | null;
  createdAt: string;
}

export interface CampaignLeadsResponse {
  leads: { lead: CrmLead; agent: CrmAgent | null }[];
  total: number;
  unassigned: number;
  page: number;
}

export interface CampaignLeadDetail {
  lead: CrmLead;
  agent: CrmAgent | null;
  notes: CrmNote[];
  activities: CrmActivity[];
  followups: CrmFollowup[];
}

export interface WebsiteLeadsResponse {
  leads: WebsiteLead[];
  total: number;
  page: number;
}

export interface WebsiteLead {
  lead: {
    id: string;
    status: string;
    isQualified: boolean;
    intentScoreAtCreation: number | null;
    aiSummary: string | null;
    buyerBudgetDisplay: string | null;
    buyerTimelineDisplay: string | null;
    notifiedWhatsapp: boolean;
    createdAt: string;
    brokerId: string;
  };
  listing: {
    id: string;
    shortId: string | null;
    arTitle: string;
    enTitle: string | null;
    price: number;
    city: string;
    photos: string[];
    projectId: string | null;
  } | null;
  buyer: {
    id: string;
    sessionId: string;
    intentScore: number;
    lastAiSummary: string | null;
    contactProvided: boolean;
    name: string | null;
    email: string | null;
    phone: string | null;
  } | null;
  agent: { id: string; name: string | null; email: string } | null;
  project: { id: string; nameEn: string; nameAr: string } | null;
}

export interface WebsiteLeadDetail {
  lead: WebsiteLead['lead'];
  listing: WebsiteLead['listing'] & {
    district: string | null;
    type: string;
    regaAdvertisingLicense: string | null;
  } | null;
  buyer: {
    id: string;
    sessionId: string;
    intentScore: number;
    lastAiSummary: string | null;
    contactProvided: boolean;
    name: string | null;
    email: string | null;
    phone: string | null;
    budgetMin: number | null;
    budgetMax: number | null;
    cityPreference: string | null;
    timelineMonths: number | null;
    purpose: string | null;
    propertyType: string[] | null;
  } | null;
  agent: WebsiteLead['agent'] & { phone: string | null } | null;
  project: { id: string; nameEn: string; nameAr: string } | null;
  chatHistory: { id: string; sender: 'USER' | 'ASSISTANT'; content: string; createdAt: string }[];
  notes: CrmNote[];
  activities: CrmActivity[];
  followups: CrmFollowup[];
}

export interface CreateCampaignLeadInput {
  name: string;
  phone: string;
  email?: string;
  cityPreference?: string;
  propertyInterest?: string;
  source?: string;
  assignedAgentId?: string;
  campaignDetails?: Record<string, unknown>;
}

export interface SystemSetting {
  key: string;
  value: string;
  description: string | null;
  updatedAt: string;
}

export interface CrmDashboardData {
  campaignByStatus: { status: string; count: number }[];
  campaignBySource: { source: string; count: number }[];
  websiteByStatus: { status: string; count: number }[];
  unassignedCount: number;
  todayFollowupCount: number;
  agentLeaderboard: { agentId: string | null; agentName: string | null; total: number; won: number }[];
}

export interface CrmProjectUnit {
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

export interface CrmListingsResponse {
  items: CrmListing[];
  total: number;
  hasMore: boolean;
  nextCursor: string | null;
}

export interface CrmListing {
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
  verified: boolean;
  regaAdvertisingLicense: string | null;
  viewsCount: number;
  createdAt: string;
  ownerId: string;
  projectId?: string | null;
  aiQualificationActive?: boolean;
}

export interface CrmListingDetail extends CrmListing {
  descriptionEn?: string | null;
  descriptionAr?: string | null;
  areaSqm?: number | null;
  bedrooms?: number | null;
  bathrooms?: number | null;
  amenities?: Record<string, boolean>;
  photos?: string[];
  district?: string | null;
}

export interface CrmProject {
  id: string;
  nameEn: string;
  nameAr: string;
  city: string;
  district: string | null;
  mapEmbedUrl: string | null;
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

export interface CheckoutInitResponse {
  orderId: string;
  publishableKey: string;
  moyasarPaymentId: string;
  formUrl: string | null;
  amount: number;
  credits: number;
  packageName: string;
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
