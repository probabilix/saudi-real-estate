import {
  RegisterInput,
  LoginInput,
  User,
  BrokerWithProfile,
  Listing,
  ListingWithOwner,
  PaginatedResponse,
  BrokerProfile
} from '@saudi-re/shared';

export const getApiBaseUrl = () => {
  // If we're in the browser
  if (typeof window !== 'undefined') {
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      return 'http://localhost:3001/api/v1';
    }
  }
  
  // If we're on the server (SSR/ISR)
  if (process.env.NODE_ENV === 'development') {
    return 'http://localhost:3001/api/v1';
  }

  return process.env.NEXT_PUBLIC_API_URL || 'https://api.saudi-re.com/api/v1';
};

export const API_BASE_URL = getApiBaseUrl();

export type ApiResponse<T> = {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
};

export interface NewsPost {
  id: string;
  slug: string;
  titleEn: string;
  titleAr: string;
  contentEn: string;
  contentAr: string;
  excerptEn?: string;
  excerptAr?: string;
  featuredImage?: string;
  isPublished: boolean;
  authorId: string;
  publishedAt?: string;
  updatedAt: string;
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

class ApiClient {
  private inFlightRequests = new Map<string, Promise<ApiResponse<unknown>>>();
  private cache = new Map<string, { data: ApiResponse<unknown>; expiry: number }>();
  private CACHE_DURATION = 5000; // 5 seconds brief cache for duplicate prevention

  private async fetcher<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const url = `${API_BASE_URL}${endpoint}`;
    const cacheKey = `${options.method || 'GET'}:${url}`;

    // 1. Check short-lived cache for GET requests
    if (!options.method || options.method === 'GET') {
      const cached = this.cache.get(cacheKey);
      if (cached && cached.expiry > Date.now()) {
        return cached.data as ApiResponse<T>;
      }
    }

    // 2. Check for in-flight requests to deduplicate simultaneous calls
    if (!options.method || options.method === 'GET') {
      const inFlight = this.inFlightRequests.get(cacheKey);
      if (inFlight) {
        return inFlight as Promise<ApiResponse<T>>;
      }
    }

    const fetchPromise = (async () => {
      let retries = 2;
      
      while (retries >= 0) {
        try {
          // Auto-inject Authorization header if token exists in localStorage
          const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;

          const getHeaders = (t: string | null) => ({
            ...(t ? { Authorization: `Bearer ${t}` } : {}),
            ...options.headers as Record<string, string>,
            ...(options.body ? { 'Content-Type': 'application/json' } : {})
          });

          let response = await fetch(url, { 
            ...options, 
            headers: getHeaders(token),
            credentials: 'include'
          });

          // Invalidate cache on mutations (POST, PUT, PATCH, DELETE)
          if (options.method && options.method !== 'GET') {
            this.cache.clear();
          }
          
          // Handle cases where response might not be JSON or empty
          let result: ApiResponse<T>;
          const text = await response.text();
          try {
            result = text ? JSON.parse(text) : {};
          } catch {
            result = { success: false, message: text } as ApiResponse<T>;
          }

          // 401 Interceptor: Attempt silent refresh
          if (response.status === 401 && token && !endpoint.includes('/auth/refresh')) {
            const refreshRes = await fetch(`${API_BASE_URL}/auth/refresh`, { 
              method: 'POST',
              credentials: 'include'
            });
            const refreshResult = await refreshRes.json();

            if (refreshResult.success && refreshResult.data?.accessToken) {
              const newToken = refreshResult.data.accessToken;
              localStorage.setItem('accessToken', newToken);
              
              // Retry original request with NEW token
              response = await fetch(url, { 
                ...options, 
                headers: getHeaders(newToken),
                credentials: 'include'
              });
              const retryText = await response.text();
              try {
                result = retryText ? JSON.parse(retryText) : {};
              } catch {
                result = { success: false, message: retryText } as ApiResponse<T>;
              }
            } else {
              // Refresh failed or no refresh token - force logout
              localStorage.removeItem('accessToken');
              if (typeof window !== 'undefined') {
                window.dispatchEvent(new CustomEvent('auth-logout'));
              }
            }
          }

          if (!response.ok) {
            // If it's a 500 error and we have retries left, wait and try again
            if (response.status >= 500 && retries > 0) {
              retries--;
              await new Promise(r => setTimeout(r, 1000));
              continue;
            }

            return {
              success: false,
              error: result.message || 'An unexpected error occurred',
            };
          }

          const successRes = result as ApiResponse<T>;
          
          // Cache successful GET requests
          if (!options.method || options.method === 'GET') {
            this.cache.set(cacheKey, {
              data: successRes,
              expiry: Date.now() + this.CACHE_DURATION
            });
          }

          return successRes;
        } catch (error: unknown) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          // Handle fetch failed (network errors / server unreachable)
          if (retries > 0) {
            retries--;
            console.warn(`API Retry [${endpoint}] (${2 - retries}):`, errorMessage);
            await new Promise(r => setTimeout(r, 1000));
            continue;
          }

          console.error(`API Error [${endpoint}]:`, error);
          return {
            success: false,
            error: 'Network error or server unreachable',
          };
        }
      }

      return { success: false, error: 'Maximum retries reached' };
    })();

    if (!options.method || options.method === 'GET') {
      this.inFlightRequests.set(cacheKey, fetchPromise);
    }

