/**
 * API Client configuration and request wrapper.
 * Provides normalized error handling, authentication headers,
 * and environment-based endpoint resolution.
 */

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || (typeof window !== 'undefined' && window.location?.origin ? `${window.location.origin}/api` : 'http://localhost:4000/api');
export const USE_MOCK_API = import.meta.env.MODE === 'test' ? true : (import.meta.env.VITE_USE_MOCK_API === 'true');

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

export function getAuthToken(): string | null {
  try {
    const raw = localStorage.getItem('vibesift_auth_token');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setAuthToken(token: string | null): void {
  if (token) {
    localStorage.setItem('vibesift_auth_token', JSON.stringify(token));
  } else {
    localStorage.removeItem('vibesift_auth_token');
  }
}

/**
 * Standard fetch wrapper with authentication and error normalization.
 */
export async function apiClient<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getAuthToken();
  const headers = new Headers(options.headers || {});
  
  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }
  
  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;

  try {
    const response = await fetch(url, {
      ...options,
      headers,
    });

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
