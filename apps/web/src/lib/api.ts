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

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://saudi-real-estate-api.vercel.app/api/v1';

export type ApiResponse<T> = {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
};

class ApiClient {
  private async fetcher<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const url = `${API_BASE_URL}${endpoint}`;

    // Auto-inject Authorization header if token exists in localStorage
    const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;

    const headers: Record<string, string> = {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers as Record<string, string>,
    };

    if (options.body) {
      headers['Content-Type'] = 'application/json';
    }

    try {
      const response = await fetch(url, { ...options, headers });
      const result = (await response.json()) as { message?: string;[key: string]: unknown };

      if (!response.ok) {
        return {
          success: false,
          error: result.message || 'An unexpected error occurred',
        };
      }

      return result as ApiResponse<T>;
    } catch (error) {
      console.error(`API Error [${endpoint}]:`, error);
      return {
        success: false,
        error: 'Network error or server unreachable',
      };
    }
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

  async getListingById(id: string) {
    return this.fetcher<ListingWithOwner>(`/listings/${id}`);
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
}

export const api = new ApiClient();
