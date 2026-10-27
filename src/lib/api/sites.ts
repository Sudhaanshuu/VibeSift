import { apiClient, USE_MOCK_API, ApiError } from './client';
import { mockStore } from './mockData';
import { SavedWebsite } from '../../types/audit';

export async function listSavedSites(): Promise<SavedWebsite[]> {
  if (USE_MOCK_API) {
    await new Promise((r) => setTimeout(r, 200));
    return mockStore.getSites();
  }

  return apiClient<SavedWebsite[]>('/sites');
}

export async function addSavedSite(hostname: string): Promise<SavedWebsite> {
  if (USE_MOCK_API) {
    await new Promise((r) => setTimeout(r, 300));
    return mockStore.addSite(hostname);
  }

  return apiClient<SavedWebsite>('/sites', {
    method: 'POST',
    body: JSON.stringify({ hostname }),
  });
}

export async function deleteSavedSite(siteId: string): Promise<void> {
  if (USE_MOCK_API) {
    await new Promise((r) => setTimeout(r, 200));
    mockStore.deleteSite(siteId);
    return;
  }

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
  if (USE_MOCK_API) {
    const site = mockStore.getSite(siteId);
    if (!site) {
      throw new ApiError('Site not found', 404, 'NOT_FOUND');
    }
    const token = site.verificationToken || `siteready-verify=${siteId}`;
    return {
      method,
      token,
      dnsHostRecord: `@ (or _vibesift-challenge.${site.hostname})`,
      dnsRecordType: 'TXT',
      metaHtmlTag: `<meta name="vibesift-site-verification" content="${token}" />`,
      httpFilePath: `/.well-known/vibesift-verification.txt`,
      httpFileContent: token,
    };
  }

  return apiClient<VerificationInstructions>(`/sites/${encodeURIComponent(siteId)}/verify-request`, {
    method: 'POST',
    body: JSON.stringify({ method }),
  });
}

export async function confirmDomainVerification(
  siteId: string
): Promise<{ verified: boolean; message: string }> {
  if (USE_MOCK_API) {
    await new Promise((r) => setTimeout(r, 800));
    return mockStore.confirmVerification(siteId);
  }

  return apiClient<{ verified: boolean; message: string }>(
    `/sites/${encodeURIComponent(siteId)}/verify-confirm`,
    {
      method: 'POST',
    }
  );
}

import { SiteStats, AuditReport } from '../../types/audit';

export async function getSiteStats(siteId: string): Promise<{ site: SavedWebsite; stats: SiteStats }> {
  if (USE_MOCK_API) {
    const site = mockStore.getSite(siteId);
    return {
      site: site || ({} as SavedWebsite),
      stats: {
        hostname: site?.hostname || 'example.com',
        siteId,
        totalScans: site?.lastScanScore ? 2 : 0,
        latestScore: site?.lastScanScore || null,
        averageScore: site?.lastScanScore || null,
        lastScannedAt: site?.lastScanDate || null,
        scoreHistory: [],
        categoryAverages: {},
        findingsSummary: { total: site?.openFindingsCount || 0, open: site?.openFindingsCount || 0, fixed: 0, waived: 0 },
      },
    };
  }

  return apiClient<{ site: SavedWebsite; stats: SiteStats }>(`/sites/${encodeURIComponent(siteId)}/stats`);
}

export async function getHostnameStats(hostname: string): Promise<SiteStats> {
  if (USE_MOCK_API) {
    return {
      hostname,
      totalScans: 1,
      latestScore: 84,
      averageScore: 84,
      lastScannedAt: new Date().toISOString(),
      scoreHistory: [],
      categoryAverages: {},
      findingsSummary: { total: 4, open: 3, fixed: 1, waived: 0 },
    };
  }

  return apiClient<SiteStats>(`/sites/stats?hostname=${encodeURIComponent(hostname)}`);
}

export async function getSiteScans(siteId: string): Promise<AuditReport[]> {
  if (USE_MOCK_API) {
    return mockStore.getScans();
  }

  return apiClient<AuditReport[]>(`/sites/${encodeURIComponent(siteId)}/scans`);
}
