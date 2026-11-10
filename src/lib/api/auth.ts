import { AuthUser } from '../../types/audit';
import { apiClient, setAuthToken, setAuthSession, clearAuthSession, ApiError } from './client';

export interface LoginCredentials {
  email: string;
  password: string;
  turnstileToken?: string;
}

export interface SignupCredentials {
  email: string;
  password: string;
  name: string;
  turnstileToken?: string;
}

export interface SignupResult {
  userSub?: string;
  userConfirmed: boolean;
  email: string;
  message: string;
  token?: string;
  refreshToken?: string;
  expiresIn?: number;
  user?: AuthUser;
}

export interface ConfirmSignupCredentials {
  email: string;
  code: string;
  password?: string;
}

export interface ConfirmSignupResult {
  success: boolean;
  message: string;
  userConfirmed?: boolean;
  token?: string;
  accessToken?: string;
  idToken?: string;
  refreshToken?: string;
  expiresIn?: number;
  user?: AuthUser;
  requiresManualLogin?: boolean;
}

export interface AuthSession {
  user: AuthUser;
  token: string;
  accessToken?: string;
  idToken?: string;
  refreshToken?: string;
  expiresIn?: number;
}

const STORAGE_KEY_USER = 'vibesift_user_session';

/**
 * Authentication service communicating with Amazon Cognito / Backend API.
 */
class ProductionAuthService {
  async login(creds: LoginCredentials): Promise<AuthSession> {
    const headers: Record<string, string> = {};
    if (creds.turnstileToken) {
      headers['cf-turnstile-response'] = creds.turnstileToken;
      headers['x-turnstile-token'] = creds.turnstileToken;
    }
    const data = await apiClient<AuthSession>('/auth/login', {
      method: 'POST',
      headers,
      body: JSON.stringify(creds),
    });
    setAuthSession(data.token, data.refreshToken, data.expiresIn);
    localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(data.user));
    return data;
  }

  async signup(creds: SignupCredentials): Promise<SignupResult> {
    const headers: Record<string, string> = {};
    if (creds.turnstileToken) {
      headers['cf-turnstile-response'] = creds.turnstileToken;
      headers['x-turnstile-token'] = creds.turnstileToken;
    }
    const data = await apiClient<SignupResult>('/auth/signup', {
      method: 'POST',
      headers,
      body: JSON.stringify(creds),
    });
    if (data.token && data.user) {
      setAuthSession(data.token, data.refreshToken, data.expiresIn);
      localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(data.user));
    }
    return data;
  }

  async confirmSignup(creds: ConfirmSignupCredentials): Promise<ConfirmSignupResult> {
    const data = await apiClient<ConfirmSignupResult>('/auth/confirm', {
      method: 'POST',
      body: JSON.stringify(creds),
    });
    if (data.token && data.user) {
      setAuthSession(data.token, data.refreshToken, data.expiresIn);
      localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(data.user));
    }
    return data;
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
      clearAuthSession();
      return null;
    }
  }

  async logout(): Promise<void> {
    try {
      await apiClient<void>('/auth/logout', { method: 'POST' });
    } finally {
      clearAuthSession();
    }
  }
}

export const authService = new ProductionAuthService();
export { ApiError };
