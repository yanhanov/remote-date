import { API_BASE_URL } from '@/shared/config/api';
import { tokenService } from './token.service';
import { notifySessionExpired } from './session';
import type {
  RegisterDto,
  RegisterCheckDto,
  LoginDto,
  RegisterResponse,
  RegisterCheckResponse,
  LoginResponse,
  RefreshTokenResponse,
  UpdateProfileDto,
  UsernameCheckResponse,
} from './auth.types';

class AuthAPI {
  private baseUrl = `${API_BASE_URL}/auth`;
  private isRefreshing = false;
  private refreshPromise: Promise<RefreshTokenResponse> | null = null;

  private async getAuthHeaders(): Promise<HeadersInit> {
    const accessToken = await tokenService.getAccessToken();
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    if (accessToken) {
      headers['Authorization'] = `Bearer ${accessToken}`;
    }

    return headers;
  }

  async refreshTokens(): Promise<RefreshTokenResponse> {
    if (this.isRefreshing && this.refreshPromise) {
      return this.refreshPromise;
    }

    this.isRefreshing = true;
    const refreshToken = await tokenService.getRefreshToken();

    if (!refreshToken) {
      this.isRefreshing = false;
      throw new Error('No refresh token available');
    }

    this.refreshPromise = fetch(`${this.baseUrl}/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    })
      .then(async (response) => {
        if (!response.ok) {
          const error = await response.json();
          await tokenService.clearTokens();
          throw new Error(error.error || 'Failed to refresh token');
        }
        return response.json();
      })
      .then(async (data: RefreshTokenResponse) => {
        await tokenService.setTokens(data.accessToken, data.refreshToken);
        return data;
      })
      .finally(() => {
        this.isRefreshing = false;
        this.refreshPromise = null;
      });

    return this.refreshPromise;
  }

  async fetchWithAuth(url: string, options: RequestInit = {}): Promise<Response> {
    let response = await fetch(url, {
      ...options,
      headers: {
        ...(await this.getAuthHeaders()),
        ...options.headers,
      },
    });

    if (response.status === 401) {
      try {
        await this.refreshTokens();
        response = await fetch(url, {
          ...options,
          headers: {
            ...(await this.getAuthHeaders()),
            ...options.headers,
          },
        });

        if (response.status === 401) {
          await tokenService.clearTokens();
          notifySessionExpired();
        }
      } catch (error) {
        await tokenService.clearTokens();
        notifySessionExpired();
        throw error;
      }
    }

    return response;
  }

  async register(dto: RegisterDto): Promise<RegisterResponse> {
    const response = await fetch(`${this.baseUrl}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dto),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to register');
    }

    return response.json();
  }

  async checkUsername(username: string): Promise<UsernameCheckResponse> {
    const params = new URLSearchParams({ username });
    const response = await fetch(`${this.baseUrl}/username/check?${params}`);

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to check username');
    }

    return response.json();
  }

  async registerCheck(dto: RegisterCheckDto): Promise<RegisterCheckResponse> {
    const response = await fetch(`${this.baseUrl}/register-check`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dto),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to verify code');
    }

    const data = await response.json();
    await tokenService.setTokens(data.accessToken, data.refreshToken);
    return data;
  }

  async login(dto: LoginDto): Promise<LoginResponse> {
    const response = await fetch(`${this.baseUrl}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dto),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Login failed');
    }

    const data = await response.json();
    await tokenService.setTokens(data.accessToken, data.refreshToken);
    return data;
  }

  async logout(): Promise<void> {
    const refreshToken = await tokenService.getRefreshToken();

    try {
      if (refreshToken) {
        await fetch(`${this.baseUrl}/logout`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken }),
        });
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      await tokenService.clearTokens();
    }
  }

  async getMe(): Promise<{
    userId: string;
    email: string;
    username?: string;
    firstName?: string;
    lastName?: string;
    birthDate?: string;
    sex?: 'male' | 'female' | 'other';
    avatarUrl?: string;
    verified: boolean;
    createdAt: string;
  }> {
    const response = await this.fetchWithAuth(`${this.baseUrl}/me`);

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to get user info');
    }

    return response.json();
  }

  async updateProfile(dto: UpdateProfileDto) {
    const response = await this.fetchWithAuth(`${this.baseUrl}/me`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dto),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to update profile');
    }

    return response.json();
  }
}

export const authAPI = new AuthAPI();
