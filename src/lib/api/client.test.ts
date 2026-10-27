import { describe, it, expect, vi, afterEach } from 'vitest';
import { apiClient, ApiError } from './client';

describe('API Client & Error Handling', () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('normalizes HTTP 404 into typed ApiError', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => ({ error: 'Report not found', code: 'REPORT_NOT_FOUND' }),
    });

    await expect(apiClient('/reports/unknown-123')).rejects.toThrow(ApiError);
    try {
      await apiClient('/reports/unknown-123');
    } catch (err: any) {
      expect(err.statusCode).toBe(404);
      expect(err.code).toBe('REPORT_NOT_FOUND');
      expect(err.message).toBe('Report not found');
    }
  });

  it('normalizes network disconnects into NETWORK_ERROR', async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new Error('Failed to fetch'));

    await expect(apiClient('/scans')).rejects.toThrow(ApiError);
    try {
      await apiClient('/scans');
    } catch (err: any) {
      expect(err.code).toBe('NETWORK_ERROR');
      expect(err.statusCode).toBe(0);
    }
  });
});
