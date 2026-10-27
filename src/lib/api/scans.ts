import { apiClient, USE_MOCK_API, ApiError } from './client';
import { mockStore } from './mockData';
import { AuditReport, ScanProfile, ScanStatus } from '../../types/audit';

export interface ScanSubmissionPayload {
  url: string;
  profile: ScanProfile;
  acknowledgedTerms: boolean;
}

export interface ScanSubmissionResponse {
  scanId: string;
  status: ScanStatus;
  targetUrl: string;
  createdAt: string;
}

/**
 * Initiates a new audit scan.
 */
export async function submitScan(payload: ScanSubmissionPayload): Promise<ScanSubmissionResponse> {
  if (USE_MOCK_API) {
    // Artificial small latency for realism
    await new Promise((r) => setTimeout(r, 400));
    const scan = mockStore.submitScan(payload.url, payload.profile);
    return {
      scanId: scan.scanId,
      status: scan.status,
      targetUrl: scan.targetUrl,
      createdAt: scan.createdAt,
    };
  }

  return apiClient<ScanSubmissionResponse>('/scans', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

/**
 * Retrieves the latest scan report and live execution status.
 */
export async function getScanStatus(scanId: string): Promise<AuditReport> {
  if (USE_MOCK_API) {
    await new Promise((r) => setTimeout(r, 200));
    const scan = mockStore.getScan(scanId);
    if (!scan) {
      throw new ApiError(`Audit report with ID "${scanId}" was not found.`, 404, 'NOT_FOUND');
    }
    return scan;
  }

  return apiClient<AuditReport>(`/scans/${encodeURIComponent(scanId)}`);
}

/**
 * Lists previous scans with optional search & profile filtering.
 */
export async function listScans(params?: { search?: string; profile?: ScanProfile }): Promise<AuditReport[]> {
  if (USE_MOCK_API) {
    await new Promise((r) => setTimeout(r, 250));
    let list = mockStore.getScans();
    if (params?.profile) {
      list = list.filter((s) => s.scanProfile === params.profile);
    }
    if (params?.search?.trim()) {
      const q = params.search.toLowerCase();
      list = list.filter((s) => s.targetUrl.toLowerCase().includes(q) || s.scanId.toLowerCase().includes(q));
    }
    return list;
  }

  const query = new URLSearchParams();
  if (params?.search) query.set('search', params.search);
  if (params?.profile) query.set('profile', params.profile);

  const qs = query.toString();
  return apiClient<AuditReport[]>(`/scans${qs ? `?${qs}` : ''}`);
}

/**
 * Triggers a rescan of an existing audit target.
 */
export async function rescanTarget(scanId: string): Promise<ScanSubmissionResponse> {
  if (USE_MOCK_API) {
    await new Promise((r) => setTimeout(r, 350));
    const newScan = mockStore.rescan(scanId);
    return {
      scanId: newScan.scanId,
      status: newScan.status,
      targetUrl: newScan.targetUrl,
      createdAt: newScan.createdAt,
    };
  }

  return apiClient<ScanSubmissionResponse>(`/scans/${encodeURIComponent(scanId)}/rescan`, {
    method: 'POST',
  });
}

/**
 * Cancels an ongoing scan in queued or running state.
 */
export async function cancelScan(scanId: string): Promise<void> {
  if (USE_MOCK_API) {
    const scan = mockStore.getScan(scanId);
    if (scan && scan.status !== 'COMPLETED' && scan.status !== 'FAILED') {
      scan.status = 'CANCELLED';
    }
    return;
  }

  return apiClient<void>(`/scans/${encodeURIComponent(scanId)}/cancel`, {
    method: 'POST',
  });
}
