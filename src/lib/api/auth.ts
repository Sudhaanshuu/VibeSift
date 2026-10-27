import { AuthUser } from '../../types/audit';
import { apiClient, setAuthToken, USE_MOCK_API, ApiError } from './client';

export interface LoginCredentials {
  email: string;
  password?: string;
}

export interface SignupCredentials {
  email: string;
  password: string;
  name: string;
}

export interface AuthSession {
  user: AuthUser;
  token: string;
}

const DEMO_USER: AuthUser = {
  id: 'usr_demo_developer_01',
  email: 'alex.developer@example.com',
  name: 'Alex Developer',
  isDemoUser: true,
  plan: 'verified_developer',
};

const STORAGE_KEY_USER = 'vibesift_user_session';

/**
 * Amazon Cognito / Backend API auth adapter.
 */
class ProductionAuthService {
  async login(creds: LoginCredentials): Promise<AuthSession> {
    const data = await apiClient<AuthSession>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(creds),
    });
    setAuthToken(data.token);
    localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(data.user));
    return data;
  }

  async signup(creds: SignupCredentials): Promise<AuthSession> {
    const data = await apiClient<AuthSession>('/auth/signup', {
      method: 'POST',
      body: JSON.stringify(creds),
    });
    setAuthToken(data.token);
    localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(data.user));
    return data;
  }

  async getCurrentSession(): Promise<AuthUser | null> {
    try {
      const user = await apiClient<AuthUser>('/auth/me');
      localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(user));
      return user;
    } catch {
      setAuthToken(null);
      localStorage.removeItem(STORAGE_KEY_USER);
      return null;
    }
  }

  async logout(): Promise<void> {
    try {
      await apiClient<void>('/auth/logout', { method: 'POST' });
    } finally {
      setAuthToken(null);
      localStorage.removeItem(STORAGE_KEY_USER);
    }
  }

  async loginAsDemo(): Promise<AuthSession> {
    const token = 'demo_usr_alex_dev';
    setAuthToken(token);
    localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(DEMO_USER));
    return { user: DEMO_USER, token };
  }
}

/**
 * Mock Auth Service for local development or demo testing.
 */
class MockAuthService {
  async login(creds: LoginCredentials): Promise<AuthSession> {
    await new Promise((r) => setTimeout(r, 300));
    const user: AuthUser = {
      id: `usr_${Date.now().toString(36)}`,
      email: creds.email,
      name: creds.email.split('@')[0],
      isDemoUser: false,
      plan: 'verified_developer',
    };
    const token = `mock-jwt-token-${user.id}`;
    setAuthToken(token);
    localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(user));
    return { user, token };
  }

  async signup(creds: SignupCredentials): Promise<AuthSession> {
    await new Promise((r) => setTimeout(r, 300));
    const user: AuthUser = {
      id: `usr_${Date.now().toString(36)}`,
      email: creds.email,
      name: creds.name || creds.email.split('@')[0],
      isDemoUser: false,
      plan: 'free',
    };
    const token = `mock-jwt-token-${user.id}`;
    setAuthToken(token);
    localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(user));
    return { user, token };
  }

  async loginAsDemo(): Promise<AuthSession> {
    await new Promise((r) => setTimeout(r, 150));
    const token = 'mock-jwt-token-demo';
    setAuthToken(token);
    localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(DEMO_USER));
    return { user: DEMO_USER, token };
  }

  async getCurrentSession(): Promise<AuthUser | null> {
    const raw = localStorage.getItem(STORAGE_KEY_USER);
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  async logout(): Promise<void> {
    setAuthToken(null);
    localStorage.removeItem(STORAGE_KEY_USER);
  }
}

export const authService = USE_MOCK_API ? new MockAuthService() : new ProductionAuthService();
export const mockAuthService = new MockAuthService();
export const isMockAuthMode = USE_MOCK_API;
