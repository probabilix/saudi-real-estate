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
  getUsers: (params?: { role?: string; status?: string; search?: string; page?: number; limit?: number }) => {
    const q = new URLSearchParams();
    if (params?.role) q.set('role', params.role);
    if (params?.status) q.set('status', params.status);
    if (params?.search) q.set('search', params.search);
    if (params?.page) q.set('page', String(params.page));
    if (params?.limit) q.set('limit', String(params.limit));
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
  subscriptionTier: string;
  creditsBalance: number;
  createdAt: string;
  listingCount?: number;
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
