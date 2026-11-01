import { apiClient, ApiError } from './client';
import { SavedWebsite, SiteStats, AuditReport } from '../../types/audit';

export async function listSavedSites(): Promise<SavedWebsite[]> {
  return apiClient<SavedWebsite[]>('/sites');
}

export async function addSavedSite(hostname: string): Promise<SavedWebsite> {
  return apiClient<SavedWebsite>('/sites', {
    method: 'POST',
    body: JSON.stringify({ hostname }),
  });
}

export async function deleteSavedSite(siteId: string): Promise<void> {
  return apiClient<void>(`/sites/${encodeURIComponent(siteId)}`, {
    method: 'DELETE',
  });
}

export interface VerificationInstructions {
  method: 'dns_txt' | 'html_meta' | 'http_file';
  token: string;
  dnsHostRecord: string;
  dnsRecordType: string;
  metaHtmlTag: string;
  httpFilePath: string;
  httpFileContent: string;
}

export async function requestDomainVerification(
  siteId: string,
  method: 'dns_txt' | 'html_meta' | 'http_file' = 'dns_txt'
): Promise<VerificationInstructions> {
  return apiClient<VerificationInstructions>(`/sites/${encodeURIComponent(siteId)}/verify-request`, {
    method: 'POST',
    body: JSON.stringify({ method }),
  });
}

export async function confirmDomainVerification(
  siteId: string
): Promise<{ verified: boolean; message: string }> {
  return apiClient<{ verified: boolean; message: string }>(
    `/sites/${encodeURIComponent(siteId)}/verify-confirm`,
    {
      method: 'POST',
    }
  );
}

export async function getSiteStats(siteId: string): Promise<{ site: SavedWebsite; stats: SiteStats }> {
  return apiClient<{ site: SavedWebsite; stats: SiteStats }>(`/sites/${encodeURIComponent(siteId)}/stats`);
}

export async function getHostnameStats(hostname: string): Promise<SiteStats> {
  return apiClient<SiteStats>(`/sites/stats?hostname=${encodeURIComponent(hostname)}`);
}

export async function getSiteScans(siteId: string): Promise<AuditReport[]> {
  return apiClient<AuditReport[]>(`/sites/${encodeURIComponent(siteId)}/scans`);
}

export { ApiError };
