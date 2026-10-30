import { AuthUser } from '../../types/audit';
import { apiClient, setAuthToken, USE_MOCK_API, ApiError } from './client';

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface SignupCredentials {
  email: string;
  password: string;
  name: string;
}

export interface SignupResult {
  userSub?: string;
  userConfirmed: boolean;
  email: string;
  message: string;
  token?: string;
  user?: AuthUser;
}

export interface ConfirmSignupCredentials {
  email: string;
  code: string;
}

export interface AuthSession {
  user: AuthUser;
  token: string;
  accessToken?: string;
  idToken?: string;
}

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

  async signup(creds: SignupCredentials): Promise<SignupResult> {
    const data = await apiClient<SignupResult>('/auth/signup', {
      method: 'POST',
      body: JSON.stringify(creds),
    });
    if (data.token && data.user) {
      setAuthToken(data.token);
      localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(data.user));
    }
    return data;
  }

  async confirmSignup(creds: ConfirmSignupCredentials): Promise<{ success: boolean; message: string }> {
    return apiClient<{ success: boolean; message: string }>('/auth/confirm', {
      method: 'POST',
      body: JSON.stringify(creds),
    });
  }

  async resendCode(email: string): Promise<{ success: boolean; message: string }> {
    return apiClient<{ success: boolean; message: string }>('/auth/resend-code', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
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
}

/**
 * Mock Auth Service for local development or demo testing.
 */
class MockAuthService {
  async login(creds: LoginCredentials): Promise<AuthSession> {
    await new Promise((r) => setTimeout(r, 200));
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

  async signup(creds: SignupCredentials): Promise<SignupResult> {
    await new Promise((r) => setTimeout(r, 200));
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
    return {
      userConfirmed: true,
      email: creds.email,
      message: 'Account registered successfully.',
      user,
      token,
    };
  }

  async confirmSignup(creds: ConfirmSignupCredentials): Promise<{ success: boolean; message: string }> {
    await new Promise((r) => setTimeout(r, 100));
    return { success: true, message: 'Account confirmed successfully.' };
  }

  async resendCode(email: string): Promise<{ success: boolean; message: string }> {
    await new Promise((r) => setTimeout(r, 100));
    return { success: true, message: 'Verification code resent.' };
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
export { ApiError };
