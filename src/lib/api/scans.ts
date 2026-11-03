import { apiClient, ApiError } from './client';
import { AuditReport, ScanProfile, ScanStatus } from '../../types/audit';

export interface ScanSubmissionPayload {
  url: string;
  profile: ScanProfile;
  acknowledgedTerms: boolean;
  forceRescan?: boolean;
}

export interface ScanSubmissionResponse {
  scanId: string;
  status: ScanStatus;
  targetUrl: string;
  createdAt: string;
}

export interface PrecheckResult {
  exists: boolean;
  scanId?: string;
  targetUrl?: string;
  normalizedHostname?: string;
  createdAt?: string;
  readinessScore?: number | null;
  summary?: any;
  s3Key?: string;
}

/**
 * Checks whether an audit already exists in S3 and SQLite for this target URL.
 */
export async function precheckScanTarget(url: string): Promise<PrecheckResult> {
  try {
    return await apiClient<PrecheckResult>('/scans/precheck', {
      method: 'POST',
      body: JSON.stringify({ url }),
    });
  } catch {
    // If network or offline, treat as non-existent so fresh scan can proceed
    return { exists: false };
  }
}

/**
 * Initiates a new audit scan against the backend.
 */
export async function submitScan(payload: ScanSubmissionPayload): Promise<ScanSubmissionResponse> {
  return apiClient<ScanSubmissionResponse>('/scans', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

/**
 * Retrieves the latest scan report and live execution status.
 */
export async function getScanStatus(scanId: string): Promise<AuditReport> {
  return apiClient<AuditReport>(`/scans/${encodeURIComponent(scanId)}`);
}

/**
 * Lists previous scans with optional search & profile filtering.
 */
export async function listScans(params?: { search?: string; profile?: ScanProfile }): Promise<AuditReport[]> {
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
  return apiClient<ScanSubmissionResponse>(`/scans/${encodeURIComponent(scanId)}/rescan`, {
    method: 'POST',
  });
}

/**
 * Cancels an ongoing scan in queued or running state.
 */
export async function cancelScan(scanId: string): Promise<void> {
  return apiClient<void>(`/scans/${encodeURIComponent(scanId)}/cancel`, {
    method: 'POST',
  });
}

export { ApiError };
