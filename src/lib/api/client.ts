/**
 * API Client configuration and request wrapper.
 * Provides normalized error handling, authentication headers,
 * and environment-based endpoint resolution.
 */

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || (typeof window !== 'undefined' && window.location?.origin ? `${window.location.origin}/api` : 'http://localhost:4000/api');

export interface ApiErrorResponse {
  error: string;
  code: string;
  statusCode: number;
  details?: Record<string, any>;
  message?: string;
}

export class ApiError extends Error {
  statusCode: number;
  code: string;
  details?: Record<string, any>;

  constructor(message: string, statusCode = 500, code = 'INTERNAL_ERROR', details?: Record<string, any>) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}

export const STORAGE_KEY_TOKEN = 'vibesift_auth_token';
export const STORAGE_KEY_REFRESH_TOKEN = 'vibesift_refresh_token';
export const STORAGE_KEY_SESSION_EXPIRES_AT = 'vibesift_session_expires_at';
export const FOURTEEN_DAYS_MS = 14 * 24 * 60 * 60 * 1000;

export function getAuthToken(): string | null {
  try {
    const expiresAt = localStorage.getItem(STORAGE_KEY_SESSION_EXPIRES_AT);
    if (expiresAt && Date.now() > Number(expiresAt)) {
      clearAuthSession();
      return null;
    }
    const raw = localStorage.getItem(STORAGE_KEY_TOKEN);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function getRefreshToken(): string | null {
  try {
    const expiresAt = localStorage.getItem(STORAGE_KEY_SESSION_EXPIRES_AT);
    if (expiresAt && Date.now() > Number(expiresAt)) {
      clearAuthSession();
      return null;
    }
    const raw = localStorage.getItem(STORAGE_KEY_REFRESH_TOKEN);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setAuthToken(token: string | null): void {
  if (token) {
    localStorage.setItem(STORAGE_KEY_TOKEN, JSON.stringify(token));
  } else {
    localStorage.removeItem(STORAGE_KEY_TOKEN);
  }
}

export function setAuthSession(
  token: string | null,
  refreshToken?: string | null,
  expiresInSeconds?: number
): void {
  if (token) {
    localStorage.setItem(STORAGE_KEY_TOKEN, JSON.stringify(token));
    if (refreshToken) {
      localStorage.setItem(STORAGE_KEY_REFRESH_TOKEN, JSON.stringify(refreshToken));
    }
    // Set 14-day persistent session expiration
    localStorage.setItem(STORAGE_KEY_SESSION_EXPIRES_AT, String(Date.now() + FOURTEEN_DAYS_MS));
  } else {
    clearAuthSession();
  }
}

export function clearAuthSession(): void {
  localStorage.removeItem(STORAGE_KEY_TOKEN);
  localStorage.removeItem(STORAGE_KEY_REFRESH_TOKEN);
  localStorage.removeItem(STORAGE_KEY_SESSION_EXPIRES_AT);
  localStorage.removeItem('vibesift_user_session');
}

// Single-flight refresh token mutex
let refreshPromise: Promise<string | null> | null = null;

export async function refreshSession(): Promise<string | null> {
  const currentRefreshToken = getRefreshToken();
  if (!currentRefreshToken) return null;

  if (refreshPromise) {
    return refreshPromise;
  }

  refreshPromise = (async () => {
    try {
      const url = `${API_BASE_URL}/auth/refresh`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: currentRefreshToken }),
      });

      if (!res.ok) {
        clearAuthSession();
        return null;
      }

      const data = await res.json();
      const newToken = data.token || data.accessToken;
      if (newToken) {
        setAuthToken(newToken);
        return newToken;
      }
      return null;
    } catch {
      return null;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

/**
 * Standard fetch wrapper with authentication and error normalization.
 */
export async function apiClient<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  let token = getAuthToken();
  const headers = new Headers(options.headers || {});
  
  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }
  
  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;

  try {
    let response = await fetch(url, {
      ...options,
      headers,
    });

    // Automatic token refresh on 401 expiration (if not auth endpoint itself)
    if (
      response.status === 401 &&
      !endpoint.includes('/auth/login') &&
      !endpoint.includes('/auth/refresh')
    ) {
      const refreshedToken = await refreshSession();
      if (refreshedToken) {
        headers.set('Authorization', `Bearer ${refreshedToken}`);
        response = await fetch(url, {
          ...options,
          headers,
        });
      }
    }

    if (response.status === 204) {
      return {} as T;
    }

    const contentType = response.headers.get('content-type');
    const isJson = contentType && contentType.includes('application/json');
    const data = isJson ? await response.json() : await response.text();

    if (!response.ok) {
      const errorMsg = (data && typeof data === 'object' && (data.error || data.message)) 
        ? (data.error || data.message) 
        : `Request failed with status ${response.status}`;
      
      const errorCode = (data && typeof data === 'object' && data.code) 
        ? data.code 
        : `HTTP_${response.status}`;

      throw new ApiError(errorMsg, response.status, errorCode, isJson ? data : undefined);
    }

    return data as T;
  } catch (error: any) {
    if (error instanceof ApiError) {
      throw error;
    }

    // Network error or timeout
    throw new ApiError(
      error.message || 'Network request failed. Please check your internet connection.',
      0,
      'NETWORK_ERROR'
    );
  }
}