    return fetchPromise;
  }

  // ── Auth Endpoints ──

  async register(data: RegisterInput) {
    return this.fetcher<{ userId: string; accessToken?: string; user?: User }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async login(data: LoginInput) {
    return this.fetcher<{ accessToken: string; user: User }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getMe() {
    return this.fetcher<{ user: User }>('/auth/me', {
      method: 'GET',
    });
  }

  async logout() {
    return this.fetcher('/auth/logout', {
      method: 'POST',
    });
  }

  // ── Listings Endpoints ──

  async getListings(params: string) {
    return this.fetcher<PaginatedResponse<Listing>>(`/listings?${params}`);
  }

  async getMyDashboardListings(params: { ownerId?: string; firmId?: string; status?: string; q?: string; limit?: number }) {
    const s = new URLSearchParams();
    if (params.ownerId) s.append('ownerId', params.ownerId);
    if (params.firmId) s.append('firmId', params.firmId);
    if (params.status) s.append('status', params.status);
    if (params.q) s.append('q', params.q);
    if (params.limit) s.append('limit', params.limit.toString());
    
    return this.fetcher<PaginatedResponse<Listing>>(`/listings?${s.toString()}`);
  }

  async getListingById(id: string) {
    return this.fetcher<ListingWithOwner>(`/listings/${id}`);
  }

  async createListing(data: Partial<Listing>) {
    return this.fetcher<Listing>('/listings', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateListing(id: string, data: Partial<Listing>) {
    return this.fetcher<Listing>(`/listings/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteListing(id: string) {
    return this.fetcher<{ success: boolean; message: string }>(`/listings/${id}`, {
      method: 'DELETE',
    });
  }

  async getDashboardStats() {
    return this.fetcher<Record<string, unknown>>('/user/dashboard-stats');
  }

  // ── User & Profile Endpoints ──

  async getPublicBroker(id: string) {
    return this.fetcher<BrokerWithProfile>(`/user/public-broker/${id}`);
  }

  async getPublicFirm(id: string) {
    return this.fetcher<User>(`/user/public-firm/${id}`);
  }

  async getProfile() {
    return this.fetcher<{ user: User; profile: BrokerProfile }>('/user/profile', {
      method: 'GET',
    });
  }

  async updateProfile(data: Partial<BrokerProfile>) {
    return this.fetcher('/user/profile', {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async verifyProfessional(licenseNumber: string, type: 'sell' | 'daily') {
    return this.fetcher('/user/verify-professional', {
      method: 'POST',
      body: JSON.stringify({ licenseNumber, type }),
    });
  }

  // ── AI Endpoints ──

  async aiTranslate(data: { text: string; fromLang: string; toLang: string; context?: string }) {
    return this.fetcher<{ translatedText: string }>('/ai/translate', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async aiGenerateTitle(data: { languages: string[]; experience: string; areas: string[]; targetLang: string }) {
    return this.fetcher<{ title: string }>('/ai/generate-title', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // ── Firm Management Endpoints ──

  async getFirmBrokers() {
    return this.fetcher<User[]>('/firm/brokers', {
      method: 'GET',
    });
  }

  async allocateBrokerCredits(brokerId: string, amount: number) {
    return this.fetcher<{ success: boolean; message: string }>(`/firm/brokers/${brokerId}/credits`, {
      method: 'POST',
      body: JSON.stringify({ amount }),
    });
  }

   async reclaimBrokerCredits(brokerId: string, amount: number) {
    return this.fetcher<{ success: boolean; message: string }>(`/firm/brokers/${brokerId}/reclaim`, {
      method: 'POST',
      body: JSON.stringify({ amount }),
    });
  }

  // ── Listing Lifecycle ──

  async publishListing(id: string) {
    return this.fetcher<{ listing: Listing; newBalance: number }>(`/listings/${id}/publish`, {
      method: 'POST',
    });
  }

  async getListingCost() {
    // For now we can just return 10 or fetch from a settings endpoint if created
    return 10;
  }

  // ── Favorites Endpoints ──

  async toggleFavorite(listingId: string) {
    return this.fetcher<{ isFavorited: boolean }>('/favorites/toggle', {
      method: 'POST',
      body: JSON.stringify({ listingId }),
    });
  }

  async getFavorites() {
    return this.fetcher<PaginatedResponse<Listing & { isFavorited: boolean }>>('/favorites', {
      method: 'GET',
    });
  }

  async getCloudinarySignature() {
    return this.fetcher<{
      timestamp: number;
      signature: string;
      apiKey: string;
      cloudName: string;
      folder: string;
      upload_preset: string;
    }>('/listings/upload-signature', {
      method: 'GET',
    });
  }

  // ── News Endpoints ──

  async getNews() {
    return this.fetcher<NewsPost[]>('/news', {
      method: 'GET',
    });
  }

  async getNewsBySlug(slug: string) {
    return this.fetcher<NewsPost>(`/news/${slug}`, {
      method: 'GET',
    });
  }

  // ── Legal Endpoints ──

  async getLegalPage(slug: string) {
    return this.fetcher<LegalPage>(`/legal/${slug}`, {
      method: 'GET',
    });
  }

  async updateLegalPage(slug: string, data: Partial<LegalPage>) {
    return this.fetcher<LegalPage>(`/legal/${slug}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }
}


export const api = new ApiClient();
